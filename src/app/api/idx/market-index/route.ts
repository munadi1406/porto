import { NextResponse } from 'next/server';
import '@/lib/idxWarmup';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const YAHOO_INDICES = [
    { symbol: '^JKSE', name: 'IHSG', label: 'Indeks Harga Saham Gabungan' },
    { symbol: '^JKQ', name: 'LQ45', label: 'LQ45' },
    { symbol: '^JKLQ45', name: 'IDX30', label: 'IDX30' },
    { symbol: '^JKINFRA', name: 'INFRA', label: 'Infrastruktur' },
];

export async function GET() {
    try {
        const results = await Promise.allSettled(
            YAHOO_INDICES.map(async (idx) => {
                try {
                    const q: any = await yf.quote(idx.symbol);
                    return {
                        symbol: idx.symbol,
                        name: idx.name,
                        label: idx.label,
                        lastPrice: q.regularMarketPrice || 0,
                        change: q.regularMarketChange || 0,
                        changePercent: q.regularMarketChangePercent || 0,
                        previousClose: q.regularMarketPreviousClose || 0,
                        open: q.regularMarketOpen || 0,
                        dayHigh: q.regularMarketDayHigh || 0,
                        dayLow: q.regularMarketDayLow || 0,
                        volume: q.regularMarketVolume || 0,
                    };
                } catch { return null; }
            })
        );
        const data = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value != null)
            .map(r => r.value);
        return NextResponse.json({ success: true, data, source: 'yahoo' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
