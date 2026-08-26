import { NextResponse } from 'next/server';
import '@/lib/idxWarmup';

const PERIOD_DAYS: Record<string, number> = {
    "1d": 2, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "5y": 1825,
};

// Interval intraday untuk periode pendek agar chart lebih live
const INTERVAL_MAP: Record<string, string> = {
    "1d": "1m",
    "5d": "5m",
    "1mo": "30m",
    "3mo": "60m",
    "6mo": "1d",
    "1y": "1d",
    "5y": "1d",
};

function wibDate(d: Date): string {
    return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

// Pivot klasik (floor trader) dari OHLC sesi bursa sebelumnya
function computePivots(prev: { open: number; high: number; low: number; close: number } | null) {
    if (!prev || !prev.high || !prev.low || !prev.close) return null;
    const pp = (prev.high + prev.low + prev.close) / 3;
    const range = prev.high - prev.low;
    return {
        pp: +(pp.toFixed(2)),
        r1: +((2 * pp - prev.low).toFixed(2)),
        s1: +((2 * pp - prev.high).toFixed(2)),
        r2: +((pp + range).toFixed(2)),
        s2: +((pp - range).toFixed(2)),
        r3: +((prev.high + 2 * (pp - prev.low)).toFixed(2)),
        s3: +((prev.low - 2 * (prev.high - pp)).toFixed(2)),
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1mo';

    try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

        const days = PERIOD_DAYS[period] || 30;
        const interval = (searchParams.get('interval') || INTERVAL_MAP[period] || '1d') as any;
        const period2 = Math.floor(Date.now() / 1000);
        const period1 = period2 - days * 24 * 60 * 60;

        const result = await yf.chart('^JKSE', { period1, period2, interval });

        // Ambil harga live terakhir dari quote (delay ~15 menit utk IDX, tapi lebih fresh dari daily)
        let lastPrice: number | null = null;
        let quoteInfo: any = null;
        try {
            const quote: any = await yf.quote('^JKSE');
            lastPrice = quote.regularMarketPrice || null;
            quoteInfo = {
                price: quote.regularMarketPrice ?? null,
                change: quote.regularMarketChange ?? null,
                changePercent: quote.regularMarketChangePercent ?? null,
                open: quote.regularMarketOpen ?? null,
                high: quote.regularMarketDayHigh ?? null,
                low: quote.regularMarketDayLow ?? null,
                prevClose: quote.regularMarketPreviousClose ?? null,
            };
        } catch {}

        // Pivot points: dari OHLC sesi bursa sebelumnya (daily, 10 hari terakhir)
        let pivots: any = null;
        let prevDay: any = null;
        try {
            const p2 = Math.floor(Date.now() / 1000);
            const daily = await yf.chart('^JKSE', { period1: p2 - 12 * 86400, period2: p2, interval: '1d' });
            const dq: any[] = ((daily as any)?.quotes || []).filter((q: any) => q.close != null);
            if (dq.length >= 1) {
                const last = dq[dq.length - 1];
                const lastIsToday = wibDate(new Date(last.date)) === wibDate(new Date());
                const prev = lastIsToday && dq.length >= 2 ? dq[dq.length - 2] : last;
                prevDay = {
                    date: new Date(prev.date).toISOString().slice(0, 10),
                    open: +(Number(prev.open).toFixed(2)),
                    high: +(Number(prev.high).toFixed(2)),
                    low: +(Number(prev.low).toFixed(2)),
                    close: +(Number(prev.close).toFixed(2)),
                };
                pivots = computePivots({ open: prev.open, high: prev.high, low: prev.low, close: prev.close });
            }
        } catch {}

        const quotes: any = (result as any)?.quotes || [];
        const isIntraday = ['1m', '5m', '15m', '30m', '60m'].includes(interval);
        const mapped = quotes
            .filter((q: any) => q.close != null && q.close > 0)
            .map((q: any) => ({
                Date: q.date ? new Date(q.date).toISOString().slice(0, isIntraday ? 16 : 10) : '',
                Close: q.close,
                Open: q.open,
                High: q.high,
                Low: q.low,
                Volume: q.volume ?? 0,
            }));

        // Yahoo kadang mengembalikan sesi TIDAK berurutan → urutkan agar garis tidak zigzag
        mapped.sort((a: any, b: any) => a.Date.localeCompare(b.Date));

        // Buang sesi parsial (terlalu sedikit titik) pada intraday — bikin domain Y melar & tampilan berantakan
        const MIN_POINTS = 10;
        let sessions: { date: string; rows: any[] }[] = [];
        for (const row of mapped) {
            const sess = row.Date.slice(0, 10);
            const last = sessions[sessions.length - 1];
            if (last && last.date === sess) last.rows.push(row);
            else sessions.push({ date: sess, rows: [row] });
        }
        if (isIntraday) sessions = sessions.filter(s => s.rows.length >= MIN_POINTS);

        // Sisipkan pemisah antar sesi trading → garis putus di akhir pekan/gap (ala Stockbit)
        const data: any[] = [];
        let prevSession = '';
        for (const s of sessions) {
            if (prevSession) {
                data.push({ Date: prevSession + ' 23:59', Close: null as any, Volume: 0 });
            }
            data.push(...s.rows);
            prevSession = s.date;
        }

        const res = NextResponse.json({ success: true, data, source: 'yahoo', interval, lastPrice, quote: quoteInfo, pivots, prevDay });
        res.headers.set('Cache-Control', 'no-store, max-age=0');
        return res;
    } catch {
        const res = NextResponse.json({ success: true, data: [] });
        res.headers.set('Cache-Control', 'no-store, max-age=0');
        return res;
    }
}