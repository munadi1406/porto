"use client";

import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { TransactionHistory } from "@/components/TransactionHistory";

export default function HistoryPage() {
    const { transactions } = useCashAndHistory();

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
                <p className="text-sm text-muted-foreground">
                    Riwayat semua transaksi • {transactions.length} transaksi
                </p>
            </div>

            {/* Transaction History */}
            <TransactionHistory transactions={transactions} />
        </div>
    );
}
