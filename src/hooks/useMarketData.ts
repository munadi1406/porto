"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StockPrice } from "@/lib/types";
import { useSharedWs } from "@/components/WsProvider";

interface MarketDataMap {
    [ticker: string]: StockPrice;
}

const REFRESH_INTERVAL = 5000;

export function useMarketData(tickers: string[]) {
    const [prices, setPrices] = useState<MarketDataMap>({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [useWs, setUseWs] = useState(true);
    const isInitialFetch = useRef(true);

    // WebSocket connection — shared via WsProvider when mounted (single socket per tab),
    // otherwise useSharedWs falls back to an isolated connection (backward compat).
    const { connected, prices: wsPrices, subscribe, unsubscribe } = useSharedWs();

    // Update prices from WebSocket
    useEffect(() => {
        if (connected && useWs && Object.keys(wsPrices).length > 0) {
            setPrices((prev) => {
                const updated = { ...prev };
                for (const [ticker, data] of Object.entries(wsPrices)) {
                    updated[ticker] = {
                        ticker,
                        price: data.price,
                        change: data.change,
                        changePercent: data.changePercent,
                        name: data.name,
                        high52w: data.high52w,
                        lastUpdated: Date.now(),
                    };
                }
                return updated;
            });
            setLastUpdated(new Date());

            if (isInitialFetch.current) {
                isInitialFetch.current = false;
                setLoading(false);
            }
        }
    }, [wsPrices, connected, useWs]);

    // Subscribe to tickers when they change
    useEffect(() => {
        if (connected && useWs && tickers.length > 0) {
            subscribe(tickers);
            return () => unsubscribe(tickers);
        }
    }, [JSON.stringify(tickers), connected, useWs, subscribe, unsubscribe]);

    // HTTP Fallback — if WebSocket not connected, use polling
    const fetchPricesHttp = useCallback(async () => {
        if (tickers.length === 0) return;
        const wasInitialFetch = isInitialFetch.current;
        if (wasInitialFetch) setLoading(true);

        try {
            const uniqueTickers = Array.from(new Set(tickers));
            const res = await fetch("/api/price-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickers: uniqueTickers }),
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    const newPrices: MarketDataMap = {};
                    for (const [ticker, data] of Object.entries(json.data) as [string, any][]) {
                        newPrices[ticker] = {
                            ticker,
                            price: data.price,
                            change: data.change,
                            changePercent: data.changePercent,
                            name: data.name,
                            high52w: data.high52w,
                            lastUpdated: Date.now(),
                        };
                    }
                    setPrices((prev) => ({ ...prev, ...newPrices }));
                    setLastUpdated(new Date());
                }
            }
        } catch (err) {
            console.error("Error fetching market data", err);
        } finally {
            if (wasInitialFetch) {
                isInitialFetch.current = false;
                setLoading(false);
            }
        }
    }, [JSON.stringify(tickers)]);

    // Detect if WebSocket is working, fallback to HTTP if not
    useEffect(() => {
        if (!connected && useWs) {
            // Wait 2 seconds for WS to connect, then fallback
            const timer = setTimeout(() => {
                if (!connected) {
                    console.log("[MarketData] WebSocket not available, falling back to HTTP polling");
                    setUseWs(false);
                    fetchPricesHttp();
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [connected, useWs, fetchPricesHttp]);

    // HTTP polling fallback interval
    useEffect(() => {
        if (useWs && connected) return; // Don't poll if WS is working

        fetchPricesHttp();
        const interval = setInterval(fetchPricesHttp, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [useWs, connected, fetchPricesHttp]);

    return { prices, loading, lastUpdated, refresh: fetchPricesHttp, connected, useWs };
}
