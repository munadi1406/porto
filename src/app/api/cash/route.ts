// API Route: Cash Management (with userId support)
import { NextRequest, NextResponse } from 'next/server';
import { CashHolding, CashLedger, Portfolio, syncDatabase } from '@/lib/models';

let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        const success = await syncDatabase();
        if (success) dbInitialized = true;
    }
}

// GET: Fetch current cash balance for a specific portfolio
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const { searchParams } = new URL(request.url);
        const portfolioId = searchParams.get('portfolioId');
        const includeHistory = searchParams.get('history') === 'true';

        if (!portfolioId) {
            return NextResponse.json(
                { success: false, error: 'portfolioId is required' },
                { status: 400 }
            );
        }

        let cash = await CashHolding.findOne({
            where: { portfolioId }
        });

        if (!cash) {
            // Validate portfolio exists before creating cash child record
            const portfolioExists = await Portfolio.findByPk(portfolioId);
            if (!portfolioExists) {
                return NextResponse.json({
                    success: true,
                    data: { amount: 0, lastUpdated: new Date() },
                });
            }

            cash = await CashHolding.create({
                portfolioId,
                amount: 0,
                lastUpdated: new Date(),
            });
        }

        let ledger = includeHistory ? await CashLedger.findAll({ where: { portfolioId }, order: [['timestamp', 'ASC']], limit: 10000 }) : undefined;
        // One-time baseline for portfolios created before the cash ledger existed.
        if (includeHistory && ledger?.length === 0 && Number(cash.amount) !== 0) {
            const baseline = await CashLedger.create({
                portfolioId,
                amount: Number(cash.amount),
                balanceAfter: Number(cash.amount),
                kind: 'adjustment',
                timestamp: cash.createdAt || cash.lastUpdated,
            });
            ledger = [baseline];
        }
        return NextResponse.json({
            success: true,
            data: {
                amount: cash.amount ? parseFloat(cash.amount.toString()) : 0,
                lastUpdated: cash.lastUpdated,
                ...(includeHistory ? { ledger } : {}),
            },
        });
    } catch (error: any) {
        console.error('Error fetching cash:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST: Update cash balance
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { portfolioId, amount, operation, kind } = body;

        if (!portfolioId) {
            return NextResponse.json(
                { success: false, error: 'portfolioId is required' },
                { status: 400 }
            );
        }

        if (amount === undefined) {
            return NextResponse.json(
                { success: false, error: 'Amount is required' },
                { status: 400 }
            );
        }

        let cash = await CashHolding.findOne({
            where: { portfolioId }
        });

        if (!cash) {
            const portfolioExists = await Portfolio.findByPk(portfolioId);
            if (!portfolioExists) {
                return NextResponse.json(
                    { success: false, error: 'Portfolio not found' },
                    { status: 404 }
                );
            }

            cash = await CashHolding.create({
                portfolioId,
                amount: 0,
                lastUpdated: new Date(),
            });
        }

        let newAmount: number;
        const currentAmount = cash.amount ? parseFloat(cash.amount.toString()) : 0;

        switch (operation) {
            case 'add':
                newAmount = currentAmount + amount;
                break;
            case 'subtract':
                newAmount = Math.max(0, currentAmount - amount);
                break;
            case 'set':
            default:
                newAmount = amount;
        }

        await cash.update({
            amount: newAmount,
            lastUpdated: new Date(),
        });

        const delta = newAmount - currentAmount;
        if (delta !== 0) {
            const ledgerKind = ['deposit', 'withdrawal', 'trade_buy', 'trade_sell', 'adjustment'].includes(kind)
                ? kind
                : operation === 'add' ? 'deposit' : operation === 'subtract' ? 'withdrawal' : 'adjustment';
            await CashLedger.create({ portfolioId, amount: delta, balanceAfter: newAmount, kind: ledgerKind, timestamp: new Date() });
        }

        return NextResponse.json({
            success: true,
            data: {
                amount: newAmount,
                lastUpdated: cash.lastUpdated,
            },
            message: 'Cash updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating cash:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
