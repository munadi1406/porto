"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Portfolio } from "@/lib/types";
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

// Persistence for selected portfolio ID
interface PortfolioState {
    selectedPortfolioId: string | null;
    setSelectedPortfolioId: (id: string | null) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set) => ({
            selectedPortfolioId: null,
            setSelectedPortfolioId: (id: string | null) => set({ selectedPortfolioId: id }),
        }),
        {
            name: 'portfolio-storage',
        }
    )
);

// API Functions
async function fetchPortfolios(): Promise<Portfolio[]> {
    const response = await fetch('/api/portfolios');
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

async function createPortfolioAPI(data: Omit<Portfolio, "id" | "createdAt">) {
    const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

async function deletePortfolioAPI(id: string) {
    const response = await fetch(`/api/portfolios?id=${id}`, {
        method: 'DELETE',
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
}

async function updatePortfolioAPI(data: { id: string } & Partial<Portfolio>) {
    const response = await fetch('/api/portfolios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export function usePortfolios() {
    const queryClient = useQueryClient();
    const { selectedPortfolioId, setSelectedPortfolioId } = usePortfolioStore();

    const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
        queryKey: ['portfolios'],
        queryFn: fetchPortfolios,
    });

    // Auto-select logic moved to useEffect as onSuccess is deprecated in v5
    useEffect(() => {
        if (!isLoading && portfolios.length > 0 && !selectedPortfolioId) {
            setSelectedPortfolioId(portfolios[0].id);
        }
    }, [isLoading, portfolios, selectedPortfolioId, setSelectedPortfolioId]);

    const createPortfolioMutation = useMutation({
        mutationFn: createPortfolioAPI,
        onSuccess: (newPortfolio) => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            toast.success('Portofolio baru berhasil dibuat');
            if (!selectedPortfolioId) setSelectedPortfolioId(newPortfolio.id);
        },
        onError: (error: any) => {
            toast.error('Gagal membuat portofolio: ' + error.message);
        }
    });

    const updatePortfolioMutation = useMutation({
        mutationFn: updatePortfolioAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            toast.success('Portofolio berhasil diperbarui');
        },
        onError: (error: any) => {
            toast.error('Gagal memperbarui portofolio: ' + error.message);
        }
    });

    const deletePortfolioMutation = useMutation({
        mutationFn: deletePortfolioAPI,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            toast.success('Portofolio berhasil dihapus');
            setSelectedPortfolioId(null);
        },
        onError: (error: any) => {
            toast.error('Gagal menghapus portofolio: ' + error.message);
        }
    });

    const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || portfolios[0];

    return {
        portfolios,
        currentPortfolio,
        selectedPortfolioId: selectedPortfolioId || (portfolios[0]?.id || null),
        setSelectedPortfolioId,
        isLoading,
        createPortfolio: createPortfolioMutation.mutateAsync,
        updatePortfolio: updatePortfolioMutation.mutateAsync,
        deletePortfolio: deletePortfolioMutation.mutateAsync,
    };
}
