"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "porto_watchlist";

// Watchlist sederhana berbasis localStorage — kode saham tanpa .JK (mis. "BBCA")
export function useWatchlist() {
    const [items, setItems] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) setItems(arr.filter(x => typeof x === "string"));
            }
        } catch {}
        setLoaded(true);
    }, []);

    const persist = (next: string[]) => {
        setItems(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    };

    const add = useCallback((code: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        setItems(prev => {
            if (prev.includes(c)) return prev;
            const next = [...prev, c].slice(0, 30);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const remove = useCallback((code: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        setItems(prev => {
            const next = prev.filter(x => x !== c);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const toggle = useCallback((code: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        setItems(prev => {
            const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c].slice(0, 30);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const has = useCallback((code: string) => items.includes(code.replace(".JK", "").toUpperCase()), [items]);

    return { items, loaded, add, remove, toggle, has };
}
