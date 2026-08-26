// Library kuantitatif bersama: indikator teknikal, metrik risiko,
// seasonality, backtesting, dan fair value.
// Semua fungsi pure — mudah di-unit-test.

export interface Bar {
    time: number; // unix seconds
    date?: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ─────────────────────────────────────────────────────────────
// Indikator dasar
// ─────────────────────────────────────────────────────────────

export function sma(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
    }
    return out;
}

export function ema(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

/** RSI versi Wilder. */
export function rsiSeries(closes: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gain += d; else loss -= d;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return out;
}

export function lastValue<T>(arr: T[]): T | undefined {
    return arr.length ? arr[arr.length - 1] : undefined;
}

/** Rolling standar deviasi populasi (untuk Bollinger). */
export function rollingStd(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    let sum = 0, sumSq = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i]; sumSq += values[i] ** 2;
        if (i >= period) {
            const old = values[i - period];
            sum -= old; sumSq -= old * old;
        }
        if (i >= period - 1) {
            const mean = sum / period;
            out[i] = Math.sqrt(Math.max(sumSq / period - mean * mean, 0));
        }
    }
    return out;
}

/** Max/min dari `period` bar SEBELUM indeks i (eksklusif — untuk Donchian). */
function rollingExtremePrev(highsOrLows: number[], period: number, mode: "max" | "min"): (number | null)[] {
    const out: (number | null)[] = new Array(highsOrLows.length).fill(null);
    for (let i = period; i < highsOrLows.length; i++) {
        let best = highsOrLows[i - 1];
        for (let j = i - period; j < i; j++) {
            const v = highsOrLows[j];
            if (mode === "max" ? v > best : v < best) best = v;
        }
        out[i] = best;
    }
    return out;
}

/** MACD line & signal line (EMA12 − EMA26, signal EMA9). Null sebelum data cukup. */
export function macdSeries(closes: number[]): { macd: (number | null)[]; signal: (number | null)[] } {
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    const macd: (number | null)[] = closes.map((_, i) =>
        e12[i] != null && e26[i] != null ? e12[i]! - e26[i]! : null
    );
    // EMA9 atas seri MACD yang valid
    const firstIdx = macd.findIndex(v => v != null);
    const signal: (number | null)[] = new Array(closes.length).fill(null);
    if (firstIdx >= 0) {
        const valid = macd.slice(firstIdx) as number[];
        const sigVals = ema(valid, 9);
        for (let i = 0; i < sigVals.length; i++) signal[firstIdx + i] = sigVals[i];
    }
    return { macd, signal };
}

// ─────────────────────────────────────────────────────────────
// Risiko: return, beta, korelasi, drawdown, volatilitas
// ─────────────────────────────────────────────────────────────

/** Return harian sederhana: r[i] = c[i]/c[i-1] − 1 */
export function dailyReturns(closes: number[]): number[] {
    const r: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i - 1] > 0) r.push(closes[i] / closes[i - 1] - 1);
    }
    return r;
}

/**
 * Beta & korelasi Pearson dari dua seri return harian yang SUDAH
 * sejajar per tanggal (panjang sama).
 */
export function betaAndCorrelation(
    assetReturns: number[],
    marketReturns: number[]
): { beta: number; correlation: number } {
    const n = Math.min(assetReturns.length, marketReturns.length);
    if (n < 10) return { beta: NaN, correlation: NaN };
    const a = assetReturns.slice(-n);
    const m = marketReturns.slice(-n);
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanM = m.reduce((s, v) => s + v, 0) / n;
    let cov = 0, varM = 0, varA = 0;
    for (let i = 0; i < n; i++) {
        const da = a[i] - meanA;
        const dm = m[i] - meanM;
        cov += da * dm;
        varM += dm * dm;
        varA += da * da;
    }
    const beta = varM > 0 ? cov / varM : NaN;
    const corr = varA > 0 && varM > 0 ? cov / Math.sqrt(varA * varM) : NaN;
    return { beta, correlation: corr };
}

