"use client";

import { useMemo, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { GrowthChart } from "@/components/GrowthChart";
import { AllocationTabs } from "@/components/AllocationTabs";
import { GainLossChart } from "@/components/GainLossChart";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { DiversificationScore } from "@/components/DiversificationScore";
import { CostBasisAnalysis } from "@/components/CostBasisAnalysis";
import { HoldingPeriodAnalysis } from "@/components/HoldingPeriodAnalysis";

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, recordSnapshot, getGrowth, getHistoryForPeriod, clearHistory, transactions, isLoaded: cashLoaded } = useCashAndHistory();

    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices, loading: pricesLoading } = useMarketData(tickers);

    const summary = useMemo(() => {
        let totalMarketValue = 0;
        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            totalMarketValue += item.lots * 100 * livePrice;
        });
        return { totalMarketValue };
    }, [portfolio, prices]);


    // Record snapshot on value changes (with debounce to prevent spam)
    useEffect(() => {
        if (!isLoaded || !cashLoaded || pricesLoading) return;
        if (summary.totalMarketValue === 0) return;

        // Debounce to prevent too many calls
        const timeoutId = setTimeout(() => {
            recordSnapshot(summary.totalMarketValue, cash);
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeoutId);
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading]);

    const chartData = useMemo(() => {
        const totalValue = portfolio.reduce((sum, item) => {
            return sum + (item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice));
        }, 0);

        return portfolio.map((item) => {
            const livePrice = prices[item.ticker]?.price || item.averagePrice;
            const value = item.lots * 100 * livePrice;
            const costBasis = item.lots * 100 * item.averagePrice;
            const gainLoss = value - costBasis;
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

            return {
                name: item.ticker,
                value,
                percentage,
                gainLoss,
            };
        }).filter(d => d.value > 0);
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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Analisis performa portfolio Anda
                    </p>
                </div>

                {/* Growth Chart - Full Width */}
                <div className="mb-6">
                    <GrowthChart
                        getGrowth={getGrowth}
                        getHistoryForPeriod={getHistoryForPeriod}
                        onResetHistory={clearHistory}
                    />
                </div>

                {/* Performance Metrics - Full Width */}
                <div className="mb-6">
                    <PerformanceMetrics portfolio={portfolio} prices={prices} />
                </div>

                {/* Allocation Tabs (Stock & Sector) - Full Width */}
                <div className="mb-6">
                    <AllocationTabs portfolio={portfolio} prices={prices} allocationData={chartData} />
                </div>

                {/* Gain/Loss Chart - Full Width */}
                <div className="mb-6">
                    <GainLossChart data={gainLossChartData} />
                </div>

                {/* Diversification & Cost Basis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <DiversificationScore portfolio={portfolio} prices={prices} />
                    <CostBasisAnalysis portfolio={portfolio} prices={prices} />
                </div>

                {/* Holding Period Analysis - Full Width */}
                <div className="mb-6">
                    <HoldingPeriodAnalysis portfolio={portfolio} transactions={transactions} prices={prices} />
                </div>
            </div>
        </div>
    );
}
