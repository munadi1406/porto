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
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            Transaction History
                        </h3>
                        <p className="text-xs text-muted-foreground">Riwayat transaksi Anda</p>
                    </div>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
                    <p className="text-muted-foreground text-xs mt-1">Transaksi akan muncul di sini</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            Transaction History
                        </h3>
                        <p className="text-xs text-muted-foreground">Riwayat transaksi Anda</p>
                    </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
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
                                ? "bg-destructive/5 border-destructive/20 hover:border-destructive/30"
                                : "bg-success/5 border-success/20 hover:border-success/30"
                        )}
                    >
                        {/* Transaction number badge */}
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-card text-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                            {transactions.length - index}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    {tx.type === "buy" ? (
                                        <div className="p-1.5 bg-destructive/10 rounded-lg">
                                            <ArrowDownRight className="w-4 h-4 text-destructive" />
                                        </div>
                                    ) : (
                                        <div className="p-1.5 bg-success/10 rounded-lg">
                                            <ArrowUpRight className="w-4 h-4 text-success" />
                                        </div>
                                    )}
                                    <span
                                        className={cn(
                                            "text-xs font-bold uppercase px-2 py-1 rounded-md",
                                            tx.type === "buy"
                                                ? "text-destructive bg-destructive/10"
                                                : "text-success bg-success/10"
                                        )}
                                    >
                                        {tx.type === "buy" ? "BUY" : "SELL"}
                                    </span>
                                    <span className="text-sm font-bold text-foreground truncate">
                                        {tx.ticker}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-semibold">{tx.lots}</span> lot × {formatIDR(tx.pricePerShare)}
                                    </div>
                                    <div className="text-base font-bold text-foreground">
                                        Total: {formatIDR(tx.totalAmount)}
                                    </div>
                                    {tx.notes && (
                                        <div className="text-xs text-muted-foreground italic mt-1 flex items-center gap-1">
                                            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                                            {tx.notes}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <div className="text-xs font-medium text-muted-foreground">
                                    {new Date(tx.timestamp).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
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
