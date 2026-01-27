"use client";

import { useMemo, useRef, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { SummaryCard } from "@/components/SummaryCard";
import { AllocationChart } from "@/components/AllocationChart";
import { GainLossChart } from "@/components/GainLossChart";
import { CashManager } from "@/components/CashManager";
import { EquityGrowthChart } from "@/components/EquityGrowthChart";
import { DashboardTabs } from "@/components/DashboardTabs";
import { Briefcase, DollarSign, TrendingUp, Activity, Calendar, Wallet } from "lucide-react";
import { MonthlyPerformanceHeatmap } from "@/components/MonthlyPerformanceHeatmap";
import { formatIDR, formatPercentage } from "@/lib/utils";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/Skeleton";
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { exportToPDF } from "@/lib/exportPDF";
import { DecisionAdvisor } from "@/components/DecisionAdvisor";

export default function HomePage() {
  const { portfolio, isLoaded } = usePortfolio();
  const { currentPortfolio } = usePortfolios();
  const {
    cash,
    updateCash,
    getHistoryForPeriod,
    recordSnapshot,
    history,
    isLoaded: cashLoaded
  } = useCashAndHistory();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
  const { prices, loading: pricesLoading, lastUpdated } = useMarketData(tickers);

  const handleExportPDF = () => {
    if (dashboardRef.current) {
      exportToPDF(dashboardRef.current, {
        title: 'Portfolio Dashboard',
      });
    }
  };

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalMarketValue = 0;
    let dayChange = 0;

    portfolio.forEach((item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      const change = prices[item.ticker]?.change || 0;
      const marketPrice = livePrice > 0 ? livePrice : 0;
      const shares = item.lots * 100;
      const invested = item.averagePrice * shares;
      const marketValue = marketPrice * shares;

      totalInvested += invested;
      totalMarketValue += marketValue;
      dayChange += shares * change;
    });

    const totalEquity = totalMarketValue + cash;
    const totalGainLoss = totalMarketValue - totalInvested;
    const totalReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const dayChangePercent = (totalMarketValue - dayChange) > 0
      ? (dayChange / (totalMarketValue - dayChange)) * 100
      : 0;

    return {
      totalInvested,
      totalMarketValue,
      totalEquity,
      totalGainLoss,
      totalReturn,
      dayChange,
      dayChangePercent,
      cash,
    };
  }, [portfolio, prices, cash]);

  const lastRecordTimeRef = useRef<number>(0);

  // Record snapshot when prices or cash update
  useEffect(() => {
    // Only record if:
    // 1. Portfolio and cash are loaded
    // 2. Prices are not loading AND have been updated at least once
    // 3. If portfolio is not empty, totalMarketValue must be > 0 (wait for real prices)
    // 4. Throttle: only record every 5 minutes
    const hasPortfolio = portfolio.length > 0;
    const hasPrices = lastUpdated !== null;
    const isValidValue = !hasPortfolio || summary.totalMarketValue > 0;

    const now = Date.now();
    const isThrottleExpired = now - lastRecordTimeRef.current > 5 * 60 * 1000; // 5 minutes

    if (isLoaded && cashLoaded && !pricesLoading && hasPrices && isValidValue && isThrottleExpired) {
      recordSnapshot(summary.totalMarketValue, cash);
      lastRecordTimeRef.current = now;
    }
  }, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading, lastUpdated, portfolio.length, recordSnapshot]);

  const chartData = useMemo(() => {
    return portfolio.map((item) => ({
      name: item.ticker,
      value: item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice),
    })).filter(d => d.value > 0);
  }, [portfolio, prices]);

  const gainLossData = useMemo(() => {
    return portfolio.map((item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      const marketPrice = livePrice > 0 ? livePrice : 0;
      const shares = item.lots * 100;
      const invested = item.averagePrice * shares;
      const marketValue = marketPrice * shares;
      const gainLoss = marketValue - invested;
      const percentage = invested > 0 ? (gainLoss / invested) * 100 : 0;

      return {
        ticker: item.ticker,
        name: item.name,
        value: Math.abs(gainLoss),
        gainLoss: gainLoss,
        percentage: percentage,
      };
    }).filter(d => d.gainLoss !== 0);
  }, [portfolio, prices]);

  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div ref={dashboardRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 border border-gray-200 dark:border-gray-700">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Portfolio View</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">
              {currentPortfolio?.name || "Portfolio Dashboard"}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {lastUpdated ? `Terakhir diperbarui: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Mendapatkan data real-time...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const event = new CustomEvent('export-portfolio-summary');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-black rounded-xl transition-all border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 active:scale-95 uppercase tracking-widest shadow-sm"
            >
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Share Performance</span>
            </button>
            <ExportPDFButton onClick={handleExportPDF} size="md" className="shadow-lg shadow-gray-200 dark:shadow-none" />
          </div>
        </div>

        {/* Summary Cards - Always Visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <SummaryCard
            title="Net Worth"
            value={formatIDR(summary.totalEquity)}
            subValue={pricesLoading ? "..." : "Day: " + (summary.dayChange >= 0 ? "+" : "") + formatPercentage(summary.dayChangePercent)}
            icon={Activity}
            trend={summary.dayChange >= 0 ? "up" : "down"}
          />
          <SummaryCard
            title="Unrealized P/L"
            value={summary.totalGainLoss > 0 ? `+${formatIDR(summary.totalGainLoss)}` : formatIDR(summary.totalGainLoss)}
            subValue={formatPercentage(summary.totalReturn)}
            icon={DollarSign}
            trend={summary.totalGainLoss >= 0 ? "up" : "down"}
          />
          <SummaryCard
            title="Total Modal"
            value={formatIDR(summary.totalInvested)}
            icon={Briefcase}
          />
          <SummaryCard
            title="Cash Balance"
            value={formatIDR(summary.cash)}
            icon={Wallet}
            trend="neutral"
          />
        </div>

        {/* Smart Advisor */}
        <div className="mb-6">
          <DecisionAdvisor
            portfolio={portfolio}
            cash={cash}
            prices={prices}
          />
        </div>

        {/* Cash Manager */}
        <div className="mb-6">
          <CashManager cash={cash} onUpdateCash={updateCash} />
        </div>

        {/* Tabs for Charts */}
        <DashboardTabs
          tabs={[
            { id: "growth", label: "Portfolio Growth", icon: <TrendingUp className="w-5 h-5" /> },
            { id: "allocation", label: "Allocation", icon: <Briefcase className="w-5 h-5" /> },
            { id: "gainloss", label: "Gain/Loss", icon: <DollarSign className="w-5 h-5" /> },
            { id: "heatmap", label: "History", icon: <Calendar className="w-5 h-5" /> },
          ]}
        >
          {(activeTab) => (
            <>
              {activeTab === "growth" && (
                <div className="space-y-6">
                  <EquityGrowthChart
                    getHistoryForPeriod={getHistoryForPeriod}
                    currentEquity={summary.totalEquity}
                  />
                </div>
              )}

              {activeTab === "allocation" && (
                <div className="grid grid-cols-1 gap-6">
                  <AllocationChart data={chartData} />
                </div>
              )}

              {activeTab === "gainloss" && (
                <div className="grid grid-cols-1 gap-6">
                  <GainLossChart data={gainLossData} />
                </div>
              )}

              {activeTab === "heatmap" && (
                <div className="space-y-6">
                  <MonthlyPerformanceHeatmap history={history} />
                </div>
              )}
            </>
          )}
        </DashboardTabs>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/portfolio"
            className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Portfolio</h3>
            <p className="text-xs text-gray-500">{portfolio.length} saham</p>
          </Link>

          <Link
            href="/analytics"
            className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analytics</h3>
            <p className="text-xs text-gray-500">Lihat growth</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
