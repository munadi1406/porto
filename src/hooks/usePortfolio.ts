"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioItem } from "@/lib/types";

// Fetch portfolio
async function fetchPortfolio(): Promise<PortfolioItem[]> {
    const response = await fetch('/api/portfolio');
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

// Add stock
async function addStockAPI(stock: Omit<PortfolioItem, "id">) {
    const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

// Update stock
async function updateStockAPI(data: { id: string } & Partial<Omit<PortfolioItem, "id">>) {
    const response = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

// Delete stock
async function deleteStockAPI(id: string) {
    const response = await fetch(`/api/portfolio?id=${id}`, {
        method: 'DELETE',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
}

// Execute transaction
async function executeTransactionAPI(data: {
    id: string;
    type: 'buy' | 'sell';
    ticker: string;
    name: string;
    lots: number;
    pricePerShare: number;
}) {
    const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export function usePortfolio() {
    const queryClient = useQueryClient();

    // Fetch portfolio with React Query
    const { data: portfolio = [], isLoading, error } = useQuery({
        queryKey: ['portfolio'],
        queryFn: fetchPortfolio,
    });

    // Add stock mutation
    const addStockMutation = useMutation({
        mutationFn: addStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        },
    });

    // Update stock mutation
    const updateStockMutation = useMutation({
        mutationFn: updateStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        },
    });

    // Delete stock mutation
    const deleteStockMutation = useMutation({
        mutationFn: deleteStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        },
    });

    // Execute transaction mutation
    const executeTransactionMutation = useMutation({
        mutationFn: executeTransactionAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const addStock = async (item: Omit<PortfolioItem, "id">) => {
        await addStockMutation.mutateAsync(item);
    };

    const removeStock = async (id: string) => {
        await deleteStockMutation.mutateAsync(id);
    };

    const updateStock = async (id: string, updates: Partial<Omit<PortfolioItem, "id">>) => {
        await updateStockMutation.mutateAsync({ id, ...updates });
    };

    const executeTransaction = async (
        id: string,
        type: 'buy' | 'sell',
        lots: number,
        price: number
    ) => {
        const item = portfolio.find(p => p.id === id);
        if (!item) return;

        await executeTransactionMutation.mutateAsync({
            id,
            type,
            ticker: item.ticker,
            name: item.name,
            lots,
            pricePerShare: price,
        });
    };

    const getPortfolioSummary = () => {
        const totalInvested = portfolio.reduce(
            (acc, item) => acc + (item.lots * 100 * item.averagePrice),
            0
        );
        return { totalInvested };
    };

    return {
        portfolio,
        isLoaded: !isLoading,
        isLoading,
        error,
        addStock,
        removeStock,
        updateStock,
        executeTransaction,
        getPortfolioSummary,
        refreshPortfolio: () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
    };
}
