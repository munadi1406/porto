import { describe, it, expect } from "vitest";
import { detectChartDrawings, detectChartMarkers, type OHLCBar } from "../patternDetection";

function makeData(closes: number[]): OHLCBar[] {
    const base = Math.floor(Date.now() / 1000) - closes.length * 86400;
    return closes.map((c, i) => ({
        time: base + i * 86400,
        open: c - 1,
        high: c + 1.5,
        low: c - 1.5,
        close: c,
        volume: 1000,
    })) as OHLCBar[];
}

describe("detectChartDrawings", () => {
    it("uptrend jelas → trendline-up dengan fill ke bawah", () => {
        const closes: number[] = [];
        for (let i = 0; i < 120; i++) closes.push(100 + i * 0.4 + Math.sin(i / 6) * 2);
        const d = detectChartDrawings(makeData(closes));
        const up = d.find(x => x.id === "trendline-up");
        expect(up).toBeDefined();
        expect(up!.fillDir).toBe("below");
        expect(up!.points?.length).toBe(2);
    });

    it("sideways range → zona S/R + support/resistance horizontal", () => {
        const closes: number[] = [];
        for (let i = 0; i < 150; i++) closes.push(100 + Math.sin(i / 5) * 4);
        const d = detectChartDrawings(makeData(closes));
        expect(d.some(x => x.id === "sr-zone" && x.type === "zone")).toBe(true);
        expect(d.some(x => x.id === "support")).toBe(true);
        expect(d.some(x => x.id === "resistance")).toBe(true);
    });

    it("data pendek (<20) → kosong", () => {
        expect(detectChartDrawings(makeData([100, 101, 102]))).toHaveLength(0);
    });

    it("semua harga level positif & konsisten (support < resistance)", () => {
        const closes: number[] = [];
        for (let i = 0; i < 150; i++) closes.push(100 + Math.sin(i / 5) * 4);
        const d = detectChartDrawings(makeData(closes));
        const sup = d.find(x => x.id === "support")?.price;
        const res = d.find(x => x.id === "resistance")?.price;
        if (sup != null && res != null) expect(sup).toBeLessThan(res);
    });
});

describe("detectChartMarkers", () => {
    it("sideways panjang → ada label pola (double top/bottom)", () => {
        const closes: number[] = [];
        for (let i = 0; i < 150; i++) closes.push(100 + Math.sin(i / 5) * 4);
        const m = detectChartMarkers(makeData(closes));
        expect(m.length).toBeGreaterThan(0);
        expect(m.every(x => ["DOUBLE TOP", "DOUBLE BOTTOM", "BREAKOUT", "BREAKDOWN", "BUY SIGNAL", "SELL SIGNAL"].includes(x.text))).toBe(true);
    });

    it("terurut waktu & dibatasi maksimal 8", () => {
        const closes: number[] = [];
        for (let i = 0; i < 150; i++) closes.push(100 + Math.sin(i / 5) * 4);
        const m = detectChartMarkers(makeData(closes));
        for (let i = 1; i < m.length; i++) expect(m[i].time).toBeGreaterThanOrEqual(m[i - 1].time);
        expect(m.length).toBeLessThanOrEqual(8);
    });
});
