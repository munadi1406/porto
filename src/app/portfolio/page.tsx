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
            exportToPDF(portfolioRef.current, { title: 'Portfolio Holdings' });
        }
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleAddStock = (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        addStock(data);
        setIsAddModalOpen(false);
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
            <div>
                <div className="mb-4 space-y-2">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                </div>
                <PortfolioTableSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }} />
                        {currentPortfolio?.name || "Portfolio"}
                    </h1>
                    <p className="text-sm text-muted-foreground">{portfolio.length} holdings</p>
                </div>
                <ExportPDFButton onClick={handleExportPDF} size="md" />
            </div>

            <div>
                <DecisionAdvisor portfolio={portfolio} cash={cash} prices={prices} />
            </div>

            <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Tambah Saham
            </button>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-card p-6 rounded-lg w-full max-w-lg border border-border">
                        <div className="mb-4">
                            <h3 className="font-medium text-foreground">Tambah Saham</h3>
                            <p className="text-sm text-muted-foreground">Beli aset baru ke portfolio</p>
                        </div>
                        <StockForm
                            onSubmit={handleAddStock}
                            onCancel={() => setIsAddModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            <DashboardTabs
                tabs={[
                    { id: "holdings", label: "Holdings", icon: <Layers className="w-4 h-4" /> },
                    { id: "target", label: "Target Portfolio", icon: <Target className="w-4 h-4" /> }
                ]}
            >
                {(activeTab) => (
                    <div>
                        {activeTab === "holdings" ? (
                            <div ref={portfolioRef}>
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
    );
}
