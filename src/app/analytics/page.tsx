"use client";

import { useMemo, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { GrowthChart } from "@/components/GrowthChart";
import { AllocationChart } from "@/components/AllocationChart";
import { GainLossChart } from "@/components/GainLossChart";

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, recordSnapshot, getGrowth, getHistoryForPeriod, isLoaded: cashLoaded } = useCashAndHistory();

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

    useEffect(() => {
        if (isLoaded && cashLoaded && !pricesLoading && portfolio.length > 0) {
            recordSnapshot(summary.totalMarketValue, cash);
        }
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded]);

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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Analisis performa portfolio Anda
                    </p>
                </div>

                {/* Growth Chart - Full Width */}
                <div className="mb-6">
                    <GrowthChart getGrowth={getGrowth} getHistoryForPeriod={getHistoryForPeriod} />
                </div>

                {/* Allocation & Gain/Loss Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AllocationChart data={chartData} />
                    <GainLossChart data={gainLossChartData} />
                </div>
            </div>
        </div>
    );
}
