"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioItem } from "@/lib/types";
import { toast } from 'sonner';

import { usePortfolioStore } from './usePortfolios';

// Fetch portfolio
async function fetchPortfolio(portfolioId: string | null): Promise<PortfolioItem[]> {
    if (!portfolioId) return [];
    const response = await fetch(`/api/portfolio?portfolioId=${portfolioId}`);
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
    portfolioId: string;
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
    const { selectedPortfolioId } = usePortfolioStore();

    // Fetch portfolio with React Query
    const { data: portfolio = [], isLoading, error } = useQuery({
        queryKey: ['portfolio', selectedPortfolioId],
        queryFn: () => fetchPortfolio(selectedPortfolioId),
        enabled: !!selectedPortfolioId,
    });

    // Add stock mutation
    const addStockMutation = useMutation({
        mutationFn: addStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
            toast.success('Saham berhasil ditambahkan');
        },
        onError: (error: any) => {
            toast.error('Gagal menambahkan saham: ' + error.message);
        }
    });

    // Update stock mutation
    const updateStockMutation = useMutation({
        mutationFn: updateStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
            toast.success('Saham berhasil diperbarui');
        },
        onError: (error: any) => {
            toast.error('Gagal memperbarui saham: ' + error.message);
        }
    });

    // Delete stock mutation
    const deleteStockMutation = useMutation({
        mutationFn: deleteStockAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
            toast.success('Saham berhasil dihapus');
        },
        onError: (error: any) => {
            toast.error('Gagal menghapus saham: ' + error.message);
        }
    });

    // Execute transaction mutation
    const executeTransactionMutation = useMutation({
        mutationFn: executeTransactionAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
            queryClient.invalidateQueries({ queryKey: ['transactions', selectedPortfolioId] });
            toast.success('Transaksi berhasil dilaksanakan');
        },
        onError: (error: any) => {
            toast.error('Gagal melaksanakan transaksi: ' + error.message);
        }
    });

    const addStock = async (item: Omit<PortfolioItem, "id" | "portfolioId">) => {
        if (!selectedPortfolioId) return;
        await addStockMutation.mutateAsync({ ...item, portfolioId: selectedPortfolioId } as any);
    };

    const removeStock = async (id: string) => {
        if (!selectedPortfolioId) return;
        const response = await fetch(`/api/portfolio?id=${id}&portfolioId=${selectedPortfolioId}`, {
            method: 'DELETE',
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
    };

    const updateStock = async (id: string, updates: Partial<Omit<PortfolioItem, "id" | "portfolioId">>) => {
        if (!selectedPortfolioId) return;
        await updateStockMutation.mutateAsync({ id, portfolioId: selectedPortfolioId, ...updates } as any);
    };

    const executeTransaction = async (
        id: string,
        type: 'buy' | 'sell',
        lots: number,
        price: number
    ) => {
        const item = portfolio.find(p => p.id === id);
        if (!item || !selectedPortfolioId) return;

        await executeTransactionMutation.mutateAsync({
            portfolioId: selectedPortfolioId,
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
        selectedPortfolioId,
        refreshPortfolio: () => queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] }),
    };
}
