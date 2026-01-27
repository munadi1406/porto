"use client";

import { useMemo, useEffect, useRef } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { PortfolioTable } from "./PortfolioTable";
import { SummaryCard } from "./SummaryCard";
import { AllocationChart } from "./AllocationChart";
import { StockForm } from "./StockForm";
import { CashManager } from "./CashManager";
import { EquityGrowthChart } from "./EquityGrowthChart";
import { TransactionHistory } from "./TransactionHistory";
import { GainLossChart } from "./GainLossChart";
import { Briefcase, DollarSign, TrendingUp, Activity, Plus } from "lucide-react";
import { formatIDR, formatPercentage } from "@/lib/utils";
import { DashboardSkeleton } from "./Skeleton";
import { DecisionAdvisor } from "./DecisionAdvisor";

export default function Dashboard() {
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded } = usePortfolio();
    const { cash, updateCash, recordSnapshot, recordTransaction, getGrowth, getHistoryForPeriod, clearHistory, transactions, isLoaded: cashLoaded } = useCashAndHistory();

    // Extract tickers for market data fetching
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices, loading: pricesLoading, lastUpdated } = useMarketData(tickers);

    // Calculate Summary Metrics
    const summary = useMemo(() => {
        let totalInvested = 0;
        let totalMarketValue = 0;

        let totalDayChange = 0;
        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const change = prices[item.ticker]?.change || 0;
            const marketPrice = livePrice > 0 ? livePrice : 0;

            totalInvested += item.lots * 100 * item.averagePrice;
            totalMarketValue += item.lots * 100 * marketPrice;
            totalDayChange += item.lots * 100 * change;
        });

        const totalPL = totalMarketValue - totalInvested;
        const returnPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
        const dayChangePercent = (totalMarketValue - totalDayChange) > 0
            ? (totalDayChange / (totalMarketValue - totalDayChange)) * 100
            : 0;

        return {
            totalInvested,
            totalMarketValue,
            totalPL,
            returnPercent,
            totalDayChange,
            dayChangePercent,
        };
    }, [portfolio, prices]);

    const lastRecordTimeRef = useRef<number>(0);

    // Record snapshot when prices update (for growth tracking)
    useEffect(() => {
        const now = Date.now();
        const isThrottleExpired = now - lastRecordTimeRef.current > 5 * 60 * 1000; // 5 minutes

        if (isLoaded && cashLoaded && !pricesLoading && portfolio.length > 0 && isThrottleExpired) {
            recordSnapshot(summary.totalMarketValue, cash);
            lastRecordTimeRef.current = now;
        }
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading, portfolio.length, recordSnapshot]);

    // Data for Pie Chart
    const chartData = useMemo(() => {
        return portfolio.map((item) => ({
            name: item.ticker,
            value: item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice), // Fallback to avgPrice if live missing for chart
        })).filter(d => d.value > 0);
    }, [portfolio, prices]);

    // Data for Gain/Loss Chart
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
        }).filter(d => d.gainLoss !== 0); // Only show stocks with gain/loss
    }, [portfolio, prices]);

    // Wrapper to add stock and record transaction
    const handleAddStock = async (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        try {
            await addStock(data);

            // Record transaction (updates cash)
            await recordTransaction({
                type: 'buy',
                ticker: data.ticker,
                name: data.name,
                lots: data.lots,
                pricePerShare: data.averagePrice,
                totalAmount: data.lots * 100 * data.averagePrice,
                notes: 'Initial purchase'
            });
        } catch (error) {
            console.error('Error adding stock:', error);
        }
    };

    // Wrapper to execute transaction (buy more / sell)
    const handleExecuteTransaction = async (id: string, type: 'buy' | 'sell', lots: number, price: number) => {
        const item = portfolio.find(p => p.id === id);
        if (!item) return;

        try {
            await executeTransaction(id, type, lots, price);

            // Record transaction (updates cash)
            await recordTransaction({
                type,
                ticker: item.ticker,
                name: item.name,
                lots,
                pricePerShare: price,
                totalAmount: lots * 100 * price,
                notes: type === 'buy' ? 'Buy more' : 'Partial sell'
            });
        } catch (error) {
            console.error('Error executing transaction:', error);
        }
    };

    if (!isLoaded) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard
                    title="Total Modal"
                    value={formatIDR(summary.totalInvested)}
                    icon={Briefcase}
                />
                <SummaryCard
                    title="Total Portfolio"
                    value={formatIDR(summary.totalMarketValue + cash)}
                    subValue={pricesLoading ? "Updating..." : "Live"}
                    subLabel={lastUpdated ? `• ${lastUpdated.toLocaleTimeString()}` : ""}
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
                    title="Return Portofolio"
                    value={formatPercentage(summary.returnPercent)}
                    icon={TrendingUp}
                    trend={summary.returnPercent >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    title="Day Change"
                    value={summary.totalDayChange > 0 ? `+${formatIDR(summary.totalDayChange)}` : formatIDR(summary.totalDayChange)}
                    subValue={(summary.dayChangePercent > 0 ? "+" : "") + formatPercentage(summary.dayChangePercent)}
                    subLabel="Hari Ini"
                    icon={Activity}
                    trend={summary.totalDayChange > 0 ? "up" : summary.totalDayChange < 0 ? "down" : "neutral"}
                />
            </div>

            {/* Smart Advisor */}
            <DecisionAdvisor
                portfolio={portfolio}
                cash={cash}
                prices={prices}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <AllocationChart data={chartData} />
                        <GainLossChart data={gainLossChartData} />
                    </div>
                    <EquityGrowthChart
                        getHistoryForPeriod={getHistoryForPeriod}
                        currentEquity={summary.totalMarketValue + cash}
                    />
                </div>

                {/* Right Col: Cash & Transactions */}
                <div className="space-y-6">
                    <CashManager cash={cash} onUpdateCash={updateCash} />
                    <TransactionHistory transactions={transactions} />
                </div>
            </div>

            {/* Add Stock Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tambah / Beli Saham</h3>
                </div>
                <StockForm onSubmit={handleAddStock} />
            </div>

            {/* Bottom: Table */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Detail Portofolio</h2>
                <PortfolioTable
                    portfolio={portfolio}
                    marketData={prices}
                    onRemove={removeStock}
                    onUpdate={updateStock}
                    onTransaction={handleExecuteTransaction}
                />
            </div>
        </div>
    );
}
