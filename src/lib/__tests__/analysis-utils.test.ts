import { describe, it, expect } from 'vitest';
import { analyzeCandlesticks } from '@/lib/analysis-utils';
import type { OHLCData } from '@/lib/analysis-utils';

function makeCandles(count: number, startPrice = 100, step = 1): OHLCData[] {
    const out: OHLCData[] = [];
    let price = startPrice;
    for (let i = 0; i < count; i++) {
        const open = price;
        const close = price + step;
        const high = Math.max(open, close) + 0.5;
        const low = Math.min(open, close) - 0.5;
        out.push({ time: i, open, high, low, close, volume: 1000 + i });
        price = close;
    }
    return out;
}

describe('analyzeCandlesticks', () => {
    it('mengembalikan HOLD + saran jika data < 50 titik', () => {
        const result = analyzeCandlesticks(makeCandles(10));
        expect(result.recommendation).toBe('HOLD');
        expect(result.advice).toContain('at least 50');
        expect(result.predictions).toHaveLength(0);
    });

    it('menganalisis data >= 50 titik dan mengembalikan struktur lengkap', () => {
        const data = makeCandles(80);
        const result = analyzeCandlesticks(data);
        const recs = ['BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL'];
        expect(recs).toContain(result.recommendation);
        expect(result.indicators.rsi).toBeGreaterThanOrEqual(0);
        expect(result.indicators.rsi).toBeLessThanOrEqual(100);
        expect(result.indicators.ma20).toBeGreaterThan(0);
        expect(result.predictions).toHaveLength(3);
        expect(result.predictions.every((p) => p.data.length > 0)).toBe(true);
        expect(result.maLines.ma20.length).toBeGreaterThan(0);
        expect(result.maLines.ma50.length).toBeGreaterThan(0);
        expect(result.series.bbUpper.length).toBe(data.length);
        expect(result.series.rsi.length).toBe(data.length);
        expect(result.series.volume.length).toBe(data.length);
    });

    it('menghitung level trading berdasarkan harga terakhir', () => {
        const data = makeCandles(60);
        const result = analyzeCandlesticks(data);
        const lastClose = data[data.length - 1].close;
        expect(result.levels.scalping.buy).toBeCloseTo(lastClose * 0.995, 3);
        expect(result.levels.swing.sl).toBeCloseTo(lastClose * 0.93, 3);
    });

    it('data naik konsisten tidak menghasilkan SELL/STRONG_SELL', () => {
        const result = analyzeCandlesticks(makeCandles(80, 100, 1));
        expect(['SELL', 'STRONG_SELL']).not.toContain(result.recommendation);
    });
});