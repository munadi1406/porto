"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/analysis-utils";

export default function TechnicalSignals({ analysis }: { analysis: AnalysisResult | null }) {
    const signals = useMemo(() => {
        if (!analysis) return [];

        const rec = analysis.recommendation || "";
        const vol = analysis.volume;

        return [
            {
                name: "Moving Average",
                signal: rec.includes("BUY") ? "BUY" : rec.includes("SELL") ? "SELL" : "NEUTRAL",
                detail: "MA20 & MA50",
            },
            {
                name: "RSI",
                signal: vol?.mfioversold ? "BUY" : vol?.mfioverbought ? "SELL" : "NEUTRAL",
                detail: `MFI: ${vol?.mfi ?? "-"}`,
            },
            {
                name: "MACD",
                signal: vol?.obvTrend === "UP" ? "BUY" : vol?.obvTrend === "DOWN" ? "SELL" : "NEUTRAL",
                detail: `OBV: ${vol?.obvTrend ?? "-"}`,
            },
            {
                name: "Bollinger Bands",
                signal: vol?.signal === "ACCUMULATION" ? "BUY" : vol?.signal === "DISTRIBUTION" ? "SELL" : "NEUTRAL",
                detail: `Score: ${vol?.score ?? 0}`,
            },
            {
                name: "Stochastic",
                signal: vol?.volumeSurge ? (vol?.obvTrend === "UP" ? "BUY" : "SELL") : "NEUTRAL",
                detail: vol?.volumeSurge ? "Surge" : "Normal",
            },
        ];
    }, [analysis]);

    const buyCount = signals.filter((s) => s.signal === "BUY").length;
    const sellCount = signals.filter((s) => s.signal === "SELL").length;
    const overall = buyCount > sellCount ? "BUY" : sellCount > buyCount ? "SELL" : "NEUTRAL";

    if (signals.length === 0) {
        return <p className="text-xs text-muted-foreground">Belum ada sinyal teknikal.</p>;
    }

    return (
        <div>
            <div className="divide-y divide-border">
                {signals.map((s) => (
                    <div key={s.name} className="flex items-center justify-between px-1 py-2.5">
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                        <span
                            className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded",
                                s.signal === "BUY"
                                    ? "bg-success/10 text-success"
                                    : s.signal === "SELL"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {s.signal}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs font-bold">Overall Signal</span>
                <span
                    className={cn(
                        "px-3 py-1 text-xs font-black rounded-lg",
                        overall === "BUY"
                            ? "bg-success text-success-foreground"
                            : overall === "SELL"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    {overall}
                </span>
            </div>
        </div>
    );
}