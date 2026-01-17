"use client";

import { useMemo, useRef } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { SummaryCard } from "@/components/SummaryCard";
import { AllocationChart } from "@/components/AllocationChart";
import { GainLossChart } from "@/components/GainLossChart";
import { CashManager } from "@/components/CashManager";
import { EquityGrowthChart } from "@/components/EquityGrowthChart";
import { DashboardTabs } from "@/components/DashboardTabs";
import { Briefcase, DollarSign, TrendingUp, Activity } from "lucide-react";
import { formatIDR, formatPercentage } from "@/lib/utils";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/Skeleton";
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { exportToPDF } from "@/lib/exportPDF";

export default function HomePage() {
  const { portfolio, isLoaded } = usePortfolio();
  const { cash, updateCash, getHistoryForPeriod } = useCashAndHistory();
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

    portfolio.forEach((item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      const marketPrice = livePrice > 0 ? livePrice : 0;
      const shares = item.lots * 100;
      const invested = item.averagePrice * shares;
      const marketValue = marketPrice * shares;

      totalInvested += invested;
      totalMarketValue += marketValue;
    });

    const totalEquity = totalMarketValue + cash;
    const totalGainLoss = totalMarketValue - totalInvested;
    const totalReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalMarketValue,
      totalEquity,
      totalGainLoss,
      totalReturn,
      cash,
    };
  }, [portfolio, prices, cash]);

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Real-time data'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Trigger summary export
                const event = new CustomEvent('export-portfolio-summary');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Activity className="w-4 h-4" />
              <span>Share Return</span>
            </button>
            <ExportPDFButton onClick={handleExportPDF} size="md" />
          </div>
        </div>

        {/* Summary Cards - Always Visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <SummaryCard
            title="Total Modal"
            value={formatIDR(summary.totalInvested)}
            icon={Briefcase}
          />
          <SummaryCard
            title="Total Portfolio"
            value={formatIDR(summary.totalEquity)}
            subValue={pricesLoading ? "..." : "Live"}
            icon={Activity}
            trend="neutral"
          />
          <SummaryCard
            title="Unrealized P/L"
            value={summary.totalGainLoss > 0 ? `+${formatIDR(summary.totalGainLoss)}` : formatIDR(summary.totalGainLoss)}
            icon={DollarSign}
            trend={summary.totalGainLoss >= 0 ? "up" : "down"}
          />
          <SummaryCard
            title="Return"
            value={formatPercentage(summary.totalReturn)}
            icon={TrendingUp}
            trend={summary.totalReturn >= 0 ? "up" : "down"}
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
