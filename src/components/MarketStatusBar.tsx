"use client";

import { useEffect, useState } from "react";
import { getMarketStatus, type MarketSession } from "@/lib/market-hours";
import { cn } from "@/lib/utils";

const SESSION_LABEL: Record<MarketSession, string> = {
    pre_open: "PRE-OPENING",
    trading: "PASAR BUKA",
    post_close: "PENUTUPAN",
    closed: "PASAR TUTUP",
};

const SESSION_CLASS: Record<MarketSession, string> = {
    pre_open: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    trading: "bg-success/10 text-success border-success/30",
    post_close: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    closed: "bg-muted text-muted-foreground border-border",
};

export default function MarketStatusBar() {
    const [now, setNow] = useState<Date | null>(null);
    const [session, setSession] = useState<MarketSession>("closed");

    useEffect(() => {
        const tick = () => {
            const d = new Date();
            setNow(d);
            setSession(getMarketStatus(d).session);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const clock = now
        ? now.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false })
        : "--:--:--";
    const dateLabel = now
        ? now.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "short", year: "numeric" })
        : "";
    const isOpen = session === "trading";

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2">
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider border rounded-full px-2.5 py-1", SESSION_CLASS[session])}>
                    {isOpen && (
                        <span className="relative flex size-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                        </span>
                    )}
                    {SESSION_LABEL[session]}
                </span>
                <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">IDX · Jakarta</span>
            </div>
            <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground hidden md:inline">{dateLabel}</span>
                <span className={cn("font-mono font-bold text-sm tabular-nums", isOpen ? "text-success" : "text-foreground")}>
                    {clock} <span className="text-[9px] text-muted-foreground font-sans font-bold">WIB</span>
                </span>
            </div>
        </div>
    );
}
