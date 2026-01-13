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
            const oneDayAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
            const filtered = prev.filter((s) => s.timestamp > oneDayAgo);

            // Avoid duplicate snapshots within 1 minute
            const lastSnapshot = filtered[filtered.length - 1];
            if (lastSnapshot && (snapshot.timestamp - lastSnapshot.timestamp < 60000)) {
                return prev;
            }

            return [...filtered, snapshot];
        });
    };

    const getGrowth = (period: "day" | "week" | "year" | "all") => {
        if (history.length === 0) return { value: 0, percent: 0 };

        const now = Date.now();
        let startTime: number;

        switch (period) {
            case "day":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
        }

        // Find closest snapshot to start time
        const startSnapshot = history
            .filter((s) => s.timestamp >= startTime)
            .sort((a, b) => a.timestamp - b.timestamp)[0];

        if (!startSnapshot) return { value: 0, percent: 0 };

        const currentSnapshot = history[history.length - 1];
        const growthValue = currentSnapshot.totalValue - startSnapshot.totalValue;
        const growthPercent =
            startSnapshot.totalValue > 0
                ? (growthValue / startSnapshot.totalValue) * 100
                : 0;

        return { value: growthValue, percent: growthPercent };
    };

    const getHistoryForPeriod = (period: "day" | "week" | "year" | "all") => {
        const now = Date.now();
        let startTime: number;

        switch (period) {
            case "day":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
        }

        return history.filter((s) => s.timestamp >= startTime);
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
    };
}
