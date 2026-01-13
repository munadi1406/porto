"use client";

import { useMemo, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { PortfolioTable } from "./PortfolioTable";
import { SummaryCard } from "./SummaryCard";
import { AllocationChart } from "./AllocationChart";
import { StockForm } from "./StockForm";
import { CashManager } from "./CashManager";
import { GrowthChart } from "./GrowthChart";
import { TransactionHistory } from "./TransactionHistory";
import { Briefcase, DollarSign, TrendingUp, Activity, Plus } from "lucide-react";
import { formatIDR, formatPercentage } from "@/lib/utils";

export default function Dashboard() {
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded } = usePortfolio();
    const { cash, updateCash, recordSnapshot, recordTransaction, getGrowth, getHistoryForPeriod, transactions, isLoaded: cashLoaded } = useCashAndHistory();

    // Extract tickers for market data fetching
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices, loading: pricesLoading, lastUpdated } = useMarketData(tickers);

    // Calculate Summary Metrics
    const summary = useMemo(() => {
        let totalInvested = 0;
        let totalMarketValue = 0;

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0; // Use 0 if price not loaded yet

            // If price is 0 but we have valid stock, maybe fallback to avgPrice to not show -100% loss?
            // No, strictly use live price. If live price is 0, it means loading or error.
            // Ideally we should track if price is successfully fetched. 
            // For MVP, we accept 0 means 0 value temporarily.

            const marketPrice = livePrice > 0 ? livePrice : 0;

            totalInvested += item.lots * 100 * item.averagePrice;
            totalMarketValue += item.lots * 100 * marketPrice;
        });

        const totalPL = totalMarketValue - totalInvested;
        const returnPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        return {
            totalInvested,
            totalMarketValue,
            totalPL,
            returnPercent,
        };
    }, [portfolio, prices]);

    // Record snapshot when prices update (for growth tracking)
    useEffect(() => {
        if (isLoaded && cashLoaded && !pricesLoading && portfolio.length > 0) {
            recordSnapshot(summary.totalMarketValue, cash);
        }
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded]);

    // Data for Pie Chart
    const chartData = useMemo(() => {
        return portfolio.map((item) => ({
            name: item.ticker,
            value: item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice), // Fallback to avgPrice if live missing for chart
        })).filter(d => d.value > 0);
    }, [portfolio, prices]);

    // Wrapper to add stock and record transaction
    const handleAddStock = (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        addStock(data);

        // Record transaction
        recordTransaction({
            type: 'buy',
            ticker: data.ticker,
            name: data.name,
            lots: data.lots,
            pricePerShare: data.averagePrice,
            totalAmount: data.lots * 100 * data.averagePrice,
            notes: 'Initial purchase'
        });
    };

    // Wrapper to execute transaction (buy more / sell)
    const handleExecuteTransaction = (id: string, type: 'buy' | 'sell', lots: number, price: number) => {
        const item = portfolio.find(p => p.id === id);
        if (!item) return;

        executeTransaction(id, type, lots, price);

        // Record transaction
        recordTransaction({
            type,
            ticker: item.ticker,
            name: item.name,
            lots,
            pricePerShare: price,
            totalAmount: lots * 100 * price,
            notes: type === 'buy' ? 'Buy more' : 'Partial sell'
        });
    };

    if (!isLoaded) {
        return <div className="p-8 flex justify-center text-gray-400">Memuat portofolio...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <AllocationChart data={chartData} />
                    <GrowthChart getGrowth={getGrowth} getHistoryForPeriod={getHistoryForPeriod} />
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
