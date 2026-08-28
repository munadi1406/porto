import { NextRequest } from 'next/server';
import { fetchBars } from '@/lib/backtestService';
import { runBacktest, nextEntryLevel, STRATEGIES, type StrategyId } from '@/lib/quant';

const VALID: StrategyId[] = ['golden_cross', 'sma_cross', 'ema_cross', 'macd_signal', 'bollinger_breakout', 'bollinger_reversion', 'breakout_donchian', 'rsi_reversion'];

// Cache memori 10 menit — hindari refetch Yahoo untuk kombinasi sama
const CACHE_TTL = 10 * 60 * 1000;
const memCache = new Map<string, { data: any; ts: number }>();

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const ticker = sp.get('ticker')?.replace('.JK', '')?.toUpperCase();
    const strategy = (sp.get('strategy') || 'golden_cross') as StrategyId;
    const rawYears = parseFloat(sp.get('years') || '2');
    const years = Math.min(Math.max(Number.isFinite(rawYears) ? rawYears : 2, 0.25), 10);

    if (!ticker) return Response.json({ success: false, error: 'ticker required' }, { status: 400 });
    if (!VALID.includes(strategy)) return Response.json({ success: false, error: 'strategi tidak dikenal' }, { status: 400 });

    const ck = `${ticker}|${strategy}|${years}`;
    const hit = memCache.get(ck);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
        return Response.json({ success: true, data: hit.data, cached: true });
    }

    try {
        const bars = await fetchBars(ticker, years);

        const bt = runBacktest(bars, strategy);
        if (!bt) return Response.json({ success: false, error: 'Data historis kurang dari 60 hari' }, { status: 404 });

        const meta = STRATEGIES.find(s => s.id === strategy)!;
        const payload = {
            ...bt,
            ticker,
            strategyLabel: meta.label,
            strategyDescription: meta.description,
            years,
            nextEntry: nextEntryLevel(bars, strategy),
        };
        memCache.set(ck, { data: payload, ts: Date.now() });
        return Response.json({ success: true, data: payload });
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
