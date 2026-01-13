"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StockForm } from "@/components/StockForm";
import { Plus } from "lucide-react";

export default function PortfolioPage() {
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded } = usePortfolio();
    const { recordTransaction } = useCashAndHistory();

    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices } = useMarketData(tickers);

    const handleAddStock = (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        addStock(data);

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

    const handleExecuteTransaction = (id: string, type: 'buy' | 'sell', lots: number, price: number) => {
        const item = portfolio.find(p => p.id === id);
        if (!item) return;

        executeTransaction(id, type, lots, price);

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Kelola saham Anda • {portfolio.length} holdings
                    </p>
                </div>

                {/* Add Stock Form */}
                <div className="mb-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tambah Saham</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Beli saham baru</p>
                        </div>
                    </div>
                    <StockForm onSubmit={handleAddStock} />
                </div>

                {/* Portfolio Table */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Holdings</h2>
                    <PortfolioTable
                        portfolio={portfolio}
                        marketData={prices}
                        onRemove={removeStock}
                        onUpdate={updateStock}
                        onTransaction={handleExecuteTransaction}
                    />
                </div>
            </div>
        </div>
    );
}
