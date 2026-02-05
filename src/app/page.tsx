"use client";

import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { useAggregateHistory } from "@/hooks/useAggregateHistory";
import { SummaryCard } from "@/components/SummaryCard";
import { formatIDR, formatPercentage, formatCompactIDR } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Activity, PieChart, Wallet, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { DashboardTabs } from "@/components/DashboardTabs";
import { EquityGrowthChart } from "@/components/EquityGrowthChart";
import { EquityReturnTable } from "@/components/EquityReturnTable";
import Link from "next/link";

export default function HomePage() {
  const { data, loading } = useAggregatePortfolio();
  const { getHistoryForPeriod, loading: historyLoading } = useAggregateHistory();

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
  const chartData = portfolios.map((p: any) => ({
    name: p.name,
    value: p.totalValue,
    color: p.color
  })).filter((d: any) => d.value > 0);

  return (
    <div className="p-3 sm:p-8 space-y-6 sm:space-y-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-3 border border-blue-100 dark:border-blue-800">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Executive View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
            Main Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            Konsolidasi dari <span className="text-gray-900 dark:text-white font-semibold">{portfolios.length} portofolio</span> aktif hari ini.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 bg-white dark:bg-[#23272f] p-3 rounded-xl border border-gray-200 dark:border-[#2d3139] shadow-sm">
            <div className="px-4 border-r border-gray-200 dark:border-[#2d3139]">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total Equity</p>
              <p className="text-xl font-semibold text-blue-600">{formatIDR(totals.grandTotal)}</p>
            </div>
            <div className="px-4">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Today's P/L</p>
              <p className={cn(
                "text-xl font-semibold",
                totals.dayChange >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
              )}>
                {totals.dayChange >= 0 ? "+" : ""}{formatIDR(totals.dayChange)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-6">
        <SummaryCard
          title="Modal Total"
          value={formatIDR(totals.invested)}
          icon={Briefcase}
        />
        <SummaryCard
          title="Total Cash"
          value={formatIDR(totals.cash)}
          icon={Wallet}
          trend="neutral"
        />
        <SummaryCard
          title="Cuan/Rugi"
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
          title="Top Asset"
          value={portfolios.sort((a: any, b: any) => b.marketValue - a.marketValue)[0]?.name || "-"}
          subValue="Leading Portfolio"
          icon={PieChart}
          trend="up"
        />
      </div>

      <DashboardTabs
        tabs={[
          { id: "overview", label: "Perbandingan Porto", icon: <Layers className="w-4 h-4" /> },
          { id: "growth", label: "Performa Gabungan", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "holdings", label: "Konsolidasi Saham", icon: <Briefcase className="w-4 h-4" /> },
        ]}
      >
        {(activeTab) => (
          <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                <div className="lg:col-span-8 bg-white dark:bg-[#23272f] backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-[#2d3139] overflow-hidden shadow-sm">
                  <div className="p-6 sm:p-8 border-b border-gray-50 dark:border-[#2d3139]/50 flex items-center justify-between bg-gray-50/30 dark:bg-[#1a1d23]/40">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                        <Layers className="w-5 h-5 text-[#3498db]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                          Perbandingan Portofolio
                        </h2>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Performance Matrix</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#1a1d23]/50 border-b border-gray-100 dark:border-[#2d3139]">
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Portofolio</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Total Aset</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] text-right">Perubahan Hari Ini</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] text-right">Total Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2d3139]">
                        {portfolios.map((p: any) => (
                          <tr key={p.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300">
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white dark:ring-[#23272f]" style={{ backgroundColor: p.color }} />
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm group-hover:text-[#3498db] transition-colors">{p.name}</span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">{p.tickerCount} Saham Aktif</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{formatIDR(p.totalValue)}</div>
                              <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Dana: {formatIDR(p.cashValue)}</div>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <div className={cn("font-black text-sm tracking-tight", p.dayChange >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                                {p.dayChange >= 0 ? "+" : ""}{formatIDR(p.dayChange)}
                              </div>
                              <div className={cn("text-[10px] font-bold mt-0.5", p.dayChange >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70")}>
                                {p.dayChange >= 0 ? "+" : ""}{formatPercentage(p.dayChangePercent)}
                              </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <div className={cn("font-black text-xl tracking-tighter", p.profitLoss >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                                {formatPercentage(p.returnPercent)}
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">
                                {p.profitLoss >= 0 ? "Untung" : "Rugi"} {formatIDR(p.profitLoss)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-[#23272f] backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-[#2d3139] shadow-sm p-8 overflow-hidden relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                      <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Distribusi Aset</h3>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Weight Allocation</p>
                    </div>
                  </div>

                  <div className="h-[280px] w-full relative mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: '24px',
                            border: 'none',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                            backgroundColor: '#23272f',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 16px'
                          }}
                          itemStyle={{ fontWeight: '900', color: '#fff' }}
                          formatter={(value: any) => formatIDR(Number(value || 0))}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{formatCompactIDR(totals.grandTotal)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {chartData.map((d: any, i: number) => (
                      <div key={i} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]" style={{ backgroundColor: d.color }} />
                          <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-black text-gray-900 dark:text-white transition-transform group-hover:scale-110">
                              {((d.value / totals.grandTotal) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-12">
                  <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
                </div>
              </div>
            )}

            {activeTab === "growth" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <EquityGrowthChart
                  getHistoryForPeriod={getHistoryForPeriod}
                  currentEquity={totals.grandTotal}
                  totalReturnPercent={totals.returnPercent}
                />
                <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
              </div>
            )}

            {activeTab === "holdings" && (
              <div className="bg-white dark:bg-[#23272f] backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-[#2d3139] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-gray-50 dark:border-[#2d3139]/50 flex items-center justify-between bg-gray-50/30 dark:bg-[#1a1d23]/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                      <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Konsolidasi Kepemilikan Saham</h3>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Aggregated Asset View</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-[#1a1d23]/50 border-b border-gray-100 dark:border-[#2d3139]">
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Saham (Ticker)</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Total Kepemilikan</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Harga Rata-rata / Saat Ini</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em]">Market Value</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] text-right">Return Gabungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#2d3139]">
                      {consolidatedItems.map((item: any) => (
                        <tr key={item.ticker} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300">
                          <td className="px-8 py-6">
                            <Link href={`/analysis/${item.ticker}`} className="block group/ticker">
                              <div className="text-sm font-black text-indigo-600 dark:text-[#3498db] uppercase tracking-tight mb-1 group-hover/ticker:underline">{item.ticker}</div>
                              <div className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</div>
                            </Link>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {item.portfolios.map((pName: string) => (
                                <span key={pName} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-[9px] font-black text-gray-400 uppercase tracking-tighter border border-transparent group-hover:border-gray-200 dark:group-hover:border-[#2d3139] transition-colors">
                                  {pName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-black text-gray-900 dark:text-white tracking-tighter">{item.totalLots} <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Lot</span></div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Avg: {formatIDR(item.avgPrice)}</div>
                            <div className="text-xs font-black text-gray-900 dark:text-white">Cur: {formatIDR(item.currentPrice)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{formatIDR(item.marketValue)}</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className={cn("text-xl font-black tracking-tighter", item.profitLoss >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                              {formatPercentage(item.returnPercent)}
                            </div>
                            <div className={cn("text-[10px] font-bold mt-1 uppercase", item.profitLoss >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70")}>
                              {item.profitLoss >= 0 ? "+" : ""}{formatIDR(item.profitLoss)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {consolidatedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                              <Briefcase className="w-12 h-12 text-gray-400" />
                              <p className="font-black uppercase text-sm tracking-widest text-gray-400">Belum ada kepemilikan saham</p>
                            </div>
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
