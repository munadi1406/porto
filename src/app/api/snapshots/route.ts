// API Route: Portfolio Snapshots (Growth Tracking) with userId support
import { NextRequest, NextResponse } from 'next/server';
import { PortfolioSnapshot, syncDatabase } from '@/lib/models';
import sequelize from '@/lib/db';
import { Op } from 'sequelize';

let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        await syncDatabase();
        dbInitialized = true;
    }
}

// GET: Fetch snapshots for a period
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const portfolioId = searchParams.get('portfolioId');
        const period = searchParams.get('period') || 'all';

        if (!portfolioId) {
            return NextResponse.json(
                { success: false, error: 'portfolioId is required' },
                { status: 400 }
            );
        }

        const now = new Date();
        let startTime: Date;

        switch (period) {
            case 'today':
                startTime = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'day':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                startTime = new Date(0);
        }

        // Use raw query to properly handle BIGINT
        const [snapshots]: any = await sequelize.query(`
            SELECT 
                id,
                portfolioId,
                CAST(timestamp AS CHAR) as timestamp,
                CAST(totalValue AS CHAR) as totalValue,
                CAST(stockValue AS CHAR) as stockValue,
                CAST(cashValue AS CHAR) as cashValue
            FROM portfolio_snapshots
            WHERE portfolioId = :portfolioId
                AND timestamp >= :startTime
                AND totalValue > 0
            ORDER BY timestamp ASC
        `, {
            replacements: { portfolioId, startTime },
        });

        // Calculate growth
        let growth = { value: 0, percent: 0 };

        if (snapshots.length >= 2) {
            const first = snapshots[0];
            const last = snapshots[snapshots.length - 1];

            const firstValue = Number(first.totalValue) || 0;
            const lastValue = Number(last.totalValue) || 0;

            growth.value = lastValue - firstValue;
            growth.percent = firstValue > 0 ? (growth.value / firstValue) * 100 : 0;
        }

        return NextResponse.json({
            success: true,
            data: {
                snapshots: snapshots.map((s: any) => ({
                    timestamp: Number(s.timestamp),
                    totalValue: Number(s.totalValue),
                    stockValue: Number(s.stockValue),
                    cashValue: Number(s.cashValue),
                })),
                growth,
            },
        });
    } catch (error: any) {
        console.error('Error fetching snapshots:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST: Record new snapshot
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { portfolioId, stockValue, cashValue } = body;

        if (!portfolioId || stockValue === undefined || cashValue === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Round to integers for BIGINT storage
        const totalValue = Math.round(Number(stockValue) + Number(cashValue));

        // Skip recording if value is suspiciously low (could be loading error)
        if (totalValue <= 0) {
            return NextResponse.json({
                success: true,
                message: 'Snapshot skipped (zero or negative value)',
                data: null,
            });
        }
        const stockVal = Math.round(Number(stockValue));
        const cashVal = Math.round(Number(cashValue));

        // Check for recent snapshot (within 5 seconds)
        const fiveSecondsAgo = Date.now() - 5000;
        const recentSnapshot = await PortfolioSnapshot.findOne({
            where: {
                portfolioId,
                timestamp: {
                    [Op.gte]: fiveSecondsAgo,
                },
            },
            order: [['timestamp', 'DESC']],
        });

        // Skip if too recent and value hasn't changed significantly
        if (recentSnapshot && recentSnapshot.totalValue) {
            const recentValue = Number(recentSnapshot.totalValue);
            const percentDiff = recentValue > 0 ? Math.abs((totalValue - recentValue) / recentValue) * 100 : 0;

            if (percentDiff < 0.01) {
                return NextResponse.json({
                    success: true,
                    message: 'Snapshot skipped (too recent and no significant change)',
                    data: null,
                });
            }
        }

        const snapshot = await PortfolioSnapshot.create({
            portfolioId,
            timestamp: Date.now(),
            totalValue,
            stockValue: stockVal,
            cashValue: cashVal,
        });

        // Clean up old snapshots (keep last 365 days)
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        await PortfolioSnapshot.destroy({
            where: {
                portfolioId,
                timestamp: {
                    [Op.lt]: oneYearAgo,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                timestamp: snapshot.timestamp ? new Date(snapshot.timestamp).getTime() : Date.now(),
                totalValue: snapshot.totalValue ? parseFloat(snapshot.totalValue.toString()) : 0,
                stockValue: snapshot.stockValue ? parseFloat(snapshot.stockValue.toString()) : 0,
                cashValue: snapshot.cashValue ? parseFloat(snapshot.cashValue.toString()) : 0,
            },
            message: 'Snapshot recorded successfully',
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error recording snapshot:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE: Clear all snapshots for a specific portfolio
export async function DELETE(request: NextRequest) {
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

        await PortfolioSnapshot.destroy({
            where: { portfolioId },
        });

        return NextResponse.json({
            success: true,
            message: 'All snapshots cleared successfully',
        });
    } catch (error: any) {
        console.error('Error clearing snapshots:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
