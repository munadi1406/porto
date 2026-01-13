"use client";

import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import { TransactionHistory } from "@/components/TransactionHistory";

export default function HistoryPage() {
    const { transactions } = useCashAndHistory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Riwayat semua transaksi • {transactions.length} transaksi
                    </p>
                </div>

                {/* Transaction History */}
                <TransactionHistory transactions={transactions} />
            </div>
        </div>
    );
}
