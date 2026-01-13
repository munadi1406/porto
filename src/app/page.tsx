"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { SummaryCard } from "@/components/SummaryCard";
import { AllocationChart } from "@/components/AllocationChart";
import { GainLossChart } from "@/components/GainLossChart";
import { CashManager } from "@/components/CashManager";
import { Briefcase, DollarSign, TrendingUp, Activity } from "lucide-react";
import { formatIDR, formatPercentage } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  const { portfolio, isLoaded } = usePortfolio();
  const { cash, updateCash } = useCashAndHistory();

  const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
  const { prices, loading: pricesLoading, lastUpdated } = useMarketData(tickers);

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalMarketValue = 0;

    portfolio.forEach((item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      const marketPrice = livePrice > 0 ? livePrice : 0;

      totalInvested += item.lots * 100 * item.averagePrice;
      totalMarketValue += item.lots * 100 * marketPrice;
    });

    const totalPL = totalMarketValue - totalInvested;
    const returnPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    return { totalInvested, totalMarketValue, totalPL, returnPercent };
  }, [portfolio, prices]);

  const chartData = useMemo(() => {
    return portfolio.map((item) => ({
      name: item.ticker,
      value: item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice),
    })).filter(d => d.value > 0);
  }, [portfolio, prices]);

  const gainLossChartData = useMemo(() => {
    const totalGainLoss = portfolio.reduce((sum, item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      if (livePrice === 0) return sum;

      const marketValue = item.lots * 100 * livePrice;
      const initialValue = item.lots * 100 * item.averagePrice;
      return sum + Math.abs(marketValue - initialValue);
    }, 0);

    return portfolio.map((item) => {
      const livePrice = prices[item.ticker]?.price || 0;
      const marketValue = item.lots * 100 * livePrice;
      const initialValue = item.lots * 100 * item.averagePrice;
      const gainLoss = marketValue - initialValue;
      const percentage = totalGainLoss > 0 ? (Math.abs(gainLoss) / totalGainLoss) * 100 : 0;

      return {
        name: item.ticker,
        value: Math.abs(gainLoss),
        gainLoss: gainLoss,
        percentage: percentage,
      };
    }).filter(d => d.gainLoss !== 0);
  }, [portfolio, prices]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Real-time data'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <SummaryCard
            title="Total Modal"
            value={formatIDR(summary.totalInvested)}
            icon={Briefcase}
          />
          <SummaryCard
            title="Total Portfolio"
            value={formatIDR(summary.totalMarketValue + cash)}
            subValue={pricesLoading ? "..." : "Live"}
            icon={Activity}
            trend="neutral"
          />
          <SummaryCard
            title="Unrealized P/L"
            value={summary.totalPL > 0 ? `+${formatIDR(summary.totalPL)}` : formatIDR(summary.totalPL)}
            icon={DollarSign}
            trend={summary.totalPL >= 0 ? "up" : "down"}
          />
          <SummaryCard
            title="Return"
            value={formatPercentage(summary.returnPercent)}
            icon={TrendingUp}
            trend={summary.returnPercent >= 0 ? "up" : "down"}
          />
        </div>

        {/* Cash Manager - Mobile Full Width */}
        <div className="mb-6">
          <CashManager cash={cash} onUpdateCash={updateCash} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="min-h-[450px]">
            <AllocationChart data={chartData} />
          </div>
          <div className="min-h-[450px]">
            <GainLossChart data={gainLossChartData} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
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
