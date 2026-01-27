// API Route: Transaction Operations (with userId support)
import { NextRequest, NextResponse } from 'next/server';
import { Transaction, PortfolioItem, syncDatabase } from '@/lib/models';

let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        await syncDatabase();
        dbInitialized = true;
    }
}

// GET: Fetch all transactions for a specific portfolio
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const { searchParams } = new URL(request.url);
        const portfolioId = searchParams.get('portfolioId');

        if (!portfolioId) {
            return NextResponse.json(
                { success: false, error: 'portfolioId is required' },
                { status: 400 }
            );
        }

        const transactions = await Transaction.findAll({
            where: { portfolioId },
            order: [['timestamp', 'DESC']],
            limit: 100,
        });

        return NextResponse.json({
            success: true,
            data: transactions,
        });
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST: Execute transaction (buy/sell)
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { portfolioId, id, type, ticker, name, lots, pricePerShare, notes } = body;

        if (!portfolioId || !type || !ticker || !name || lots === undefined || pricePerShare === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const totalAmount = lots * 100 * pricePerShare;

        // Create transaction record
        const transaction = await Transaction.create({
            portfolioId,
            type,
            ticker,
            name,
            lots,
            pricePerShare,
            totalAmount,
            notes: notes || (type === 'buy' ? 'Buy more' : 'Partial sell'),
            timestamp: new Date(),
        });

        // Update portfolio item if ID provided
        if (id) {
            const item = await PortfolioItem.findOne({
                where: { id, portfolioId }
            });

            if (item) {
                if (type === 'buy') {
                    const currentLots = parseFloat(item.lots?.toString() || '0') || 0;
                    const currentAvg = parseFloat(item.averagePrice?.toString() || '0') || 0;
                    const addedLots = parseFloat(lots?.toString() || '0') || 0;
                    const addedAvg = parseFloat(pricePerShare?.toString() || '0') || 0;

                    const totalCostValue = (currentLots * currentAvg) + (addedLots * addedAvg);
                    const totalLotsCount = currentLots + addedLots;
                    const finalAverage = totalLotsCount > 0 ? totalCostValue / totalLotsCount : addedAvg;

                    await item.update({
                        lots: totalLotsCount,
                        averagePrice: finalAverage,
                    });
                } else if (type === 'sell') {
                    const newLots = Math.max(0, item.lots - lots);
                    if (newLots === 0) {
                        await item.destroy();
                    } else {
                        await item.update({ lots: newLots });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: transaction,
            message: `${type === 'buy' ? 'Purchase' : 'Sale'} recorded successfully`,
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