/** Volatilitas tahunan (%) dari return harian. */
export function annualizedVolatility(returns: number[]): number {
    if (returns.length < 2) return NaN;
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export interface DrawdownResult {
    maxDrawdownPct: number;
    peak: number;
    trough: number;
    peakDate?: string;
    troughDate?: string;
}

/** Max drawdown dari seri harga (peak-to-trough terdalam). */
export function maxDrawdown(closes: number[], dates?: string[]): DrawdownResult {
    let peak = closes[0] ?? 0;
    let peakIdx = 0;
    let worstPct = 0, worstPeak = 0, worstTrough = 0, worstPeakIdx = 0, worstTroughIdx = 0;
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > peak) { peak = closes[i]; peakIdx = i; }
        const dd = peak > 0 ? closes[i] / peak - 1 : 0;
        if (dd < worstPct) {
            worstPct = dd;
            worstPeak = peak;
            worstTrough = closes[i];
            worstPeakIdx = peakIdx;
            worstTroughIdx = i;
        }
    }
    return {
        maxDrawdownPct: worstPct * 100,
        peak: worstPeak,
        trough: worstTrough,
        ...(dates ? { peakDate: dates[worstPeakIdx], troughDate: dates[worstTroughIdx] } : {}),
    };
}

// ─────────────────────────────────────────────────────────────
// Seasonality — matriks return bulanan
// ─────────────────────────────────────────────────────────────

export interface SeasonalityMatrix {
    years: number[];
    /** grid[yearIdx][monthIdx] = return % bulan itu (null jika tidak ada data) */
    grid: (number | null)[][];
    /** rata-rata return % per bulan kalender (Jan–Des) */
    averages: (number | null)[];
    positiveRate: number[]; // % tahun positif per bulan kalender
}

/** true jika `cur` tepat satu bulan setelah `prev` (aman lintas tahun). */
function isNextMonth(prev: string, cur: string): boolean {
    const py = parseInt(prev.slice(0, 4)), pm = parseInt(prev.slice(5, 7));
    const cy = parseInt(cur.slice(0, 4)), cm = parseInt(cur.slice(5, 7));
    return cy === py + (pm === 12 ? 1 : 0) && cm === (pm === 12 ? 1 : pm + 1);
}

export function monthlyReturnMatrix(bars: { date: string; close: number }[]): SeasonalityMatrix {
    // Ambil close terakhir tiap bulan
    const monthEnd = new Map<string, { ym: string; close: number }>();
    for (const b of bars) {
        if (!b.date || !(b.close > 0)) continue;
        const ym = b.date.slice(0, 7); // YYYY-MM
        monthEnd.set(ym, { ym, close: b.close });
    }
    const series = [...monthEnd.values()].sort((a, b) => a.ym.localeCompare(b.ym));

    const byYear = new Map<number, Map<number, number>>();
    let prevClose: number | null = null;
    let prevYm = "";
    for (const s of series) {
        const y = parseInt(s.ym.slice(0, 4));
        const m = parseInt(s.ym.slice(5, 7)) - 1;
        if (!byYear.has(y)) byYear.set(y, new Map());
        if (prevClose !== null && prevYm !== "" && isNextMonth(prevYm, s.ym)) {
            byYear.get(y)!.set(m, (s.close / prevClose - 1) * 100);
        }
        prevClose = s.close;
        prevYm = s.ym;
    }

    const years = [...byYear.keys()].sort((a, b) => a - b);
    const grid = years.map(y => {
        const row: (number | null)[] = [];
        for (let m = 0; m < 12; m++) row.push(byYear.get(y)!.get(m) ?? null);
        return row;
    });

    const averages: (number | null)[] = [];
    const positiveRate: number[] = [];
    for (let m = 0; m < 12; m++) {
        const vals = grid.map(row => row[m]).filter((v): v is number => v != null);
        if (vals.length === 0) { averages.push(null); positiveRate.push(NaN); continue; }
        averages.push(vals.reduce((s, v) => s + v, 0) / vals.length);
        positiveRate.push((vals.filter(v => v > 0).length / vals.length) * 100);
    }

    return { years, grid, averages, positiveRate };
}

// ─────────────────────────────────────────────────────────────
// Area beli berikutnya — level harga pemicu sinyal entry besok
// ─────────────────────────────────────────────────────────────

