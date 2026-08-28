"use client";

import { useMemo } from "react";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { TransactionHistory } from "@/components/TransactionHistory";
import { formatIDR } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default function HistoryPage() {
    const { transactions } = useCashAndHistory();

    const taxSummary = useMemo(() => {
        const sells = transactions.filter(t => t.type === "sell");
        const totalSell = sells.reduce((s, t) => s + (Number(t.totalAmount) || 0), 0);
        const tax = totalSell * 0.001; // 0.1%
        return { totalSell, tax, count: sells.length };
    }, [transactions]);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
                <p className="text-sm text-muted-foreground">
                    Riwayat semua transaksi • {transactions.length} transaksi
                </p>
            </div>

            {/* 11.B8 Tax 0.1% – pure client calc */}
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="p-2.5 bg-warning/10 rounded-xl">
                    <Receipt className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Estimasi Pajak 0.1% (Jual)</h3>
                    <p className="text-[11px] text-muted-foreground">
                        {taxSummary.count} transaksi jual · total jual {formatIDR(taxSummary.totalSell)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-foreground">{formatIDR(taxSummary.tax)}</p>
                    <p className="text-[10px] text-muted-foreground">0.1% dari nilai jual</p>
                </div>
            </div>

            {/* Transaction History */}
            <TransactionHistory transactions={transactions} />
        </div>
    );
}
