"use client";

import { useRef } from "react";
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
import { DailyPerformanceCalendar } from "@/components/DailyPerformanceCalendar";
import { ExportDashboard } from "@/components/ExportDashboard";
import { SharePortfolio } from "@/components/SharePortfolio";
import { PrivacyWrapper } from "@/components/PrivacyWrapper";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { isPrivacyMode } = usePrivacyMode();
  const { data, loading } = useAggregatePortfolio();
  const { history, getHistoryForPeriod, loading: historyLoading } = useAggregateHistory();

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
    <div ref={dashboardRef} className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2 border border-blue-100 dark:border-blue-800">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Executive View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
            Main Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Konsolidasi dari <span className="text-gray-900 dark:text-white font-medium">{portfolios.length} portofolio</span> aktif hari ini.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Export & Share Controls */}
          <div className="flex items-center gap-2">
            <SharePortfolio
              consolidatedItems={consolidatedItems || []}
              totals={{
                grandTotal: totals.grandTotal || 0,
                profitLoss: totals.profitLoss || 0,
                returnPercent: totals.returnPercent || 0,
                invested: totals.invested || 0
              }}
            />
            <ExportDashboard targetRef={dashboardRef} filename="main-dashboard" />
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-[#23272f] p-3 rounded-lg border border-gray-200 dark:border-[#2d3139] shadow-sm">
            <div className="px-3 border-r border-gray-200 dark:border-[#2d3139]">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Total Equity</p>
              <p className="text-lg font-semibold text-blue-600">
                <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(totals.grandTotal)}</PrivacyWrapper>
              </p>
            </div>
            <div className="px-3">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Today's P/L</p>
              <p className={cn(
                "text-lg font-semibold",
                totals.dayChange >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
              )}>
                <PrivacyWrapper isPrivate={isPrivacyMode}>
                  {totals.dayChange >= 0 ? "+" : ""}{formatIDR(totals.dayChange)}
                </PrivacyWrapper>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
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
          { id: "calendar", label: "Kalender Performa", icon: <CalendarIcon className="w-4 h-4" /> },
          { id: "holdings", label: "Konsolidasi Saham", icon: <Briefcase className="w-4 h-4" /> },
        ]}
      >
        {(activeTab) => (
          <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                <div className="lg:col-span-8 bg-white dark:bg-[#23272f] rounded-2xl border border-gray-100 dark:border-[#2d3139] overflow-hidden shadow-sm">
                  <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2d3139] flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1d23]/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Layers className="w-4 h-4 text-[#3498db]" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                          Perbandingan Portofolio
                        </h2>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Performance Matrix</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#1a1d23]/50 border-b border-gray-100 dark:border-[#2d3139]">
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Portofolio</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Total Aset</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide text-right">Perubahan Hari Ini</th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide text-right">Total Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2d3139]">
                        {portfolios.map((p: any) => (
                          <tr key={p.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-[#23272f]" style={{ backgroundColor: p.color }} />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-[#3498db] transition-colors">{p.name}</span>
                                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">{p.tickerCount} Saham</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(p.totalValue)}</PrivacyWrapper>
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">
                                Dana: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(p.cashValue)}</PrivacyWrapper>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className={cn("font-semibold text-sm", p.dayChange >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>
                                  {p.dayChange >= 0 ? "+" : ""}{formatIDR(p.dayChange)}
                                </PrivacyWrapper>
                              </div>
                              <div className={cn("text-[10px] font-medium mt-0.5", p.dayChange >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70")}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>
                                  {p.dayChange >= 0 ? "+" : ""}{formatPercentage(p.dayChangePercent)}
                                </PrivacyWrapper>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className={cn("font-bold text-lg", p.profitLoss >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>
                                  {formatPercentage(p.returnPercent)}
                                </PrivacyWrapper>
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {p.profitLoss >= 0 ? "Untung" : "Rugi"} <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(p.profitLoss)}</PrivacyWrapper>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-[#23272f] rounded-2xl border border-gray-100 dark:border-[#2d3139] shadow-sm p-5 overflow-hidden relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Distribusi Aset</h3>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Weight Allocation</p>
                    </div>
                  </div>

                  <div className="h-[240px] w-full relative mb-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
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
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Total</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        <PrivacyWrapper isPrivate={isPrivacyMode}>{formatCompactIDR(totals.grandTotal)}</PrivacyWrapper>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {chartData.map((d: any, i: number) => (
                      <div key={i} className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">
                              <PrivacyWrapper isPrivate={isPrivacyMode}>
                                {((d.value / totals.grandTotal) * 100).toFixed(1)}%
                              </PrivacyWrapper>
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

            {activeTab === "calendar" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <DailyPerformanceCalendar history={history} />
                <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
              </div>
            )}

            {activeTab === "holdings" && (
              <div className="bg-white dark:bg-[#23272f] rounded-2xl border border-gray-100 dark:border-[#2d3139] overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2d3139] flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1d23]/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Konsolidasi Kepemilikan Saham</h3>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Aggregated Asset View</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-[#1a1d23]/50 border-b border-gray-100 dark:border-[#2d3139]">
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Saham (Ticker)</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Total Kepemilikan</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Harga Rata-rata / Saat Ini</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Market Value</th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase text-gray-500 tracking-wide text-right">Return Gabungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#2d3139]">
                      {consolidatedItems.map((item: any) => (
                        <tr key={item.ticker} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all">
                          <td className="px-4 py-4">
                            <Link href={`/analysis/${item.ticker}`} className="block group/ticker">
                              <div className="text-sm font-semibold text-indigo-600 dark:text-[#3498db] uppercase mb-1 group-hover/ticker:underline">{item.ticker}</div>
                              <div className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</div>
                            </Link>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.portfolios.map((pName: string) => (
                                <span key={pName} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-medium text-gray-500 dark:text-gray-400">
                                  {pName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              <PrivacyWrapper isPrivate={isPrivacyMode}>{item.totalLots}</PrivacyWrapper> <span className="text-[10px] text-gray-400 font-medium ml-1">Lot</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                              Avg: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.avgPrice)}</PrivacyWrapper>
                            </div>
                            <div className="text-xs font-semibold text-gray-900 dark:text-white">
                              Cur: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.currentPrice)}</PrivacyWrapper>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.marketValue)}</PrivacyWrapper>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className={cn("text-lg font-bold", item.profitLoss >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]")}>
                              <PrivacyWrapper isPrivate={isPrivacyMode}>
                                {formatPercentage(item.returnPercent)}
                              </PrivacyWrapper>
                            </div>
                            <div className={cn("text-[10px] font-medium mt-1", item.profitLoss >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70")}>
                              <PrivacyWrapper isPrivate={isPrivacyMode}>
                                {item.profitLoss >= 0 ? "+" : ""}{formatIDR(item.profitLoss)}
                              </PrivacyWrapper>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {consolidatedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 opacity-30">
                              <Briefcase className="w-10 h-10 text-gray-400" />
                              <p className="font-semibold uppercase text-sm tracking-wide text-gray-400">Belum ada kepemilikan saham</p>
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
