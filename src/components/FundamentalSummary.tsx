"use client";

import { cn } from "@/lib/utils";
import type { FundamentalData } from "@/hooks/useFundamentals";

export default function FundamentalSummary({ data }: { data: FundamentalData | null }) {
    if (!data) return null;

    const summary = [
        `P/E Ratio ${data.peRatio != null ? data.peRatio.toFixed(2) : "-"}x`,
        `P/B ${data.pbRatio != null ? data.pbRatio.toFixed(2) : "-"}x`,
        `ROE ${data.roe != null ? (data.roe * 100).toFixed(1) : "-"}%`,
        `Dividend Yield ${data.dividendYield != null ? (data.dividendYield * 100).toFixed(2) : "-"}%`,
    ].join(" | ");

    const description = data.sector
        ? `${data.ticker || ""} bergerak di sektor ${data.sector}${data.industry ? ` (${data.industry})` : ""}. ${
            data.profitMargin != null && data.profitMargin > 0.1
                ? "Margin profitabilitas yang sehat."
                : data.profitMargin != null && data.profitMargin > 0
                ? "Margin profit moderat."
                : ""
        } ${
            data.currentRatio != null && data.currentRatio > 1.5
                ? "Likuiditas yang kuat."
                : data.currentRatio != null && data.currentRatio > 1
                ? "Likuiditas memadai."
                : ""
        } ${
            data.revenueGrowth != null && data.revenueGrowth > 0
                ? `Pertumbuhan pendapatan ${(data.revenueGrowth * 100).toFixed(1)}% YoY.`
                : ""
        }`
        : "Data fundamental belum tersedia.";

    return (
        <div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
            <div className="flex flex-wrap gap-1.5">
                {[
                    data.peRatio != null && { label: "P/E", value: `${data.peRatio.toFixed(1)}x` },
                    data.pbRatio != null && { label: "P/B", value: `${data.pbRatio.toFixed(1)}x` },
                    data.roe != null && { label: "ROE", value: `${(data.roe * 100).toFixed(1)}%` },
                    data.dividendYield != null && data.dividendYield > 0 && { label: "Div", value: `${(data.dividendYield * 100).toFixed(2)}%` },
                ]
                    .filter(Boolean)
                    .map((chip: any) => (
                        <span
                            key={chip.label}
                            className="px-2 py-0.5 bg-muted rounded text-[9px] font-bold text-muted-foreground"
                        >
                            {chip.label}: {chip.value}
                        </span>
                    ))}
            </div>
        </div>
    );
}