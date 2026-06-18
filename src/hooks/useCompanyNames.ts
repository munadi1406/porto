"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useCompanyNames(tickers: string[]) {
    const [names, setNames] = useState<Record<string, string>>({});
    const fetchedRef = useRef<Set<string>>(new Set());

    const fetchNames = useCallback(async (batch: string[]) => {
        const results = await Promise.all(
            batch.map(async (ticker) => {
                try {
                    const res = await fetch(`/api/name?ticker=${encodeURIComponent(ticker)}`);
                    const data = await res.json();
                    return { ticker, name: data.name || ticker };
                } catch {
                    return { ticker, name: ticker };
                }
            })
        );
        const map: Record<string, string> = {};
        results.forEach(r => { map[r.ticker] = r.name; });
        setNames(prev => ({ ...prev, ...map }));
    }, []);

    useEffect(() => {
        const unique = Array.from(new Set(tickers));
        const uncached = unique.filter(t => !fetchedRef.current.has(t));
        if (uncached.length === 0) return;
        uncached.forEach(t => fetchedRef.current.add(t));
        fetchNames(uncached);
    }, [tickers, fetchNames]);

    return names;
}
