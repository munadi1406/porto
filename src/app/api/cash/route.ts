// API Route: Cash Management (with userId support)
import { NextRequest, NextResponse } from 'next/server';
import { CashHolding, syncDatabase } from '@/lib/models';

const USER_ID = 'default';

let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        await syncDatabase();
        dbInitialized = true;
    }
}

// GET: Fetch current cash balance for current user
export async function GET() {
    try {
        await ensureDbInitialized();

        let cash = await CashHolding.findOne({
            where: { userId: USER_ID }
        });

        if (!cash) {
            cash = await CashHolding.create({
                userId: USER_ID,
                amount: 0,
                lastUpdated: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                amount: cash.amount ? parseFloat(cash.amount.toString()) : 0,
                lastUpdated: cash.lastUpdated,
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
        const { amount, operation } = body;

        if (amount === undefined) {
            return NextResponse.json(
                { success: false, error: 'Amount is required' },
                { status: 400 }
            );
        }

        let cash = await CashHolding.findOne({
            where: { userId: USER_ID }
        });

        if (!cash) {
            cash = await CashHolding.create({
                userId: USER_ID,
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
