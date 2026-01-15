"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from "react";
import { PortfolioSnapshot, Transaction } from "@/lib/types";
import { toast } from 'sonner';

// API Functions
async function fetchCash() {
    const response = await fetch('/api/cash');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat mengambil data cash');
    return result.data.amount;
}

async function updateCashAPI(data: { amount: number; operation: 'set' | 'add' | 'subtract' }) {
    const response = await fetch('/api/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat memperbarui cash');
    return result.data.amount;
}

async function fetchTransactions(): Promise<Transaction[]> {
    const response = await fetch('/api/transactions');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat mengambil data transaksi');
    return result.data;
}

async function fetchSnapshots(period: string = 'all') {
    const response = await fetch(`/api/snapshots?period=${period}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat mengambil data snapshot');
    return result.data;
}

async function recordSnapshotAPI(data: { stockValue: number; cashValue: number }) {
    const response = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    return result;
}

async function clearHistoryAPI() {
    const response = await fetch('/api/snapshots', {
        method: 'DELETE',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat menghapus riwayat');
    return result;
}

export function useCashAndHistory() {
    const queryClient = useQueryClient();

    // Fetch cash
    const { data: cash = 0, isLoading: cashLoading } = useQuery({
        queryKey: ['cash'],
        queryFn: fetchCash,
    });

    // Fetch transactions
    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['transactions'],
        queryFn: fetchTransactions,
    });

    // Fetch snapshots
    const { data: snapshotsData } = useQuery({
        queryKey: ['snapshots', 'all'],
        queryFn: () => fetchSnapshots('all'),
        refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    });

    const history: PortfolioSnapshot[] = snapshotsData?.snapshots || [];

    // Update cash mutation
    const updateCashMutation = useMutation({
        mutationFn: updateCashAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash'] });
            toast.success('Cash berhasil diperbarui');
        },
        onError: (error: any) => {
            toast.error('Gagal memperbarui cash: ' + error.message);
        }
    });

    // Record snapshot mutation
    const recordSnapshotMutation = useMutation({
        mutationFn: recordSnapshotAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots'] });
        },
    });

    // Clear history mutation
    const clearHistoryMutation = useMutation({
        mutationFn: clearHistoryAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots'] });
            toast.success('Riwayat berhasil dihapus');
        },
        onError: (error: any) => {
            toast.error('Gagal menghapus riwayat: ' + error.message);
        }
    });

    const updateCash = async (amount: number) => {
        await updateCashMutation.mutateAsync({ amount, operation: 'set' });
    };

    const addCash = async (amount: number) => {
        await updateCashMutation.mutateAsync({ amount, operation: 'add' });
    };

    const subtractCash = async (amount: number) => {
        await updateCashMutation.mutateAsync({ amount, operation: 'subtract' });
    };

    const recordTransaction = async (transaction: Omit<Transaction, "id" | "timestamp">) => {
        const amount = transaction.totalAmount;
        if (transaction.type === 'buy') {
            await subtractCash(amount);
        } else if (transaction.type === 'sell') {
            await addCash(amount);
        }
    };

    const recordSnapshot = useCallback(async (stockValue: number, cashValue: number) => {
        try {
            await recordSnapshotMutation.mutateAsync({ stockValue, cashValue });
        } catch (error) {
            console.error('Error recording snapshot:', error);
        }
    }, [recordSnapshotMutation]);

    const getGrowth = useCallback((period: "today" | "day" | "week" | "month" | "year" | "all") => {
        if (history.length === 0) return { value: 0, percent: 0 };
        if (history.length === 1) return { value: 0, percent: 0 };

        const now = Date.now();
        let startTime: number;

        switch (period) {
            case "today":
                startTime = new Date().setHours(0, 0, 0, 0);
                break;
            case "day":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "month":
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
            default:
                startTime = 0;
        }

        const periodSnapshots = history
            .filter((s) => s.timestamp >= startTime && s.totalValue > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (periodSnapshots.length === 0) return { value: 0, percent: 0 };
        if (periodSnapshots.length === 1) return { value: 0, percent: 0 };

        const startSnapshot = periodSnapshots[0];
        const currentSnapshot = periodSnapshots[periodSnapshots.length - 1];

        const growthValue = currentSnapshot.totalValue - startSnapshot.totalValue;
        const growthPercent =
            startSnapshot.totalValue > 0
                ? (growthValue / startSnapshot.totalValue) * 100
                : 0;

        return { value: growthValue, percent: growthPercent };
    }, [history]);

    const getHistoryForPeriod = useCallback((period: "today" | "day" | "week" | "month" | "year" | "all") => {
        const now = Date.now();
        let startTime: number;

        switch (period) {
            case "today":
                startTime = new Date().setHours(0, 0, 0, 0);
                break;
            case "day":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "month":
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
            default:
                startTime = 0;
        }

        const filtered = history
            .filter((s) => s.timestamp >= startTime && s.totalValue > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        // For today and day periods, aggregate into OHLC per hour (candlestick style)
        if (period === 'today' || period === 'day') {
            const hourlyMap = new Map<number, any>();

            filtered.forEach(snapshot => {
                const hourKey = Math.floor(snapshot.timestamp / (60 * 60 * 1000)); // Group by hour

                if (!hourlyMap.has(hourKey)) {
                    // First snapshot in this hour
                    hourlyMap.set(hourKey, {
                        timestamp: hourKey * 60 * 60 * 1000, // Hour start timestamp
                        totalValue: snapshot.totalValue,
                        open: snapshot.totalValue,
                        high: snapshot.totalValue,
                        low: snapshot.totalValue,
                        close: snapshot.totalValue,
                        stockValue: snapshot.stockValue,
                        cashValue: snapshot.cashValue,
                    });
                } else {
                    // Update OHLC for this hour
                    const hourData = hourlyMap.get(hourKey)!;
                    hourData.high = Math.max(hourData.high, snapshot.totalValue);
                    hourData.low = Math.min(hourData.low, snapshot.totalValue);
                    hourData.close = snapshot.totalValue; // Latest value
                    hourData.totalValue = snapshot.totalValue; // Use close as totalValue
                    hourData.stockValue = snapshot.stockValue;
                    hourData.cashValue = snapshot.cashValue;
                }
            });

            return Array.from(hourlyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        }

        return filtered;
    }, [history]);

    const clearHistory = async () => {
        await clearHistoryMutation.mutateAsync();
    };

    const refreshSnapshots = () => {
        queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    };

    return {
        cash,
        history,
        transactions,
        isLoaded: !cashLoading,
        updateCash,
        addCash,
        subtractCash,
        recordTransaction,
        recordSnapshot,
        getGrowth,
        getHistoryForPeriod,
        clearHistory,
        refreshSnapshots,
    };
}