export interface NextEntryLevel {
    kind:
        | "ma_cross"        // SMA/EMA golden-cross
        | "macd"            // MACD di atas signal line
        | "band_breakout"   // tutup menembus upper band
        | "band_reversion"  // tutup jatuh di bawah lower band
        | "donchian"        // tutup menembus high 20 hari
        | "rsi_below";      // RSI turun <30
    /** Level harga pemicu (close bar berikutnya). Null jika tak dapat dihitung. */
    price: number | null;
    lastClose: number;
    /** Jarak harga sekarang ke level pemicu, % (negatif = perlu turun). */
    distancePct: number | null;
    /** Sudah memenuhi syarat data indikator? */
    ready: boolean;
    reason?: string;
    /** Snapshot kondisi indikator saat ini. */
    indicatorNow: string;
}

/**
 * Hitung harga close bar BERIKUTNYA yang tepat membuat sinyal entry terbentuk.
 * - SMA cross: selesaikan persamaan linear SMA_fast(i+1) > SMA_slow(i+1)
 *   → p* = (f·B − s·A)/(s − f), A/B = jumlah (period−1) close terakhir.
 * - RSI reversion: dari state Wilder terakhir, cari p agar 7·avgGain' < 3·avgLoss'
 *   → p* = c − (91·avgG − 39·avgL)/3.
 * Ini proyeksi matematis berbasis data saat ini — bukan jaminan sinyal.
 */
