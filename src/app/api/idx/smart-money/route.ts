import { NextResponse } from 'next/server';
import { getSmartMoneyData } from '@/lib/idxFirecrawl';

export async function GET() {
    try {
        const data = await getSmartMoneyData();
        return NextResponse.json({ success: true, data, source: 'firecrawl' });
    } catch (error: any) {
        // Fallback ke Yahoo
        try {
            const { getSmartMoneyData: yahooData } = await import('@/lib/idxApi');
            const fallback = await yahooData();
            return NextResponse.json({ success: true, data: fallback, source: 'yahoo_fallback' });
        } catch {
            return NextResponse.json({ success: false, error: error.message }, { status: 502 });
        }
    }
}
