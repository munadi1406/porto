"use client";

import { useMarketData } from "@/hooks/useMarketData";
import type { StockPrice } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TickerTapeProps {
    tickers: string[];
    // Jika diisi, pakai data dari parent (hemat koneksi WS); jika kosong, self-subscribe
    prices?: Record<string, StockPrice>;
}

export default function TickerTape({ tickers, prices: externalPrices }: TickerTapeProps) {
    const md = useMarketData(externalPrices ? [] : tickers);
    const prices = externalPrices ?? md.prices;
    const loading = externalPrices ? false : md.loading;

    const rows = tickers
        .map(t => ({ t, p: prices[t] }))
        .filter(r => r.p && r.p.price > 0);

    if (loading && rows.length === 0) {
        return <div className="h-9 border-b border-border bg-muted/40 animate-pulse" />;
    }
    if (rows.length === 0) return null;

    // Duplikasi daftar agar loop marquee mulus (translateX -50%)
    const doubled = [...rows, ...rows];

    return (
        <div className="tape relative overflow-hidden border-b border-border bg-card">
            <div className="tape-track flex w-max items-center gap-8 px-4 py-2">
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
            {/* Fade kiri-kanan */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
        </div>
    );
}
