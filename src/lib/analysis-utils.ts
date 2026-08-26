export interface OHLCData {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface PredictionMethod {
    name: string;
    description: string;
    data: { time: number; value: number }[];
}

export interface VolumeAnalysis {
    signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    score: number;
    adLine: number;
    obvTrend: 'UP' | 'DOWN' | 'FLAT';
    mfi: number;
    mfioverbought: boolean;
    mfioversold: boolean;
    volumeSurge: boolean;
    keySupport: number;
    keyResistance: number;
}

export interface AnalysisResult {
    recommendation: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
    patterns: string[];
    markers: {
        time: string | number;
        position: 'aboveBar' | 'belowBar' | 'inBar';
        color: string;
        shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
        text: string;
    }[];
    indicators: {
        rsi: number;
        ma20: number;
        ma50: number;
        macd: {
            value: number;
            signal: number;
            histogram: number;
        };
        trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    };
    volume: VolumeAnalysis;
    levels: {
        scalping: { buy: number; target: number; sl: number };
        dayTrade: { buy: number; target: number; sl: number };
        swing: { buy: number; target: number; sl: number };
    };
    predictions: PredictionMethod[];
    advice: string;
    maLines: {
        ma20: { time: string | number; value: number }[];
        ma50: { time: string | number; value: number }[];
    };
    series: {
        rsi: number[];
        macd: number[];
        macdSignal: number[];
        macdHist: number[];
        bbUpper: number[];
        bbMiddle: number[];
        bbLower: number[];
        stochK: number[];
        stochD: number[];
        volume: number[];
    };
}

export function analyzeCandlesticks(data: OHLCData[]): AnalysisResult {
    const markers: AnalysisResult['markers'] = [];
    const patterns: string[] = [];

    if (data.length < 50) {
        return {
            recommendation: 'HOLD',
            patterns: [],
            markers: [],
            indicators: { rsi: 50, ma20: 0, ma50: 0, macd: { value: 0, signal: 0, histogram: 0 }, trend: 'SIDEWAYS' },
            volume: { signal: 'NEUTRAL', score: 0, adLine: 0, obvTrend: 'FLAT', mfi: 50, mfioverbought: false, mfioversold: false, volumeSurge: false, keySupport: 0, keyResistance: 0 },
            levels: {
                scalping: { buy: 0, target: 0, sl: 0 },
                dayTrade: { buy: 0, target: 0, sl: 0 },
                swing: { buy: 0, target: 0, sl: 0 }
            },
            predictions: [],
            advice: 'Need at least 50 points of data for accurate analysis.',
            maLines: { ma20: [], ma50: [] },
            series: {
                rsi: [], macd: [], macdSignal: [], macdHist: [], bbUpper: [], bbMiddle: [], bbLower: [], stochK: [], stochD: [], volume: []
            }
        };
    }

    // Pattern Recognition
    for (let i = Math.max(2, data.length - 60); i < data.length; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        const bodySize = Math.abs(curr.close - curr.open);
        const upperWick = curr.high - Math.max(curr.open, curr.close);
        const lowerWick = Math.min(curr.open, curr.close) - curr.low;

        if ((lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) ||
            (curr.close > curr.open && prev.close < prev.open && curr.open <= prev.close && curr.close >= prev.open)) {
            markers.push({ time: curr.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'BULLISH REV' });
            if (i === data.length - 1) patterns.push('Bullish Reversal');
        }

        if ((upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) ||
            (curr.close < curr.open && prev.close > prev.open && curr.open >= prev.close && curr.close <= prev.open)) {
            markers.push({ time: curr.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'BEARISH REV' });
            if (i === data.length - 1) patterns.push('Bearish Reversal');
        }

        if (bodySize < (curr.high - curr.low) * 0.1) {
            markers.push({ time: curr.time, position: 'inBar', color: '#9ca3af', shape: 'circle', text: 'DOJI' });
        }
    }

    const ma20Data = calculateMALine(data, 20);
    const ma50Data = calculateMALine(data, 50);
    const latestMA20 = ma20Data.length > 0 ? ma20Data[ma20Data.length - 1].value : 0;
    const latestMA50 = ma50Data.length > 0 ? ma50Data[ma50Data.length - 1].value : 0;
    const rsi = calculateRSI(data, 14);

    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdValue = ema12 - ema26;
    const signalLine = macdValue * 0.8;
    const macd = { value: macdValue, signal: signalLine, histogram: macdValue - signalLine };

    const trend = latestMA20 > latestMA50 ? 'UP' : 'DOWN';
    const latest = data[data.length - 1];

    let score = 0;
    if (macd.histogram > 0) score += 1;
    if (trend === 'UP') score += 1;
    if (latest.close > latestMA20) score += 1;
    if (rsi < 35) score += 1;
    if (rsi > 70) score -= 2;

    let rec: AnalysisResult['recommendation'] = 'HOLD';
    if (score >= 3) rec = 'STRONG_BUY';
    else if (score >= 1) rec = 'BUY';
    else if (score <= -2) rec = 'SELL';

    // Volume Analysis
    const vAnalysis = calculateVolumeAnalysis(data);

    let advice = `Price is ${latest.close > latestMA20 ? 'above' : 'below'} MA20. `;
    advice += `MACD is ${macd.histogram > 0 ? 'Positive' : 'Negative'}. `;
    advice += `Volume: ${vAnalysis.signal === 'ACCUMULATION' ? 'Accumulation detected' : vAnalysis.signal === 'DISTRIBUTION' ? 'Distribution detected' : 'Neutral'}. `;
    if (vAnalysis.volumeSurge) advice += 'Volume surge detected. ';
    if (vAnalysis.score > 0) score += 1;
    if (vAnalysis.score < 0) score -= 1;

    // Recalculate recommendation with volume
    if (score >= 3) rec = 'STRONG_BUY';
    else if (score >= 1) rec = 'BUY';
    else if (score <= -2) rec = 'SELL';

    const closes = data.map((d) => d.close);
    const rsiSeriesArr = rsiSeries(closes, 14);
    const macdCalc = macdSeries(closes, 12, 26, 9);
    const boll = bollingerSeries(closes, 20, 2);
    const stoch = stochasticSeries(data, 14, 3);
    const volSeries = data.map((d) => d.volume || 0);

    return {
        recommendation: rec,
        patterns,
        markers,
        indicators: { rsi, ma20: latestMA20, ma50: latestMA50, macd, trend },
        volume: vAnalysis,
        levels: {
            scalping: { buy: latest.close * 0.995, target: latest.close * 1.015, sl: latest.close * 0.99 },
            dayTrade: { buy: latest.close * 0.985, target: latest.close * 1.04, sl: latest.close * 0.97 },
            swing: { buy: latest.close * 0.96, target: latest.close * 1.12, sl: latest.close * 0.93 }
        },
        predictions: generateMultiPredictions(latest, data, latestMA20),
        advice,
        maLines: { ma20: ma20Data, ma50: ma50Data },
        series: {
            rsi: rsiSeriesArr,
            macd: macdCalc.macd,
            macdSignal: macdCalc.signal,
            macdHist: macdCalc.hist,
            bbUpper: boll.up,
            bbMiddle: boll.mid,
            bbLower: boll.low,
            stochK: stoch.k,
            stochD: stoch.d,
            volume: volSeries
        }
    };
}

function calculateMALine(data: OHLCData[], period: number) {
    const maLine = [];
    if (data.length < period) return [];
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const avg = slice.reduce((a, b) => a + b.close, 0) / period;
        maLine.push({ time: data[i].time, value: avg });
    }
    return maLine;
}

