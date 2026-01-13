"use client";

import { Transaction } from "@/lib/types";
import { formatIDR, cn } from "@/lib/utils";
import { ShoppingCart, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
    if (transactions.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Transaction History
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Riwayat transaksi Anda</p>
                    </div>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada transaksi</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Transaksi akan muncul di sini</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Transaction History
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Riwayat transaksi Anda</p>
                    </div>
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-3 py-1.5 rounded-full">
                    {transactions.length} transaksi
                </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {transactions.map((tx, index) => (
                    <div
                        key={tx.id}
                        className={cn(
                            "group relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                            tx.type === "buy"
                                ? "bg-red-50/50 border-red-200 hover:border-red-300 dark:bg-red-900/10 dark:border-red-800 dark:hover:border-red-700"
                                : "bg-green-50/50 border-green-200 hover:border-green-300 dark:bg-green-900/10 dark:border-green-800 dark:hover:border-green-700"
                        )}
                    >
                        {/* Transaction number badge */}
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                            {transactions.length - index}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    {tx.type === "buy" ? (
                                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                            <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </div>
                                    ) : (
                                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                    )}
                                    <span
                                        className={cn(
                                            "text-xs font-bold uppercase px-2 py-1 rounded-md",
                                            tx.type === "buy"
                                                ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                                                : "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                                        )}
                                    >
                                        {tx.type === "buy" ? "BUY" : "SELL"}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {tx.ticker}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold">{tx.lots}</span> lot × {formatIDR(tx.pricePerShare)}
                                    </div>
                                    <div className="text-base font-bold text-gray-900 dark:text-white">
                                        Total: {formatIDR(tx.totalAmount)}
                                    </div>
                                    {tx.notes && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1 flex items-center gap-1">
                                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                            {tx.notes}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {new Date(tx.timestamp).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                    {new Date(tx.timestamp).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
        </div>
    );
}
