// API Route: Portfolio CRUD Operations (Simplified)
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch all portfolio items for a specific portfolio
export async function GET(request: NextRequest) {
    try {
        const { PortfolioItem, syncDatabase } = await import('@/lib/models');
        await syncDatabase();

        const { searchParams } = new URL(request.url);
        const portfolioId = searchParams.get('portfolioId');

        if (!portfolioId) {
            return NextResponse.json(
                { success: false, error: 'portfolioId is required' },
                { status: 400 }
            );
        }

        const items = await PortfolioItem.findAll({
            where: { portfolioId },
            order: [['createdAt', 'DESC']],
        });

        return NextResponse.json({
            success: true,
            data: items,
        });
    } catch (error: any) {
        console.error('Error fetching portfolio:', error);
        return NextResponse.json(
            { success: false, error: error.message },
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
        const { portfolioId, ticker, name, lots, averagePrice, targetPercentage } = body;

        if (!portfolioId || !ticker || !name || lots === undefined || averagePrice === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const existing = await PortfolioItem.findOne({
            where: { portfolioId, ticker }
        });

        if (existing) {
            const currentLots = parseFloat(existing.lots?.toString() || '0') || 0;
            const currentAvg = parseFloat(existing.averagePrice?.toString() || '0') || 0;
            const addedLots = parseFloat(lots?.toString() || '0') || 0;
            const addedAvg = parseFloat(averagePrice?.toString() || '0') || 0;

            const totalCostValue = (currentLots * currentAvg) + (addedLots * addedAvg);
            const totalLotsCount = currentLots + addedLots;
            const finalAverage = totalLotsCount > 0 ? totalCostValue / totalLotsCount : addedAvg;

            await existing.update({
                lots: totalLotsCount,
                averagePrice: finalAverage,
                targetPercentage: targetPercentage !== undefined ? targetPercentage : existing.targetPercentage,
            });

            return NextResponse.json({
                success: true,
                data: existing,
                message: 'Stock updated successfully',
            });
        } else {
            const newItem = await PortfolioItem.create({
                portfolioId,
                ticker,
                name,
                lots,
                averagePrice,
                targetPercentage: targetPercentage || 0,
            });

            return NextResponse.json({
                success: true,
                data: newItem,
                message: 'Stock added successfully',
            }, { status: 201 });
        }
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
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
        const { id, portfolioId, ticker, name, lots, averagePrice, targetPercentage } = body;

        if (!id || !portfolioId) {
            return NextResponse.json(
                { success: false, error: 'ID and portfolioId are required' },
                { status: 400 }
            );
        }

        const item = await PortfolioItem.findOne({
            where: { id, portfolioId }
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
            targetPercentage: targetPercentage !== undefined ? targetPercentage : item.targetPercentage,
        });

        return NextResponse.json({
            success: true,
            data: item,
            message: 'Stock updated successfully',
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
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
        const portfolioId = searchParams.get('portfolioId');

        if (!id || !portfolioId) {
            return NextResponse.json(
                { success: false, error: 'ID and portfolioId are required' },
                { status: 400 }
            );
        }

        const item = await PortfolioItem.findOne({
            where: { id, portfolioId }
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
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
