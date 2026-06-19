import { NextRequest, NextResponse } from 'next/server';
import { ScreenerResult, syncDatabase } from '@/lib/models';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await syncDatabase();

        const { id } = await params;
        const item = await ScreenerResult.findByPk(id);

        if (!item) {
            return NextResponse.json(
                { success: false, error: 'Not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: item.id,
                name: item.name,
                label: item.label,
                resultsCount: item.resultsCount,
                buyCount: item.buyCount,
                sellCount: item.sellCount,
                createdAt: item.createdAt,
                results: JSON.parse(item.results),
            },
        });
    } catch (error: any) {
        console.error('Error fetching screener result:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
