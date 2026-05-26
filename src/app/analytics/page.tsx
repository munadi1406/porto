"use client";

import { useMemo, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { EquityGrowthChart } from "@/components/EquityGrowthChart";
import { AllocationTabs } from "@/components/AllocationTabs";
import { GainLossChart } from "@/components/GainLossChart";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { DiversificationScore } from "@/components/DiversificationScore";
import { CostBasisAnalysis } from "@/components/CostBasisAnalysis";
import { HoldingPeriodAnalysis } from "@/components/HoldingPeriodAnalysis";
import { EquityReturnTable } from "@/components/EquityReturnTable";
import { MonthlyPerformanceHeatmap } from "@/components/MonthlyPerformanceHeatmap";
import { DailyPerformanceCalendar } from "@/components/DailyPerformanceCalendar";
import { EquityGrowthChartSkeleton, ChartSkeleton, CardSkeleton } from "@/components/Skeleton";
import { DashboardTabs } from "@/components/DashboardTabs";
import { TrendingUp, LayoutList } from "lucide-react";
import { DecisionAdvisor } from "@/components/DecisionAdvisor";

export default function AnalyticsPage() {
    const { portfolio, isLoaded } = usePortfolio();
    const { cash, recordSnapshot, getHistoryForPeriod, transactions, history, isLoaded: cashLoaded } = useCashAndHistory();

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
        if (!isLoaded || !cashLoaded || pricesLoading) return;
        if (summary.totalMarketValue === 0) return;
        const timeoutId = setTimeout(() => {
            recordSnapshot(summary.totalMarketValue, cash);
        }, 2000);
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
            return { name: item.ticker, value, percentage, gainLoss };
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
            return { name: item.ticker, value: Math.abs(gainLoss), gainLoss, percentage };
        }).filter(d => d.gainLoss !== 0);
    }, [portfolio, prices]);

    if (!isLoaded) {
        return (
            <div>
                <div className="mb-4 space-y-2">
                    <div className="h-6 w-32 bg-[var(--border)] animate-pulse rounded" />
                    <div className="h-4 w-48 bg-[var(--border)] animate-pulse rounded" />
                </div>
                <div className="space-y-4">
                    <EquityGrowthChartSkeleton />
                    <ChartSkeleton />
                    <ChartSkeleton />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-[var(--fg)] tracking-tight">Analytics</h1>
                <p className="text-sm text-[var(--muted)]">Analisis performa portfolio Anda</p>
            </div>

            <div>
                <DecisionAdvisor portfolio={portfolio} cash={cash} prices={prices} />
            </div>

            <DashboardTabs
                tabs={[
                    { id: "chart", label: "Growth Chart", icon: <TrendingUp className="w-4 h-4" /> },
                    { id: "table", label: "Return Table", icon: <LayoutList className="w-4 h-4" /> },
                ]}
            >
                {(activeTab) => (
                    <div className="space-y-4">
                        {activeTab === "chart" && (
                            <>
                                <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={summary.totalMarketValue + cash} />
                                <PerformanceMetrics portfolio={portfolio} prices={prices} />
                            </>
                        )}
                        {activeTab === "table" && (
                            <>
                                <EquityReturnTable getHistoryForPeriod={getHistoryForPeriod} />
                                <div className="grid grid-cols-1 gap-4">
                                    <DailyPerformanceCalendar history={history} />
                                    <MonthlyPerformanceHeatmap history={history} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DashboardTabs>

            <AllocationTabs portfolio={portfolio} prices={prices} allocationData={chartData} />
            <GainLossChart data={gainLossChartData} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DiversificationScore portfolio={portfolio} prices={prices} />
                <CostBasisAnalysis portfolio={portfolio} prices={prices} />
            </div>

            <HoldingPeriodAnalysis portfolio={portfolio} transactions={transactions} prices={prices} />
        </div>
    );
}
