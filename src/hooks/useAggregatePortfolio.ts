"use client";

import { useQuery } from '@tanstack/react-query';
import { useMarketData } from './useMarketData';
import { useMemo } from 'react';

async function fetchAggregate() {
    const response = await fetch('/api/portfolios/aggregate');
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
}

export function useAggregatePortfolio() {
    const { data: aggregate, isLoading: aggregateLoading } = useQuery({
        queryKey: ['portfolios', 'aggregate'],
        queryFn: fetchAggregate,
    });

    // Get all unique tickers across all portfolios
    const allTickers = useMemo(() => {
        if (!aggregate) return [];
        const tickers = new Set<string>();
        aggregate.summaries.forEach((s: any) => {
            s.items.forEach((item: any) => tickers.add(item.ticker));
        });
        return Array.from(tickers);
    }, [aggregate]);

    const { prices, loading: pricesLoading } = useMarketData(allTickers);

    const processedData = useMemo(() => {
        // Only return null if we have NO aggregate data at all
        if (!aggregate) return null;

        // We don't block on pricesLoading anymore. 
        // If prices are not yet available for a ticker, it will fallback to item.averagePrice (line 40)

        const detailedSummaries = aggregate.summaries.map((s: any) => {
            let marketValue = 0;
            let dayChange = 0;

            s.items.forEach((item: any) => {
                const price = prices[item.ticker]?.price || item.averagePrice;
                const change = prices[item.ticker]?.change || 0;

                marketValue += item.lots * 100 * price;
                dayChange += item.lots * 100 * change;
            });

            const totalValue = marketValue + s.cashValue;
            const profitLoss = marketValue - s.investedValue;
            const returnPercent = s.investedValue > 0 ? (profitLoss / s.investedValue) * 100 : 0;
            const dayChangePercent = (marketValue - dayChange) > 0
                ? (dayChange / (marketValue - dayChange)) * 100
                : 0;

            return {
                ...s,
                marketValue,
                totalValue,
                profitLoss,
                returnPercent,
                dayChange,
                dayChangePercent
            };
        });

        const totalInvested = detailedSummaries.reduce((acc: number, s: any) => acc + s.investedValue, 0);
        const totalMarketValue = detailedSummaries.reduce((acc: number, s: any) => acc + s.marketValue, 0);
        const totalDayChange = detailedSummaries.reduce((acc: number, s: any) => acc + s.dayChange, 0);
        const totalCash = detailedSummaries.reduce((acc: number, s: any) => acc + s.cashValue, 0);

        const grandTotal = totalMarketValue + totalCash;
        const totalPL = totalMarketValue - totalInvested;
        const totalReturnPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
        const totalDayPercent = (totalMarketValue - totalDayChange) > 0
            ? (totalDayChange / (totalMarketValue - totalDayChange)) * 100
            : 0;

        const consolidatedMap = new Map<string, {
            ticker: string;
            name: string;
            totalLots: number;
            totalInvested: number;
            portfolios: string[]
        }>();

        detailedSummaries.forEach((s: any) => {
            s.items.forEach((item: any) => {
                const existing = consolidatedMap.get(item.ticker);
                if (existing) {
                    existing.totalLots += item.lots;
                    existing.totalInvested += item.lots * 100 * item.averagePrice;
                    if (!existing.portfolios.includes(s.name)) existing.portfolios.push(s.name);
                } else {
                    consolidatedMap.set(item.ticker, {
                        ticker: item.ticker,
                        name: item.name || item.ticker,
                        totalLots: item.lots,
                        totalInvested: item.lots * 100 * item.averagePrice,
                        portfolios: [s.name]
                    });
                }
            });
        });

        const consolidatedItems = Array.from(consolidatedMap.values()).map(item => {
            const price = prices[item.ticker]?.price || (item.totalInvested / (item.totalLots * 100));
            const marketValue = item.totalLots * 100 * price;
            const profitLoss = marketValue - item.totalInvested;
            const returnPercent = item.totalInvested > 0 ? (profitLoss / item.totalInvested) * 100 : 0;

            return {
                ...item,
                avgPrice: item.totalInvested / (item.totalLots * 100),
                currentPrice: price,
                marketValue,
                profitLoss,
                returnPercent
            };
        }).sort((a, b) => b.marketValue - a.marketValue);

        return {
            portfolios: detailedSummaries,
            consolidatedItems,
            totals: {
                invested: totalInvested,
                marketValue: totalMarketValue,
                cash: totalCash,
                grandTotal,
                profitLoss: totalPL,
                returnPercent: totalReturnPercent,
                dayChange: totalDayChange,
                dayChangePercent: totalDayPercent
            }
        };
    }, [aggregate, prices, pricesLoading]);


    return {
        data: processedData,
        loading: aggregateLoading && !aggregate, // Only show loading if we have absolutely NO aggregate data
    };
}
