"use client";

import { useState } from "react";
import { FlaskConical, Loader2, Search, Target, Trophy, BarChart3, Bot, Calculator, LayoutGrid, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { STRATEGIES, type StrategyId } from "@/lib/quant";
import { PositionCalculator } from "@/components/PositionCalculator";
import { BacktestAiSummary } from "@/components/BacktestAiSummary";

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
    const [activeTab, setActiveTab] = useState<"hasil" | "ai" | "posisi" | "ranking">("hasil");

    const run = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const t = ticker.trim().toUpperCase().replace(".JK", "");
        if (!t) return;
        setLoading(true);
        setError(null);
        setResult(null);
        setActiveTab("hasil");
        try {
            const res = await fetch(`/api/backtest?ticker=${t}&strategy=${strategy}&years=${years}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Gagal menjalankan backtest");
            setResult(json.data);

            if (!rank || rank.ticker !== t || rank.years !== years) {
                fetchRanking(t, years);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRanking = async (t: string, y: number) => {
        setRankLoading(true);
        setRankError(null);
        try {
            const res = await fetch(`/api/backtest/rank?ticker=${t}&years=${y}`);
            const json = await res.json();
            if (json.success) {
                setRank(json.data);
            }
        } catch (err: any) {
            setRankError(err.message);
        } finally {
            setRankLoading(false);
        }
    };

    const runRank = async (e?: React.MouseEvent) => {
        e?.preventDefault();
        const t = ticker.trim().toUpperCase().replace(".JK", "");
        if (!t) return;
        setRank(null);
        await fetchRanking(t, years);
    };

    const tabs = [
        { id: "hasil" as const, label: "Statistik", icon: BarChart3 },
        { id: "ai" as const, label: "Entry AI", icon: Bot },
        { id: "posisi" as const, label: "Kalkulator", icon: Calculator },
        { id: "ranking" as const, label: "Banding", icon: LayoutGrid },
    ];

    return (
        <div className="space-y-3">
            {/* Header + Form */}
            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-primary" />
                                Backtest Strategi
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Uji strategi teknikal ke data historis IDX
                            </p>
                        </div>
                        {result && (
                            <div className="text-right">
                                <p className="text-base font-black text-primary">{result.ticker}</p>
                                <p className="text-[10px] text-muted-foreground">{result.strategyLabel}</p>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={run} className="p-3 flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Kode Saham</label>
                        <div className="relative mt-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                value={ticker}
                                onChange={e => setTicker(e.target.value)}
                                placeholder="BBCA"
                                className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Strategi</label>
                        <select
                            value={strategy}
                            onChange={e => setStrategy(e.target.value as StrategyId)}
                            className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                            {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="w-28">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground">Periode</label>
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
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        Jalankan
                    </button>
                </form>
            </div>

            {/* Error */}
            {error && !loading && (
                <div className="card flex items-center gap-2 p-3 border-destructive/40 bg-destructive/5 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="card h-32 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Menghitung backtest…</span>
                </div>
            )}

            {/* Tabs */}
            <div className="card p-0 overflow-hidden">
                <div className="flex items-center border-b border-border bg-muted/10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            disabled={!result && tab.id !== "ranking"}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 -mb-px transition-colors",
                                activeTab === tab.id
                                    ? "border-primary text-primary bg-background"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
                                !result && tab.id !== "ranking" && "opacity-40 cursor-not-allowed hover:text-muted-foreground hover:bg-transparent"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-4 min-h-[400px]">
                    {!result && activeTab !== "ranking" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <FlaskConical className="w-12 h-12 mb-4 text-muted-foreground/30" />
                            <p className="text-sm font-medium">Belum ada hasil backtest</p>
                            <p className="text-xs mt-1">Isi form di atas dan klik "Jalankan"</p>
                        </div>
                    )}

                    {activeTab === "hasil" && result && <BacktestResultView result={result} />}

                    {activeTab === "ai" && result && (
                        <div className="space-y-4">
                            <BacktestAiSummary
                                backtestResult={result}
                                positionCalc={null}
                                ticker={result.ticker}
                                strategyLabel={result.strategyLabel}
                            />
                            <div className="card p-4 border-primary/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-bold">Entry & Alokasi AI</h3>
                                    <span className="ml-auto text-[9px] text-muted-foreground">Berbasis ranking semua strategi</span>
                                </div>
                                <PositionCalculator
                                    ticker={result.ticker}
                                    lastClose={result.nextEntry?.lastClose}
                                    technicalData={{
                                        nextEntry: result.nextEntry,
                                        indicators: result.nextEntry?.indicatorNow
                                            ? { indicatorNow: result.nextEntry.indicatorNow }
                                            : {},
                                    }}
                                    strategyLabel={result.strategyLabel}
                                    showCalculator={false}
                                    ranking={rank}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "posisi" && result && (
                        <PositionCalculator
                            ticker={result.ticker}
                            lastClose={result.nextEntry?.lastClose}
                            technicalData={{
                                nextEntry: result.nextEntry,
                                indicators: result.nextEntry?.indicatorNow
                                    ? { indicatorNow: result.nextEntry.indicatorNow }
                                    : {},
                            }}
                            strategyLabel={result.strategyLabel}
                            showCalculator={true}
                            ranking={rank}
                        />
                    )}

                    {activeTab === "ranking" && (
                        <RankingSection
                            ticker={ticker}
                            years={years}
                            rank={rank}
                            loading={rankLoading}
                            error={rankError}
                            onRun={runRank}
                        />
                    )}
                </div>
            </div>
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
                    <p className="text-[11px] text-muted-foreground">
                        Bandingkan 8 strategi sekaligus — skor komposit dari win rate, profit factor &amp; Sharpe
                    </p>
                </div>
                <button
                    onClick={onRun}
                    disabled={loading || !t}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/20 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                    Uji Semua ({years}t)
                </button>
            </div>

            {error && !loading && (
                <div className="card flex items-center gap-2 p-3 border-destructive/40 bg-destructive/5 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {!loading && !rank && !error && (
                <div className="text-center py-10 text-xs text-muted-foreground">
                    Tekan &quot;Uji Semua&quot; untuk melihat strategi terbaik untuk {t || "saham"}.
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Menguji 8 strategi…</span>
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
                <div className="card p-3 border-success/40 bg-success/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-success" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-success">
                            Strategi Terbaik · {data.ticker} · {data.years} tahun
                        </span>
                    </div>
                    <p className="text-sm font-black">{data.best.label}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                        <span>Skor <b className="text-success">{data.best.score.toFixed(0)}/100</b></span>
                        <span>Return <b className={data.best.stats.totalReturnPct >= 0 ? "text-success" : "text-destructive"}>
                            {data.best.stats.totalReturnPct >= 0 ? "+" : ""}{data.best.stats.totalReturnPct.toFixed(1)}%
                        </b></span>
                        <span>vs B&H <b className={data.best.stats.buyHoldReturnPct >= 0 ? "text-success" : "text-destructive"}>
                            {data.best.stats.buyHoldReturnPct >= 0 ? "+" : ""}{data.best.stats.buyHoldReturnPct.toFixed(1)}%
                        </b></span>
                        <span>WR <b>{data.best.stats.winRatePct.toFixed(0)}%</b></span>
                        <span>Sharpe <b>{data.best.stats.sharpeRatio.toFixed(2)}</b></span>
                        {data.best.lowSample && <span className="text-warning">⚠ sampel sedikit</span>}
                    </div>
                </div>
            )}

            <div className="card overflow-x-auto p-0">
                <table className="w-full text-xs tabular-nums min-w-[680px]">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Strategi</th>
                            <th className="py-2 px-3">Skor</th>
                            <th className="py-2 px-3 text-right">Return</th>
                            <th className="py-2 px-3 text-right">vs B&H</th>
                            <th className="py-2 px-3 text-right">Win</th>
                            <th className="py-2 px-3 text-right">Trade</th>
                            <th className="py-2 px-3 text-right">Sharpe</th>
                            <th className="py-2 px-3 text-right">Exposure</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.ranked.map((r, i) => (
                            <tr key={r.strategy} className={cn("border-b border-border/40 last:border-b-0", i === 0 && "bg-primary/5")}>
                                <td className="py-2 px-3 font-bold text-muted-foreground">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </td>
                                <td className="py-2 px-3 font-semibold max-w-[200px] truncate" title={r.description}>{r.label}</td>
                                <td className="py-2 px-3">
                                    <div className="flex items-center gap-2 min-w-[90px]">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${(r.score / maxScore) * 100}%` }} />
                                        </div>
                                        <span className="font-bold w-6 text-right">{r.score.toFixed(0)}</span>
                                    </div>
                                </td>
                                <td className={cn("py-2 px-3 text-right font-bold", r.stats.totalReturnPct >= 0 ? "text-success" : "text-destructive")}>
                                    {r.stats.totalReturnPct >= 0 ? "+" : ""}{r.stats.totalReturnPct.toFixed(0)}%
                                </td>
                                <td className={cn("py-2 px-3 text-right", r.stats.totalReturnPct - r.stats.buyHoldReturnPct >= 0 ? "text-success" : "text-destructive")}>
                                    {r.stats.totalReturnPct - r.stats.buyHoldReturnPct >= 0 ? "+" : ""}
                                    {(r.stats.totalReturnPct - r.stats.buyHoldReturnPct).toFixed(0)}%
                                </td>
                                <td className="py-2 px-3 text-right">{r.stats.winRatePct.toFixed(0)}%</td>
                                <td className="py-2 px-3 text-right">
                                    {r.tradeCount}{r.lowSample && <span title="<5 trade"> ⚠</span>}
                                </td>
                                <td className="py-2 px-3 text-right">{Number.isFinite(r.stats.sharpeRatio) ? r.stats.sharpeRatio.toFixed(2) : "-"}</td>
                                <td className="py-2 px-3 text-right">{r.stats.exposurePct.toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[9px] text-muted-foreground/60 px-1">
                Skor = 45% win rate + 25% profit factor + 30% Sharpe. Return net biaya 0.15%/0.25%.
            </p>
        </div>
    );
}

