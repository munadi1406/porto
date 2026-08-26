"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { monthlyReturnMatrix, type SeasonalityMatrix } from "@/lib/quant";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function cellColor(v: number | null): string {
    if (v == null) return "";
    const clamped = Math.max(-10, Math.min(10, v));
    const alpha = (Math.abs(clamped) / 10) * 0.75 + 0.12;
    return clamped >= 0
        ? `color-mix(in srgb, var(--success) ${alpha * 100}%, transparent)`
        : `color-mix(in srgb, var(--destructive) ${alpha * 100}%, transparent)`;
}

/** Heatmap return bulanan per saham dari data bulanan 5 tahun. */
export default function SeasonalityHeatmap({ ticker }: { ticker: string }) {
    const [matrix, setMatrix] = useState<SeasonalityMatrix | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setMatrix(null);
        fetch(`/api/stocks/history?ticker=${ticker}&period=5y&interval=1mo`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data)) {
                    setMatrix(monthlyReturnMatrix(
                        j.data.map((d: any) => ({
                            date: new Date(d.time * 1000).toISOString().slice(0, 10),
                            close: d.close,
                        }))
                    ));
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [ticker]);

    const bestWorst = useMemo(() => {
        if (!matrix) return null;
        const valid = matrix.averages
            .map((v, i) => ({ v, i }))
            .filter(x => x.v != null) as { v: number; i: number }[];
        if (!valid.length) return null;
        const best = valid.reduce((a, b) => (b.v > a.v ? b : a));
        const worst = valid.reduce((a, b) => (b.v < a.v ? b : a));
        return { best, worst };
    }, [matrix]);

    return (
        <div className="card">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Seasonality
                <span className="text-[9px] font-normal text-muted-foreground">return bulanan 5 tahun</span>
            </h3>

            {loading ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Menghitung pola musiman…</div>
            ) : !matrix || matrix.years.length === 0 ? (
                <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Data tidak cukup</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px] tabular-nums border-separate border-spacing-[2px]">
                            <thead>
                                <tr>
                                    <th className="text-left font-bold text-muted-foreground pr-1">Thn</th>
                                    {MONTHS.map(m => (
                                        <th key={m} className="font-bold text-muted-foreground px-0.5">{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {matrix.years.map((y, yi) => (
                                    <tr key={y}>
                                        <td className="font-bold text-muted-foreground pr-1">{y}</td>
                                        {matrix.grid[yi].map((v, mi) => (
                                            <td
                                                key={mi}
                                                className={cn("text-center rounded py-1 font-semibold", v == null && "opacity-30")}
                                                style={{ backgroundColor: v != null ? cellColor(v) : undefined }}
                                                title={v != null ? `${MONTHS[mi]} ${y}: ${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "no data"}
                                            >
                                                {v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(0)}` : "·"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                <tr>
                                    <td className="font-black pr-1">Avg</td>
                                    {matrix.averages.map((v, mi) => (
                                        <td key={mi} className={cn("text-center rounded py-1 font-black border border-border",
                                            v == null ? "opacity-30" : v > 0 ? "text-success" : v < 0 ? "text-destructive" : "")}>
                                            {v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}` : "·"}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {bestWorst && bestWorst.best.i !== bestWorst.worst.i && (
                        <p className="mt-2 text-[10px] text-muted-foreground">
                            Historis terkuat: <span className="text-success font-bold">{MONTHS[bestWorst.best.i]}</span>{" "}
                            (+{bestWorst.best.v.toFixed(1)}% rata-rata) · terlemah:{" "}
                            <span className="text-destructive font-bold">{MONTHS[bestWorst.worst.i]}</span>{" "}
                            ({bestWorst.worst.v.toFixed(1)}%)
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