function calculateEMA(data: OHLCData[], period: number) {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b.close, 0) / period;
}

function calculateRSI(data: OHLCData[], period: number): number {
    const slice = data.slice(-period - 1);
    if (slice.length < period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i < slice.length; i++) {
        const diff = slice[i].close - slice[i - 1].close;
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    const rs = (gains / period) / (losses / period || 1);
    return 100 - (100 / (1 + rs));
}

function calculateVolumeAnalysis(data: OHLCData[]): VolumeAnalysis {
    if (data.length < 20) {
        return { signal: 'NEUTRAL', score: 0, adLine: 0, obvTrend: 'FLAT', mfi: 50, mfioverbought: false, mfioversold: false, volumeSurge: false, keySupport: 0, keyResistance: 0 };
    }

    // Chaikin A/D Line
    let adLine = 0;
    const adValues: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d.high === d.low) continue;
        const mfv = ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low) * (d.volume || 0);
        adLine += mfv;
        adValues.push(adLine);
    }

    // OBV
    let obv = 0;
    const obvValues: number[] = [0];
    for (let i = 1; i < data.length; i++) {
        if (data[i].close > data[i - 1].close) obv += (data[i].volume || 0);
        else if (data[i].close < data[i - 1].close) obv -= (data[i].volume || 0);
        obvValues.push(obv);
    }

    // OBV Trend: compare first vs last third
    const obvFirstThird = obvValues.length > 3 ? obvValues.slice(0, Math.floor(obvValues.length / 3)) : obvValues;
    const obvLastThird = obvValues.length > 3 ? obvValues.slice(-Math.floor(obvValues.length / 3)) : obvValues;
    const obvEarly = obvFirstThird.reduce((a, b) => a + b, 0) / obvFirstThird.length;
    const obvLate = obvLastThird.reduce((a, b) => a + b, 0) / obvLastThird.length;
    const obvTrend: 'UP' | 'DOWN' | 'FLAT' = obvLate > obvEarly * 1.02 ? 'UP' : obvLate < obvEarly * 0.98 ? 'DOWN' : 'FLAT';

    // MFI (Money Flow Index) — 14-period
    const mfiPeriod = 14;
    const mfiData = data.slice(-mfiPeriod - 1);
    let positiveFlow = 0, negativeFlow = 0;
    for (let i = 1; i < mfiData.length; i++) {
        const tp = (mfiData[i].high + mfiData[i].low + mfiData[i].close) / 3;
        const tpPrev = (mfiData[i - 1].high + mfiData[i - 1].low + mfiData[i - 1].close) / 3;
        const mf = tp * (mfiData[i].volume || 0);
        if (tp > tpPrev) positiveFlow += mf; else negativeFlow += mf;
    }
    const mfRatio = negativeFlow > 0 ? positiveFlow / negativeFlow : 1;
    const mfi = 100 - (100 / (1 + mfRatio));

    // Volume Surge: current volume vs 20-day average
    const recentVolumes = data.slice(-20).map(d => d.volume || 0);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = data[data.length - 1].volume || 0;
    const volumeSurge = avgVolume > 0 && currentVolume > avgVolume * 1.8;

    // Volume Profile: find key price levels with highest volume
    const priceBuckets = new Map<number, number>();
    const bucketSize = Math.max(1, Math.round((data[data.length - 1].high - data[data.length - 1].low) / 5));
    data.slice(-30).forEach(d => {
        const bucket = Math.round(d.close / bucketSize) * bucketSize;
        priceBuckets.set(bucket, (priceBuckets.get(bucket) || 0) + (d.volume || 0));
    });
    const sortedBuckets = Array.from(priceBuckets.entries()).sort((a, b) => b[1] - a[1]);
    const keySupport = sortedBuckets.length > 1 ? sortedBuckets[1][0] : data[data.length - 1].low;
    const keyResistance = sortedBuckets.length > 0 ? sortedBuckets[0][0] : data[data.length - 1].high;

    // Overall signal
    const adTrend = adValues.length > 2
        ? adValues.slice(-3).reduce((a, b) => a + b, 0) / 3 > adValues.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
        : false;

    const lastPrice = data[data.length - 1].close;
    const priceAboveMA20 = data.length > 20 && lastPrice > data.slice(-20).reduce((a, b) => a + b.close, 0) / 20;

    let score = 0;
    if (adTrend && obvTrend === 'UP') score += 35;
    else if (adTrend || obvTrend === 'UP') score += 15;
    if (!adTrend && obvTrend === 'DOWN') score -= 35;
    else if (!adTrend || obvTrend === 'DOWN') score -= 15;
    if (mfi < 30) score += 10;
    else if (mfi > 70) score -= 10;
    if (volumeSurge && obvTrend === 'UP') score += 15;
    else if (volumeSurge && obvTrend === 'DOWN') score -= 15;
    if (priceAboveMA20) score += 10;
    else score -= 10;

    const signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' =
        score >= 20 ? 'ACCUMULATION' : score <= -20 ? 'DISTRIBUTION' : 'NEUTRAL';

    return {
        signal,
        score,
        adLine,
        obvTrend,
        mfi: Math.round(mfi),
        mfioverbought: mfi > 70,
        mfioversold: mfi < 30,
        volumeSurge,
        keySupport,
        keyResistance,
    };
}

