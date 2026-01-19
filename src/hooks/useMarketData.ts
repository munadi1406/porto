"use client";

import { useState, useEffect, useCallback } from "react";
import { StockPrice } from "@/lib/types";

interface MarketDataMap {
    [ticker: string]: StockPrice;
}

export function useMarketData(tickers: string[]) {
    const [prices, setPrices] = useState<MarketDataMap>({});
    const [loading, setLoading] = useState(tickers.length > 0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchPrices = useCallback(async () => {
        if (tickers.length === 0) return;

        setLoading(true);
        const newPrices: MarketDataMap = {};

        // Create unique list of tickers to avoid duplicate requests
        const uniqueTickers = Array.from(new Set(tickers));

        try {
            // Fetch in parallel
            const promises = uniqueTickers.map(async (ticker) => {
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

            setPrices((prev) => ({ ...prev, ...newPrices }));
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching market data", error);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(tickers)]); // specific, triggers when ticker list changes content

    // Initial fetch when tickers change
    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    // Auto refresh interval (60 seconds to avoid Yahoo Finance rate limiting/timeouts)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPrices();
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchPrices]);

    return { prices, loading, lastUpdated, refresh: fetchPrices };
}
