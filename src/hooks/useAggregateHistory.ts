"use client";

import { useQuery } from '@tanstack/react-query';
import { PortfolioSnapshot } from '@/lib/types';

async function fetchAggregateHistory() {
    const response = await fetch('/api/portfolios/aggregate/history');
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data as PortfolioSnapshot[];
}

export function useAggregateHistory() {
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['portfolios', 'aggregate', 'history'],
        queryFn: fetchAggregateHistory,
        refetchInterval: 5000, // Refresh every 5 seconds for ultra real-time updates
        refetchOnWindowFocus: false, // Don't refetch on window focus
        staleTime: 3000, // Consider data fresh for 3 seconds
    });

    const getHistoryForPeriod = (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all"): PortfolioSnapshot[] => {
        if (history.length === 0) return [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let cutoffDate: Date;
        let needsOpeningSnapshot = false;

        switch (period) {
            case "today":
                cutoffDate = startOfToday;
                needsOpeningSnapshot = true; // Need market open snapshot (09:00)
                break;
            case "day":
                // 24 jam yang lalu
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                needsOpeningSnapshot = true;
                break;
            case "week":
                // 7 hari yang lalu (1 minggu)
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                needsOpeningSnapshot = true;
                break;
            case "month":
                // 1 bulan yang lalu
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                needsOpeningSnapshot = true;
                break;
            case "3month":
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                needsOpeningSnapshot = true;
                break;
            case "ytd":
                // Awal tahun (1 Januari tahun ini)
                cutoffDate = new Date(now.getFullYear(), 0, 1);
                needsOpeningSnapshot = true;
                break;
            case "year":
                // 1 tahun yang lalu
                cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                needsOpeningSnapshot = true;
                break;
            case "all":
                return history;
            default:
                cutoffDate = new Date(now.getFullYear(), 0, 1);
        }

        const filtered = history.filter(snapshot => {
            const date = new Date(snapshot.timestamp);
            const isToday = date.toDateString() === now.toDateString();

            if (period === "today") {
                // Return only today's snapshots within market hours (09:00 - 16:00)
                const hour = date.getHours();
                return isToday && hour >= 9 && hour <= 16;
            }

            return date >= cutoffDate;
        });

        // Jika perlu opening snapshot dan tidak ada data di cutoff date,
        // cari snapshot terdekat SEBELUM cutoff date sebagai baseline
        if (needsOpeningSnapshot && filtered.length > 0) {
            const firstFiltered = new Date(filtered[0].timestamp);

            // Jika data pertama jauh dari cutoff (lebih dari threshold)
            // cari snapshot terdekat sebelum cutoff sebagai opening baseline
            const timeDiff = firstFiltered.getTime() - cutoffDate.getTime();

            // Threshold: untuk "today" = 0, untuk "day" = 2 jam, untuk lainnya = 1 hari
            const maxGap = period === "today"
                ? 0
                : (period === "day" ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);

            if (timeDiff > maxGap) {
                // Cari snapshot terdekat SEBELUM atau PADA cutoff date
                const beforeCutoff = history.filter(s => new Date(s.timestamp) <= cutoffDate);
                if (beforeCutoff.length > 0) {
                    // Ambil yang terakhir sebelum cutoff (paling dekat dengan cutoff)
                    const openingSnapshot = beforeCutoff[beforeCutoff.length - 1];
                    // Tambahkan di awal array sebagai baseline
                    return [openingSnapshot, ...filtered];
                }
            }
        }

        // If no data in period but we have history, show at least the last available point
        if (filtered.length === 0 && history.length > 0) {
            return [history[history.length - 1]];
        }

        return filtered;
    };

    return {
        history,
        getHistoryForPeriod,
        loading: isLoading
    };
}
