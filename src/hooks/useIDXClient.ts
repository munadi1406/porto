"use client";

import { useState, useEffect, useCallback } from "react";

const CACHE_KEY_PREFIX = "idx_cache_";
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

function getCached<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data as T;
    } catch { return null; }
}

function setCache(key: string, data: any) {
    try {
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
}

async function idxFetchClient<T>(path: string, timeout = 15000): Promise<T> {
    const normalized = path
        .replace(/^https:\/\/www\.idx\.co\.id\/primary\//, "")
        .replace(/^\/primary\//, "")
        .replace(/^\//, "");
    const res = await fetch(`/api/idxx/${normalized}`, {
        signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.includes("Cloudflare") || text.includes("blocked")) throw new Error("Cloudflare blocked");
    return JSON.parse(text) as T;
}

export function useIDXIndexList() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<"idx" | "cache" | "none">("none");

    const fetch = useCallback(async () => {
        // Check cache dulu
        const cached = getCached<any[]>("index-list");
        if (cached && cached.length > 0) {
            setData(cached);
            setSource("cache");
            setLoading(false);
            return;
        }

        // Coba fetch dari IDX langsung
        try {
            const raw = await idxFetchClient<any>("/primary/home/GetIndexList");
            const mapped = (Array.isArray(raw) ? raw : []).map((item: any) => ({
                symbol: item.IndexCode,
                name: item.IndexCode,
                label: item.IndexCode,
                lastPrice: parseFloat(String(item.Current || 0).replace(/,/g, "")) || 0,
                change: parseFloat(String(item.Change || 0).replace(/,/g, "")) || 0,
                changePercent: parseFloat(String(item.Percent || 0).replace(/,/g, "").replace("%", "")) || 0,
                previousClose: parseFloat(String(item.Closing || 0).replace(/,/g, "")) || 0,
                open: 0, dayHigh: 0, dayLow: 0, volume: 0,
            }));
            if (mapped.length > 0) {
                setData(mapped);
                setSource("idx");
                setCache("index-list", mapped);
            }
        } catch {}

        setLoading(false);
    }, []);

    useEffect(() => { fetch(); }, [fetch]);
    return { data, loading, source, refetch: fetch };
}

export function useIDXStockSummary() {
    const [gainers, setGainers] = useState<any[]>([]);
    const [losers, setLosers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        const cached = getCached<{ gainers: any[]; losers: any[] }>("stock-summary");
        if (cached) {
            setGainers(cached.gainers);
            setLosers(cached.losers);
            setLoading(false);
            return;
        }

        try {
            const raw = await idxFetchClient<any>("/primary/TradingSummary/GetStockSummary?date=" + new Date().toISOString().slice(0,10).replace(/-/g, ""));
            const stocks = Array.isArray(raw) ? raw : (raw?.data || []);
            const parsed = stocks
                .map((s: any) => ({
                    KODE_SAHAM: s.Kode || s.Code || "",
                    NAMA_SAHAM: s.Nama || s.Name || "",
                    HARGA_PENUTUPAN: Number(s.Harga || s.Close || 0),
                    PERSEN_PERUBAHAN: Number(s.Persen || s.ChangePercent || 0),
                }))
                .filter((s: any) => s.KODE_SAHAM && s.HARGA_PENUTUPAN > 0);

            const g = parsed.filter((s: any) => s.PERSEN_PERUBAHAN > 0).sort((a: any, b: any) => b.PERSEN_PERUBAHAN - a.PERSEN_PERUBAHAN).slice(0, 20);
            const l = parsed.filter((s: any) => s.PERSEN_PERUBAHAN < 0).sort((a: any, b: any) => a.PERSEN_PERUBAHAN - b.PERSEN_PERUBAHAN).slice(0, 20);

            setGainers(g);
            setLosers(l);
            setCache("stock-summary", { gainers: g, losers: l });
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => { fetch(); }, [fetch]);
    return { gainers, losers, loading, refetch: fetch };
}

export function useIDXBrokerSummary() {
    const [foreignFlow, setForeignFlow] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        const cached = getCached<any[]>("broker-foreign");
        if (cached) { setForeignFlow(cached); setLoading(false); return; }

        try {
            // Coba beberapa tanggal terakhir
            for (let i = 0; i < 5; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                if (d.getDay() === 0 || d.getDay() === 6) continue;
                const ds = d.toISOString().slice(0, 10).replace(/-/g, "");
                try {
                    const raw = await idxFetchClient<any>(`/primary/TradingSummary/GetBrokerSummary?length=50&start=0&date=${ds}`);
                    const brokers = raw?.data || [];
                    if (brokers.length > 0) {
                        const foreignKW = /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley/i;
                        let foreignBuy = 0, foreignSell = 0, totalBuy = 0, totalSell = 0;
                        brokers.forEach((b: any) => {
                            const v = b.Value || 0;
                            const buy = v / 2;
                            const sell = v / 2;
                            totalBuy += buy;
                            totalSell += sell;
                            if (foreignKW.test(b.FirmName || "")) { foreignBuy += buy; foreignSell += sell; }
                        });
                        const flow = [
                            { investor: "Foreign", buyValue: foreignBuy, sellValue: foreignSell, netValue: foreignBuy - foreignSell },
                            { investor: "Domestic", buyValue: totalBuy - foreignBuy, sellValue: totalSell - foreignSell, netValue: (totalBuy - foreignBuy) - (totalSell - foreignSell) },
                        ];
                        setForeignFlow(flow);
                        setCache("broker-foreign", flow);
                        break;
                    }
                } catch {}
            }
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => { fetch(); }, [fetch]);
    return { foreignFlow, loading, refetch: fetch };
}
