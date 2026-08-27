"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle, Target, PieChart, BarChart3, Activity, Shield, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";

const COLORS = ['#c8300a', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#0ea5e9', '#6366f1'];

interface StockAnalysis {
    ticker: string;
    name: string;
    lots: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
    costBasis: number;
    gainLoss: number;
    gainLossPct: number;
    weight: number;
    sector: string;
    recommendation: 'BUY' | 'HOLD' | 'SELL';
    reason: string;
}

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, transactions, history } = useCashAndHistory();
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices } = useMarketData(tickers);

    const analysis = useMemo<StockAnalysis[]>(() => {
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

            let recommendation: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
            let reason = '';

            if (gainLossPct > 20) {
                recommendation = 'SELL';
                reason = `Profit ${gainLossPct.toFixed(1)}% - consider taking profit`;
            } else if (gainLossPct < -15) {
                recommendation = 'HOLD';
                reason = `Loss ${gainLossPct.toFixed(1)}% - consider averaging down`;
            } else if (weight < 5) {
                recommendation = 'BUY';
                reason = `Small position (${weight.toFixed(1)}%) - consider adding`;
            } else {
                reason = 'Position within healthy range';
            }

            return {
                ticker: item.ticker,
                name: item.ticker,
                lots: item.lots,
                avgPrice: item.averagePrice,
                currentPrice,
                marketValue,
                costBasis,
                gainLoss,
                gainLossPct,
                weight,
                sector: 'Unknown',
                recommendation,
                reason,
            };
        }).filter(d => d.marketValue > 0).sort((a, b) => b.marketValue - a.marketValue);
    }, [portfolio, prices]);

    const portfolioMetrics = useMemo(() => {
        const totalValue = analysis.reduce((sum, s) => sum + s.marketValue, 0);
        const totalCost = analysis.reduce((sum, s) => sum + s.costBasis, 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
        const totalEquity = totalValue + cash;

        const winners = analysis.filter(s => s.gainLoss > 0).length;
        const losers = analysis.filter(s => s.gainLoss < 0).length;

        return { totalValue, totalCost, totalGainLoss, totalGainLossPct, totalEquity, winners, losers };
    }, [analysis, cash]);

    const sectorData = useMemo(() => {
        const sectors: Record<string, number> = {};
        analysis.forEach(s => {
            sectors[s.sector] = (sectors[s.sector] || 0) + s.marketValue;
        });
        return Object.entries(sectors).map(([name, value]) => ({ name, value }));
    }, [analysis]);

    const topPerformers = analysis.slice(0, 3);
    const bottomPerformers = analysis.slice(-3).reverse();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black tracking-tight">Portfolio Analytics</h1>
                    <p className="text-[11px] text-muted-foreground">Analisis komprehensif portfolio Anda</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-primary">Rp {portfolioMetrics.totalEquity.toLocaleString("id-ID")}</p>
                    <p className={cn("text-xs font-bold", portfolioMetrics.totalGainLoss >= 0 ? "text-success" : "text-destructive")}>
                        {portfolioMetrics.totalGainLoss >= 0 ? "+" : ""}Rp {portfolioMetrics.totalGainLoss.toLocaleString("id-ID")} ({portfolioMetrics.totalGainLossPct.toFixed(1)}%)
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Total Value" value={`Rp ${(portfolioMetrics.totalValue / 1000000).toFixed(2)}M`} icon={TrendingUp} color="primary" />
                <MetricCard label="Total Cost" value={`Rp ${(portfolioMetrics.totalCost / 1000000).toFixed(2)}M`} icon={BarChart3} color="default" />
                <MetricCard label="Winners" value={`${portfolioMetrics.winners} stocks`} icon={TrendingUp} color="success" />
                <MetricCard label="Losers" value={`${portfolioMetrics.losers} stocks`} icon={TrendingDown} color="destructive" />
            </div>

            {/* Top & Bottom Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <h3 className="text-sm font-bold">Top Performers</h3>
                    </div>
                    <div className="space-y-2">
                        {topPerformers.map(s => (
                            <div key={s.ticker} className="flex items-center justify-between p-2 rounded-lg bg-success/5">
                                <div>
                                    <span className="text-sm font-bold font-mono">{s.ticker}</span>
                                    <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                                </div>
                                <span className="text-sm font-black text-success">+{s.gainLossPct.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <h3 className="text-sm font-bold">Bottom Performers</h3>
                    </div>
                    <div className="space-y-2">
                        {bottomPerformers.map(s => (
                            <div key={s.ticker} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                                <div>
                                    <span className="text-sm font-bold font-mono">{s.ticker}</span>
                                    <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                                </div>
                                <span className="text-sm font-black text-destructive">{s.gainLossPct.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Allocation & Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <PieChart className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">Stock Allocation</h3>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie data={analysis.map(s => ({ name: s.ticker, value: s.weight }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value.toFixed(0)}%`}>
                                    {analysis.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">Gain/Loss by Stock</h3>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.slice(0, 8)}>
                                <XAxis dataKey="ticker" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                                <Bar dataKey="gainLossPct" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Stock Table */}
            <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">Stock Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs tabular-nums">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="py-2 px-3 text-left">Stock</th>
                                <th className="py-2 px-3 text-right">Lots</th>
                                <th className="py-2 px-3 text-right">Avg Price</th>
                                <th className="py-2 px-3 text-right">Current</th>
                                <th className="py-2 px-3 text-right">Value</th>
                                <th className="py-2 px-3 text-right">Gain/Loss</th>
                                <th className="py-2 px-3 text-right">Weight</th>
                                <th className="py-2 px-3 text-center">Rec</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.map(s => (
                                <tr key={s.ticker} className="border-b border-border/30 hover:bg-muted/20">
                                    <td className="py-2 px-3 font-bold font-mono">{s.ticker}</td>
                                    <td className="py-2 px-3 text-right">{s.lots}</td>
                                    <td className="py-2 px-3 text-right">{s.avgPrice.toLocaleString("id-ID")}</td>
                                    <td className="py-2 px-3 text-right">{s.currentPrice.toLocaleString("id-ID")}</td>
                                    <td className="py-2 px-3 text-right">{(s.marketValue / 1000).toFixed(0)}K</td>
                                    <td className={cn("py-2 px-3 text-right font-bold", s.gainLoss >= 0 ? "text-success" : "text-destructive")}>
                                        {s.gainLoss >= 0 ? "+" : ""}{s.gainLossPct.toFixed(1)}%
                                    </td>
                                    <td className="py-2 px-3 text-right">{s.weight.toFixed(1)}%</td>
                                    <td className="py-2 px-3 text-center">
                                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded",
                                            s.recommendation === 'BUY' ? "bg-success/10 text-success" :
                                            s.recommendation === 'SELL' ? "bg-destructive/10 text-destructive" :
                                            "bg-muted text-muted-foreground"
                                        )}>{s.recommendation}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Recommendations */}
            <div className="card p-4 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">AI Recommendations</h3>
                </div>
                <div className="space-y-2">
                    {analysis.filter(s => s.recommendation !== 'HOLD').map(s => (
                        <div key={s.ticker} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded",
                                s.recommendation === 'BUY' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}>{s.recommendation}</span>
                            <span className="text-sm font-bold font-mono">{s.ticker}</span>
                            <span className="text-[11px] text-muted-foreground flex-1">{s.reason}</span>
                        </div>
                    ))}
                    {analysis.filter(s => s.recommendation !== 'HOLD').length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">All positions are within healthy range. No action needed.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    const colorClass = {
        primary: "text-primary",
        success: "text-success",
        destructive: "text-destructive",
        default: "text-foreground",
    }[color] || "text-foreground";

    return (
        <div className="card p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("w-3.5 h-3.5", colorClass)} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
            </div>
            <p className={cn("text-sm font-black", colorClass)}>{value}</p>
        </div>
    );
}
