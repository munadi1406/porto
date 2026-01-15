// API Route: Portfolio CRUD Operations (Simplified)
import { NextRequest, NextResponse } from 'next/server';

const USER_ID = 'default';

// GET: Fetch all portfolio items
export async function GET() {
    try {
        // Dynamic import to avoid build issues
        const { PortfolioItem, syncDatabase } = await import('@/lib/models');
        await syncDatabase();

        const items = await PortfolioItem.findAll({
            where: { userId: USER_ID },
            order: [['createdAt', 'DESC']],
        });

        return NextResponse.json({
            success: true,
            data: items,
        });
    } catch (error: any) {
        console.error('Error fetching portfolio:', error);
        return NextResponse.json(
            { success: false, error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

// POST: Add new stock or update existing
export async function POST(request: NextRequest) {
    try {
        const { PortfolioItem, syncDatabase } = await import('@/lib/models');
        await syncDatabase();

        const body = await request.json();
        const { ticker, name, lots, averagePrice } = body;

        if (!ticker || !name || lots === undefined || averagePrice === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const existing = await PortfolioItem.findOne({
            where: { userId: USER_ID, ticker }
        });

        if (existing) {
            // Force conversion to number to avoid string concatenation or NaN
            const currentLots = Number(existing.lots);
            const currentAvg = Number(existing.averagePrice);
            const addedLots = Number(lots);
            const addedAvg = Number(averagePrice);

            const totalCost = (currentLots * currentAvg) + (addedLots * addedAvg);
            const totalLots = currentLots + addedLots;
            const newAverage = totalLots > 0 ? totalCost / totalLots : 0;

            await existing.update({
                lots: totalLots,
                averagePrice: Math.round(newAverage),
            });

            return NextResponse.json({
                success: true,
                data: existing,
                message: 'Stock updated successfully',
            });
        } else {
            const newItem = await PortfolioItem.create({
                userId: USER_ID,
                ticker,
                name,
                lots,
                averagePrice,
            });

            return NextResponse.json({
                success: true,
                data: newItem,
                message: 'Stock added successfully',
            }, { status: 201 });
        }
    } catch (error: any) {
        console.error('Error adding/updating stock:', error);
        return NextResponse.json(
            { success: false, error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

// PUT: Update stock
export async function PUT(request: NextRequest) {
    try {
        const { PortfolioItem, syncDatabase } = await import('@/lib/models');
        await syncDatabase();

        const body = await request.json();
        const { id, ticker, name, lots, averagePrice } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const item = await PortfolioItem.findOne({
            where: { id, userId: USER_ID }
        });

        if (!item) {
            return NextResponse.json(
                { success: false, error: 'Stock not found' },
                { status: 404 }
            );
        }

        await item.update({
            ticker: ticker || item.ticker,
            name: name || item.name,
            lots: lots !== undefined ? lots : item.lots,
            averagePrice: averagePrice !== undefined ? averagePrice : item.averagePrice,
        });

        return NextResponse.json({
            success: true,
            data: item,
            message: 'Stock updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating stock:', error);
        return NextResponse.json(
            { success: false, error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

// DELETE: Remove stock
export async function DELETE(request: NextRequest) {
    try {
        const { PortfolioItem, syncDatabase } = await import('@/lib/models');
        await syncDatabase();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const item = await PortfolioItem.findOne({
            where: { id, userId: USER_ID }
        });

        if (!item) {
            return NextResponse.json(
                { success: false, error: 'Stock not found' },
                { status: 404 }
            );
        }

        await item.destroy();

        return NextResponse.json({
            success: true,
            message: 'Stock deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting stock:', error);
        return NextResponse.json(
            { success: false, error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}
