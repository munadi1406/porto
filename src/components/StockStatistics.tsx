"use client";

import { cn, formatCompactIDR, formatIDR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FundamentalData } from "@/hooks/useFundamentals";

export default function StockStatistics({ data }: { data: FundamentalData | null }) {
    if (!data) return null;

    const stats = [
        { label: "Market Cap", value: data.marketCap ? formatCompactIDR(data.marketCap) : "-", trend: null as null | boolean },
        { label: "P/E Ratio", value: data.peRatio != null ? `${data.peRatio.toFixed(2)}x` : "-", trend: data.peRatio != null ? data.peRatio < 20 : null },
        { label: "P/B Ratio", value: data.pbRatio != null ? `${data.pbRatio.toFixed(2)}x` : "-", trend: data.pbRatio != null ? data.pbRatio < 3 : null },
        { label: "EPS (TTM)", value: data.trailingEps != null ? formatIDR(data.trailingEps) : "-", trend: data.trailingEps != null ? data.trailingEps > 0 : null },
        { label: "Dividend Yield", value: data.dividendYield != null ? `${(data.dividendYield * 100).toFixed(2)}%` : "-", trend: data.dividendYield != null ? data.dividendYield > 0.02 : null },
        { label: "ROE", value: data.roe != null ? `${(data.roe * 100).toFixed(1)}%` : "-", trend: data.roe != null ? data.roe > 0.15 : null },
        { label: "Der", value: data.debtToEquity != null ? `${data.debtToEquity.toFixed(2)}x` : "-", trend: data.debtToEquity != null ? data.debtToEquity < 1 : null },
        { label: "Current Ratio", value: data.currentRatio != null ? `${data.currentRatio.toFixed(2)}x` : "-", trend: data.currentRatio != null ? data.currentRatio > 1.5 : null },
    ];

    return (
        <div className="divide-y divide-border">
            {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between px-1 py-2.5">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-mono">{s.value}</span>
                        {s.trend === true && <TrendingUp className="w-3 h-3 text-success" />}
                        {s.trend === false && <TrendingDown className="w-3 h-3 text-destructive" />}
                        {s.trend === null && <Minus className="w-3 h-3 text-muted-foreground" />}
                    </div>
                </div>
            ))}
        </div>
    );
}