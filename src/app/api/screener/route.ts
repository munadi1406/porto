import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

import fs from 'fs';
import path from 'path';

function getAllStocks(): string[] {
    try {
        const jsonPath = path.join(process.cwd(), 'stocks-idx.json');
        if (!fs.existsSync(jsonPath)) return [];
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return (parsed.stocks || []).filter((t: string) => /^[A-Z]{2,4}\.JK$/.test(t));
    } catch {
        return [];
    }
}

interface ScreenerResult {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
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
}

function calculateIndicators(data: any[]): Partial<ScreenerResult> {
    if (data.length < 50) return {};

    const closes = data.map((d: any) => d.close);
    const highs = data.map((d: any) => d.high);
    const lows = data.map((d: any) => d.low);
    const volumes = data.map((d: any) => d.volume || 0);

    // MA20, MA50
    const ma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const ma50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;

    // Check golden cross / death cross
    const prevMA20 = closes.slice(-21, -1).reduce((a: number, b: number) => a + b, 0) / 20;
    const prevMA50 = closes.slice(-51, -1).reduce((a: number, b: number) => a + b, 0) / 50;
    const goldenCross = prevMA20 <= prevMA50 && ma20 > ma50;
    const deathCross = prevMA20 >= prevMA50 && ma20 < ma50;
    const nearGoldenCross = !goldenCross && !deathCross && Math.abs(ma20 - ma50) / ma50 < 0.01;

    // RSI 14
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

    // Volume Analysis
    const avgVol = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const currentVol = volumes[volumes.length - 1];
    const volumeSurge = avgVol > 0 && currentVol > avgVol * 1.8;

    // OBV Trend
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

    // MFI
    const mfiSlice = data.slice(-15);
    let posFlow = 0, negFlow = 0;
    for (let i = 1; i < mfiSlice.length; i++) {
        const tp = (mfiSlice[i].high + mfiSlice[i].low + mfiSlice[i].close) / 3;
        const tpPrev = (mfiSlice[i - 1].high + mfiSlice[i - 1].low + mfiSlice[i - 1].close) / 3;
        const mf = tp * (mfiSlice[i].volume || 0);
        if (tp > tpPrev) posFlow += mf; else negFlow += mf;
    }
    const mfi = Math.round(100 - (100 / (1 + (negFlow > 0 ? posFlow / negFlow : 1))));

    // Price trend context
    const lastClose = closes[closes.length - 1];
    const priceAboveMA20 = lastClose > ma20;
    const priceAboveMA50 = lastClose > ma50;

    // Chaikin A/D trend (10 days)
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

    // Accumulation estimation: net money flow in IDR + percentage
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
    const maxFlow = netFlowValues.length > 0
        ? Math.max(...netFlowValues.map(Math.abs), 1)
        : 1;
    const accumulationPercent = Math.min(100, Math.round((netFlow / maxFlow) * 50 + 50));

    // Accumulation: both OBV AND A/D must confirm + bullish context
    const accumulation = (obvUp && adTrend) && rsi >= 30 && rsi < 65 && priceAboveMA20;
    const strongAccumulation = accumulation && (volumeSurge || goldenCross);

    // Distribution: both OBV AND A/D must confirm + bearish context
    const distribution = (obvDown && !adTrend) && rsi > 35 && rsi <= 70 && !priceAboveMA20;
    const strongDistribution = distribution && (volumeSurge || deathCross);

    // Neutral accumulation/distribution (less confident - only one indicator confirms)
    const weakAccumulation = !accumulation && (obvUp || adTrend) && rsi < 60;
    const weakDistribution = !distribution && (obvDown || !adTrend) && rsi > 40;

    // Divergence patterns: price vs volume (14 days)
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
        investorIndication = 'Potential smart money accumulation. Price declining but volume flowing in.';
    } else if (bearishDivergence) {
        divergence = 'BEARISH_DIVERGENCE';
        investorIndication = 'Potential distribution. Price rising but volume declining.';
    } else if (volumeSurge && rsiOverbought && priceUp14) {
        divergence = 'RETAIL_FOMO';
        investorIndication = 'Potential retail FOMO. High volume + price spike + overbought.';
    } else if (volumeSurge && rsiOversold && priceDown14) {
        divergence = 'PANIC_SELLING';
        investorIndication = 'Potential panic selling. Volume surge + price drop + oversold.';
    } else if (accumulation) {
        divergence = 'STEADY_ACCUMULATION';
        investorIndication = 'Steady accumulation. Volume confirms uptrend.';
    } else if (distribution) {
        divergence = 'STEADY_DISTRIBUTION';
        investorIndication = 'Steady distribution. Volume confirms downtrend.';
    } else if (obvUp && !priceUp14) {
        divergence = 'EARLY_ACCUMULATION';
        investorIndication = 'Possible early accumulation. OBV rising ahead of price.';
    } else if (obvDown && !priceDown14) {
        divergence = 'EARLY_DISTRIBUTION';
        investorIndication = 'Possible early distribution. OBV declining ahead of price.';
    } else {
        divergence = 'NEUTRAL';
        investorIndication = 'No clear divergence pattern.';
    }

    // Composite score
    let score = 0;
    if (goldenCross) score += 25;
    if (deathCross) score -= 25;
    if (nearGoldenCross) score += 8;
    if (strongAccumulation) score += 35;
    else if (accumulation) score += 20;
    else if (weakAccumulation) score += 8;
    if (strongDistribution) score -= 35;
    else if (distribution) score -= 20;
    else if (weakDistribution) score -= 8;
    if (priceAboveMA20) score += 10;
    else score -= 10;
    if (rsi >= 30 && rsi <= 40) score += 10;
    else if (rsi > 70) score -= 10;
    if (mfi < 30) score += 10;
    else if (mfi > 70) score -= 10;
    if (volumeSurge && obvUp) score += 10;
    else if (volumeSurge && obvDown) score -= 10;
    if (obvUp && adTrend) score += 10;
    else if (obvDown && !adTrend) score -= 10;

    const signal = score >= 20 ? 'BUY' : score <= -20 ? 'SELL' : 'NEUTRAL';

    // Key support / resistance from recent price action
    const recentH = highs.slice(-20).reduce((a: number, b: number) => Math.max(a, b), 0);
    const recentL = lows.slice(-20).reduce((a: number, b: number) => Math.min(a, b), Infinity);
    const keySupport = Math.min(recentL, ma20);
    const keyResistance = Math.max(recentH, ma50);

    // Entry / SL / TP
    const entryPrice = Math.round(lastClose);
    const stopLoss = signal === 'SELL'
        ? Math.round(keyResistance * 1.03)
        : Math.round(keySupport * 0.95);
    const takeProfit = signal === 'SELL'
        ? Math.round(keySupport * 0.95)
        : Math.round(keyResistance * 0.97);

    // Generate reason
    const reasons: string[] = [];
    if (goldenCross) reasons.push('Golden Cross confirmed');
    if (deathCross) reasons.push('Death Cross confirmed');
    if (strongAccumulation) reasons.push('Strong accumulation (OBV↑ A/D↑ price↑)');
    else if (accumulation) reasons.push('Accumulation (OBV↑ A/D↑)');
    else if (weakAccumulation) reasons.push('Weak accumulation signals');
    if (strongDistribution) reasons.push('Strong distribution (OBV↓ A/D↓ price↓)');
    else if (distribution) reasons.push('Distribution (OBV↓ A/D↓)');
    else if (weakDistribution) reasons.push('Weak distribution signals');
    if (priceAboveMA20 && priceAboveMA50) reasons.push('Price above MA20 & MA50');
    if (!priceAboveMA20) reasons.push('Price below MA20');
    if (rsi >= 30 && rsi <= 40) reasons.push(`RSI ${rsi} near oversold`);
    else if (rsi < 30) reasons.push(`RSI ${rsi} oversold`);
    else if (rsi > 70) reasons.push(`RSI ${rsi} overbought`);
    if (mfi < 30) reasons.push(`MFI ${mfi} oversold`);
    else if (mfi > 70) reasons.push(`MFI ${mfi} overbought`);
    if (volumeSurge) reasons.push(`Volume ${obvUp ? 'surge + bullish' : 'surge + bearish'}`);
    if (reasons.length === 0) reasons.push('Mixed signals, no clear edge');
    const reason = reasons.join(' · ');

    return {
        ma20, ma50, goldenCross, deathCross, nearGoldenCross,
        rsi, rsiOversold: rsi < 30, rsiOverbought: rsi > 70,
        volumeSurge,
        accumulation: strongAccumulation || accumulation || weakAccumulation,
        distribution: strongDistribution || distribution || weakDistribution,
        adSignal: adTrend ? 'BULLISH' : 'BEARISH',
        obvTrend,
        mfi,
        signal,
        score,
        keySupport,
        keyResistance,
        entryPrice,
        stopLoss,
        takeProfit,
        reason,
        accumulationPercent,
        netFlow: Math.round(netFlow),
        divergence,
        investorIndication,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');
    const tickers = tickersParam ? tickersParam.split(',') : getAllStocks();

    if (tickers.length > 100) {
        return NextResponse.json({ error: 'Max 100 tickers per request' }, { status: 400 });
    }

    const results: ScreenerResult[] = [];
    const errors: string[] = [];

    const BATCH_SIZE = 5;
    for (let batchStart = 0; batchStart < tickers.length; batchStart += BATCH_SIZE) {
        const batch = tickers.slice(batchStart, batchStart + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
            batch.map(async (ticker) => {
                try {
                    const [quote, chartResult] = await Promise.all([
                        yahooFinance.quote(ticker).catch(() => null),
                        yahooFinance.chart(ticker, { period1: new Date('2025-01-01'), period2: new Date(), interval: '1d' }).catch(() => null),
                    ]);

                    const history = chartResult?.quotes || [];
                    if (!quote || history.length < 50) {
                        return { error: true, ticker };
                    }

                    const price = quote.regularMarketPrice || 0;
                    const name = quote.shortName || quote.longName || ticker;
                    const change = quote.regularMarketChange || 0;
                    const changePercent = quote.regularMarketChangePercent || 0;

                    const indicators = calculateIndicators(history);

                    // Use real quote price for entry/SL/TP
                    const realPrice = Math.round(price || 0);
                    const ind = indicators as any;
                    const keyS = ind.keySupport || Math.round(price * 0.95);
                    const keyR = ind.keyResistance || Math.round(price * 1.05);
                    const isSell = ind.signal === 'SELL';

                    return {
                        error: false,
                        ticker,
                        data: {
                            ticker: ticker.replace('.JK', ''),
                            name,
                            price,
                            change,
                            changePercent,
                            ...indicators,
                            entryPrice: realPrice,
                            stopLoss: isSell ? Math.round(keyR * 1.03) : Math.round(keyS * 0.95),
                            takeProfit: isSell ? Math.round(keyS * 0.95) : Math.round(keyR * 0.97),
                        } as ScreenerResult,
                    };
                } catch {
                    return { error: true, ticker };
                }
            })
        );

        for (let i = 0; i < batchResults.length; i++) {
            const r = batchResults[i];
            if (r.status === 'fulfilled') {
                const val = r.value as any;
                if (val.error) {
                    errors.push(val.ticker);
                } else {
                    results.push(val.data as ScreenerResult);
                }
            } else {
                errors.push(batch[i]);
            }
        }

        if (batchStart + BATCH_SIZE < tickers.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    return NextResponse.json({
        success: true,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        total: results.length,
    });
}
