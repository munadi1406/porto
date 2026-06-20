import { NextResponse } from 'next/server';
import { getStockSummary, getTopGainer, getTopLoser } from '@/lib/idxApi';

export async function GET() {
    try {
        const [stocks, gainers, losers] = await Promise.all([
            getStockSummary(),
            getTopGainer(),
            getTopLoser(),
        ]);
        return NextResponse.json({ success: true, data: stocks, gainers, losers, total: stocks.length });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
