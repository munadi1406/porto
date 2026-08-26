"use client";

import { useState } from "react";
import { FlaskConical, Loader2, Search, Target, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { STRATEGIES, type StrategyId } from "@/lib/quant";

interface BtTrade {
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    returnPct: number;
    days: number;
}

interface BtResponse {
    ticker: string;
    strategyLabel: string;
    strategyDescription: string;
    from: string;
    to: string;
    trades: BtTrade[];
    equityCurve: { date: string; strategy: number; buyHold: number }[];
    barsUsed: number;
    assumptions: { feeBuyPct: number; feeSellPct: number; executeOnNextBar: boolean };
    nextEntry: {
        kind: "ma_cross" | "macd" | "band_breakout" | "band_reversion" | "donchian" | "rsi_below";
        price: number | null;
        lastClose: number;
        distancePct: number | null;
        ready: boolean;
        reason?: string;
        indicatorNow: string;
    };
    stats: {
        totalReturnPct: number;
        buyHoldReturnPct: number;
        annualizedReturnPct: number;
        winRatePct: number;
        tradeCount: number;
        avgDaysHeld: number;
        maxDrawdownPct: number;
        buyHoldMaxDDPct: number;
        exposurePct: number;
        sharpeRatio: number;
        profitFactor: number | null;
    };
}

const YEARS = [1, 2, 3, 5];

export default function BacktestPage() {
    const [ticker, setTicker] = useState("BBCA");
    const [strategy, setStrategy] = useState<StrategyId>("golden_cross");
    const [years, setYears] = useState(2);
    const [result, setResult] = useState<BtResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rank, setRank] = useState<RankResponse | null>(null);
    const [rankLoading, setRankLoading] = useState(false);
    const [rankError, setRankError] = useState<string | null>(null);

    const run = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const t = ticker.trim().toUpperCase().replace(".JK", "");
        if (!t) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch(`/api/backtest?ticker=${t}&strategy=${strategy}&years=${years}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Gagal menjalankan backtest");
            setResult(json.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const runRank = async (e?: React.MouseEvent) => {
        e?.preventDefault();
        const t = ticker.trim().toUpperCase().replace(".JK", "");
        if (!t) return;
        setRankLoading(true);
        setRankError(null);
        setRank(null);
        try {
            const res = await fetch(`/api/backtest/rank?ticker=${t}&years=${years}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Gagal menjalankan ranking");
            setRank(json.data);
        } catch (err: any) {
            setRankError(err.message);
        } finally {
            setRankLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <FlaskConical className="w-6 h-6 text-primary" />
                    Backtest Strategi
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    Uji strategi teknikal ke data historis — bandingkan dengan beli-dan-tahan
                </p>
            </div>

            <BacktestForm
                ticker={ticker} setTicker={setTicker}
                strategy={strategy} setStrategy={setStrategy}
                years={years} setYears={setYears}
                loading={loading} onSubmit={run}
            />

            {error && !loading && (
                <div className="card border-destructive/40 text-xs text-destructive">{error}</div>
            )}

            {loading && (
                <div className="card h-40 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" /> Menghitung…
                </div>
            )}

            {!loading && result && <BacktestResultView result={result} />}

            {/* Ranking semua strategi */}
            <RankingSection
                ticker={ticker} years={years}
                rank={rank} loading={rankLoading} error={rankError}
                onRun={runRank}
            />
        </div>
    );
}

interface RankRow {
    strategy: string;
    label: string;
    description: string;
    tradeCount: number;
    barsUsed: number;
    lowSample: boolean;
    score: number;
    scoreParts: { winRate: number; profitFactor: number; sharpe: number };
    stats: {
        totalReturnPct: number; buyHoldReturnPct: number; annualizedReturnPct: number;
        winRatePct: number; avgDaysHeld: number; maxDrawdownPct: number; buyHoldMaxDDPct: number;
        exposurePct: number; sharpeRatio: number; profitFactor: number | null;
    };
}

