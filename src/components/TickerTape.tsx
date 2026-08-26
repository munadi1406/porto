"use client";

import { useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import type { StockPrice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";

interface TickerTapeProps {
    tickers: string[];
    prices?: Record<string, StockPrice>;
}

const SPEEDS = [
    { label: "0.5×", value: 90 },
    { label: "1×", value: 45 },
    { label: "2×", value: 22 },
];

export default function TickerTape({ tickers, prices: externalPrices }: TickerTapeProps) {
    const md = useMarketData(externalPrices ? [] : tickers);
    const prices = externalPrices ?? md.prices;
    const loading = externalPrices ? false : md.loading;
    const [paused, setPaused] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1); // default 1×

    const rows = tickers
        .map(t => ({ t, p: prices[t] }))
        .filter(r => r.p && r.p.price > 0);

    if (loading && rows.length === 0) {
        return <div className="h-9 border-b border-border bg-muted/40 animate-pulse" />;
    }
    if (rows.length === 0) return null;

    const doubled = [...rows, ...rows];
    const speed = SPEEDS[speedIdx].value;

    return (
        <div className="tape relative overflow-hidden border-b border-border bg-card group/tape">
            {/* Tape track */}
            <div
                className="tape-track flex w-max items-center gap-8 px-4 py-2"
                style={{
                    animationDuration: `${speed}s`,
                    animationPlayState: paused ? "paused" : "running",
                }}
            >
                {doubled.map((r, i) => (
                    <span key={i} className="flex items-center gap-2 text-xs whitespace-nowrap">
                        <b className="font-black text-foreground">{r.t.replace(".JK", "")}</b>
                        <span className="tabular-nums text-muted-foreground">
                            {r.p!.price.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                        </span>
                        <span className={cn("font-bold tabular-nums", r.p!.changePercent >= 0 ? "text-success" : "text-destructive")}>
                            {r.p!.changePercent >= 0 ? "+" : ""}{r.p!.changePercent.toFixed(2)}%
                        </span>
                    </span>
                ))}
            </div>

            {/* Controls — muncul saat hover */}
            <div className="absolute inset-y-0 right-0 z-10 flex items-center gap-1 pr-1.5 pl-6 bg-gradient-to-l from-card via-card/90 to-transparent opacity-0 group-hover/tape:opacity-100 transition-opacity pointer-events-none group-hover/tape:pointer-events-auto">
                <button
                    onClick={() => setSpeedIdx(i => (i - 1 + SPEEDS.length) % SPEEDS.length)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Lebih lambat"
                >
                    <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-mono font-bold text-muted-foreground w-6 text-center tabular-nums">{SPEEDS[speedIdx].label}</span>
                <button
                    onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Lebih cepat"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setPaused(p => !p)}
                    className={cn(
                        "p-1 rounded transition-colors cursor-pointer",
                        paused ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={paused ? "Play" : "Pause"}
                >
                    {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
            </div>

            {/* Fade kiri-kanan */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
        </div>
    );
}
