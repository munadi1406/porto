"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StockPrice } from "@/lib/types";

interface MarketDataMap {
    [ticker: string]: StockPrice;
}

// Batch size untuk menghindari rate limit
const BATCH_SIZE = 3; // Fetch 3 tickers per batch
const BATCH_DELAY = 200; // 200ms delay between batches
const REFRESH_INTERVAL = 5000; // 5 seconds for pure real-time updates

export function useMarketData(tickers: string[]) {
    const [prices, setPrices] = useState<MarketDataMap>({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const isInitialFetch = useRef(true);

    const fetchPrices = useCallback(async () => {
        if (tickers.length === 0) {
            setLoading(false);
            return;
        }

        // Store initial fetch state before any changes
        const wasInitialFetch = isInitialFetch.current;

        // Only show loading on initial fetch
        if (wasInitialFetch) {
            setLoading(true);
        }

        const newPrices: MarketDataMap = {};

        // Create unique list of tickers to avoid duplicate requests
        const uniqueTickers = Array.from(new Set(tickers));

        try {
            // Split tickers into batches to avoid rate limiting
            const batches: string[][] = [];
            for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
                batches.push(uniqueTickers.slice(i, i + BATCH_SIZE));
            }

            // Process batches sequentially with delay
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];

                // Fetch batch in parallel
                const promises = batch.map(async (ticker) => {
                    try {
                        const res = await fetch(`/api/price?ticker=${ticker}`);
                        if (!res.ok) return null;
                        const data = await res.json();
                        return data;
                    } catch (err) {
                        console.error(`Failed to fetch ${ticker}`, err);
                        return null;
                    }
                });

                const results = await Promise.all(promises);

                results.forEach((data) => {
                    if (data && data.ticker) {
                        newPrices[data.ticker] = {
                            ticker: data.ticker,
                            price: data.price,
                            change: data.change,
                            changePercent: data.changePercent,
                            name: data.name,
                            high52w: data.high52w,
                            lastUpdated: Date.now(),
                        };
                    }
                });

                // Add delay between batches (except for the last batch)
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }

            setPrices((prev) => ({ ...prev, ...newPrices }));
            setLastUpdated(new Date());

            // Mark initial fetch as complete and turn off loading
            if (wasInitialFetch) {
                isInitialFetch.current = false;
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching market data", error);
            // Still set loading to false on error for initial fetch
            if (wasInitialFetch) {
                isInitialFetch.current = false;
                setLoading(false);
            }
        }
    }, [JSON.stringify(tickers)]);

    // Initial fetch when tickers change
    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    // Auto refresh interval - 8 seconds for near real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPrices();
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchPrices]);

    return { prices, loading, lastUpdated, refresh: fetchPrices };
}
