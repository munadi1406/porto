"use client";

import { useState, useEffect } from "react";
import { CashHolding, PortfolioSnapshot, Transaction } from "@/lib/types";

const CASH_STORAGE_KEY = "portfolio_cash";
const HISTORY_STORAGE_KEY = "portfolio_history";
const TRANSACTIONS_STORAGE_KEY = "portfolio_transactions";

export function useCashAndHistory() {
    const [cash, setCash] = useState<number>(0);
    const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        try {
            const storedCash = localStorage.getItem(CASH_STORAGE_KEY);
            if (storedCash) {
                const cashData: CashHolding = JSON.parse(storedCash);
                setCash(cashData.amount);
            }

            const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }

            const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
            if (storedTransactions) {
                setTransactions(JSON.parse(storedTransactions));
            }
        } catch (error) {
            console.error("Failed to load cash/history from storage", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save cash to LocalStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            const cashData: CashHolding = {
                amount: cash,
                lastUpdated: Date.now(),
            };
            localStorage.setItem(CASH_STORAGE_KEY, JSON.stringify(cashData));
        }
    }, [cash, isLoaded]);

    // Save history to LocalStorage whenever it changes
    useEffect(() => {
        if (isLoaded && history.length > 0) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        }
    }, [history, isLoaded]);

    // Save transactions to LocalStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
        }
    }, [transactions, isLoaded]);

    const updateCash = (amount: number) => {
        setCash(amount);
    };

    const addCash = (amount: number) => {
        setCash((prev) => prev + amount);
    };

    const subtractCash = (amount: number) => {
        setCash((prev) => Math.max(0, prev - amount));
    };

    const recordTransaction = (transaction: Omit<Transaction, "id" | "timestamp">) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        setTransactions((prev) => [newTransaction, ...prev]); // Newest first

        // Auto adjust cash based on transaction type
        if (transaction.type === 'buy') {
            subtractCash(transaction.totalAmount);
        } else {
            addCash(transaction.totalAmount);
        }
    };

    const recordSnapshot = (stockValue: number, cashValue: number) => {
        const snapshot: PortfolioSnapshot = {
            timestamp: Date.now(),
            totalValue: stockValue + cashValue,
            stockValue,
            cashValue,
        };

        setHistory((prev) => {
            // Keep only last 365 days of snapshots
            const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
            const filtered = prev.filter((s) => s.timestamp > oneYearAgo);

            const lastSnapshot = filtered[filtered.length - 1];

            // Record if:
            // 1. No previous snapshot exists
            // 2. More than 5 seconds passed (real-time tracking)
            // 3. Value changed by more than 0.01% (significant change)
            if (!lastSnapshot) {
                console.log('[Snapshot] First snapshot recorded:', snapshot.totalValue);
                return [snapshot];
            }

            const timeDiff = snapshot.timestamp - lastSnapshot.timestamp;
            const valueDiff = Math.abs(snapshot.totalValue - lastSnapshot.totalValue);
            const percentDiff = lastSnapshot.totalValue > 0
                ? (valueDiff / lastSnapshot.totalValue) * 100
                : 0;

            // Record if enough time passed OR significant value change
            if (timeDiff >= 5000 || percentDiff >= 0.01) {
                console.log('[Snapshot] Recorded:', {
                    value: snapshot.totalValue,
                    timeDiff: `${(timeDiff / 1000).toFixed(0)}s`,
                    valueDiff,
                    percentDiff: `${percentDiff.toFixed(2)}%`
                });
                return [...filtered, snapshot];
            }

            // Skip if too recent and no significant change
            return prev;
        });
    };

    const getGrowth = (period: "today" | "day" | "week" | "month" | "year" | "all") => {
        if (history.length === 0) return { value: 0, percent: 0 };
        if (history.length === 1) return { value: 0, percent: 0 };

        const now = Date.now();
        let startTime: number;

        switch (period) {
            case "today":
                // Start of today (midnight)
                startTime = new Date().setHours(0, 0, 0, 0);
                break;
            case "day":
                // Last 24 hours
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                // Last 7 days
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "month":
                // Last 30 days
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                // Last 365 days
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
            default:
                startTime = 0;
        }

        // Get all snapshots in the period, sorted by time
        // FILTER OUT ZERO VALUES (corrupted data)
        const periodSnapshots = history
            .filter((s) => s.timestamp >= startTime && s.totalValue > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (periodSnapshots.length === 0) return { value: 0, percent: 0 };
        if (periodSnapshots.length === 1) return { value: 0, percent: 0 };

        // Compare FIRST and LAST snapshot in the period
        const startSnapshot = periodSnapshots[0];
        const currentSnapshot = periodSnapshots[periodSnapshots.length - 1];

        const growthValue = currentSnapshot.totalValue - startSnapshot.totalValue;
        const growthPercent =
            startSnapshot.totalValue > 0
                ? (growthValue / startSnapshot.totalValue) * 100
                : 0;

        // Debug logging
        console.log(`[Growth ${period}]`, {
            periodSnapshots: periodSnapshots.length,
            startValue: startSnapshot.totalValue,
            currentValue: currentSnapshot.totalValue,
            growthValue,
            growthPercent: growthPercent.toFixed(2) + '%',
            startDate: new Date(startSnapshot.timestamp).toLocaleString(),
            endDate: new Date(currentSnapshot.timestamp).toLocaleString()
        });

        return { value: growthValue, percent: growthPercent };
    };

    const getHistoryForPeriod = (period: "today" | "day" | "week" | "month" | "year" | "all") => {
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

        return history
            .filter((s) => s.timestamp >= startTime && s.totalValue > 0)
            .sort((a, b) => a.timestamp - b.timestamp);
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    };

    return {
        cash,
        history,
        transactions,
        isLoaded,
        updateCash,
        addCash,
        subtractCash,
        recordTransaction,
        recordSnapshot,
        getGrowth,
        getHistoryForPeriod,
        clearHistory,
    };
}
