"use client";

import { useCallback, useEffect, useState, useMemo } from "react";

const KEY = "porto_watchlist";

export type WatchlistEntry = { ticker: string; tag?: string };

// Legacy string array support -> normalized to entries
function normalize(raw: unknown): WatchlistEntry[] {
    if (!Array.isArray(raw)) return [];
    const out: WatchlistEntry[] = [];
    for (const v of raw) {
        if (typeof v === "string") {
            const t = v.replace(".JK", "").toUpperCase().trim();
            if (t) out.push({ ticker: t });
        } else if (v && typeof v === "object" && typeof (v as any).ticker === "string") {
            const t = String((v as any).ticker).replace(".JK", "").toUpperCase().trim();
            const tag = typeof (v as any).tag === "string" ? String((v as any).tag).trim().slice(0, 30) : undefined;
            if (t) out.push({ ticker: t, tag: tag || undefined });
        }
    }
    // dedup by ticker keep first tag
    const seen = new Map<string, WatchlistEntry>();
    for (const e of out) if (!seen.has(e.ticker)) seen.set(e.ticker, e);
    return Array.from(seen.values()).slice(0, 30);
}

// Watchlist sederhana berbasis localStorage — kode saham tanpa .JK (mis. "BBCA")
// Enhanced: optional tag/group field per ticker, persisted as objects but backward compat with string[]
export function useWatchlist() {
    const [entries, setEntries] = useState<WatchlistEntry[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                const normalized = normalize(arr);
                if (normalized.length) setEntries(normalized);
            }
        } catch {}
        setLoaded(true);
    }, []);

    const persist = useCallback((next: WatchlistEntry[]) => {
        setEntries(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }, []);

    // derived string array for backward compat
    const items = useMemo(() => entries.map(e => e.ticker), [entries]);

    const add = useCallback((code: string, tag?: string) => {
        const c = code.replace(".JK", "").toUpperCase().trim();
        if (!c) return;
        setEntries(prev => {
            if (prev.some(e => e.ticker === c)) return prev;
            const next = [...prev, { ticker: c, tag: tag?.trim() || undefined }].slice(0, 30);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const remove = useCallback((code: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        setEntries(prev => {
            const next = prev.filter(x => x.ticker !== c);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const toggle = useCallback((code: string, tag?: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        setEntries(prev => {
            const exists = prev.find(e => e.ticker === c);
            const next = exists ? prev.filter(x => x.ticker !== c) : [...prev, { ticker: c, tag: tag?.trim() || undefined }].slice(0, 30);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const has = useCallback((code: string) => entries.some(e => e.ticker === code.replace(".JK", "").toUpperCase()), [entries]);

    // ---- tag/group support (optional, no API) ----
    const setTag = useCallback((code: string, tag: string | undefined) => {
        const c = code.replace(".JK", "").toUpperCase();
        const t = tag?.trim().slice(0, 30) || undefined;
        setEntries(prev => {
            const idx = prev.findIndex(e => e.ticker === c);
            if (idx === -1) {
                // add with tag if not exists
                const next = [...prev, { ticker: c, tag: t }].slice(0, 30);
                try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
                return next;
            }
            const next = prev.map(e => e.ticker === c ? { ...e, tag: t } : e);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const getTag = useCallback((code: string) => {
        const c = code.replace(".JK", "").toUpperCase();
        return entries.find(e => e.ticker === c)?.tag;
    }, [entries]);

    const groups = useMemo(() => {
        const s = new Set<string>();
        for (const e of entries) if (e.tag) s.add(e.tag);
        return Array.from(s).sort();
    }, [entries]);

    const getByTag = useCallback((tag: string) => entries.filter(e => e.tag === tag).map(e => e.ticker), [entries]);

    return { items, entries, loaded, add, remove, toggle, has, setTag, getTag, groups, getByTag, persist };
}
