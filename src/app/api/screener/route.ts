import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getAllStocks } from '@/lib/screenerStockList';
import { isSharia } from '@/lib/shariaStocks';
import { runBacktest, STRATEGIES, type Bar, type StrategyId, type BacktestResult } from '@/lib/quant';

const SCREENER_STRATEGIES: StrategyId[] = [
    'golden_cross', 'sma_cross', 'ema_cross', 'macd_signal',
    'bollinger_breakout', 'bollinger_reversion', 'breakout_donchian', 'rsi_reversion'
];

interface StrategyScore {
    strategy: StrategyId;
    label: string;
    score: number;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    stats: any;
}

function calculateStrategyScore(s: any): number {
    const pfNorm = s.profitFactor == null ? 100 : Math.min(100, Math.max(0, (s.profitFactor / 3) * 100));
    const sharpeNorm = Math.min(100, Math.max(0, ((s.sharpeRatio + 1) / 3) * 100));
    const returnNorm = Math.min(100, Math.max(0, (s.totalReturnPct / 50) * 100 + 50));
    return Math.round(0.35 * s.winRatePct + 0.20 * pfNorm + 0.25 * sharpeNorm + 0.20 * returnNorm);
}

function getStrategySignal(bt: BacktestResult): 'BUY' | 'SELL' | 'NEUTRAL' {
    const s = bt.stats;
    if (s.totalReturnPct > 10 && s.winRatePct > 45) return 'BUY';
    if (s.totalReturnPct < -10 || s.maxDrawdownPct < -25) return 'SELL';
    return 'NEUTRAL';
}

function rankStrategiesFast(bars: Bar[]): { strategies: StrategyScore[]; composite: number; consensus: string } {
    const strategies: StrategyScore[] = [];
    let buyCount = 0;
    let sellCount = 0;

    for (const id of SCREENER_STRATEGIES) {
        const bt = runBacktest(bars, id);
        if (!bt) continue;
        const s = bt.stats;
        if (s.totalReturnPct == null || !Number.isFinite(s.totalReturnPct)) continue;

        const score = calculateStrategyScore(s);
        const signal = getStrategySignal(bt);
        const label = STRATEGIES.find(st => st.id === id)?.label || id;

        if (signal === 'BUY') buyCount++;
        if (signal === 'SELL') sellCount++;

        strategies.push({ strategy: id, label, score, signal, stats: s });
    }

    strategies.sort((a, b) => b.score - a.score);

    const topStrategies = strategies.slice(0, 3);
    const avgScore = topStrategies.length > 0
        ? Math.round(topStrategies.reduce((sum, s) => sum + s.score, 0) / topStrategies.length)
        : 0;

    const consensus = buyCount >= 4 ? 'STRONG_BUY' : buyCount >= 2 ? 'BUY' : sellCount >= 3 ? 'AVOID' : 'NEUTRAL';

    return { strategies, composite: avgScore, consensus };
}

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const YEARS = 5;
const BARS_MIN = 60;
const BATCH_SIZE = 5;

const EXCLUDED_TICKERS = ['FCA', 'SCMA', 'IBST'];

interface ScreenerResult {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    sharia: boolean;
    ma20: number;
    ma50: number;
    goldenCross: boolean;
    deathCross: boolean;
    nearGoldenCross: boolean;
    rsi: number;
    rsiOversold: boolean;
    rsiOverbought: boolean;
    volumeSurge: boolean;
    accumulation: boolean;
    distribution: boolean;
    adSignal: string;
    obvTrend: string;
    mfi: number;
    signal: string;
    score: number;
    keySupport: number;
    keyResistance: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    reason: string;
    accumulationPercent: number;
    netFlow: number;
    divergence: string;
    investorIndication: string;
    bestStrategy: string;
    bestStrategyScore: number;
    winRate: number;
    sharpe: number;
    maxDrawdown: number;
    totalReturn: number;
    tradeCount: number;
}

