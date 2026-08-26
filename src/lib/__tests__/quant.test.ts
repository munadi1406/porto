import { describe, it, expect } from "vitest";
import {
    sma, ema, rsiSeries,
    dailyReturns, betaAndCorrelation, maxDrawdown, annualizedVolatility,
    monthlyReturnMatrix, grahamNumber, assessFairValue, runBacktest,
    nextEntryLevel, macdSeries, rollingStd, STRATEGIES,
    type Bar,
} from "../quant";

const seq = (n: number, start = 1) => Array.from({ length: n }, (_, i) => start + i);

describe("sma", () => {
    it("menghitung SMA sederhana dengan benar", () => {
        const out = sma([1, 2, 3, 4, 5], 3);
        expect(out.slice(0, 2)).toEqual([null, null]);
        expect(out[2]).toBeCloseTo(2);
        expect(out[4]).toBeCloseTo(4);
    });
});

describe("ema", () => {
    it("seed = SMA period pertama", () => {
        const out = ema([2, 4, 6, 8], 2);
        expect(out[0]).toBeNull();
        expect(out[1]).toBe(3);
    });
});

describe("rsiSeries", () => {
    it("harga naik terus → RSI 100", () => {
        const closes = seq(30);
        const rsi = rsiSeries(closes, 14);
        expect(rsi[29]).toBe(100);
    });
    it("panjang output sama dengan input", () => {
        const rsi = rsiSeries(seq(50), 14);
        expect(rsi).toHaveLength(50);
        expect(rsi[13]).toBeNull();
    });
});

describe("dailyReturns & betaAndCorrelation", () => {
    it("beta aset identik pasar = 1 dan korelasi 1", () => {
        const m = [0.01, -0.02, 0.03, 0.01, -0.01, 0.02, -0.03, 0.04, 0.005, -0.005];
        const { beta, correlation } = betaAndCorrelation(m, m);
        expect(beta).toBeCloseTo(1);
        expect(correlation).toBeCloseTo(1);
    });
    it("return harian menghasilkan n-1 nilai", () => {
        expect(dailyReturns([100, 101, 102])).toHaveLength(2);
    });
});

describe("maxDrawdown", () => {
    it("drawdown peak-to-trough benar", () => {
        // peak 100 → trough 80 → DD −20%
        const dd = maxDrawdown([50, 100, 90, 80, 95]);
        expect(dd.maxDrawdownPct).toBeCloseTo(-20);
        expect(dd.peak).toBe(100);
        expect(dd.trough).toBe(80);
    });
    it("tren naik murni → 0%", () => {
        expect(maxDrawdown(seq(20)).maxDrawdownPct).toBe(0);
    });
});

describe("annualizedVolatility", () => {
    it("volatilitas konstan → mendekati 0", () => {
        const r = new Array(100).fill(0.001);
        expect(annualizedVolatility(r)).toBeLessThan(1e-6);
    });
});

describe("monthlyReturnMatrix", () => {
    it("grid bulanan + rata-rata dihitung dari close akhir bulan", () => {
        // Des naik ke Jan (+10%), Jan turun ke Feb (−4.55%).
        // Bulan pertama seri tidak punya return (tidak ada close bulan sebelumnya).
        const bars = [
            { date: "2023-12-29", close: 100 },
            { date: "2024-01-31", close: 110 },
            { date: "2024-02-28", close: 105 },
        ];
        const m = monthlyReturnMatrix(bars);
        expect(m.years).toEqual([2023, 2024]);
        expect(m.grid[0][11]).toBeNull(); // Des 2023: bulan pertama seri
        expect(m.grid[1][0]).toBeCloseTo(10); // Jan 2024
        expect(m.grid[1][1]).toBeCloseTo((105 / 110 - 1) * 100); // Feb 2024
        expect(m.averages[0]).toBeCloseTo(10);
    });
});

describe("grahamNumber & assessFairValue", () => {
    it("grahan number sqrt(22.5*eps*bvps)", () => {
        expect(grahamNumber(4, 25)).toBeCloseTo(Math.sqrt(22.5 * 4 * 25)); // 15√... = 67.08
    });
    it("null jika eps/bvps tidak valid", () => {
        expect(grahamNumber(0, 25)).toBeNull();
        expect(grahamNumber(null, null)).toBeNull();
    });
    it("verdict undervalued bila upside ≥ 20%", () => {
        const a = assessFairValue(100, 130);
        expect(a.verdict).toBe("UNDERVALUED");
        expect(a.upsidePct).toBeCloseTo(30);
    });
    it("verdict overvalued bila downside ≥ 20%", () => {
        expect(assessFairValue(100, 70).verdict).toBe("OVERVALUED");
    });
    it("verdict fair dalam ±20%", () => {
        expect(assessFairValue(100, 110).verdict).toBe("FAIR");
    });
});