function generateMultiPredictions(latest: OHLCData, data: OHLCData[], ma20: number): PredictionMethod[] {
    const lastUnix = typeof latest.time === 'number' ? latest.time : Math.floor(new Date(latest.time).getTime() / 1000);
    const daySec = 86400;

    // 1. Momentum Decay (Default)
    const momentum = (latest.close - data[data.length - 10].close) / 10;
    const momentumData = [];
    let priceM = latest.close;
    for (let i = 1; i <= 5; i++) {
        priceM += momentum * (1 - (i * 0.1));
        momentumData.push({ time: lastUnix + (i * daySec), value: priceM });
    }

    // 2. Linear Regression (Statistical Best Fit)
    const regressionData = [];
    const n = 20; // Lookback 20 days
    const slice = data.slice(-n);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += slice[i].close;
        sumXY += i * slice[i].close;
        sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    for (let i = 1; i <= 5; i++) {
        regressionData.push({ time: lastUnix + (i * daySec), value: intercept + slope * (n + i) });
    }

    // 3. MA Mean Reversion (Pull towards Moving Average)
    const reversionData = [];
    let priceR = latest.close;
    const gap = ma20 - latest.close;
    for (let i = 1; i <= 5; i++) {
        priceR += (gap / 10); // Slowly pull 10% of gap per day
        reversionData.push({ time: lastUnix + (i * daySec), value: priceR });
    }

    return [
        {
            name: "Neural Momentum",
            description: "Menghitung kecepatan tren 10 hari terakhir dengan efek perlambatan berkala, cocok untuk tren jangka pendek.",
            data: momentumData
        },
        {
            name: "Linear Regression",
            description: "Menggunakan garis statistik 'best-fit' dari 20 hari terakhir untuk melihat arah logis pergerakan harga.",
            data: regressionData
        },
        {
            name: "Mean Reversion",
            description: "Memprediksi harga akan kembali mendekati garis rata-rata (MA20) jika harga sudah naik/turun terlalu jauh.",
            data: reversionData
        }
    ];
}