async function fetchBars(ticker: string): Promise<Bar[]> {
    const symbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`;
    const result: any = await yahooFinance.chart(symbol, {
        period1: new Date('2020-01-01'),
        period2: new Date(),
        interval: '1d' as any,
    });
    return ((result?.quotes ?? []) as any[])
        .filter((q: any) => q.date && typeof q.close === 'number' && q.close > 0)
        .map((q: any) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            date: new Date(q.date).toISOString().slice(0, 10),
            open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume ?? 0,
        }));
}

function calculateIndicators(data: any[]): Partial<ScreenerResult> {
    if (data.length < 50) return {};

    const closes = data.map((d: any) => d.close);
    const highs = data.map((d: any) => d.high);
    const lows = data.map((d: any) => d.low);
    const volumes = data.map((d: any) => d.volume || 0);

    const ma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const ma50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;

    const prevMA20 = closes.slice(-21, -1).reduce((a: number, b: number) => a + b, 0) / 20;
    const prevMA50 = closes.slice(-51, -1).reduce((a: number, b: number) => a + b, 0) / 50;
    const goldenCross = prevMA20 <= prevMA50 && ma20 > ma50;
    const deathCross = prevMA20 >= prevMA50 && ma20 < ma50;
    const nearGoldenCross = !goldenCross && !deathCross && Math.abs(ma20 - ma50) / ma50 < 0.01;

    const rsiSlice = closes.slice(-15);
    let gains = 0, losses = 0;
    for (let i = 1; i < rsiSlice.length; i++) {
        const diff = rsiSlice[i] - rsiSlice[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    const rs = (gains / 14) / (losses / 14 || 1);
    const rsi = Math.round(100 - (100 / (1 + rs)));
    const rsiOversold = rsi < 30;
    const rsiOverbought = rsi > 70;

    const avgVol = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const currentVol = volumes[volumes.length - 1];
    const volumeSurge = avgVol > 0 && currentVol > avgVol * 1.8;

    let obv = 0;
    const obvValues: number[] = [0];
    for (let i = 1; i < data.length; i++) {
        if (closes[i] > closes[i - 1]) obv += volumes[i];
        else if (closes[i] < closes[i - 1]) obv -= volumes[i];
        obvValues.push(obv);
    }
    const obvFirst = obvValues.slice(0, Math.floor(obvValues.length / 3)).reduce((a: number, b: number) => a + b, 0) / Math.floor(obvValues.length / 3) || 0;
    const obvLast = obvValues.slice(-Math.floor(obvValues.length / 3)).reduce((a: number, b: number) => a + b, 0) / Math.floor(obvValues.length / 3) || 0;
    const obvTrend = obvLast > obvFirst * 1.02 ? 'UP' : obvLast < obvFirst * 0.98 ? 'DOWN' : 'FLAT';

    const mfiSlice = data.slice(-15);
    let posFlow = 0, negFlow = 0;
    for (let i = 1; i < mfiSlice.length; i++) {
        const tp = (mfiSlice[i].high + mfiSlice[i].low + mfiSlice[i].close) / 3;
        const tpPrev = (mfiSlice[i - 1].high + mfiSlice[i - 1].low + mfiSlice[i - 1].close) / 3;
        const mf = tp * (mfiSlice[i].volume || 0);
        if (tp > tpPrev) posFlow += mf; else negFlow += mf;
    }
    const mfi = Math.round(100 - (100 / (1 + (negFlow > 0 ? posFlow / negFlow : 1))));

    const lastClose = closes[closes.length - 1];
    const priceAboveMA20 = lastClose > ma20;
    const priceAboveMA50 = lastClose > ma50;

    let adLine = 0;
    const adSlice = data.slice(-10);
    adSlice.forEach((d: any) => {
        if (d.high !== d.low) {
            adLine += ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low) * (d.volume || 0);
        }
    });
    const adTrend = adLine > 0;
    const obvUp = obvTrend === 'UP';
    const obvDown = obvTrend === 'DOWN';

    let netFlow = 0;
    const netFlowValues: number[] = [];
    data.slice(-20).forEach((d: any) => {
        if (d.high !== d.low) {
            const mfv = ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low);
            const rp = mfv * (d.volume || 0) * d.close;
            netFlow += rp;
            netFlowValues.push(netFlow);
        }
    });
    const netFlowAbs = Math.abs(netFlow);
    const maxFlow = netFlowValues.length > 0 ? Math.max(...netFlowValues.map(Math.abs), 1) : 1;
    const accumulationPercent = Math.min(100, Math.round((netFlow / maxFlow) * 50 + 50));

    const accumulation = (obvUp && adTrend) && rsi >= 30 && rsi < 65 && priceAboveMA20;
    const distribution = (obvDown && !adTrend) && rsi > 35 && rsi <= 70 && !priceAboveMA20;

    const priceSlice14 = closes.slice(-14);
    const priceUp14 = priceSlice14[priceSlice14.length - 1] > priceSlice14[0];
    const obvSlice14 = obvValues.slice(-14);
    const obvUp14 = obvSlice14[obvSlice14.length - 1] > obvSlice14[0];
    const priceDown14 = !priceUp14;
    const obvDown14 = !obvUp14;

    const bullishDivergence = priceDown14 && obvUp14 && adTrend;
    const bearishDivergence = priceUp14 && obvDown14 && !adTrend;

    let divergence: string;
    let investorIndication: string;
    if (bullishDivergence) {
        divergence = 'BULLISH_DIVERGENCE';
        investorIndication = 'Smart money accumulation. Price declining but volume flowing in.';
    } else if (bearishDivergence) {
        divergence = 'BEARISH_DIVERGENCE';
        investorIndication = 'Distribution. Price rising but volume declining.';
    } else if (volumeSurge && rsiOverbought && priceUp14) {
        divergence = 'RETAIL_FOMO';
        investorIndication = 'Retail FOMO. High volume + price spike + overbought.';
    } else if (volumeSurge && rsiOversold && priceDown14) {
        divergence = 'PANIC_SELLING';
        investorIndication = 'Panic selling. Volume surge + price drop + oversold.';
    } else if (accumulation) {
        divergence = 'STEADY_ACCUMULATION';
        investorIndication = 'Steady accumulation. Volume confirms uptrend.';
    } else if (distribution) {
        divergence = 'STEADY_DISTRIBUTION';
        investorIndication = 'Steady distribution. Volume confirms downtrend.';
    } else {
        divergence = 'NEUTRAL';
        investorIndication = 'No clear divergence pattern.';
    }

    const recentH = highs.slice(-20).reduce((a: number, b: number) => Math.max(a, b), 0);
    const recentL = lows.slice(-20).reduce((a: number, b: number) => Math.min(a, b), Infinity);
    const keySupport = Math.min(recentL, ma20);
    const keyResistance = Math.max(recentH, ma50);

    return {
        ma20, ma50, goldenCross, deathCross, nearGoldenCross,
        rsi, rsiOversold: rsi < 30, rsiOverbought: rsi > 70,
        volumeSurge,
        accumulation,
        distribution,
        adSignal: adTrend ? 'BULLISH' : 'BEARISH',
        obvTrend,
        mfi,
        divergence,
        investorIndication,
        accumulationPercent,
        netFlow: Math.round(netFlow),
        keySupport,
        keyResistance,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');
    const tickers = tickersParam ? tickersParam.split(',') : getAllStocks();

    if (tickers.length > 100) {
        return NextResponse.json({ error: 'Max 100 tickers per request' }, { status: 400 });
    }

    const filteredTickers = tickers.filter(t => {
        const base = t.replace('.JK', '');
        return !EXCLUDED_TICKERS.includes(base);
    });

    const results: ScreenerResult[] = [];
    const errors: string[] = [];

    for (let batchStart = 0; batchStart < filteredTickers.length; batchStart += BATCH_SIZE) {
        const batch = filteredTickers.slice(batchStart, batchStart + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
            batch.map(async (ticker) => {
                try {
                    const [quote, bars] = await Promise.all([
                        yahooFinance.quote(ticker).catch(() => null),
                        fetchBars(ticker).catch(() => [] as Bar[]),
                    ]);

                    if (!quote) {
                        return { error: true, ticker, reason: 'no quote' };
                    }
                    if (bars.length < BARS_MIN) {
                        return { error: true, ticker, reason: `only ${bars.length} bars` };
                    }

                    const price = quote.regularMarketPrice || 0;
                    const name = quote.shortName || quote.longName || ticker;
                    const change = quote.regularMarketChange || 0;
                    const changePercent = quote.regularMarketChangePercent || 0;
                    const lastClose = Math.round(price);

                    const indicators = calculateIndicators(bars);

                    const { strategies, composite, consensus } = rankStrategiesFast(bars);
                    const best = strategies[0] || null;

                    const score = composite;
                    const signal = consensus === 'STRONG_BUY' ? 'BUY' : consensus === 'BUY' ? 'BUY' : consensus === 'AVOID' ? 'SELL' : 'NEUTRAL';

                    const ind = indicators as any;
                    const keyS = ind.keySupport || Math.round(price * 0.95);
                    const keyR = ind.keyResistance || Math.round(price * 1.05);
                    const isSell = signal === 'SELL';

                    const topStrategies = strategies.slice(0, 3).map(s => {
                        const name = s.label.replace(/\(.*\)/, '').trim();
                        return `${name}(${s.signal === 'BUY' ? '+' : s.signal === 'SELL' ? '-' : '0'}${s.score})`;
                    }).join(', ');

                    const strategyReason = best
                        ? `${topStrategies}`
                        : 'No clear edge';
                    const technicalReasons = [
                        ind.goldenCross ? 'Golden Cross' : '',
                        ind.deathCross ? 'Death Cross' : '',
                        ind.rsiOversold ? `RSI ${ind.rsi} oversold` : ind.rsiOverbought ? `RSI ${ind.rsi} overbought` : '',
                        ind.volumeSurge ? 'Volume surge' : '',
                        ind.accumulation ? 'Accumulation' : '',
                    ].filter(Boolean).join(', ');
                    const reasons = `${strategyReason}${technicalReasons ? ' | ' + technicalReasons : ''}`;

                    const baseTicker = ticker.replace('.JK', '');
                    return {
                        error: false,
                        ticker,
                        data: {
                            ticker: baseTicker,
                            name,
                            price,
                            change,
                            changePercent,
                            sharia: isSharia(baseTicker),
                            ...indicators,
                            signal,
                            score,
                            entryPrice: lastClose,
                            stopLoss: isSell ? Math.round(keyR * 1.03) : Math.round(keyS * 0.95),
                            takeProfit: isSell ? Math.round(keyS * 0.95) : Math.round(keyR * 0.97),
                            reason: reasons || 'Mixed signals',
                            bestStrategy: best?.label || '-',
                            bestStrategyScore: best ? best.score : 0,
                            consensus,
                            buySignals: strategies.filter(s => s.signal === 'BUY').length,
                            sellSignals: strategies.filter(s => s.signal === 'SELL').length,
                            winRate: best ? Math.round(best.stats.winRatePct) : 0,
                            sharpe: best ? +best.stats.sharpeRatio.toFixed(2) : 0,
                            maxDrawdown: best ? +best.stats.maxDrawdownPct.toFixed(1) : 0,
                            totalReturn: best ? +best.stats.totalReturnPct.toFixed(1) : 0,
                            tradeCount: best ? best.stats.tradeCount : 0,
                        } as ScreenerResult,
                    };
                } catch (e: any) {
                    return { error: true, ticker, reason: e.message?.slice(0, 50) || 'exception' };
                }
            })
        );

        for (let i = 0; i < batchResults.length; i++) {
            const r = batchResults[i];
            if (r.status === 'fulfilled') {
                const val = r.value as any;
                if (val.error) {
                    errors.push(val.ticker + (val.reason ? ` (${val.reason})` : ''));
                } else {
                    results.push(val.data as ScreenerResult);
                }
            } else {
                errors.push(batch[i]);
            }
        }

        if (batchStart + BATCH_SIZE < tickers.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    const errorReasons: Record<string, number> = {};
    for (const e of errors) {
        const reason = e.includes('(') ? e.match(/\(([^)]+)\)/)?.[1] || 'unknown' : 'unknown';
        errorReasons[reason] = (errorReasons[reason] || 0) + 1;
    }

    return NextResponse.json({
        success: true,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        errorSummary: errorReasons,
        total: results.length,
    });
}
