"use client";

import { useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StockForm } from "@/components/StockForm";
import { Plus } from "lucide-react";
import { PortfolioTableSkeleton } from "@/components/Skeleton";
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { exportToPDF } from "@/lib/exportPDF";
import { DecisionAdvisor } from "@/components/DecisionAdvisor";
import { DashboardTabs } from "@/components/DashboardTabs";
import { TargetPortfolio } from "@/components/TargetPortfolio";
import { Target, Layers } from "lucide-react";

export default function PortfolioPage() {
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded, selectedPortfolioId } = usePortfolio();
    const { currentPortfolio } = usePortfolios();
    const { cash, recordTransaction } = useCashAndHistory();
    const portfolioRef = useRef<HTMLDivElement>(null);

    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { prices } = useMarketData(tickers);

    const handleExportPDF = () => {
        if (portfolioRef.current) {
            exportToPDF(portfolioRef.current, {
                title: 'Portfolio Holdings',
            });
        }
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleAddStock = (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        addStock(data);
        setIsAddModalOpen(false); // Close modal after success

        recordTransaction({
            portfolioId: selectedPortfolioId || '',
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
            portfolioId: selectedPortfolioId || '',
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6 space-y-2">
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                    <PortfolioTableSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div
                                className="w-5 h-5 rounded-full"
                                style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }}
                            />
                            {currentPortfolio?.name || "Portfolio"}
                        </h1>
                        <div className="flex items-center gap-2">
                            <ExportPDFButton onClick={handleExportPDF} size="md" />
                        </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider">
                        Kelola aset investasi • {portfolio.length} holdings
                    </p>
                </div>

                {/* Smart Advisor */}
                <div className="mb-8">
                    <DecisionAdvisor
                        portfolio={portfolio}
                        cash={cash}
                        prices={prices}
                    />
                </div>

                {/* Quick Add Action Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-900/10 dark:shadow-white/5"
                    >
                        <Plus className="w-5 h-5" />
                        Tambah Saham Baru
                    </button>
                </div>

                {/* Add Stock Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] w-full max-w-lg shadow-2xl border border-white/20 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
                                    <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Tambah Saham</h3>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Beli aset baru ke portfolio</p>
                                </div>
                            </div>
                            <StockForm
                                onSubmit={handleAddStock}
                                onCancel={() => setIsAddModalOpen(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Content Tabs */}
                <DashboardTabs
                    tabs={[
                        { id: "holdings", label: "Holdings", icon: <Layers className="w-4 h-4" /> },
                        { id: "target", label: "Target Portfolio", icon: <Target className="w-4 h-4" /> }
                    ]}
                >
                    {(activeTab) => (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {activeTab === "holdings" ? (
                                <div ref={portfolioRef}>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Holdings</h2>
                                    <PortfolioTable
                                        portfolio={portfolio}
                                        marketData={prices}
                                        onRemove={removeStock}
                                        onUpdate={updateStock}
                                        onTransaction={handleExecuteTransaction}
                                    />
                                </div>
                            ) : (
                                <TargetPortfolio portfolio={portfolio} prices={prices} cash={cash} />
                            )}
                        </div>
                    )}
                </DashboardTabs>
            </div>
        </div>
    );
}
