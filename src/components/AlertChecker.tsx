"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAlerts } from "@/hooks/useAlerts";
import { cn, formatIDR } from "@/lib/utils";

// Pasang di MarketPage — memantau harga live (WS) dan memicu notifikasi
// browser + toast saat alert harga tertembus (sekali per alert).
export function AlertChecker({ prices }: { prices: Record<string, { price: number }> }) {
    const { alerts, markTriggered, loaded } = useAlerts();
    const lastCheck = useRef(0);

    useEffect(() => {
        if (!loaded || !alerts.length) return;
        const now = Date.now();
        if (now - lastCheck.current < 2000) return; // throttle 2 detik
        lastCheck.current = now;

        for (const a of alerts) {
            if (a.triggeredAt) continue;
            const p = prices[`${a.ticker}.JK`]?.price;
            if (!p || p <= 0) continue;
            const hit = a.dir === "above" ? p >= a.price : p <= a.price;
            if (!hit) continue;

            markTriggered(a.id);
            const msg = `${a.ticker} ${a.dir === "above" ? "≥" : "≤"} ${formatIDR(a.price)} — sekarang ${formatIDR(p)}`;
            toast[a.dir === "above" ? "success" : "error"](`🔔 Alert ${a.ticker}`, { description: msg });
            try {
                if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                    new Notification(`🔔 Alert ${a.ticker}`, { body: msg });
                }
            } catch {}
        }
    }, [prices, alerts, loaded, markTriggered]);

    return null;
}

// Chip indikator jumlah alert aktif (opsional, dipasang di hero)
export function AlertBadge({ count, className }: { count: number; className?: string }) {
    if (count <= 0) return null;
    return (
        <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-500 px-2 py-0.5", className)}>
            🔔 {count} alert aktif
        </span>
    );
}
