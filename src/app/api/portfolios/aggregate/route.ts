import { NextRequest, NextResponse } from 'next/server';
import { Portfolio, PortfolioItem, CashHolding, syncDatabase } from '@/lib/models';
import sequelize from '@/lib/db';

export async function GET() {
    try {
        await syncDatabase();

        // Fetch all portfolios
        const portfolios = await Portfolio.findAll();

        // Fetch all items and cash across all portfolios
        const allItems = await PortfolioItem.findAll();
        const allCash = await CashHolding.findAll();

        // Aggregate data
        const summaries = portfolios.map(portfolio => {
            const items = allItems.filter(item => item.portfolioId === portfolio.id);
            const cash = allCash.find(c => c.portfolioId === portfolio.id)?.amount || 0;

            const investedValue = items.reduce((acc, item) => acc + (Number(item.lots) * 100 * Number(item.averagePrice)), 0);
            const portfolioTickers = items.map(item => item.ticker);

            return {
                id: portfolio.id,
                name: portfolio.name,
                color: portfolio.color,
                investedValue,
                cashValue: Number(cash),
                tickerCount: items.length,
                items: items.map(i => ({
                    ticker: i.ticker,
                    name: i.name,
                    lots: Number(i.lots),
                    averagePrice: Number(i.averagePrice)
                }))
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                summaries,
                totalInvested: summaries.reduce((acc, s) => acc + s.investedValue, 0),
                totalCash: summaries.reduce((acc, s) => acc + s.cashValue, 0),
            }
        });
    } catch (error: any) {
        console.error('Error fetching aggregate data:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
