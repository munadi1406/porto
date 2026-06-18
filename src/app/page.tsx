"use client";

import { useRef } from "react";
import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { useAggregateHistory } from "@/hooks/useAggregateHistory";
import { SummaryCard } from "@/components/SummaryCard";
import { formatIDR, formatPercentage, formatCompactIDR, cn } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Activity, PieChart, Wallet, Layers } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
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
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-80 bg-muted animate-pulse rounded-lg" />
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
    <div ref={dashboardRef} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
            <Layers className="w-4 h-4" />
            <span>Executive View</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Main Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Konsolidasi dari <span className="font-medium text-foreground">{portfolios.length} portofolio</span> aktif.
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <SummaryCard title="Modal Total" value={formatIDR(totals.invested)} icon={Briefcase} />
        <SummaryCard title="Total Cash" value={formatIDR(totals.cash)} icon={Wallet} trend="neutral" />
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
          subLabel="Portofolio Teratas"
          icon={PieChart}
          trend="up"
        />
      </div>

      <DashboardTabs
        tabs={[
          { id: "overview", label: "Perbandingan", icon: <Layers className="w-4 h-4" /> },
          { id: "growth", label: "Performa", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "calendar", label: "Kalender", icon: <CalendarIcon className="w-4 h-4" /> },
          { id: "holdings", label: "Konsolidasi", icon: <Briefcase className="w-4 h-4" /> },
        ]}
      >
        {(activeTab) => (
          <div>
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h2 className="font-medium text-foreground">Perbandingan Portofolio</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="px-4 py-3 font-medium text-left">Portofolio</th>
                          <th className="px-4 py-3 font-medium text-left">Total Aset</th>
                          <th className="px-4 py-3 font-medium text-right">Perubahan</th>
                          <th className="px-4 py-3 font-medium text-right">Total Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {portfolios.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                <div>
                                  <span className="font-medium text-foreground">{p.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{p.tickerCount} saham</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground"><PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(p.totalValue)}</PrivacyWrapper></div>
                              <div className="text-xs text-muted-foreground">Cash: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(p.cashValue)}</PrivacyWrapper></div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className={cn("font-medium", p.dayChange >= 0 ? "text-success" : "text-destructive")}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{p.dayChange >= 0 ? "+" : ""}{formatIDR(p.dayChange)}</PrivacyWrapper>
                              </div>
                              <div className={cn("text-xs", p.dayChange >= 0 ? "text-success" : "text-destructive")}>
                                {p.dayChange >= 0 ? "+" : ""}{formatPercentage(p.dayChangePercent)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className={cn("font-semibold", p.profitLoss >= 0 ? "text-success" : "text-destructive")}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{formatPercentage(p.returnPercent)}</PrivacyWrapper>
                              </div>
                              <div className="text-xs text-muted-foreground">{formatIDR(p.profitLoss)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-card border border-border rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-4">Distribusi Aset</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                          {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                          formatter={(value: any) => formatIDR(Number(value || 0))}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center mt-2">
                    <p className="text-2xl font-semibold text-foreground">
                      <PrivacyWrapper isPrivate={isPrivacyMode}>{formatCompactIDR(totals.grandTotal)}</PrivacyWrapper>
                    </p>
                  </div>
                  <div className="space-y-1 mt-3">
                    {chartData.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          <PrivacyWrapper isPrivate={isPrivacyMode}>{((d.value / totals.grandTotal) * 100).toFixed(1)}%</PrivacyWrapper>
                        </span>
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
              <div className="space-y-4">
                <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={totals.grandTotal} totalReturnPercent={totals.returnPercent} />
                <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-4">
                <DailyPerformanceCalendar history={history} />
                <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
              </div>
            )}

            {activeTab === "holdings" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-medium text-foreground">Konsolidasi Saham</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium text-left">Saham</th>
                        <th className="px-4 py-3 font-medium text-right">Lot</th>
                        <th className="px-4 py-3 font-medium text-right">Harga</th>
                        <th className="px-4 py-3 font-medium text-right">Market Value</th>
                        <th className="px-4 py-3 font-medium text-right">Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {consolidatedItems.map((item: any) => (
                        <tr key={item.ticker} className="hover:bg-muted transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/analysis/${item.ticker}`} className="block">
                              <div className="font-mono font-medium text-primary text-sm">{item.ticker}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.name}</div>
                            </Link>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.portfolios.map((pName: string) => (
                                <span key={pName} className="text-[10px] px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">{pName}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{item.totalLots} lot</td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-[11px] text-muted-foreground">Avg: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.avgPrice)}</PrivacyWrapper></div>
                            <div className="text-sm font-medium text-foreground">Cur: <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.currentPrice)}</PrivacyWrapper></div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-foreground"><PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(item.marketValue)}</PrivacyWrapper></td>
                          <td className="px-4 py-3 text-right">
                            <div className={cn("font-semibold", item.profitLoss >= 0 ? "text-success" : "text-destructive")}>
                              <PrivacyWrapper isPrivate={isPrivacyMode}>{formatPercentage(item.returnPercent)}</PrivacyWrapper>
                            </div>
                            <div className={cn("text-xs", item.profitLoss >= 0 ? "text-success" : "text-destructive")}>
                              {item.profitLoss >= 0 ? "+" : ""}{formatIDR(item.profitLoss)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {consolidatedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