interface RankResponse {
    ticker: string;
    years: number;
    barsUsed: number;
    from: string;
    to: string;
    ranked: RankRow[];
    best: RankRow | null;
}

function RankingSection({
    ticker, years, rank, loading, error, onRun,
}: {
    ticker: string; years: number;
    rank: RankResponse | null; loading: boolean; error: string | null;
    onRun: (e?: React.MouseEvent) => void;
}) {
    const t = ticker.trim().toUpperCase().replace(".JK", "");
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-lg font-black tracking-tight">Peringkat Semua Strategi</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Jalankan 8 strategi sekaligus — skor komposit dari win rate, profit factor &amp; Sharpe
                    </p>
                </div>
                <button
                    onClick={onRun}
                    disabled={loading || !t}
                    className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 text-primary px-4 py-2 text-sm font-bold hover:bg-primary/20 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                    Uji Semua ({years} tahun)
                </button>
            </div>

            {error && !loading && (
                <div className="card border-destructive/40 text-xs text-destructive">{error}</div>
            )}

            {!loading && !rank && !error && (
                <div className="card py-8 text-center text-xs text-muted-foreground">
                    Tekan &quot;Uji Semua&quot; untuk melihat strategi dengan peluang terbaik untuk {t || "saham"}.
                </div>
            )}

            {loading && (
                <div className="card h-24 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Menguji 8 strategi…
                </div>
            )}

            {rank && <RankTable data={rank} />}
        </div>
    );
}

