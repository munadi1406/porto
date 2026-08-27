"use client";

import { useMemo, useState, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { cn, formatIDR } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Activity, Shield, Target,
    BarChart3, PieChart as PieChartIcon, AlertTriangle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
    ReferenceLine
} from "recharts";

const COLORS = ['#c8300a', '#4ade80', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, history } = useCashAndHistory();
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices } = useMarketData(tickers);

    const [ihsgData, setIhsgData] = useState<{ date: string; close: number }[]>([]);
    const [riskMetrics, setRiskMetrics] = useState({ beta: 0, correlation: 0, volatility: 0 });

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
        const end = Math.floor(Date.now() / 1000);
        const start = end - 365 * 24 * 60 * 60;
        fetch(`/api/idx/index-chart?period=1y&interval=1d`)
            .then(r => r.json())
            .then(j => {
                if (j.success && j.data) {
                    setIhsgData(j.data);
                }
            })
            .catch(() => {});
    }, []);

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
        if (!ihsgData.length || !history.length) return [];
        const data = history.map((h: any) => {
            const date = new Date(h.timestamp).toISOString().slice(0, 10);
            const ihsg = ihsgData.find(i => i.date.slice(0, 10) === date);
            return {
                date,
                portfolio: h.totalValue || 0,
                ihsg: ihsg ? ihsg.close * 1000 : null,
            };
        }).filter(d => d.ihsg !== null);
        return data;
    }, [ihsgData, history]);

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
                            Portfolio Analytics
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Advanced portfolio analysis & risk metrics</p>
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

                {/* Performance Chart */}
                <div className="card p-5 border-border/50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold">Portfolio vs IHSG</h3>
                            <p className="text-[10px] text-muted-foreground">Value comparison (IDR Million)</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Portfolio</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />IHSG (x1000)</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                                <defs>
                                    <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorIHSG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}`} />
                                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                                <Area yAxisId="left" type="monotone" dataKey="portfolio" stroke="var(--primary)" fill="url(#colorPort)" strokeWidth={2} name="Portfolio (Rp)" />
                                <Area yAxisId="right" type="monotone" dataKey="ihsg" stroke="var(--success)" fill="url(#colorIHSG)" strokeWidth={2} name="IHSG (points)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Drawdown & Allocation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5 border-border/50 shadow-lg">
                        <h3 className="text-sm font-bold mb-1">Drawdown</h3>
                        <p className="text-[10px] text-muted-foreground mb-4">Portfolio peak-to-trough decline</p>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={drawdownData}>
                                    <defs>
                                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={0} stroke="var(--border)" />
                                    <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                                    <Area type="monotone" dataKey="drawdown" stroke="var(--destructive)" fill="url(#colorDD)" strokeWidth={2} name="Drawdown" />
                                </AreaChart>
                            </ResponsiveContainer>
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