export function nextEntryLevel(bars: Bar[], strategy: StrategyId): NextEntryLevel {
    const closes = bars.map(b => b.close);
    const n = closes.length;
    const lastClose = closes[n - 1] ?? 0;

    if (strategy === "rsi_reversion") {
        const period = 14;
        if (n <= period + 1) {
            return { kind: "rsi_below", price: null, lastClose, distancePct: null, ready: false, reason: `Butuh ≥ ${period + 2} hari data`, indicatorNow: "-" };
        }
        // Replikasi state Wilder terakhir
        let avgG = 0, avgL = 0;
        for (let i = 1; i <= period; i++) {
            const d = closes[i] - closes[i - 1];
            if (d > 0) avgG += d; else avgL -= d;
        }
        avgG /= period; avgL /= period;
        for (let i = period + 1; i < n; i++) {
            const d = closes[i] - closes[i - 1];
            avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
            avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
        }
        const rsiNow = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
        // p* agar 7·avgG' = 3·avgL' dengan asumsi close berikutnya di bawah lastClose:
        // 7·(13/14)avgG < 3·((13/14)avgL + (c − p)/14)  ⇒  p < c − (91·avgG − 39·avgL)/3
        const threshold = lastClose - (91 * avgG - 39 * avgL) / 3;
        const price = threshold > 0 && Number.isFinite(threshold) ? threshold : null;
        return {
            kind: "rsi_below",
            price,
            lastClose,
            distancePct: price != null && lastClose > 0 ? ((price / lastClose - 1) * 100) : null,
            ready: true,
            ...(rsiNow <= 30 ? { reason: "RSI saat ini sudah <30 — area beli aktif sekarang" } : {}),
            indicatorNow: `RSI(14) ${rsiNow.toFixed(1)}`,
        };
    }

    // ── MA cross: SMA & EMA (golden_cross / sma_cross / ema_cross) ──
    if (strategy === "golden_cross" || strategy === "sma_cross" || strategy === "ema_cross") {
        const isEma = strategy === "ema_cross";
        const fastP = strategy === "sma_cross" ? 20 : isEma ? 9 : 50;
        const slowP = isEma ? 21 : strategy === "golden_cross" ? 200 : 50;
        const label = isEma ? "EMA" : "SMA";
        if (n < slowP + 2) {
            return {
                kind: "ma_cross", price: null, lastClose, distancePct: null,
                ready: false, reason: `Butuh ≥ ${slowP + 2} hari data untuk ${label}${slowP}`, indicatorNow: "-",
            };
        }

        let price: number | null = null;
        let fNow: number | null = null, sNow: number | null = null;

        if (!isEma) {
            // SMA linear terhadap close baru: p* = (f·B − s·A)/(s − f)
            const A = closes.slice(-(fastP - 1)).reduce((s, v) => s + v, 0);
            const B = closes.slice(-(slowP - 1)).reduce((s, v) => s + v, 0);
            const raw = (fastP * B - slowP * A) / (slowP - fastP);
            price = raw > 0 && Number.isFinite(raw) ? raw : null;
            fNow = sma(closes, fastP)[n - 1] ?? null;
            sNow = sma(closes, slowP)[n - 1] ?? null;
        } else {
            // EMA rekursif namun linear utk satu langkah: EMA'(p) = α·p + (1−α)·E_now
            const af = 2 / (fastP + 1), as = 2 / (slowP + 1);
            const ef = ema(closes, fastP)[n - 1] ?? null;
            const es = ema(closes, slowP)[n - 1] ?? null;
            fNow = ef; sNow = es;
            if (ef != null && es != null) {
                // af·p + (1−af)ef > as·p + (1−as)es ⇒ p* = ((1−as)es − (1−af)ef)/(af − as)
                const raw = ((1 - as) * es - (1 - af) * ef) / (af - as);
                price = raw > 0 && Number.isFinite(raw) ? raw : null;
            }
        }

        const above = fNow != null && sNow != null && fNow > sNow;
        return {
            kind: "ma_cross",
            price,
            lastClose,
            distancePct: price != null && lastClose > 0 ? ((price / lastClose - 1) * 100) : null,
            ready: true,
            ...(above ? { reason: `${label}${fastP} saat ini sudah di atas ${label}${slowP} — level relevan bila terjadi death cross lalu kembali naik` } : {}),
            indicatorNow: `${label}${fastP} ${(fNow ?? 0).toLocaleString("id-ID")} vs ${label}${slowP} ${(sNow ?? 0).toLocaleString("id-ID")}`,
        };
    }

    // ── MACD cross: cari p agar macd'(p) = signal'(p) ──
    // macd'(p) = a·p + b, a = α12−α26, b = (1−α12)E12 − (1−α26)E26
    // signal' = β·macd' + (1−β)·s, β=2/10 → syarat: a·p + b > s ⇒ p* = (s−b)/a
    if (strategy === "macd_signal") {
        if (n < 40) {
            return {
                kind: "macd", price: null, lastClose, distancePct: null,
                ready: false, reason: "Butuh ≥ 40 hari data untuk MACD", indicatorNow: "-",
            };
        }
        const a12 = 2 / 13, a26 = 2 / 27;
        const e12 = ema(closes, 12)[n - 1];
        const e26 = ema(closes, 26)[n - 1];
        const { macd, signal } = macdSeries(closes);
        const sigNow = signal[n - 1];
        if (e12 == null || e26 == null || sigNow == null) {
            return { kind: "macd", price: null, lastClose, distancePct: null, ready: false, reason: "Data MACD belum lengkap", indicatorNow: "-" };
        }
        const a = a12 - a26;
        const b = (1 - a12) * e12 - (1 - a26) * e26;
        const raw = (sigNow - b) / a;
        const price = Number.isFinite(raw) ? raw : null;
        const mNow = macd[n - 1] ?? null;
        const above = mNow != null && mNow > sigNow;
        return {
            kind: "macd",
            price,
            lastClose,
            distancePct: price != null && lastClose > 0 ? ((price / lastClose - 1) * 100) : null,
            ready: true,
            ...(above ? { reason: "MACD saat ini sudah di atas signal line — level relevan setelah terjadi cross turun" } : {}),
            indicatorNow: `MACD ${(mNow ?? 0).toFixed(2)} vs Signal ${sigNow.toFixed(2)}`,
        };
    }

    // ── Bollinger: band barikutnya ≈ mid'(p) ± 2σ (σ dibekukan) ──
    // breakout: p > (A19 + 40σ)/19 · reversion: p < (A19 − 40σ)/19
    if (strategy === "bollinger_breakout" || strategy === "bollinger_reversion") {
        if (n < 22) {
            return {
                kind: strategy === "bollinger_breakout" ? "band_breakout" : "band_reversion",
                price: null, lastClose, distancePct: null,
                ready: false, reason: "Butuh ≥ 22 hari data untuk Bollinger", indicatorNow: "-",
            };
        }
        const A19 = closes.slice(-19).reduce((s, v) => s + v, 0);
        const sd = rollingStd(closes, 20)[n - 1] ?? 0;
        const raw = strategy === "bollinger_breakout"
            ? (A19 + 40 * sd) / 19
            : (A19 - 40 * sd) / 19;
        const price = raw > 0 && Number.isFinite(raw) ? raw : null;
        const mid = sma(closes, 20)[n - 1] ?? null;
        return {
            kind: strategy === "bollinger_breakout" ? "band_breakout" : "band_reversion",
            price,
            lastClose,
            distancePct: price != null && lastClose > 0 ? ((price / lastClose - 1) * 100) : null,
            ready: true,
            ...(sd === 0 ? { reason: "Volatilitas nyaris nol — level kurang bermakna" } : {}),
            indicatorNow: `SMA20 ${(mid ?? 0).toLocaleString("id-ID")} · σ20 ${sd.toFixed(1)}`,
        };
    }

    // ── Donchian breakout: level = high tertinggi 20 bar terakhir (eksak) ──
    if (strategy === "breakout_donchian") {
        if (n < 21) {
            return {
                kind: "donchian", price: null, lastClose, distancePct: null,
                ready: false, reason: "Butuh ≥ 21 hari data untuk Donchian", indicatorNow: "-",
            };
        }
        const hh = Math.max(...bars.slice(-20).map(b => b.high));
        return {
            kind: "donchian",
            price: hh,
            lastClose,
            distancePct: lastClose > 0 ? ((hh / lastClose - 1) * 100) : null,
            ready: true,
            ...(lastClose > hh ? { reason: "Harga sekarang sudah di atas channel — tunggu low 10-hari ditembus untuk exit" } : {}),
            indicatorNow: `High 20-hari ${hh.toLocaleString("id-ID")}`,
        };
    }

    return {
        kind: "rsi_below", price: null, lastClose, distancePct: null,
        ready: false, reason: `Strategi ${strategy} belum didukung nextEntryLevel`, indicatorNow: "-",
    };
}

