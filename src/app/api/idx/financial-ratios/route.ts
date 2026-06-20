import { NextResponse } from 'next/server';
import { getFinancialRatiosForTicker } from '@/lib/idxApi';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker')?.toUpperCase() || '';

        if (!ticker) {
            return NextResponse.json({ success: false, error: 'ticker parameter required' }, { status: 400 });
        }

        const yahooTicker = ticker.includes('.JK') ? ticker : `${ticker}.JK`;
        const data = await getFinancialRatiosForTicker(yahooTicker);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