function BacktestResultView({ result }: { result: BtResponse }) {
    const chartData = result.equityCurve.map(p => ({
        ...p,
        label: p.date.slice(2).replace("-", "/"),
    }));

    const returnVsBH = result.stats.totalReturnPct - result.stats.buyHoldReturnPct;

    return (
        <div className="space-y-4">
            {/* Strategy badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">{result.strategyLabel}</span>
                <span>·</span>
                <span>{result.from} → {result.to}</span>
                <span>·</span>
                <span>{result.barsUsed} hari</span>
            </div>

            {/* Warning SMA200 */}
            {result.strategyLabel.includes("200") && result.barsUsed < 210 && (
                <div className="card flex items-center gap-2 p-3 border-warning/40 bg-warning/5 text-xs text-warning">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Data {result.barsUsed} hari — SMA200 belum valid. Gunakan 3–5 tahun.</span>
                </div>
            )}

            {/* Main stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <StatCard
                    label="Return"
                    value={`${result.stats.totalReturnPct >= 0 ? "+" : ""}${result.stats.totalReturnPct.toFixed(1)}%`}
                    color={result.stats.totalReturnPct >= 0 ? "success" : "destructive"}
                />
                <StatCard
                    label="vs B&H"
                    value={`${returnVsBH >= 0 ? "+" : ""}${returnVsBH.toFixed(1)}%`}
                    color={returnVsBH >= 0 ? "success" : "destructive"}
                />
                <StatCard
                    label="CAGR"
                    value={`${result.stats.annualizedReturnPct >= 0 ? "+" : ""}${result.stats.annualizedReturnPct.toFixed(1)}%`}
                    color={result.stats.annualizedReturnPct >= 0 ? "success" : "destructive"}
                />
                <StatCard
                    label="Win Rate"
                    value={`${result.stats.winRatePct.toFixed(0)}%`}
                    color={result.stats.winRatePct >= 50 ? "success" : result.stats.winRatePct >= 40 ? "warning" : "destructive"}
                />
                <StatCard
                    label="Max DD"
                    value={`${result.stats.maxDrawdownPct.toFixed(1)}%`}
                    color="destructive"
                />
                <StatCard
                    label="Trades"
                    value={String(result.stats.tradeCount)}
                    color="default"
                />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="card p-2.5 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Sharpe</p>
                    <p className={cn("text-sm font-black", result.stats.sharpeRatio >= 1 ? "text-success" : result.stats.sharpeRatio >= 0.5 ? "text-warning" : "text-destructive")}>
                        {result.stats.sharpeRatio.toFixed(2)}
                    </p>
                </div>
                <div className="card p-2.5 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Profit Factor</p>
                    <p className="text-sm font-black">
                        {result.stats.profitFactor == null ? "∞" : result.stats.profitFactor.toFixed(2)}
                    </p>
                </div>
                <div className="card p-2.5 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Exposure</p>
                    <p className="text-sm font-black">{result.stats.exposurePct.toFixed(0)}%</p>
                </div>
                <div className="card p-2.5 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Avg Hold</p>
                    <p className="text-sm font-black">{Math.round(result.stats.avgDaysHeld)} hari</p>
                </div>
            </div>

            {/* Equity Curve */}
            <EquityCurveCard chartData={chartData} title="Kurva Ekuitas vs Buy & Hold" />

            {/* Next Entry */}
            <NextEntryCard nextEntry={result.nextEntry} />

            {/* Trades */}
            <TradesTable trades={result.trades} />

            {/* Assumptions */}
            <p className="text-[9px] text-muted-foreground/60 px-1">
                Asumsi: eksekusi next-day · biaya beli {result.assumptions.feeBuyPct.toFixed(2)}% &amp; jual {result.assumptions.feeSellPct.toFixed(2)}% · B&amp;H bruto.
            </p>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color: "success" | "destructive" | "warning" | "default" }) {
    const colorClass = {
        success: "text-success",
        destructive: "text-destructive",
        warning: "text-warning",
        default: "text-foreground",
    }[color];

    return (
        <div className="card p-2.5 text-center">
            <p className="text-[9px] font-bold text-muted-foreground uppercase">{label}</p>
            <p className={cn("text-sm font-black tabular-nums", colorClass)}>{value}</p>
        </div>
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
        <div className="card p-3 border-primary/30">
            <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Area Beli Berikutnya</h3>
                <span className="ml-auto text-[9px] text-muted-foreground">proyeksi close besok</span>
            </div>

            {!ne.ready ? (
                <p className="text-xs text-muted-foreground">{ne.reason ?? "Data tidak cukup."}</p>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Level Pemicu</p>
                            <p className="text-xl font-black tabular-nums text-primary">
                                {ne.price != null ? Math.round(ne.price).toLocaleString("id-ID") : "-"}
                            </p>
                        </div>
                        {ne.distancePct != null && (
                            <span className={cn(
                                "text-[11px] font-bold rounded-full px-2 py-0.5",
                                ne.distancePct > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}>
                                {ne.distancePct > 0 ? "▲" : "▼"} {Math.abs(ne.distancePct).toFixed(1)}%
                            </span>
                        )}
                        <div className="ml-auto text-right">
                            <p className="text-[9px] text-muted-foreground">Close</p>
                            <p className="text-sm font-bold tabular-nums">{ne.lastClose.toLocaleString("id-ID")}</p>
                        </div>
                    </div>
                    {desc && <p className="text-[11px] text-foreground/80 leading-relaxed">{desc}</p>}
                    <p className="text-[9px] text-muted-foreground/60">
                        Indikator: {ne.indicatorNow} · proyeksi matematis, bukan jaminan.
                    </p>
                </div>
            )}
        </div>
    );
}

function EquityCurveCard({ chartData, title }: { chartData: any[]; title: string }) {
    return (
        <div className="card p-3">
            <h3 className="text-xs font-bold mb-2">{title}</h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={50} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => v.toFixed(0)} />
                        <Tooltip
                            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                            formatter={(v: any, name: any) => [Number(v).toFixed(1), name === "strategy" ? "Strategi" : "B&H"]}
                        />
                        <Legend formatter={(v) => (v === "strategy" ? "Strategi" : "B&H")} wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="strategy" stroke="var(--primary)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="buyHold" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function TradesTable({ trades }: { trades: BtTrade[] }) {
    if (trades.length === 0) {
        return (
            <div className="card p-3">
                <h3 className="text-xs font-bold mb-2">Daftar Transaksi</h3>
                <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada sinyal entry pada periode ini.</p>
            </div>
        );
    }

    return (
        <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold">Daftar Transaksi ({trades.length})</h3>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Win: {trades.filter(t => t.returnPct > 0).length}</span>
                    <span>Loss: {trades.filter(t => t.returnPct <= 0).length}</span>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs tabular-nums">
                    <thead className="sticky top-0 bg-card">
                        <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-1.5 px-2">#</th>
                            <th className="py-1.5 px-2">Entry</th>
                            <th className="py-1.5 px-2">Exit</th>
                            <th className="py-1.5 px-2 text-right">Beli</th>
                            <th className="py-1.5 px-2 text-right">Jual</th>
                            <th className="py-1.5 px-2 text-right">Hari</th>
                            <th className="py-1.5 px-2 text-right">Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map((t, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-b-0 hover:bg-muted/30">
                                <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                                <td className="py-1 px-2">{t.entryDate}</td>
                                <td className="py-1 px-2">{t.exitDate}</td>
                                <td className="py-1 px-2 text-right">{t.entryPrice.toLocaleString("id-ID")}</td>
                                <td className="py-1 px-2 text-right">{t.exitPrice.toLocaleString("id-ID")}</td>
                                <td className="py-1 px-2 text-right text-muted-foreground">{t.days}</td>
                                <td className={cn("py-1 px-2 text-right font-bold", t.returnPct >= 0 ? "text-success" : "text-destructive")}>
                                    {t.returnPct >= 0 ? "+" : ""}{t.returnPct.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
