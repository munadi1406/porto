"use client";

import { useState, useEffect } from "react";
import { PortfolioItem } from "@/lib/types";

const STORAGE_KEY = "my_stock_portfolio";

export function usePortfolio() {
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setPortfolio(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to load portfolio from storage", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to LocalStorage whenever portfolio changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
        }
    }, [portfolio, isLoaded]);

    const addStock = (item: Omit<PortfolioItem, "id">) => {
        // Check if ticker already exists
        const existingStock = portfolio.find(p => p.ticker === item.ticker);

        if (existingStock) {
            // If ticker exists, recalculate average price (same logic as buy transaction)
            const totalCost = (existingStock.lots * existingStock.averagePrice) + (item.lots * item.averagePrice);
            const totalLots = existingStock.lots + item.lots;
            const newAverage = totalCost / totalLots;

            setPortfolio((prev) =>
                prev.map((p) =>
                    p.ticker === item.ticker
                        ? {
                            ...p,
                            lots: totalLots,
                            averagePrice: Math.round(newAverage) // Round to nearest int IDR
                        }
                        : p
                )
            );
        } else {
            // If ticker doesn't exist, add as new stock
            const newItem: PortfolioItem = {
                ...item,
                id: crypto.randomUUID(),
            };
            setPortfolio((prev) => [...prev, newItem]);
        }
    };

    const removeStock = (id: string) => {
        setPortfolio((prev) => prev.filter((item) => item.id !== id));
    };

    const updateStock = (id: string, updates: Partial<Omit<PortfolioItem, "id">>) => {
        setPortfolio((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    };

    const executeTransaction = (id: string, type: 'buy' | 'sell', transactionLots: number, transactionPrice: number) => {
        setPortfolio((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;

                if (type === 'buy') {
                    // Average Down Logic
                    const totalCost = (item.lots * item.averagePrice) + (transactionLots * transactionPrice);
                    const totalLots = item.lots + transactionLots;
                    const newAverage = totalCost / totalLots;

                    return {
                        ...item,
                        lots: totalLots,
                        averagePrice: Math.round(newAverage) // Round to nearest int IDR
                    };
                } else {
                    // Sell (Reduce lots) Logic
                    // Avg Price does not change on sell usually (FIFO/Weighted Avg Principle)
                    // Unless we want to account for realized gain which we don't track here yet.
                    const newLots = Math.max(0, item.lots - transactionLots);
                    return {
                        ...item,
                        lots: newLots
                    };
                }
            }).filter(item => item.lots > 0) // Remove if sold out
        );
    };

    const getPortfolioSummary = () => {
        // This is just helper, real calculations need live prices
        const totalInvested = portfolio.reduce((acc, item) => acc + (item.lots * 100 * item.averagePrice), 0);
        return { totalInvested };
    };

    return {
        portfolio,
        isLoaded,
        addStock,
        removeStock,
        updateStock,
        executeTransaction,
        getPortfolioSummary
    };
}
