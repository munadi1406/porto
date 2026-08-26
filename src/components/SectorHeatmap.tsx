"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface SectorSummary {
    sector: string;
    stocks: number;
    totalVolume: number;
    totalValue: number;
    avgChangePercent: number;
    gainers: number;
    losers: number;
}

const PCT_MAX = 3; // skala warna: -3% .. +3%

function tileColor(pct: number): string {
    const c = Math.min(1, Math.abs(pct) / PCT_MAX);
    const a = 12 + c * 55; // opacity %
    return pct >= 0
        ? `color-mix(in srgb, var(--success) ${a}%, transparent)`
        : `color-mix(in srgb, var(--destructive) ${a}%, transparent)`;
}

export default function SectorHeatmap({ sectors }: { sectors: SectorSummary[] }) {
    const [mode, setMode] = useState<"pct" | "value">("pct");

    // Ukuran tile proporsional terhadap bobot (nilai transaksi atau jumlah saham)
    const tiles = useMemo(() => {
        if (!sectors.length) return [];
        const weight = (s: SectorSummary) => (mode === "value" ? Math.log10(Math.max(1, s.totalValue)) : s.stocks);
        const max = Math.max(...sectors.map(weight));
        return [...sectors]
            .sort((a, b) => weight(b) - weight(a))
            .map(s => ({ ...s, w: Math.max(0.35, weight(s) / max), span: weight(s) / max > 0.75 ? "col-span-2" : "" }));
    }, [sectors, mode]);

    if (!sectors.length) return null;

    return (
        <div className="card-flush">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <h3 className="card-title">Sector Heatmap</h3>
                <div className="ml-auto flex gap-1 bg-muted/50 rounded-md p-0.5">
                    {(["pct", "value"] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                "px-2 py-0.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors",
                                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {m === "pct" ? "%Chg" : "Bobot"}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-min gap-2">
                {tiles.map(t => {
                    const up = t.avgChangePercent >= 0;
                    return (
                        <div
                            key={t.sector}
                            className={cn("heat-tile relative rounded-lg border border-border/60 p-3 cursor-default", t.span)}
                            style={{ backgroundColor: tileColor(t.avgChangePercent) }}
                            title={`${t.sector}: ${up ? "+" : ""}${t.avgChangePercent.toFixed(2)}% · ${t.stocks} saham`}
                        >
                            <p className="text-[10px] font-bold text-muted-foreground truncate">{t.sector}</p>
                            <p className={cn("text-xl font-black tabular-nums leading-tight", up ? "text-success" : "text-destructive")}>
                                {up ? "+" : ""}{t.avgChangePercent.toFixed(2)}%
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                {t.stocks} saham · <span className="text-success">{t.gainers}↑</span> <span className="text-destructive">{t.losers}↓</span>
                            </p>
                        </div>
                    );
                })}
            </div>
            {/* Skala warna */}
            <div className="px-4 pb-3 flex items-center gap-2">
                <span className="text-[9px] font-bold text-destructive">-3%</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--destructive) 65%, transparent), color-mix(in srgb, var(--destructive) 12%, transparent), color-mix(in srgb, var(--success) 12%, transparent), color-mix(in srgb, var(--success) 65%, transparent))" }} />
                <span className="text-[9px] font-bold text-success">+3%</span>
            </div>
        </div>
    );
}
