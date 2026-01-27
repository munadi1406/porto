"use client";

import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { SummaryCard } from "@/components/SummaryCard";
import { formatIDR, formatPercentage } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Activity, PieChart, Wallet, Layers, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

import { DashboardTabs } from "@/components/DashboardTabs";

export default function AggregatePage() {
    const { data, loading } = useAggregatePortfolio();

    if (loading || !data) {
        return (
            <div className="p-8 space-y-6">
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-2xl" />
                    ))}
                </div>
                <div className="h-[400px] bg-gray-200 dark:bg-gray-800 animate-pulse rounded-3xl" />
            </div>
        );
    }

    const { portfolios, totals, consolidatedItems } = data;

    // Prepare chart data
    const chartData = portfolios.map(p => ({
        name: p.name,
        value: p.totalValue,
        color: p.color
    })).filter(d => d.value > 0);

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-5 h-5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Consolidated Ecosystem</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Ringkasan Seluruh Portofolio
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Konsolidasi dari {portfolios.length} portofolio aktif
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="px-4 py-2 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Total Aset (Equity)</p>
                        <p className="text-xl font-black text-blue-600">{formatIDR(totals.grandTotal)}</p>
                    </div>
                </div>
            </header>

            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard
                    title="Modal Gabungan"
                    value={formatIDR(totals.invested)}
                    icon={Briefcase}
                />
                <SummaryCard
                    title="Total Cash Gabungan"
                    value={formatIDR(totals.cash)}
                    icon={Wallet}
                    trend="neutral"
                />
                <SummaryCard
                    title="Cuan/Rugi Total"
                    value={totals.profitLoss >= 0 ? `+${formatIDR(totals.profitLoss)}` : formatIDR(totals.profitLoss)}
                    subValue={formatPercentage(totals.returnPercent)}
                    icon={TrendingUp}
                    trend={totals.profitLoss >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    title="Day Change"
                    value={totals.dayChange >= 0 ? `+${formatIDR(totals.dayChange)}` : formatIDR(totals.dayChange)}
                    subValue={(totals.dayChange >= 0 ? "+" : "") + formatPercentage(totals.dayChangePercent)}
                    icon={Activity}
                    trend={totals.dayChange >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    title="Market Share"
                    value={portfolios.sort((a, b) => b.marketValue - a.marketValue)[0]?.name || "-"}
                    subValue="Leading Portfolio"
                    icon={PieChart}
                    trend="up"
                />
            </div>

            <DashboardTabs
                tabs={[
                    { id: "overview", label: "Perbandingan Porto", icon: <Layers className="w-4 h-4" /> },
                    { id: "stocks", label: "Konsolidasi Saham", icon: <Briefcase className="w-4 h-4" /> }
                ]}
            >
                {(activeTab) => (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeTab === "overview" ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Comparison Table */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Portofolio</h3>
                                        <Activity className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Portofolio</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Total Aset</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Day Change</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Return Gabungan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {portfolios.map((p) => (
                                                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                                                                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{p.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 ml-7">{p.tickerCount} Saham aktif</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900 dark:text-white">{formatIDR(p.totalValue)}</div>
                                                            <div className="text-[10px] text-gray-500">Cash: {formatIDR(p.cashValue)}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("font-bold", p.dayChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                                {p.dayChange >= 0 ? "+" : ""}{formatIDR(p.dayChange)}
                                                            </div>
                                                            <div className={cn("text-[10px] font-bold", p.dayChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                {p.dayChange >= 0 ? "+" : ""}{formatPercentage(p.dayChangePercent)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("font-black text-lg", p.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                                {formatPercentage(p.returnPercent)}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                {p.profitLoss >= 0 ? "+" : ""}{formatIDR(p.profitLoss)} Total
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Distribution Chart */}
                                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Distribusi Aset</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: number) => formatIDR(value)}
                                                />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {chartData.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                                    <span className="text-gray-500 font-medium">{d.name}</span>
                                                </div>
                                                <span className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                                    {((d.value / totals.grandTotal) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Konsolidasi Kepemilikan Saham</h3>
                                    <p className="text-xs text-gray-500 font-medium">Gabungan saham yang sama dari seluruh portofolio</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Saham (Ticker)</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Total Lot</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Avg / Current</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Market Value</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Return Gabungan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {consolidatedItems.map((item) => (
                                                <tr key={item.ticker} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-black text-indigo-600 uppercase mb-0.5">{item.ticker}</div>
                                                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{item.name}</div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {item.portfolios.map(pName => (
                                                                <span key={pName} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                                                                    {pName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-black text-gray-900 dark:text-white tracking-tighter">{item.totalLots} <span className="text-[10px] text-gray-400">Lot</span></div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-bold text-gray-400">Avg: {formatIDR(item.avgPrice)}</div>
                                                        <div className="text-xs font-black text-gray-900 dark:text-white">Cur: {formatIDR(item.currentPrice)}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{formatIDR(item.marketValue)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className={cn("font-black text-lg", item.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                            {formatPercentage(item.returnPercent)}
                                                        </div>
                                                        <div className={cn("text-[10px] font-bold", item.profitLoss >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                            {item.profitLoss >= 0 ? "+" : ""}{formatIDR(item.profitLoss)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {consolidatedItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-sm tracking-widest">
                                                        Belum ada kepemilikan saham
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DashboardTabs>
        </div>
    );
}