// ─────────────────────────────────────────────────────────────
// Fair value — Graham Number & asesmen margin of safety
// ─────────────────────────────────────────────────────────────

/** Graham Number = √(22.5 × EPS × BVPS). Null jika input tak valid. */
export function grahamNumber(eps: number | null, bvps: number | null): number | null {
    if (!eps || !bvps || eps <= 0 || bvps <= 0) return null;
    return Math.sqrt(22.5 * eps * bvps);
}

export type FairValueVerdict = "UNDERVALUED" | "FAIR" | "OVERVALUED" | "UNKNOWN";

export interface FairValueAssessment {
    fairValue: number | null;
    verdict: FairValueVerdict;
    upsidePct: number | null;
}

export function assessFairValue(price: number | null, fairValue: number | null): FairValueAssessment {
    if (!fairValue || !price || price <= 0) {
        return { fairValue: fairValue ?? null, verdict: "UNKNOWN", upsidePct: null };
    }
    const upside = (fairValue / price - 1) * 100;
    const verdict: FairValueVerdict = upside >= 20 ? "UNDERVALUED" : upside <= -20 ? "OVERVALUED" : "FAIR";
    return { fairValue, verdict, upsidePct: upside };
}

// ─────────────────────────────────────────────────────────────
// Backtest engine
// ─────────────────────────────────────────────────────────────

export type StrategyId =
    | "golden_cross"       // SMA 50/200
    | "sma_cross"          // SMA 20/50
    | "ema_cross"          // EMA 9/21
    | "macd_signal"        // MACD 12/26/9
    | "bollinger_breakout" // tutup > upper band
    | "bollinger_reversion"// tutup < lower band
    | "breakout_donchian"  // breakout 20-hari / exit channel bawah 10-hari
    | "rsi_reversion";     // RSI <30 / >70

export interface StrategyMeta {
    id: StrategyId;
    label: string;
    description: string;
}