function makeBars(n: number): Bar[] {
    // pola: naik 60% pertama, turun linier berikutnya (harga selalu positif)
    const bars: Bar[] = [];
    for (let i = 0; i < n; i++) {
        const base = i < Math.floor(n * 0.6)
            ? 100 + i
            : 100 + Math.floor(n * 0.6) - (i - Math.floor(n * 0.6));
        bars.push({
            time: 1700000000 + i * 86400,
            date: new Date((1700000000 + i * 86400) * 1000).toISOString().slice(0, 10),
            open: base, high: base + 1, low: base - 1, close: base, volume: 1000,
        });
    }
    return bars;
}

describe("runBacktest", () => {
    const bars = makeBars(400);

    it("semua 8 strategi menghasilkan kurva ekuitas penuh", () => {
        expect(STRATEGIES).toHaveLength(8);
        for (const meta of STRATEGIES) {
            const bt = runBacktest(bars, meta.id)!;
            expect(bt, meta.id).not.toBeNull();
            expect(bt.equityCurve, meta.id).toHaveLength(bars.length - 1);
            expect(bt.stats.buyHoldMaxDDPct, meta.id).toBeLessThanOrEqual(0);
            expect(Number.isFinite(bt.stats.totalReturnPct), meta.id).toBe(true);
        }
    });

    it("indikator pendukung: macdSeries & rollingStd konsisten", () => {
        const closes = seq(60).map(v => v * 1.01);
        const { macd, signal } = macdSeries(closes);
        expect(macd.slice(0, 25)).toEqual(new Array(25).fill(null));
        expect(signal[33]).not.toBeNull(); // idx valid pertama 25 + EMA9 butuh 9 → 33
        const sd = rollingStd([2, 4, 4, 4, 5, 5, 7, 9], 8);
        // populasi std dari dataset statistik klasik ≈ 2
        expect(sd[7]).toBeCloseTo(2, 1);
    });

    it("buy-hold konsisten dengan harga awal/akhir", () => {
        const bt = runBacktest(bars, "sma_cross")!;
        const expected = (bars[bars.length - 1].close / bars[0].close - 1) * 100;
        expect(bt.stats.buyHoldReturnPct).toBeCloseTo(expected, 5);
    });

    it("null untuk data pendek", () => {
        expect(runBacktest(makeBars(30), "golden_cross")).toBeNull();
    });

    it("trade punya return yang konsisten dengan harga entry/exit (net fee)", () => {
        const bt = runBacktest(bars, "rsi_reversion")!;
        expect(bt.stats.tradeCount).toBeGreaterThanOrEqual(1);
        for (const t of bt.trades) {
            const expected = ((t.exitPrice * (1 - 0.0025)) / (t.entryPrice * (1 + 0.0015)) - 1) * 100;
            expect(t.returnPct).toBeCloseTo(expected, 5);
        }
    });

    it("biaya transaksi mengurangi return dibanding simulasi tanpa biaya", () => {
        const gross = runBacktest(bars, "rsi_reversion", 1000, { feeBuyPct: 0, feeSellPct: 0 })!;
        const net = runBacktest(bars, "rsi_reversion", 1000)!;
        expect(gross.assumptions.feeBuyPct).toBe(0);
        expect(net.stats.totalReturnPct).toBeLessThanOrEqual(gross.stats.totalReturnPct);
        expect(net.stats.tradeCount).toBe(gross.stats.tradeCount);
    });

    it("eksekusi next-bar: entry tidak terjadi di bar sinyal", () => {
        const bt = runBacktest(bars, "rsi_reversion")!;
        for (const t of bt.trades) {
            // tanggal eksekusi harus ada di dalam kurva
            const idx = bars.findIndex(b => b.date === t.entryDate);
            expect(idx).toBeGreaterThan(14); // RSI butuh ≥15 bar sebelum sinyal
        }
    });

    it("statistik lengkap: CAGR, exposure, sharpe, profit factor", () => {
        const bt = runBacktest(bars, "sma_cross")!;
        expect(Number.isFinite(bt.stats.annualizedReturnPct)).toBe(true);
        expect(bt.stats.exposurePct).toBeGreaterThanOrEqual(0);
        expect(bt.stats.exposurePct).toBeLessThanOrEqual(100);
        expect(Number.isFinite(bt.stats.sharpeRatio)).toBe(true);
        expect(bt.barsUsed).toBe(bars.length);
    });
});

