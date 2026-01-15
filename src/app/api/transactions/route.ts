// API Route: Transaction Operations (with userId support)
import { NextRequest, NextResponse } from 'next/server';
import { Transaction, PortfolioItem, syncDatabase } from '@/lib/models';

const USER_ID = 'default';

let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        await syncDatabase();
        dbInitialized = true;
    }
}

// GET: Fetch all transactions for current user
export async function GET() {
    try {
        await ensureDbInitialized();

        const transactions = await Transaction.findAll({
            where: { userId: USER_ID },
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
        const { id, type, ticker, name, lots, pricePerShare, notes } = body;

        if (!type || !ticker || !name || lots === undefined || pricePerShare === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const totalAmount = lots * 100 * pricePerShare;

        // Create transaction record
        const transaction = await Transaction.create({
            userId: USER_ID,
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
                where: { id, userId: USER_ID }
            });

            if (item) {
                if (type === 'buy') {
                    const currentLots = Number(item.lots);
                    const currentAvg = Number(item.averagePrice);
                    const addedLots = Number(lots);
                    const addedAvg = Number(pricePerShare);

                    const totalCost = (currentLots * currentAvg) + (addedLots * addedAvg);
                    const totalLots = currentLots + addedLots;
                    const newAverage = totalLots > 0 ? totalCost / totalLots : 0;

                    await item.update({
                        lots: totalLots,
                        averagePrice: Math.round(newAverage),
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
        console.error('Error executing transaction:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
