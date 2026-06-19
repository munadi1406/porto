import { NextRequest, NextResponse } from 'next/server';
import { ScreenerResult, syncDatabase } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        await syncDatabase();

        const body = await request.json();
        const { name, label, results } = body;

        if (!name || !label || !results) {
            return NextResponse.json(
                { success: false, error: 'name, label, and results are required' },
                { status: 400 }
            );
        }

        const buyCount = results.filter((r: any) => r.signal === 'BUY').length;
        const sellCount = results.filter((r: any) => r.signal === 'SELL').length;

        const saved = await ScreenerResult.create({
            name,
            label,
            resultsCount: results.length,
            buyCount,
            sellCount,
            results: JSON.stringify(results),
        });

        return NextResponse.json({
            success: true,
            data: { id: saved.id, label: saved.label, resultsCount: saved.resultsCount, createdAt: saved.createdAt },
        });
    } catch (error: any) {
        console.error('Error saving screener result:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