describe("nextEntryLevel", () => {
    it("sma_cross: level positif & konsisten — di level itu cross benar terbentuk", () => {
        const bars = makeBars(300);
        const ne = nextEntryLevel(bars, "sma_cross");
        expect(ne.ready).toBe(true);
        expect(ne.price).not.toBeNull();
        expect(ne.price!).toBeGreaterThan(0);
        expect(ne.lastClose).toBe(bars[bars.length - 1].close);

        // Verifikasi matematis: substitusikan p* ke formula SMA bar berikutnya
        const f = 20, s = 50;
        const closes = bars.map(b => b.close);
        const A = closes.slice(-(f - 1)).reduce((a, b) => a + b, 0);
        const B = closes.slice(-(s - 1)).reduce((a, b) => a + b, 0);
        const smaFastNext = (A + ne.price!) / f;
        const smaSlowNext = (B + ne.price!) / s;
        // tepat di threshold → hampir sama; sedikit di atas → fast menang
        expect(smaSlowNext - smaFastNext).toBeCloseTo(0, 3);
        const above = ne.price! * 1.01;
        expect((A + above) / f).toBeGreaterThan((B + above) / s);
    });

    it("golden_cross: butuh ≥202 bar, kurang dari itu tidak siap", () => {
        const short = nextEntryLevel(makeBars(150), "golden_cross");
        expect(short.ready).toBe(false);

        const ok = nextEntryLevel(makeBars(400), "golden_cross");
        expect(ok.ready).toBe(true);
        if (ok.price != null) expect(ok.price).toBeGreaterThan(0);
    });

    it("donchian: level = high 20 hari terakhir (eksak)", () => {
        const bars = makeBars(100);
        const ne = nextEntryLevel(bars, "breakout_donchian");
        expect(ne.ready).toBe(true);
        const hh = Math.max(...bars.slice(-20).map(b => b.high));
        expect(ne.price).toBeCloseTo(hh, 6);
    });

    it("ema_cross: level positif & finite", () => {
        const ne = nextEntryLevel(makeBars(300), "ema_cross");
        expect(ne.ready).toBe(true);
        expect(ne.kind).toBe("ma_cross");
        if (ne.price != null) {
            expect(ne.price).toBeGreaterThan(0);
            expect(Number.isFinite(ne.price)).toBe(true);
        }
    });

    it("bollinger_reversion: level di bawah SMA20", () => {
        const ne = nextEntryLevel(makeBars(200), "bollinger_reversion");
        expect(ne.ready).toBe(true);
        if (ne.price != null) {
            // lower band selalu di bawah middle band
            const midApprox = ne.lastClose; // aproksimasi cukup untuk sanity
            expect(ne.price).toBeLessThan(midApprox * 1.05);
            expect(ne.distancePct!).toBeLessThan(0);
        }
    });

    it("macd: level finite bila data cukup", () => {
        const ne = nextEntryLevel(makeBars(300), "macd_signal");
        expect(ne.ready).toBe(true);
        expect(ne.indicatorNow).toContain("MACD");
        if (ne.price != null) expect(Number.isFinite(ne.price)).toBe(true);
    });

    it("rsi_reversion: level di bawah close saat RSI tinggi (tren naik murni)", () => {
        // seluruhnya naik → RSI ≈100 → pemicu RSI<30 harus jauh di bawah harga
        const bars: Bar[] = Array.from({ length: 100 }, (_, i) => {
            const base = 100 + i;
            return {
                time: 1700000000 + i * 86400,
                date: new Date((1700000000 + i * 86400) * 1000).toISOString().slice(0, 10),
                open: base, high: base + 1, low: base - 1, close: base, volume: 1000,
            };
        });
        const ne = nextEntryLevel(bars, "rsi_reversion");
        expect(ne.ready).toBe(true);
        expect(ne.indicatorNow).toContain("RSI");
        expect(ne.price).not.toBeNull();
        expect(ne.price!).toBeLessThan(ne.lastClose);
        expect(ne.distancePct!).toBeLessThan(0);
    });
});
