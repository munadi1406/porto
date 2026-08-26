"use client";

import { useCallback, useEffect, useState } from "react";

export interface PriceAlert {
    id: string;
    ticker: string;      // tanpa .JK
    dir: "above" | "below";
    price: number;
    createdAt: number;
    triggeredAt?: number;
}

const KEY = "porto_price_alerts";
const MAX = 50;

export function useAlerts() {
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) setAlerts(arr);
            }
        } catch {}
        setLoaded(true);
    }, []);

    const persist = (next: PriceAlert[]) => {
        setAlerts(next);
        try { localStorage.setItem(KEY, JSON.stringify(next.slice(-MAX))); } catch {}
    };

    const add = useCallback((ticker: string, dir: "above" | "below", price: number) => {
        const alert: PriceAlert = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            ticker: ticker.replace(".JK", "").toUpperCase(),
            dir, price,
            createdAt: Date.now(),
        };
        setAlerts(prev => {
            const next = [...prev, alert].slice(-MAX);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
        return alert;
    }, []);

    const remove = useCallback((id: string) => {
        setAlerts(prev => {
            const next = prev.filter(a => a.id !== id);
            try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const markTriggered = useCallback((id: string) => {
        setAlerts(prev => {
            const next = prev.map(a => a.id === id ? { ...a, triggeredAt: Date.now() } : a);
            try { localStorage.setItem(KEY, JSON.stringify(next.slice(-MAX))); } catch {}
            return next;
        });
    }, []);

    return { alerts, loaded, add, remove, markTriggered };
}
