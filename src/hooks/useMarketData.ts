"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StockPrice } from "@/lib/types";

interface MarketDataMap {
    [ticker: string]: StockPrice;
}

const REFRESH_INTERVAL = 5000;
const REQUEST_TIMEOUT = 8000;

export function useMarketData(tickers: string[]) {
    const [prices, setPrices] = useState<MarketDataMap>({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const requestInFlight = useRef(false);
    const isInitialFetch = useRef(true);
    const fetchPricesHttp = useCallback(async () => {
        if (tickers.length === 0) return;
        if (requestInFlight.current) return;
        requestInFlight.current = true;
        const wasInitialFetch = isInitialFetch.current;
        if (wasInitialFetch) setLoading(true);

        const uniqueTickers = Array.from(new Set(tickers));
        let lastError: unknown = null;
        try {
            for (let attempt = 0; attempt < 2; attempt++) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
                try {
                    const res = await fetch("/api/price-batch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                        signal: controller.signal,
                        body: JSON.stringify({ tickers: uniqueTickers }),
                    });
                    if (!res.ok) throw new Error(`Price API HTTP ${res.status}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const newPrices: MarketDataMap = {};
                    for (const [ticker, data] of Object.entries(json.data) as [string, any][]) {
                        if (!Number.isFinite(data.price) || data.price <= 0) continue;
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
                        if (Object.keys(newPrices).length > 0) {
                            setPrices((prev) => ({ ...prev, ...newPrices }));
                            setLastUpdated(new Date());
                            setError(null);
                        }
                        return;
                    }
                    throw new Error(json.error || "Price API tidak mengembalikan data");
                } catch (err) {
                    lastError = err;
                    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
                } finally {
                    clearTimeout(timeout);
                }
            }
            const message = lastError instanceof Error ? lastError.message : "Gagal mengambil harga";
            setError(message);
            console.warn("[MarketData] API sementara tidak tersedia; harga terakhir dipertahankan.", message);
        } finally {
            requestInFlight.current = false;
            if (wasInitialFetch) {
                isInitialFetch.current = false;
                setLoading(false);
            }
        }
    }, [JSON.stringify(tickers)]);

    // API polling is the single market-data path. Five seconds is aligned with
    // the server cache TTL, giving fast updates without overlapping requests.
    useEffect(() => {
        fetchPricesHttp();
        const interval = setInterval(fetchPricesHttp, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchPricesHttp]);

    return { prices, loading, error, lastUpdated, refresh: fetchPricesHttp, connected: false, useWs: false };
}
