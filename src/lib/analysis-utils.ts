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
            levels: {
                scalping: { buy: 0, target: 0, sl: 0 },
                dayTrade: { buy: 0, target: 0, sl: 0 },
                swing: { buy: 0, target: 0, sl: 0 }
            },
            predictions: [],
            advice: 'Need at least 50 points of data for accurate analysis.',
            maLines: { ma20: [], ma50: [] }
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

    let advice = `Price is ${latest.close > latestMA20 ? 'above' : 'below'} MA20. `;
    advice += `MACD is ${macd.histogram > 0 ? 'Positive' : 'Negative'}. `;

    return {
        recommendation: rec,
        patterns,
        markers,
        indicators: { rsi, ma20: latestMA20, ma50: latestMA50, macd, trend },
        levels: {
            scalping: { buy: latest.close * 0.995, target: latest.close * 1.015, sl: latest.close * 0.99 },
            dayTrade: { buy: latest.close * 0.985, target: latest.close * 1.04, sl: latest.close * 0.97 },
            swing: { buy: latest.close * 0.96, target: latest.close * 1.12, sl: latest.close * 0.93 }
        },
        predictions: generateMultiPredictions(latest, data, latestMA20),
        advice,
        maLines: { ma20: ma20Data, ma50: ma50Data }
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
