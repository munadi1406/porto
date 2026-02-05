"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from "react";
import { PortfolioSnapshot, Transaction } from "@/lib/types";
import { toast } from 'sonner';

// API Functions
async function fetchCash(portfolioId: string | null) {
    if (!portfolioId) return 0;
    const response = await fetch(`/api/cash?portfolioId=${portfolioId}`);
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

async function fetchTransactions(portfolioId: string | null): Promise<Transaction[]> {
    if (!portfolioId) return [];
    const response = await fetch(`/api/transactions?portfolioId=${portfolioId}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat mengambil data transaksi');
    return result.data;
}

async function fetchSnapshots(portfolioId: string | null, period: string = 'all') {
    if (!portfolioId) return { snapshots: [], growth: { value: 0, percent: 0 } };
    const response = await fetch(`/api/snapshots?portfolioId=${portfolioId}&period=${period}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat mengambil data snapshot');
    return result.data;
}

async function recordSnapshotAPI(data: { portfolioId: string; stockValue: number; cashValue: number }) {
    const response = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    return result;
}

async function clearHistoryAPI(portfolioId: string | null) {
    if (!portfolioId) return;
    const response = await fetch(`/api/snapshots?portfolioId=${portfolioId}`, {
        method: 'DELETE',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Terjadi kesalahan saat menghapus riwayat');
    return result;
}

import { usePortfolioStore } from './usePortfolios';

export function useCashAndHistory() {
    const queryClient = useQueryClient();
    const { selectedPortfolioId } = usePortfolioStore();

    // Fetch cash
    const { data: cash = 0, isLoading: cashLoading } = useQuery({
        queryKey: ['cash', selectedPortfolioId],
        queryFn: () => fetchCash(selectedPortfolioId),
        enabled: !!selectedPortfolioId,
    });

    // Fetch transactions
    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['transactions', selectedPortfolioId],
        queryFn: () => fetchTransactions(selectedPortfolioId),
        enabled: !!selectedPortfolioId,
    });

    // Fetch snapshots
    const { data: snapshotsData } = useQuery({
        queryKey: ['snapshots', 'all', selectedPortfolioId],
        queryFn: () => fetchSnapshots(selectedPortfolioId, 'all'),
        enabled: !!selectedPortfolioId,
        refetchInterval: 5000, // Refresh every 5 seconds for ultra real-time updates
        refetchOnWindowFocus: false, // Don't refetch on window focus
        staleTime: 3000, // Consider data fresh for 3 seconds
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
        mutationFn: () => clearHistoryAPI(selectedPortfolioId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots', 'all', selectedPortfolioId] });
            toast.success('Riwayat berhasil dihapus');
        },
        onError: (error: any) => {
            toast.error('Gagal menghapus riwayat: ' + error.message);
        }
    });

    const updateCash = async (amount: number) => {
        if (!selectedPortfolioId) return;
        await updateCashMutation.mutateAsync({ portfolioId: selectedPortfolioId, amount, operation: 'set' } as any);
    };

    const addCash = async (amount: number) => {
        if (!selectedPortfolioId) return;
        await updateCashMutation.mutateAsync({ portfolioId: selectedPortfolioId, amount, operation: 'add' } as any);
    };

    const subtractCash = async (amount: number) => {
        if (!selectedPortfolioId) return;
        await updateCashMutation.mutateAsync({ portfolioId: selectedPortfolioId, amount, operation: 'subtract' } as any);
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
        if (!selectedPortfolioId) return;
        try {
            await recordSnapshotMutation.mutateAsync({ portfolioId: selectedPortfolioId, stockValue, cashValue });
        } catch (error) {
            console.error('Error recording snapshot:', error);
        }
    }, [selectedPortfolioId, recordSnapshotMutation]);

    const getGrowth = useCallback((period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => {
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
            case "3month":
                startTime = now - 90 * 24 * 60 * 60 * 1000;
                break;
            case "ytd":
                startTime = new Date(new Date().getFullYear(), 0, 1).getTime();
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

    const getHistoryForPeriod = useCallback((period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => {
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
            case "3month":
                startTime = now - 90 * 24 * 60 * 60 * 1000;
                break;
            case "ytd":
                startTime = new Date(new Date().getFullYear(), 0, 1).getTime();
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
            .filter((s) => s.timestamp >= startTime && s.totalValue > 1000)
            .sort((a, b) => a.timestamp - b.timestamp);

        // For today and day periods, aggregate into OHLC per hour
        if (period === 'today' || period === 'day') {
            const hourlyMap = new Map<number, any>();

            filtered.forEach(snapshot => {
                const hourKey = Math.floor(snapshot.timestamp / (60 * 60 * 1000)); // Group by hour

                if (!hourlyMap.has(hourKey)) {
                    hourlyMap.set(hourKey, {
                        timestamp: hourKey * 60 * 60 * 1000,
                        totalValue: snapshot.totalValue,
                        open: snapshot.totalValue,
                        high: snapshot.totalValue,
                        low: snapshot.totalValue,
                        close: snapshot.totalValue,
                        stockValue: snapshot.stockValue,
                        cashValue: snapshot.cashValue,
                    });
                } else {
                    const hourData = hourlyMap.get(hourKey)!;
                    hourData.high = Math.max(hourData.high, snapshot.totalValue);
                    hourData.low = Math.min(hourData.low, snapshot.totalValue);
                    hourData.close = snapshot.totalValue;
                    hourData.totalValue = snapshot.totalValue;
                    hourData.stockValue = snapshot.stockValue;
                    hourData.cashValue = snapshot.cashValue;
                }
            });

            return Array.from(hourlyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        }

        // For other periods, aggregate into daily snapshots (latest of day)
        const dailyMap = new Map<string, any>();
        filtered.forEach(snapshot => {
            const date = new Date(snapshot.timestamp);
            const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

            if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, {
                    ...snapshot,
                    // Store original snapshot for this day
                });
            } else {
                // Update with latest snapshot for this day
                const existing = dailyMap.get(dateKey)!;
                if (snapshot.timestamp > existing.timestamp) {
                    dailyMap.set(dateKey, snapshot);
                }
            }
        });

        return Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
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
