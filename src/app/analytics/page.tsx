"use client";

import { useMemo, useState, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { cn, formatIDR } from "@/lib/utils";
import { useLocale } from "@/config/locale";
import {
    TrendingUp, TrendingDown, Activity, Target,
    BarChart3, ArrowUpRight, ArrowDownRight, Info
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
    BarChart, Bar, CartesianGrid,
    ReferenceLine, Line, LineChart
} from "recharts";

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, history } = useCashAndHistory();
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices } = useMarketData(tickers);
    const { lang } = useLocale();

    const [ihsgData, setIhsgData] = useState<{ date: string; close: number }[]>([]);
    const [riskMetrics, setRiskMetrics] = useState({ beta: 0, correlation: 0, volatility: 0 });
    const [period, setPeriod] = useState<'1W'|'1M'|'3M'|'YTD'|'1Y'|'All'>('YTD');

    useEffect(() => {
        if (!tickers.length) return;
        const mainTicker = tickers[0];
        fetch(`/api/risk?ticker=${mainTicker}&period=1y`)
            .then(r => r.json())
            .then(j => {
                if (j.success && j.data) {
                    setRiskMetrics({
                        beta: j.data.beta || 0,
                        correlation: j.data.correlation || 0,
                        volatility: j.data.annualVolatilityPct || 0,
                    });
                }
            })
            .catch(() => {});
    }, [tickers]);

    useEffect(() => {
        const apiPeriod = period === '1W' ? '1mo' : period === 'All' ? '5y' : period === 'YTD' ? '1y' : period === '1Y' ? '1y' : period.toLowerCase();
        fetch(`/api/idx/index-chart?period=${apiPeriod}&interval=1d`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data) && j.data.length) {
                    const mapped = j.data
                        .filter((d: any) => d.Close != null && d.Date)
                        .map((d: any) => ({ date: String(d.Date).slice(0, 10), close: Number(d.Close) }));
                    setIhsgData(mapped);
                }
            })
            .catch(() => {});
    }, [period]);

    const analysis = useMemo(() => {
        const totalValue = portfolio.reduce((sum, item) => {
            return sum + (item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice));
        }, 0);

        return portfolio.map(item => {
            const currentPrice = prices[item.ticker]?.price || item.averagePrice;
            const marketValue = item.lots * 100 * currentPrice;
            const costBasis = item.lots * 100 * item.averagePrice;
            const gainLoss = marketValue - costBasis;
            const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
            const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

            return {
                ticker: item.ticker,
                lots: item.lots,
                avgPrice: item.averagePrice,
                currentPrice,
                marketValue,
                costBasis,
                gainLoss,
                gainLossPct,
                weight,
                sector: 'Unknown',
                recommendation: gainLossPct > 20 ? 'SELL' : gainLossPct < -15 ? 'AVOID' : weight < 5 ? 'BUY' : 'HOLD',
                reason: gainLossPct > 20 ? `Profit ${gainLossPct.toFixed(1)}% - consider taking profit` :
                        gainLossPct < -15 ? `Loss ${gainLossPct.toFixed(1)}% - review position` :
                        weight < 5 ? `Small position (${weight.toFixed(1)}%) - consider adding` :
                        'Position within healthy range',
            };
        }).filter(d => d.marketValue > 0).sort((a, b) => b.marketValue - a.marketValue);
    }, [portfolio, prices]);

    const metrics = useMemo(() => {
        const totalValue = analysis.reduce((sum, s) => sum + s.marketValue, 0);
        const totalCost = analysis.reduce((sum, s) => sum + s.costBasis, 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
        const totalEquity = totalValue + cash;

        const winners = analysis.filter(s => s.gainLoss > 0).length;
        const losers = analysis.filter(s => s.gainLoss < 0).length;

        let maxDrawdown = 0;
        let peak = 0;
        history.forEach((h: any) => {
            const value = h.totalValue || 0;
            if (value > peak) peak = value;
            const dd = peak > 0 ? ((value - peak) / peak) * 100 : 0;
            if (dd < maxDrawdown) maxDrawdown = dd;
        });

        const returns = history.map((h: any, i: number) => {
            if (i === 0) return 0;
            const prev = history[i - 1].totalValue;
            return prev > 0 ? ((h.totalValue - prev) / prev) * 100 : 0;
        }).filter(r => r !== 0);
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1)) : 1;
        const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

        return { totalValue, totalCost, totalGainLoss, totalGainLossPct, totalEquity, winners, losers, maxDrawdown, sharpe };
    }, [analysis, history]);

    const performanceData = useMemo(() => {
        if (!ihsgData.length) return [];
        const toPct = (cur: number, base: number) => base > 0 ? ((cur / base) - 1) * 100 : 0;
        const fmtLabel = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        };
        // Build continuous daily series by forward-filling portfolio value onto IHSG dates
        // This avoids sparse "step" artifact (history only on transaction days)
        const sortedHistory = [...history].sort((a: any, b: any) => a.timestamp - b.timestamp);
        const currentTotal = metrics.totalEquity || analysis.reduce((s, a) => s + a.marketValue, 0) + cash || 1;
        const getPortfolioAt = (dateStr: string) => {
            const ts = new Date(dateStr).getTime() + 16 * 3600_000; // include snapshots of same day
            let val: number | null = null;
            for (const h of sortedHistory) {
                if (h.timestamp <= ts) val = h.totalValue;
                else break;
            }
            return val ?? (sortedHistory[0]?.totalValue ?? currentTotal);
        };

        const fullSeries = ihsgData.map(d => ({
            date: d.date,
            label: fmtLabel(d.date),
            ihsgClose: d.close,
            portVal: getPortfolioAt(d.date),
        }));

        // Filter by period first, then normalize to 0% at period start
        let sliced = fullSeries;
        if (period !== 'All') {
            const lastDate = fullSeries[fullSeries.length - 1]?.date;
            const now = lastDate ? new Date(lastDate).getTime() : Date.now();
            let cutoff = 0;
            if (period === '1W') cutoff = now - 7 * 86400000;
            else if (period === '1M') cutoff = now - 30 * 86400000;
            else if (period === '3M') cutoff = now - 90 * 86400000;
            else if (period === 'YTD') cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();
            else if (period === '1Y') cutoff = now - 365 * 86400000;
            sliced = fullSeries.filter(d => new Date(d.date).getTime() >= cutoff);
            if (sliced.length < 2) sliced = fullSeries;
        }

        const basePort = sliced[0]?.portVal || 1;
        const baseIhsg = sliced[0]?.ihsgClose || 1;
        return sliced.map(d => ({
            date: d.date,
            label: d.label,
            portfolio: toPct(d.portVal, basePort),
            ihsg: toPct(d.ihsgClose, baseIhsg),
        }));
    }, [ihsgData, history, period, metrics.totalEquity, analysis, cash]);

    const drawdownData = useMemo(() => {
        if (!history.length) return [];
        let peak = 0;
        return history.map((h: any) => {
            const value = h.totalValue || 0;
            if (value > peak) peak = value;
            const drawdown = peak > 0 ? ((value - peak) / peak) * 100 : 0;
            return { date: new Date(h.timestamp).toISOString().slice(0, 10), drawdown };
        });
    }, [history]);

    const sectorData = useMemo(() => {
        const sectors: Record<string, number> = {};
        analysis.forEach(s => { sectors[s.sector] = (sectors[s.sector] || 0) + s.marketValue; });
        return Object.entries(sectors).map(([name, value]) => ({ name, value: +(value / 1000000).toFixed(2) }));
    }, [analysis]);

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-primary" />
                            {lang === "id" ? "Performa Portofolio" : "Portfolio Analytics"}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">{lang === "id" ? "Analisis lanjutan & metrik risiko" : "Advanced portfolio analysis & risk metrics"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black tracking-tight">Rp {(metrics.totalEquity / 1000000).toFixed(2)}M</p>
                        <div className={cn("flex items-center gap-1 justify-end", metrics.totalGainLoss >= 0 ? "text-success" : "text-destructive")}>
                            {metrics.totalGainLoss >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span className="text-sm font-bold">
                                {metrics.totalGainLoss >= 0 ? "+" : ""}Rp {(Math.abs(metrics.totalGainLoss) / 1000000).toFixed(2)}M ({metrics.totalGainLossPct.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KPICard label="Total Value" value={`Rp ${(metrics.totalValue / 1000000).toFixed(2)}M`} sub="IDR" color="primary" />
                    <KPICard label="Beta" value={riskMetrics.beta.toFixed(2)} sub="vs IHSG" color={riskMetrics.beta > 1 ? "warning" : "success"} />
                    <KPICard label="Correlation" value={`${(riskMetrics.correlation * 100).toFixed(0)}%`} sub="with IHSG" color="default" />
                    <KPICard label="Volatility" value={`${riskMetrics.volatility.toFixed(1)}%`} sub="annualized" color={riskMetrics.volatility > 20 ? "destructive" : "success"} />
                    <KPICard label="Sharpe" value={metrics.sharpe.toFixed(2)} sub="ratio" color={metrics.sharpe > 1 ? "success" : "warning"} />
                    <KPICard label="Max DD" value={`${metrics.maxDrawdown.toFixed(1)}%`} sub="drawdown" color="destructive" />
                </div>

                {/* Performance Chart - dark style like reference */}
                <div className="rounded-xl overflow-hidden border shadow-lg bg-[#0a0a0a] border-neutral-800">
                    <div className="p-4 pb-2">
                        <div className="flex items-center gap-1.5 mb-3">
                            <h3 className="text-sm font-bold text-white">Cumulative Portfolio Return</h3>
                            <span className="w-4 h-4 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] text-neutral-400">i</span>
                        </div>
                        {performanceData.length >= 2 ? (() => {
                            const last = performanceData[performanceData.length-1] as any;
                            const pVal = Number(last.portfolio);
                            const iVal = Number(last.ihsg);
                            return (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="flex items-center justify-between px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
                                        <span className="flex items-center gap-2 text-xs text-neutral-300">
                                            <span className="w-0.5 h-4 bg-emerald-500 rounded" /> Portfolio
                                        </span>
                                        <span className={cn("text-sm font-bold tabular-nums", pVal >= 0 ? "text-emerald-500" : "text-red-500")}>
                                            {pVal > 0 ? "+" : ""}{pVal.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
                                        <span className="flex items-center gap-2 text-xs text-neutral-300">
                                            <span className="w-0.5 h-4 bg-purple-500 rounded" /> IHSG
                                        </span>
                                        <span className={cn("text-sm font-bold tabular-nums", iVal >= 0 ? "text-emerald-500" : "text-red-500")}>
                                            {iVal > 0 ? "+" : ""}{iVal.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })() : null}
                    </div>
                    <div className="h-64 px-2">
                        {performanceData.length < 2 ? (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                                <Activity className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-xs">Belum cukup data historis</p>
                                <p className="text-[10px]">Butuh ≥2 snapshot harian</p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData} margin={{ left: 0, right: 32, top: 8, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                                <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={42} orientation="right" tickFormatter={(v) => `${v > 0 ? "" : ""}${Number(v).toFixed(0)}%`} domain={['auto','auto']} />
                                <Tooltip
                                    contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8, fontSize: 11, color: '#fff' }}
                                    formatter={(v: any, name: any) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}%`, name === 'portfolio' ? 'Portfolio' : 'IHSG']}
                                    labelFormatter={(label) => `Tanggal ${label}`}
                                />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                                <Line type="monotone" dataKey="portfolio" stroke="var(--chart-1)" strokeWidth={1.8} dot={false} name="portfolio" />
                                <Line type="monotone" dataKey="ihsg" stroke="var(--chart-2)" strokeWidth={1.8} dot={false} name="ihsg" />
                            </LineChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-6 py-3 border-t border-neutral-800 text-xs">
                        {(['1W','1M','3M','YTD','1Y','All'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn("pb-1 border-b-2 transition-colors", period === p ? "border-emerald-500 text-white font-bold" : "border-transparent text-neutral-500 hover:text-neutral-300")}
                            >{p}</button>
                        ))}
                    </div>
                </div>

                {/* Drawdown & Allocation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5 border-border/50 shadow-lg">
                        <h3 className="text-sm font-bold mb-1">Drawdown</h3>
                        <p className="text-[10px] text-muted-foreground mb-4">Portfolio peak-to-trough decline</p>
                        <div className="h-48">
                        {drawdownData.length < 2 ? (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Belum ada data drawdown</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={drawdownData}>
                                    <defs>
                                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => String(v).slice(5)} />
                                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={0} stroke="var(--border)" />
                                    <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                                    <Area type="monotone" dataKey="drawdown" stroke="var(--destructive)" fill="url(#colorDD)" strokeWidth={2} name="Drawdown" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    </div>

                    <div className="card p-5 border-border/50 shadow-lg">
                        <h3 className="text-sm font-bold mb-1">Stock Allocation</h3>
                        <p className="text-[10px] text-muted-foreground mb-4">Weight distribution</p>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analysis.slice(0, 8)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                                    <YAxis type="category" dataKey="ticker" tick={{ fontSize: 10 }} width={50} />
                                    <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                                    <Bar dataKey="weight" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Weight" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AI Recommendations */}
                <div className="card p-5 border-primary/30 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">AI Recommendations</h3>
                        <span className="ml-auto text-[9px] text-muted-foreground">Based on backtest & technical analysis</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.filter(s => s.recommendation !== 'HOLD').slice(0, 6).map(s => (
                            <div key={s.ticker} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                                <span className={cn("text-[10px] font-black px-2 py-1 rounded",
                                    s.recommendation === 'BUY' ? "bg-success/10 text-success" :
                                    s.recommendation === 'SELL' ? "bg-destructive/10 text-destructive" :
                                    "bg-warning/10 text-warning"
                                )}>{s.recommendation}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold font-mono">{s.ticker}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{s.reason}</p>
                                </div>
                                <span className={cn("text-sm font-bold", s.gainLoss >= 0 ? "text-success" : "text-destructive")}>
                                    {s.gainLoss >= 0 ? "+" : ""}{s.gainLossPct.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                        {analysis.filter(s => s.recommendation !== 'HOLD').length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4 col-span-2">All positions are within healthy range. No action needed.</p>
                        )}
                    </div>
                </div>

                {/* Holdings Table */}
                <div className="card p-5 border-border/50 shadow-lg">
                    <h3 className="text-sm font-bold mb-4">Holdings Detail</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="py-2 px-3 text-left">Stock</th>
                                    <th className="py-2 px-3 text-right">Lots</th>
                                    <th className="py-2 px-3 text-right">Avg Price</th>
                                    <th className="py-2 px-3 text-right">Current</th>
                                    <th className="py-2 px-3 text-right">Value</th>
                                    <th className="py-2 px-3 text-right">G/L</th>
                                    <th className="py-2 px-3 text-right">Weight</th>
                                    <th className="py-2 px-3 text-center">Rec</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.map((s, i) => (
                                    <tr key={s.ticker} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                                <span className="font-bold font-mono">{s.ticker}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">{s.lots}</td>
                                        <td className="py-2.5 px-3 text-right">{formatIDR(s.avgPrice)}</td>
                                        <td className="py-2.5 px-3 text-right">{formatIDR(s.currentPrice)}</td>
                                        <td className="py-2.5 px-3 text-right font-bold">{(s.marketValue / 1000000).toFixed(2)}M</td>
                                        <td className={cn("py-2.5 px-3 text-right font-bold", s.gainLoss >= 0 ? "text-success" : "text-destructive")}>
                                            {s.gainLoss >= 0 ? "+" : ""}{s.gainLossPct.toFixed(1)}%
                                        </td>
                                        <td className="py-2.5 px-3 text-right">{s.weight.toFixed(1)}%</td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded",
                                                s.recommendation === 'BUY' ? "bg-success/10 text-success" :
                                                s.recommendation === 'SELL' ? "bg-destructive/10 text-destructive" :
                                                s.recommendation === 'AVOID' ? "bg-warning/10 text-warning" :
                                                "bg-muted text-muted-foreground"
                                            )}>{s.recommendation}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    const colorMap: Record<string, string> = {
        primary: 'from-primary/10 to-primary/5 border-primary/20',
        success: 'from-success/10 to-success/5 border-success/20',
        warning: 'from-warning/10 to-warning/5 border-warning/20',
        destructive: 'from-destructive/10 to-destructive/5 border-destructive/20',
        default: 'from-muted/10 to-muted/5 border-muted/20',
    };
    const textColor: Record<string, string> = {
        primary: 'text-primary',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
        default: 'text-foreground',
    };

    return (
        <div className={cn("card p-3 bg-gradient-to-br border", colorMap[color] || colorMap.default)}>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn("text-lg font-black mt-1", textColor[color] || textColor.default)}>{value}</p>
            <p className="text-[9px] text-muted-foreground">{sub}</p>
        </div>
    );
}
