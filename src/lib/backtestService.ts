// Service backtest bersama: fetch bar historis + scoring semua strategi.
import YahooFinance from 'yahoo-finance2';
import {
    runBacktest, STRATEGIES, type Bar, type StrategyId, type BacktestResult,
} from './quant';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchBars(tickerNoJk: string, years: number): Promise<Bar[]> {
    const result: any = await yahooFinance.chart(`${tickerNoJk}.JK`, {
        period1: new Date(Date.now() - years * 365 * 86_400_000),
        interval: '1d' as any,
    });
    return ((result?.quotes ?? []) as any[])
        .filter((q: any) => q.date && typeof q.close === 'number')
        .map((q: any) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            date: new Date(q.date).toISOString().slice(0, 10),
            open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume ?? 0,
        }));
}

export interface RankedStrategy {
    strategy: StrategyId;
    label: string;
    description: string;
    stats: BacktestResult['stats'];
    tradeCount: number;
    barsUsed: number;
    /** Skor komposit 0-100 — makin tinggi makin baik secara probabilistik. */
    score: number;
    scoreParts: { winRate: number; profitFactor: number; sharpe: number };
    /** true bila jumlah trade terlalu sedikit untuk disimpulkan (<5). */
    lowSample: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Skor komposit probabilistik (0–100):
 *   45% win rate + 25% profit factor (dinormalisasi PF=3 → 100)
 * + 30% Sharpe (−1 → 0, 2 → 100).
 * Strategi dengan <5 trade diberi penalti sampel kecil (×0.6).
 */
export function scoreStrategy(bt: BacktestResult): number {
    const s = bt.stats;
    const pfNorm = s.profitFactor == null ? 100 : clamp((s.profitFactor / 3) * 100, 0, 100);
    const sharpeNorm = clamp(((s.sharpeRatio + 1) / 3) * 100, 0, 100);
    const raw = 0.45 * s.winRatePct + 0.25 * pfNorm + 0.30 * sharpeNorm;
    return raw * (s.tradeCount < 5 ? 0.6 : 1);
}

const clampN = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export function rankStrategies(bars: Bar[]): RankedStrategy[] {
    const out: RankedStrategy[] = [];
    for (const meta of STRATEGIES) {
        const bt = runBacktest(bars, meta.id);
        if (!bt) continue;
        const s = bt.stats;
        // Guard nilai NaN dari data jelek
        if (!clampN(s.totalReturnPct)) continue;
        out.push({
            strategy: meta.id,
            label: meta.label,
            description: meta.description,
            stats: s,
            tradeCount: s.tradeCount,
            barsUsed: bt.barsUsed,
            score: scoreStrategy(bt),
            scoreParts: {
                winRate: s.winRatePct,
                profitFactor: s.profitFactor == null ? 100 : clamp((s.profitFactor / 3) * 100, 0, 100),
                sharpe: clamp(((s.sharpeRatio + 1) / 3) * 100, 0, 100),
            },
            lowSample: s.tradeCount < 5,
        });
    }
    return out.sort((a, b) => b.score - a.score);
}