function emaSeries(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const out: number[] = [];
    let prev = values[0] ?? 0;
    for (let i = 0; i < values.length; i++) {
        prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
        out.push(prev);
    }
    return out;
}

function rsiSeries(closes: number[], period = 14): number[] {
    const out = new Array(closes.length).fill(50);
    if (closes.length <= period) return out;
    let gainSum = 0, lossSum = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0) gainSum += d; else lossSum -= d;
    }
    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        const g = d > 0 ? d : 0;
        const l = d < 0 ? -d : 0;
        avgGain = (avgGain * (period - 1) + g) / period;
        avgLoss = (avgLoss * (period - 1) + l) / period;
        out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
    }
    return out;
}

function macdSeries(closes: number[], fast = 12, slow = 26, signalP = 9) {
    const emaFast = emaSeries(closes, fast);
    const emaSlow = emaSeries(closes, slow);
    const macd = closes.map((_, i) => emaFast[i] - emaSlow[i]);
    const signal = emaSeries(macd, signalP);
    const hist = macd.map((m, i) => m - signal[i]);
    return { macd, signal, hist };
}

function bollingerSeries(closes: number[], period = 20, mult = 2) {
    const mid: number[] = [];
    const up: number[] = [];
    const low: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            mid.push(closes[i]);
            up.push(closes[i]);
            low.push(closes[i]);
            continue;
        }
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
        const sd = Math.sqrt(variance);
        mid.push(mean);
        up.push(mean + mult * sd);
        low.push(mean - mult * sd);
    }
    return { mid, up, low };
}

function stochasticSeries(data: OHLCData[], kPeriod = 14, dPeriod = 3) {
    const k: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < kPeriod) {
            k.push(50);
            continue;
        }
        const slice = data.slice(i - kPeriod + 1, i + 1);
        const low = Math.min(...slice.map((d) => d.low));
        const high = Math.max(...slice.map((d) => d.high));
        k.push(high === low ? 50 : ((data[i].close - low) / (high - low)) * 100);
    }
    const d: number[] = [];
    for (let i = 0; i < k.length; i++) {
        if (i < dPeriod - 1) {
            d.push(k[i]);
            continue;
        }
        const slice = k.slice(i - dPeriod + 1, i + 1);
        d.push(slice.reduce((a, b) => a + b, 0) / dPeriod);
    }
    return { k, d };
}
