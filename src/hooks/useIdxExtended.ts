"use client";

import { useQuery } from '@tanstack/react-query';

export function useFinancialStatement(code: string, year?: number, month?: number, period?: 'annual' | 'quarterly') {
    return useQuery({
        queryKey: ['idx-financial-statement', code, year, month, period],
        queryFn: async () => {
            const params = new URLSearchParams({ code });
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            if (period) params.set('period', period);
            const res = await fetch(`/api/idx/financial-statement?${params}`);
            const json = await res.json();
            if (!json.success) return null;
            return json.data;
        },
        enabled: !!code,
        staleTime: 30 * 60 * 1000,
    });
}

export function useStockScreener(sector = '', subSector = '') {
    return useQuery({
        queryKey: ['idx-stock-screener', sector, subSector],
        queryFn: async () => {
            const res = await fetch(`/api/idx/stock-screener?sector=${sector}&subSector=${subSector}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useCompanyDetail(code: string) {
    return useQuery({
        queryKey: ['idx-company-detail', code],
        queryFn: async () => {
            const res = await fetch(`/api/idx/company-detail?code=${code}`);
            const json = await res.json();
            if (!json.success) return null;
            return json.data;
        },
        enabled: !!code,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
}

export function useTradingDaily(code: string) {
    return useQuery({
        queryKey: ['idx-trading-daily', code],
        queryFn: async () => {
            const res = await fetch(`/api/idx/trading-daily?code=${code}`);
            const json = await res.json();
            if (!json.success) return null;
            return json.data;
        },
        enabled: !!code,
        refetchInterval: 10000,
        staleTime: 5000,
        retry: 1,
    });
}

export function useSectoralMovement(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-sectoral-movement', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/sectoral-movement?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useIndustryTrading(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-industry-trading', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/industry-trading?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useSuspendData(count = 100) {
    return useQuery({
        queryKey: ['idx-suspend', count],
        queryFn: async () => {
            const res = await fetch(`/api/idx/suspend?count=${count}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useNewListings(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-new-listings', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/new-listings?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useStockSplits(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-stock-splits', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/stock-splits?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useRightOfferings(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-right-offerings', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/right-offerings?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useDelistings(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-delistings', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/delistings?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useTradeSummary() {
    return useQuery({
        queryKey: ['idx-trade-summary'],
        queryFn: async () => {
            const res = await fetch('/api/idx/trade-summary');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useIssuedHistory(code: string) {
    return useQuery({
        queryKey: ['idx-issued-history', code],
        queryFn: async () => {
            const res = await fetch(`/api/idx/issued-history?code=${code}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        enabled: !!code,
        staleTime: 60 * 60 * 1000,
    });
}

export function useIndexSummary(date?: string) {
    return useQuery({
        queryKey: ['idx-index-summary', date],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (date) params.set('date', date);
            const res = await fetch(`/api/idx/index-summary?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useMostActiveFrequency(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-most-active-freq', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/most-active-frequency?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useDailyIndices(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-daily-indices', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/daily-indices?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useAdditionalListings(year?: number, month?: number) {
    return useQuery({
        queryKey: ['idx-additional-listings', year, month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (year) params.set('year', String(year));
            if (month) params.set('month', String(month));
            const res = await fetch(`/api/idx/additional-listings?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useRelistingData() {
    return useQuery({
        queryKey: ['idx-relisting'],
        queryFn: async () => {
            const res = await fetch('/api/idx/relisting');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

export function useShariaList() {
    return useQuery({
        queryKey: ['idx-sharia-list'],
        queryFn: async () => {
            const res = await fetch('/api/idx/sharia-list');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useCorporateActions() {
    return useQuery({
        queryKey: ['idx-corporate-actions'],
        queryFn: async () => {
            const res = await fetch('/api/idx/corporate-actions');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}
