"use client";

import { useMemo, useState } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { formatIDR, formatNumber, formatPercentage, cn } from "@/lib/utils";
import { Trash2, Edit2, TrendingUp, TrendingDown, Minus, ArrowRightLeft } from "lucide-react";
import { StockForm } from "./StockForm";
import { TransactionForm } from "./TransactionForm";

interface PortfolioTableProps {
    portfolio: PortfolioItem[];
    marketData: Record<string, StockPrice>;
    onRemove: (id: string) => void;
    onUpdate: (id: string, data: Partial<PortfolioItem>) => void;
    onTransaction: (id: string, type: 'buy' | 'sell', lots: number, price: number) => void;
}

export function PortfolioTable({ portfolio, marketData, onRemove, onUpdate, onTransaction }: PortfolioTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);

    const sortedPortfolio = useMemo(() => {
        return [...portfolio].sort((a, b) => a.ticker.localeCompare(b.ticker));
    }, [portfolio]);

    if (portfolio.length === 0) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="mx-auto w-12 h-12 text-gray-400 mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Belum ada investasi</h3>
                <p className="text-gray-500 dark:text-gray-400">Tambahkan saham pertama Anda untuk mulai memantau.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {editingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Edit Saham</h3>
                        <StockForm
                            initialData={portfolio.find(p => p.id === editingId)}
                            isEdit={true}
                            onSubmit={(data) => {
                                onUpdate(editingId, data);
                                setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                        />
                    </div>
                </div>
            )}

            {transactionId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Jual / Beli Saham</h3>
                        {(() => {
                            const item = portfolio.find(p => p.id === transactionId);
                            if (!item) return null;
                            const quote = marketData[item.ticker];
                            const currentPrice = quote?.price || 0;

                            return (
                                <TransactionForm
                                    item={item}
                                    currentPrice={currentPrice}
                                    onConfirm={(id, type, lots, price) => {
                                        onTransaction(id, type, lots, price);
                                        setTransactionId(null);
                                    }}
                                    onCancel={() => setTransactionId(null)}
                                />
                            );
                        })()}
                    </div>
                </div>
            )}

            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Kode</th>
                        <th className="px-6 py-4 font-semibold text-right">Lot</th>
                        <th className="px-6 py-4 font-semibold text-right">Avg Price</th>
                        <th className="px-6 py-4 font-semibold text-right">Live Price</th>
                        <th className="px-6 py-4 font-semibold text-right">Market Value</th>
                        <th className="px-6 py-4 font-semibold text-right">Unrealized P/L</th>
                        <th className="px-6 py-4 font-semibold text-right">%</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedPortfolio.map((item) => {
                        const quote = marketData[item.ticker];
                        const currentPrice = quote?.price || 0;
                        const marketValue = item.lots * 100 * currentPrice;
                        const initialValue = item.lots * 100 * item.averagePrice;
                        const gainLoss = marketValue - initialValue;
                        const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
                        const isProfit = gainLoss > 0;
                        const isLoss = gainLoss < 0;

                        return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{item.ticker}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name}</div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-700 dark:text-gray-300">
                                    {formatNumber(item.lots)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                                    {formatIDR(item.averagePrice)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {currentPrice > 0 ? (
                                        <span className={cn(
                                            "font-medium",
                                            quote?.change > 0 && "text-green-600",
                                            quote?.change < 0 && "text-red-600",
                                        )}>
                                            {formatIDR(currentPrice)}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic">...</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                    {formatIDR(marketValue)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={cn(
                                        "font-bold",
                                        isProfit && "text-green-600",
                                        isLoss && "text-red-600",
                                        !isProfit && !isLoss && "text-gray-500"
                                    )}>
                                        {gainLoss > 0 ? "+" : ""}{formatIDR(gainLoss)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={cn(
                                        "inline-flex items-center gap-1 font-medium px-2 py-1 rounded-full text-xs",
                                        isProfit && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                        isLoss && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                        !isProfit && !isLoss && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    )}>
                                        {isProfit && <TrendingUp className="w-3 h-3" />}
                                        {isLoss && <TrendingDown className="w-3 h-3" />}
                                        {!isProfit && !isLoss && <Minus className="w-3 h-3" />}
                                        {formatPercentage(gainLossPercent)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setTransactionId(item.id)}
                                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                            title="Jual/Beli"
                                        >
                                            <ArrowRightLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(item.id)}
                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