export const STRATEGIES: StrategyMeta[] = [
    { id: "golden_cross", label: "Golden Cross (SMA 50/200)", description: "Beli saat SMA50 memotong ke atas SMA200, jual saat memotong ke bawah. Lambat tapi andal untuk tren besar." },
    { id: "sma_cross", label: "SMA Cross (20/50)", description: "Beli saat SMA20 di atas SMA50, jual saat di bawah. Menengah — lebih responsif dari golden cross." },
    { id: "ema_cross", label: "EMA Cross (9/21)", description: "Beli saat EMA9 memotong ke atas EMA21, jual saat sebaliknya. Cepat — cocok tren pendek, lebih banyak sinyal palsu." },
    { id: "macd_signal", label: "MACD Cross (12/26/9)", description: "Beli saat MACD memotong ke atas signal line, jual saat memotong ke bawah." },
    { id: "bollinger_breakout", label: "Bollinger Breakout (20, 2σ)", description: "Beli saat close menembus upper band (momen kuat), jual saat kembali ke middle band." },
    { id: "bollinger_reversion", label: "Bollinger Reversion (20, 2σ)", description: "Beli saat close jatuh di bawah lower band (oversold ekstrem), jual saat kembali ke middle band." },
    { id: "breakout_donchian", label: "Breakout Donchian (20/10)", description: "Gaya Turtle: beli saat close menembus high 20 hari, jual saat jatuh di bawah low 10 hari." },
    { id: "rsi_reversion", label: "RSI Reversion (30/70)", description: "Beli saat RSI < 30, jual saat RSI > 70. Membeli saat panik, menjual saat euforia." },
];

export interface BacktestTrade {
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    returnPct: number;
    days: number;
}

export interface BacktestOptions {
    /** Biaya beli dalam % (default 0.15 — komisi broker IDX). */
    feeBuyPct?: number;
    /** Biaya jual dalam % (default 0.25 — komisi + PPh final 0.1% + levy). */
    feeSellPct?: number;
    /**
     * true (default): sinyal di bar i dieksekusi di close bar i+1 —
     * realistis, tanpa look-ahead bias. false: eksekusi di close bar sinyal.
     */
    executeOnNextBar?: boolean;
}

export interface BacktestStats {
    totalReturnPct: number;
    buyHoldReturnPct: number;
    /** CAGR strategi berbasis jumlah bar (252 hari/bulan pasar per tahun). */
    annualizedReturnPct: number;
    winRatePct: number;
    tradeCount: number;
    avgDaysHeld: number;
    maxDrawdownPct: number;
    buyHoldMaxDDPct: number;
    /** % waktu modal berada di pasar (tidak flat cash). */
    exposurePct: number;
    /** Sharpe ratio anualisasi, risk-free 0. */
    sharpeRatio: number;
    /** Gross profit / gross loss dari semua trade tertutup; null jika tak ada loss. */
    profitFactor: number | null;
}

export interface BacktestResult {
    strategy: StrategyId;
    ticker: string;
    from: string;
    to: string;
    trades: BacktestTrade[];
    equityCurve: { date: string; strategy: number; buyHold: number }[];
    stats: BacktestStats;
    assumptions: Required<BacktestOptions>;
    /** Jumlah bar historis yang dipakai — penting utk validitas SMA200. */
    barsUsed: number;
}

