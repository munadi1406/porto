import { NextRequest, NextResponse } from 'next/server';
import { Portfolio, syncDatabase } from '@/lib/models';

// GET: Fetch all portfolios
export async function GET() {
    try {
        await syncDatabase();
        const portfolios = await Portfolio.findAll({
            order: [['createdAt', 'DESC']],
        });

        return NextResponse.json({
            success: true,
            data: portfolios,
        });
    } catch (error: any) {
        console.error('Error fetching portfolios:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST: Create a new portfolio
export async function POST(request: NextRequest) {
    try {
        await syncDatabase();
        const body = await request.json();
        const { name, description, color } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        const portfolio = await Portfolio.create({
            name,
            description,
            color,
        });

        // Initialize cash for the new portfolio
        const { CashHolding } = await import('@/lib/models');
        await CashHolding.create({
            portfolioId: portfolio.id,
            amount: 0,
            lastUpdated: new Date(),
        });

        return NextResponse.json({
            success: true,
            data: portfolio,
            message: 'Portfolio created successfully',
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating portfolio:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT: Update a portfolio
export async function PUT(request: NextRequest) {
    try {
        await syncDatabase();
        const body = await request.json();
        const { id, name, description, color, targetValue } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const portfolio = await Portfolio.findByPk(id);
        if (!portfolio) {
            return NextResponse.json(
                { success: false, error: 'Portfolio not found' },
                { status: 404 }
            );
        }

        await portfolio.update({
            name: name !== undefined ? name : portfolio.name,
            description: description !== undefined ? description : portfolio.description,
            color: color !== undefined ? color : portfolio.color,
            targetValue: targetValue !== undefined ? targetValue : portfolio.targetValue,
        });

        return NextResponse.json({
            success: true,
            data: portfolio,
            message: 'Portfolio updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating portfolio:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE: Delete a portfolio and all related data
export async function DELETE(request: NextRequest) {
    try {
        await syncDatabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const portfolio = await Portfolio.findByPk(id);
        if (!portfolio) {
            return NextResponse.json(
                { success: false, error: 'Portfolio not found' },
                { status: 404 }
            );
        }

        // Check if it's the only portfolio
        const count = await Portfolio.count();
        if (count <= 1) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete the last portfolio' },
                { status: 400 }
            );
        }

        // Cascade delete using related models
        const { PortfolioItem, Transaction, PortfolioSnapshot, CashHolding } = await import('@/lib/models');

        await PortfolioItem.destroy({ where: { portfolioId: id } });
        await Transaction.destroy({ where: { portfolioId: id } });
        await PortfolioSnapshot.destroy({ where: { portfolioId: id } });
        await CashHolding.destroy({ where: { portfolioId: id } });
        await portfolio.destroy();

        return NextResponse.json({
            success: true,
            message: 'Portfolio deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting portfolio:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