function RankTable({ data }: { data: RankResponse }) {
    const maxScore = Math.max(...data.ranked.map(r => r.score), 1);
    return (
        <div className="space-y-3">
            {data.best && (
                <div className="card border-success/40 bg-success/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success mb-1">
                        🏆 Probabilitas Terbaik · {data.ticker} · {data.years} tahun
                    </p>
                    <p className="text-base font-black">{data.best.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Skor {data.best.score.toFixed(0)}/100 · return{" "}
                        <b className={data.best.stats.totalReturnPct >= 0 ? "text-success" : "text-destructive"}>
                            {data.best.stats.totalReturnPct >= 0 ? "+" : ""}{data.best.stats.totalReturnPct.toFixed(1)}%
                        </b>{" "}
                        (vs beli-tahan {data.best.stats.buyHoldReturnPct >= 0 ? "+" : ""}{data.best.stats.buyHoldReturnPct.toFixed(1)}%)
                        · win rate {data.best.stats.winRatePct.toFixed(0)}% dari {data.best.tradeCount} trade
                        · Sharpe {data.best.stats.sharpeRatio.toFixed(2)}
                        {data.best.lowSample && " · ⚠ sampel trade sedikit"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5">{data.best.description}</p>
                </div>
            )}

            <div className="card overflow-x-auto">
                <table className="w-full text-xs tabular-nums min-w-[720px]">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-2">#</th>
                            <th className="py-2 pr-3">Strategi</th>
                            <th className="py-2 pr-3">Skor</th>
                            <th className="py-2 pr-3 text-right">Return</th>
                            <th className="py-2 pr-3 text-right">vs B&amp;H</th>
                            <th className="py-2 pr-3 text-right">Win</th>
                            <th className="py-2 pr-3 text-right">Trade</th>
                            <th className="py-2 pr-3 text-right">Sharpe</th>
                            <th className="py-2 pr-3 text-right">PF</th>
                            <th className="py-2 text-right">Exposure</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.ranked.map((r, i) => (
                            <tr key={r.strategy} className={cn("border-b border-border/40 last:border-b-0", i === 0 && "bg-primary/5")}>
                                <td className="py-2 pr-2 font-bold text-muted-foreground">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </td>
                                <td className="py-2 pr-3 font-semibold max-w-[220px] truncate" title={r.description}>{r.label}</td>
                                <td className="py-2 pr-3">
                                    <div className="flex items-center gap-2 min-w-[110px]">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${(r.score / maxScore) * 100}%` }} />
                                        </div>
                                        <span className="font-bold w-7 text-right">{r.score.toFixed(0)}</span>
                                    </div>
                                </td>
                                <td className={cn("py-2 pr-3 text-right font-bold", r.stats.totalReturnPct >= 0 ? "text-success" : "text-destructive")}>
                                    {r.stats.totalReturnPct >= 0 ? "+" : ""}{r.stats.totalReturnPct.toFixed(0)}%
                                </td>
                                <td className={cn("py-2 pr-3 text-right", r.stats.totalReturnPct - r.stats.buyHoldReturnPct >= 0 ? "text-success" : "text-destructive")}>
                                    {r.stats.totalReturnPct - r.stats.buyHoldReturnPct >= 0 ? "+" : ""}
                                    {(r.stats.totalReturnPct - r.stats.buyHoldReturnPct).toFixed(0)}%
                                </td>
                                <td className="py-2 pr-3 text-right">{r.stats.winRatePct.toFixed(0)}%</td>
                                <td className="py-2 pr-3 text-right">
                                    {r.tradeCount}{r.lowSample && <span title="<5 trade — sampel lemah"> ⚠</span>}
                                </td>
                                <td className="py-2 pr-3 text-right">{Number.isFinite(r.stats.sharpeRatio) ? r.stats.sharpeRatio.toFixed(2) : "-"}</td>
                                <td className="py-2 pr-3 text-right">{r.stats.profitFactor == null ? "∞" : Number.isFinite(r.stats.profitFactor) ? r.stats.profitFactor.toFixed(2) : "-"}</td>
                                <td className="py-2 text-right">{r.stats.exposurePct.toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-2 text-[9px] text-muted-foreground/70">
                    Skor = 45% win rate + 25% profit factor (PF3→100) + 30% Sharpe (−1→0, 2→100); ×0.6 bila trade &lt;5.
                    Return sudah net biaya 0.15%/0.25%. Data historis bukan jaminan masa depan.
                </p>
            </div>
        </div>
    );
}

function BacktestForm({
    ticker, setTicker, strategy, setStrategy, years, setYears, loading, onSubmit,
}: {
    ticker: string; setTicker: (v: string) => void;
    strategy: StrategyId; setStrategy: (v: StrategyId) => void;
    years: number; setYears: (v: number) => void;
    loading: boolean; onSubmit: (e?: React.FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="card flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Kode Saham</label>
                <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        value={ticker}
                        onChange={e => setTicker(e.target.value)}
                        placeholder="BBCA"
                        className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            </div>
            <div className="flex-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Strategi</label>
                <select
                    value={strategy}
                    onChange={e => setStrategy(e.target.value as StrategyId)}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>
            <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Periode</label>
                <select
                    value={years}
                    onChange={e => setYears(Number(e.target.value))}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    {YEARS.map(y => <option key={y} value={y}>{y} tahun</option>)}
                </select>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Jalankan
            </button>
        </form>
    );
}

function BacktestResultView({ result }: { result: BtResponse }) {
    const chartData = result.equityCurve.map(p => ({
        ...p,
        label: p.date.slice(2).replace("-", "/"),
    }));

    return (
        <>
            <p className="text-xs text-muted-foreground">{result.strategyDescription}</p>

            {/* Peringatan validitas SMA200 */}
            {result.strategyLabel.includes("200") && result.barsUsed < 210 && (
                <div className="card border-warning/40 bg-warning/5 text-xs text-warning">
                    Data hanya {result.barsUsed} hari — SMA200 baru valid di akhir periode, sinyal golden cross
                    sangat terbatas. Gunakan periode 3–5 tahun untuk hasil bermakna.
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: "Return Strategi", value: `${result.stats.totalReturnPct >= 0 ? "+" : ""}${result.stats.totalReturnPct.toFixed(1)}%`, cls: result.stats.totalReturnPct >= 0 ? "text-success" : "text-destructive" },
                    { label: "Beli & Tahan", value: `${result.stats.buyHoldReturnPct >= 0 ? "+" : ""}${result.stats.buyHoldReturnPct.toFixed(1)}%`, cls: result.stats.buyHoldReturnPct >= 0 ? "text-success" : "text-destructive" },
                    { label: "CAGR", value: `${result.stats.annualizedReturnPct >= 0 ? "+" : ""}${result.stats.annualizedReturnPct.toFixed(1)}%`, cls: result.stats.annualizedReturnPct >= 0 ? "text-success" : "text-destructive" },
                    { label: "Win Rate", value: `${result.stats.winRatePct.toFixed(0)}%`, cls: "" },
                    { label: "Jumlah Trade", value: String(result.stats.tradeCount), cls: "" },
                    { label: "Max DD Strategi", value: `${result.stats.maxDrawdownPct.toFixed(1)}%`, cls: "text-destructive" },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-lg p-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{s.label}</p>
                        <p className={cn("text-sm font-black tabular-nums", s.cls)}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: "Sharpe Ratio",
                        value: result.stats.sharpeRatio.toFixed(2),
                        sub: result.stats.sharpeRatio >= 1 ? "baik" : result.stats.sharpeRatio >= 0.5 ? "cukup" : "lemah",
                    },
                    {
                        label: "Profit Factor",
                        value: result.stats.profitFactor == null ? "∞" : result.stats.profitFactor.toFixed(2),
                        sub: "gross win ÷ loss",
                    },
                    { label: "Exposure", value: `${result.stats.exposurePct.toFixed(0)}%`, sub: "waktu di pasar" },
                    { label: "Rata-rata Pegang", value: `${Math.round(result.stats.avgDaysHeld)} hari`, sub: `${result.stats.tradeCount} trade` },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-lg p-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{s.label}</p>
                        <p className="text-sm font-black tabular-nums">{s.value}</p>
                        {s.sub && <p className="text-[9px] text-muted-foreground/80">{s.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Asumsi simulasi */}
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Asumsi: eksekusi di close hari <b>setelah</b> sinyal (tanpa look-ahead) · biaya beli{" "}
                {result.assumptions.feeBuyPct.toFixed(2)}% &amp; jual {result.assumptions.feeSellPct.toFixed(2)}%
                (komisi + PPh final) · Buy &amp; Hold ditampilkan bruto tanpa biaya.
            </p>

            <EquityCurveCard chartData={chartData} title={`Kurva Ekuitas · ${result.ticker} · ${result.from} → ${result.to}`} />
            <NextEntryCard nextEntry={result.nextEntry} />
            <TradesTable trades={result.trades} />
        </>
    );
}

function NextEntryCard({ nextEntry: ne }: { nextEntry: BtResponse["nextEntry"] }) {
    const fmtP = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
    const DESC: Record<BtResponse["nextEntry"]["kind"], (p: string) => string> = {
        ma_cross: p => `Bila close besok mencapai ${p}, MA cepat akan memotong ke atas MA lambat (sinyal beli).`,
        macd: p => `Bila close besok berada di sekitar/atas ${p}, MACD akan memotong ke atas signal line (sinyal beli).`,
        band_breakout: p => `Bila close besok menembus ${p}, harga keluar dari upper band Bollinger (momen kuat — sinyal beli).`,
        band_reversion: p => `Bila close besok jatuh ke ${p} atau lebih rendah, harga menyentuh lower band (oversold — sinyal beli).`,
        donchian: p => `Bila close besok menembus ${p} (high 20 hari terakhir), breakout Donchian terbentuk (sinyal beli).`,
        rsi_below: p => `Bila close besok jatuh ke ${p} atau lebih rendah, RSI(14) turun di bawah 30 (sinyal beli).`,
    };
    const desc = ne.price != null ? DESC[ne.kind](fmtP(ne.price)) : null;

    return (
        <div className="card border-primary/40">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Area Beli Berikutnya
                <span className="ml-auto text-[9px] font-normal text-muted-foreground">proyeksi close besok</span>
            </h3>

            {!ne.ready ? (
                <p className="text-xs text-muted-foreground">{ne.reason ?? "Data tidak cukup untuk menghitung level."}</p>
            ) : (
                <>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Level Pemicu</p>
                            <p className="text-2xl font-black tabular-nums text-primary leading-none mt-0.5">
                                {ne.price != null ? Math.round(ne.price).toLocaleString("id-ID") : "-"}
                            </p>
                        </div>
                        {ne.distancePct != null && (
                            <div className="pb-0.5">
                                <span className={cn(
                                    "text-xs font-bold rounded-full px-2.5 py-1",
                                    ne.distancePct > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                )}>
                                    {ne.distancePct > 0 ? "▲" : "▼"} {Math.abs(ne.distancePct).toFixed(1)}% dari harga sekarang
                                </span>
                            </div>
                        )}
                        <div className="pb-0.5 ml-auto text-right">
                            <p className="text-[10px] text-muted-foreground">Close terakhir</p>
                            <p className="text-sm font-bold tabular-nums">{ne.lastClose.toLocaleString("id-ID")}</p>
                        </div>
                    </div>

                    {desc && <p className="mt-2.5 text-xs text-foreground/80 leading-relaxed">{desc}</p>}
                    {ne.reason && <p className="mt-1 text-[11px] text-warning">{ne.reason}</p>}
                    <p className="mt-2 text-[9px] text-muted-foreground/70">
                        Kondisi indikator saat ini: {ne.indicatorNow} · proyeksi matematis dari data saat ini, bukan jaminan sinyal.
                    </p>
                </>
            )}
        </div>
    );
}

function EquityCurveCard({ chartData, title }: { chartData: any[]; title: string }) {
    return (
        <div className="card">
            <h3 className="text-sm font-semibold mb-3">{title}</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={40} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={45} tickFormatter={(v: number) => v.toFixed(0)} />
                        <Tooltip
                            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                            formatter={(v: any, name: any) => [Number(v).toFixed(1), name === "strategy" ? "Strategi" : "Beli & Tahan"]}
                        />
                        <Legend formatter={(v) => (v === "strategy" ? "Strategi" : "Beli & Tahan")} wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="strategy" stroke="var(--primary)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="buyHold" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function TradesTable({ trades }: { trades: BtTrade[] }) {
    return (
        <div className="card">
            <h3 className="text-sm font-semibold mb-3">Daftar Transaksi ({trades.length})</h3>
            {trades.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada sinyal entry pada periode ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs tabular-nums">
                        <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                                <th className="py-2 pr-3">#</th>
                                <th className="py-2 pr-3">Entry</th>
                                <th className="py-2 pr-3">Exit</th>
                                <th className="py-2 pr-3 text-right">Harga Beli</th>
                                <th className="py-2 pr-3 text-right">Harga Jual</th>
                                <th className="py-2 pr-3 text-right">Hari</th>
                                <th className="py-2 text-right">Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((t, i) => (
                                <tr key={i} className="border-b border-border/40 last:border-b-0">
                                    <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                                    <td className="py-1.5 pr-3">{t.entryDate}</td>
                                    <td className="py-1.5 pr-3">{t.exitDate}</td>
                                    <td className="py-1.5 pr-3 text-right">{t.entryPrice.toLocaleString("id-ID")}</td>
                                    <td className="py-1.5 pr-3 text-right">{t.exitPrice.toLocaleString("id-ID")}</td>
                                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{t.days}</td>
                                    <td className={cn("py-1.5 text-right font-bold", t.returnPct >= 0 ? "text-success" : "text-destructive")}>
                                        {t.returnPct >= 0 ? "+" : ""}{t.returnPct.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