function dateOf(bars: Bar[], i: number): string {
    if (bars[i].date) return bars[i].date!;
    return new Date(bars[i].time * 1000).toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function runBacktest(bars: Bar[], strategy: StrategyId, initialCapital = 1000, opts: BacktestOptions = {}): BacktestResult | null {
    if (bars.length < 60) return null;
    const feeBuy = (opts.feeBuyPct ?? 0.15) / 100;
    const feeSell = (opts.feeSellPct ?? 0.25) / 100;
    const nextBar = opts.executeOnNextBar ?? true;
    const closes = bars.map(b => b.close);
    const n = bars.length;

    // Pre-compute indikator per strategi
    let fast: (number | null)[] = [];
    let slow: (number | null)[] | null = null;
    let rsi14: (number | null)[] | null = null;
    let macdL: (number | null)[] | null = null, macdSig: (number | null)[] | null = null;
    let bbMid: (number | null)[] | null = null, bbUpper: (number | null)[] | null = null, bbLower: (number | null)[] | null = null;
    let hh20: (number | null)[] | null = null, ll10: (number | null)[] | null = null;

    switch (strategy) {
        case "golden_cross":
            fast = sma(closes, 50); slow = sma(closes, 200); break;
        case "sma_cross":
            fast = sma(closes, 20); slow = sma(closes, 50); break;
        case "ema_cross":
            fast = ema(closes, 9); slow = ema(closes, 21); break;
        case "macd_signal": {
            const m = macdSeries(closes);
            macdL = m.macd; macdSig = m.signal; break;
        }
        case "bollinger_breakout":
        case "bollinger_reversion": {
            const mid = sma(closes, 20);
            const sd = rollingStd(closes, 20);
            bbMid = mid;
            bbUpper = mid.map((m, i) => (m != null && sd[i] != null ? m + 2 * sd[i]! : null));
            bbLower = mid.map((m, i) => (m != null && sd[i] != null ? m - 2 * sd[i]! : null));
            break;
        }
        case "breakout_donchian":
            // entry: close > high maksimum 20 bar sebelumnya; exit: close < low minimum 10 bar sebelumnya
            hh20 = rollingExtremePrev(bars.map(b => b.high), 20, "max");
            ll10 = rollingExtremePrev(bars.map(b => b.low), 10, "min");
            break;
        case "rsi_reversion":
            rsi14 = rsiSeries(closes, 14); break;
    }

    const crossPairReady =
        strategy === "golden_cross" || strategy === "sma_cross" || strategy === "ema_cross";

    const entrySignal = (i: number): boolean => {
        switch (strategy) {
            case "rsi_reversion":
                return (rsi14![i] ?? 100) < 30;
            case "macd_signal": {
                const m = macdL![i], s = macdSig![i], mp = macdL![i - 1], sp = macdSig![i - 1];
                if (m == null || s == null || mp == null || sp == null) return false;
                return m > s && mp <= sp;
            }
            case "bollinger_breakout": {
                const u = bbUpper![i];
                return u != null && closes[i] > u && closes[i - 1] <= (bbUpper![i - 1] ?? Infinity);
            }
            case "bollinger_reversion": {
                const l = bbLower![i];
                return l != null && closes[i] < l;
            }
            case "breakout_donchian": {
                const h = hh20![i];
                return h != null && closes[i] > h;
            }
            default: {
                if (!crossPairReady) return false;
                const f = fast[i], s = slow![i];
                if (f == null || s == null || fast[i - 1] == null || slow![i - 1] == null) return false;
                return f > s && fast[i - 1]! <= slow![i - 1]!;
            }
        }
    };
    const exitSignal = (i: number): boolean => {
        switch (strategy) {
            case "rsi_reversion":
                return (rsi14![i] ?? 0) > 70;
            case "macd_signal": {
                const m = macdL![i], s = macdSig![i], mp = macdL![i - 1], sp = macdSig![i - 1];
                if (m == null || s == null || mp == null || sp == null) return false;
                return m < s && mp >= sp;
            }
            case "bollinger_breakout":
            case "bollinger_reversion": {
                const m = bbMid![i];
                if (strategy === "bollinger_breakout") return m != null && closes[i] < m;
                return m != null && closes[i] > m; // reversion: kembali ke/di atas middle
            }
            case "breakout_donchian": {
                const l = ll10![i];
                return l != null && closes[i] < l;
            }
            default: {
                if (!crossPairReady) return false;
                const f = fast[i], s = slow![i];
                if (f == null || s == null || fast[i - 1] == null || slow![i - 1] == null) return false;
                return f < s && fast[i - 1]! >= slow![i - 1]!;
            }
        }
    };

    const trades: BacktestTrade[] = [];
    const equityCurve: BacktestResult["equityCurve"] = [];
    let equity = initialCapital;     // ekuitas realisasi (cash saat flat)
    let inPos = false;
    let pending: "entry" | "exit" | null = null;

    let shares = 0;                  // unit saham (fraksional)
    let basis = 0;                   // harga beli bersih per share (termasuk fee)
    let entryPrice = 0, entryDate = "";
    let barsInPos = 0;

    const doEntry = (i: number) => {
        entryPrice = closes[i];
        basis = entryPrice * (1 + feeBuy);
        shares = equity / basis;
        entryDate = dateOf(bars, i);
        inPos = true;
    };

    const doExit = (i: number) => {
        const exitPrice = closes[i];
        equity = shares * exitPrice * (1 - feeSell); // realisasi bersih
        trades.push({
            entryDate,
            exitDate: dateOf(bars, i),
            entryPrice,
            exitPrice,
            returnPct: ((exitPrice * (1 - feeSell)) / basis - 1) * 100,
            days: diffDays(entryDate, dateOf(bars, i)),
        });
        inPos = false;
        shares = 0;
    };

    for (let i = 1; i < n; i++) {
        // 1) Eksekusi pending dari bar sebelumnya (tanpa look-ahead)
        if (nextBar && pending) {
            if (pending === "entry" && !inPos) doEntry(i);
            else if (pending === "exit" && inPos) doExit(i);
            pending = null;
        }

        // 2) Evaluasi sinyal di close bar i
        if (!inPos && !pending && entrySignal(i)) {
            if (nextBar) pending = "entry";
            else doEntry(i);
        } else if (inPos && !pending && exitSignal(i)) {
            if (nextBar) pending = "exit";
            else doExit(i);
        }

        // 3) Kurva ekuitas — nilai likuidasi bersih saat memegang posisi
        if (inPos) barsInPos++;
        equityCurve.push({
            date: dateOf(bars, i),
            strategy: inPos ? shares * closes[i] * (1 - feeSell) : equity,
            buyHold: initialCapital * (closes[i] / closes[0]),
        });
    }

    // Tutup posisi terbuka di bar terakhir (mark-to-market)
    if (inPos) {
        const last = n - 1;
        trades.push({
            entryDate,
            exitDate: dateOf(bars, last),
            entryPrice,
            exitPrice: closes[last],
            returnPct: ((closes[last] * (1 - feeSell)) / basis - 1) * 100,
            days: diffDays(entryDate, dateOf(bars, last)),
        });
    }

    const stratEquity = equityCurve.map(e => e.strategy);
    const holdEquity = equityCurve.map(e => e.buyHold);
    const wins = trades.filter(t => t.returnPct > 0).length;

    // Sharpe anualisasi dari return harian kurva strategi
    const stratReturns = dailyReturns(stratEquity);
    const meanR = stratReturns.reduce((s2, v) => s2 + v, 0) / (stratReturns.length || 1);
    const varR = stratReturns.reduce((s2, v) => s2 + (v - meanR) ** 2, 0) / ((stratReturns.length - 1) || 1);
    const stdR = Math.sqrt(varR);
    const sharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(252) : 0;

    const grossWin = trades.filter(t => t.returnPct > 0).reduce((s2, t) => s2 + t.returnPct, 0);
    const grossLoss = Math.abs(trades.filter(t => t.returnPct <= 0).reduce((s2, t) => s2 + t.returnPct, 0));

    const finalEquity = inPos ? shares * closes[n - 1] * (1 - feeSell) : equity;

    return {
        strategy,
        ticker: "",
        from: dateOf(bars, 0),
        to: dateOf(bars, n - 1),
        trades,
        equityCurve,
        stats: {
            totalReturnPct: (finalEquity / initialCapital - 1) * 100,
            buyHoldReturnPct: (holdEquity[holdEquity.length - 1] / initialCapital - 1) * 100,
            annualizedReturnPct: (Math.pow(finalEquity / initialCapital, 252 / n) - 1) * 100,
            winRatePct: trades.length ? (wins / trades.length) * 100 : 0,
            tradeCount: trades.length,
            avgDaysHeld: trades.length ? trades.reduce((s2, t) => s2 + t.days, 0) / trades.length : 0,
            maxDrawdownPct: maxDrawdown(stratEquity).maxDrawdownPct,
            buyHoldMaxDDPct: maxDrawdown(holdEquity).maxDrawdownPct,
            exposurePct: (barsInPos / (n - 1)) * 100,
            sharpeRatio: sharpe,
            profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? null : 0),
        },
        assumptions: { feeBuyPct: feeBuy * 100, feeSellPct: feeSell * 100, executeOnNextBar: nextBar },
        barsUsed: n,
    };
}
