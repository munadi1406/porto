"use client";

import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { SummaryCard } from "@/components/SummaryCard";
import { formatIDR, formatPercentage, formatCompactIDR, cn } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Activity, PieChart, Wallet, Layers } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { DashboardTabs } from "@/components/DashboardTabs";

export default function AggregatePage() {
    const { data, loading } = useAggregatePortfolio();

    if (loading || !data) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-48 bg-[var(--border)] animate-pulse rounded" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-[var(--border)] animate-pulse rounded-lg" />
                    ))}
                </div>
                <div className="h-80 bg-[var(--border)] animate-pulse rounded-lg" />
            </div>
        );
    }

    const { portfolios, totals, consolidatedItems } = data;

    const chartData = portfolios.map((p: any) => ({
        name: p.name,
        value: p.totalValue,
        color: p.color
    })).filter((d: any) => d.value > 0);

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--accent)] mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Consolidated View</span>
                </div>
                <h1 className="text-2xl font-semibold text-[var(--fg)] tracking-tight">Ringkasan Seluruh Portofolio</h1>
                <p className="text-sm text-[var(--muted)]">Konsolidasi dari {portfolios.length} portofolio aktif</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SummaryCard title="Total Investasi" value={formatIDR(totals.invested)} icon={Briefcase} />
                <SummaryCard title="Total Cash" value={formatIDR(totals.cash)} icon={Wallet} trend="neutral" />
                <SummaryCard title="Unrealized P/L" value={totals.profitLoss >= 0 ? `+${formatIDR(totals.profitLoss)}` : formatIDR(totals.profitLoss)} subValue={formatPercentage(totals.returnPercent)} icon={TrendingUp} trend={totals.profitLoss >= 0 ? "up" : "down"} />
                <SummaryCard title="Day Change" value={totals.dayChange >= 0 ? `+${formatIDR(totals.dayChange)}` : formatIDR(totals.dayChange)} subValue={(totals.dayChange >= 0 ? "+" : "") + formatPercentage(totals.dayChangePercent)} icon={Activity} trend={totals.dayChange >= 0 ? "up" : "down"} />
                <SummaryCard title="Net Equity" value={formatIDR(totals.grandTotal)} icon={DollarSign} trend="up" />
            </div>

            <DashboardTabs
                tabs={[
                    { id: "overview", label: "Overview", icon: <Layers className="w-4 h-4" /> },
                    { id: "holdings", label: "Holdings", icon: <Briefcase className="w-4 h-4" /> },
                ]}
            >
                {(activeTab) => (
                    <>
                        {activeTab === "overview" && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--border)]">
                                        <h2 className="font-medium text-[var(--fg)]">Perbandingan Portofolio</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                                                    <th className="px-4 py-3 font-medium text-left">Portofolio</th>
                                                    <th className="px-4 py-3 font-medium text-right">Total Aset</th>
                                                    <th className="px-4 py-3 font-medium text-right">Day Change</th>
                                                    <th className="px-4 py-3 font-medium text-right">Total Return</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {portfolios.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="font-medium text-[var(--fg)]">{p.name}</span>
                                                            </div>
                                                            <span className="text-xs text-[var(--muted)]">{p.tickerCount} saham</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="font-medium text-[var(--fg)]">{formatIDR(p.totalValue)}</div>
                                                            <div className="text-xs text-[var(--muted)]">Cash: {formatIDR(p.cashValue)}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className={cn("font-medium", p.dayChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                                                {p.dayChange >= 0 ? "+" : ""}{formatIDR(p.dayChange)}
                                                            </div>
                                                            <div className={cn("text-xs", p.dayChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                                                {p.dayChange >= 0 ? "+" : ""}{formatPercentage(p.dayChangePercent)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className={cn("font-semibold", p.profitLoss >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                                                {formatPercentage(p.returnPercent)}
                                                            </div>
                                                            <div className="text-xs text-[var(--muted)]">{formatIDR(p.profitLoss)}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                                    <h3 className="font-medium text-[var(--fg)] mb-4">Distribusi Aset</h3>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPieChart>
                                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                                                    {chartData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: any) => formatIDR(Number(value))} />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="text-center mt-2">
                                        <p className="text-2xl font-semibold text-[var(--fg)]">{formatCompactIDR(totals.grandTotal)}</p>
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        {chartData.map((d: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                                    <span className="text-sm text-[var(--muted-fg)]">{d.name}</span>
                                                </div>
                                                <span className="text-sm font-medium text-[var(--fg)]">{((d.value / totals.grandTotal) * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "holdings" && (
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-[var(--border)]">
                                    <h3 className="font-medium text-[var(--fg)]">Konsolidasi Saham</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                                                <th className="px-4 py-3 font-medium text-left">Saham</th>
                                                <th className="px-4 py-3 font-medium text-right">Lot</th>
                                                <th className="px-4 py-3 font-medium text-right">Harga</th>
                                                <th className="px-4 py-3 font-medium text-right">Market Value</th>
                                                <th className="px-4 py-3 font-medium text-right">Return</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {consolidatedItems.map((item: any) => (
                                                <tr key={item.ticker} className="hover:bg-[var(--surface-hover)] transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono font-medium text-[var(--accent)] text-sm">{item.ticker}</div>
                                                        <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">{item.name}</div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.portfolios.map((pName: string) => (
                                                                <span key={pName} className="text-[10px] px-1.5 py-0.5 bg-[var(--surface-hover)] border border-[var(--border)] rounded text-[var(--muted)]">{pName}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-[var(--fg)]">{item.totalLots} lot</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="text-xs text-[var(--muted)]">Avg: {formatIDR(item.avgPrice)}</div>
                                                        <div className="text-sm font-medium text-[var(--fg)]">Cur: {formatIDR(item.currentPrice)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-[var(--fg)]">{formatIDR(item.marketValue)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className={cn("font-semibold", item.profitLoss >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>{formatPercentage(item.returnPercent)}</div>
                                                        <div className={cn("text-xs", item.profitLoss >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>{item.profitLoss >= 0 ? "+" : ""}{formatIDR(item.profitLoss)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {consolidatedItems.length === 0 && (
                                                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--muted)]">Belum ada kepemilikan saham</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </DashboardTabs>
        </div>
    );
}
