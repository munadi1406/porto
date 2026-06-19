import { NextResponse } from 'next/server';
import { ScreenerResult, syncDatabase } from '@/lib/models';

export async function GET() {
    try {
        await syncDatabase();

        const items = await ScreenerResult.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50,
        });

        const data = items.map(item => ({
            id: item.id,
            name: item.name,
            label: item.label,
            resultsCount: item.resultsCount,
            buyCount: item.buyCount,
            sellCount: item.sellCount,
            createdAt: item.createdAt,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching screener history:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
