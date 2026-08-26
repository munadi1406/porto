"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWatchlist } from "@/hooks/useWatchlist";
import { rsiSeries, sma } from "@/lib/quant";

interface HistBar { time: number; close: number }

type AlertKind = "rsi_oversold" | "rsi_overbought" | "golden_cross" | "death_cross";

const COOLDOWN_MS = 12 * 3600 * 1000; // 12 jam per kondisi per saham
const REFRESH_MS = 10 * 60 * 1000; // cek ulang tiap 10 menit
const KEY = "porto_tech_alert_fired";

function loadFired(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

function saveFired(map: Record<string, number>) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

async function fetchHistory(ticker: string): Promise<HistBar[]> {
    const res = await fetch(`/api/stocks/history?ticker=${ticker}.JK&period=1y&interval=1d`);
    const json = await res.json();
    return json.success ? json.data : [];
}

/**
 * Memantau saham di watchlist dan memicu notifikasi saat kondisi teknikal terpenuhi:
 * RSI <30 / >70, serta golden/death cross SMA50×200.
 * Berjalan hanya saat app terbuka — evaluasi tiap 10 menit, cooldown 12 jam per kondisi.
 */
export function TechnicalAlertChecker() {
    const watchlist = useWatchlist();
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const busy = useRef(false);

    useEffect(() => {
        if (!watchlist.items.length) return;

        const evaluate = async () => {
            if (busy.current) return;
            busy.current = true;
            try {
                const fired = loadFired();
                const now = Date.now();

                for (const code of watchlist.items) {
                    let bars: HistBar[];
                    try { bars = await fetchHistory(code); } catch { continue; }
                    if (bars.length < 210) continue; // butuh SMA200

                    const closes = bars.map(b => b.close);
                    const rsi = rsiSeries(closes, 14);
                    const sma50 = sma(closes, 50);
                    const sma200 = sma(closes, 200);
                    const lastRsi = rsi[rsi.length - 1];
                    const f = sma50[sma50.length - 1];
                    const s = sma200[sma200.length - 1];
                    if (lastRsi == null || f == null || s == null) continue;

                    // cross event: bandingkan 2 bar terakhir yang punya nilai
                    const prevFIdx = sma50.length - 6;
                    const crossedUp = sma50[prevFIdx] != null && sma200[prevFIdx] != null &&
                        f > s && sma50[prevFIdx]! <= sma200[prevFIdx]!;
                    const crossedDown = sma50[prevFIdx] != null && sma200[prevFIdx] != null &&
                        f < s && sma50[prevFIdx]! >= sma200[prevFIdx]!;

                    const candidates: [AlertKind, string, "success" | "error" | "warning"][] = [];
                    if (lastRsi < 30) candidates.push(["rsi_oversold", `RSI ${lastRsi.toFixed(0)} — kondisi oversold`, "success"]);
                    if (lastRsi > 70) candidates.push(["rsi_overbought", `RSI ${lastRsi.toFixed(0)} — kondisi overbought`, "error"]);
                    if (crossedUp) candidates.push(["golden_cross", "Golden Cross — SMA50 memotong ke atas SMA200", "success"]);
                    if (crossedDown) candidates.push(["death_cross", "Death Cross — SMA50 memotong ke bawah SMA200", "error"]);

                    for (const [kind, desc, tone] of candidates) {
                        const k = `${code}:${kind}`;
                        if (fired[k] && now - fired[k] < COOLDOWN_MS) continue;
                        fired[k] = now;
                        toast[tone](`📊 Sinyal ${code}`, { description: desc });
                        try {
                            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                                new Notification(`📊 Sinyal ${code}`, { body: desc });
                            }
                        } catch {}
                    }
                }
                saveFired(fired);
            } finally {
                busy.current = false;
            }
        };

        evaluate();
        timer.current = setInterval(evaluate, REFRESH_MS);
        return () => { if (timer.current) clearInterval(timer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchlist.items.join(",")]);

    return null;
}
