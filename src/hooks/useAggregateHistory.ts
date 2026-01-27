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
        refetchInterval: 60000, // Refresh every minute for real-time updates
    });

    const getHistoryForPeriod = (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all"): PortfolioSnapshot[] => {
        if (history.length === 0) return [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let cutoffDate: Date;

        switch (period) {
            case "today":
                cutoffDate = startOfToday;
                break;
            case "day":
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "week":
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case "3month":
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case "ytd":
                cutoffDate = new Date(now.getFullYear(), 0, 1);
                break;
            case "year":
                cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
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
