import { NextRequest } from 'next/server';
import { fetchBars, rankStrategies } from '@/lib/backtestService';

// Cache memori 10 menit
const CACHE_TTL = 10 * 60 * 1000;
const memCache = new Map<string, { data: any; ts: number }>();

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const ticker = sp.get('ticker')?.replace('.JK', '')?.toUpperCase();
    const years = Math.min(Math.max(parseInt(sp.get('years') || '2'), 1), 10);

    if (!ticker) return Response.json({ success: false, error: 'ticker required' }, { status: 400 });

    const ck = `rank|${ticker}|${years}`;
    const hit = memCache.get(ck);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
        return Response.json({ success: true, data: hit.data, cached: true });
    }

    try {
        const bars = await fetchBars(ticker, years);
        if (bars.length < 210) {
            return Response.json({
                success: false,
                error: `Data historis ${bars.length} hari — minimal 210 hari agar golden cross (SMA200) valid`,
            }, { status: 404 });
        }

        const ranked = rankStrategies(bars);
        const payload = {
            ticker,
            years,
            barsUsed: bars.length,
            from: bars[0]?.date ?? "",
            to: bars[bars.length - 1]?.date ?? "",
            ranked,
            best: ranked[0] ?? null,
        };
        memCache.set(ck, { data: payload, ts: Date.now() });
        return Response.json({ success: true, data: payload });
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
