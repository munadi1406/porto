"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";

interface GrowthDisplayProps {
    getGrowth: (period: "day" | "week" | "year" | "all") => { value: number; percent: number };
}

type Period = "day" | "week" | "year" | "all";

export function GrowthDisplay({ getGrowth }: GrowthDisplayProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("day");

    const periods: { key: Period; label: string }[] = [
        { key: "day", label: "1D" },
        { key: "week", label: "1W" },
        { key: "year", label: "1Y" },
        { key: "all", label: "All" },
    ];

    const growth = getGrowth(selectedPeriod);
    const isPositive = growth.value >= 0;

    return (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                    Portfolio Growth
                </h3>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 mb-4">
                {periods.map((period) => (
                    <button
                        key={period.key}
                        onClick={() => setSelectedPeriod(period.key)}
                        className={cn(
                            "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors",
                            selectedPeriod === period.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {period.label}
                    </button>
                ))}
            </div>

            {/* Growth Display */}
            <div className="space-y-2">
                <div
                    className={cn(
                        "text-3xl font-bold flex items-center gap-2",
                        isPositive ? "text-success" : "text-destructive"
                    )}
                >
                    {isPositive ? (
                        <TrendingUp className="w-6 h-6" />
                    ) : (
                        <TrendingDown className="w-6 h-6" />
                    )}
                    {isPositive ? "+" : ""}
                    {formatIDR(growth.value)}
                </div>
                <div
                    className={cn(
                        "text-lg font-semibold",
                        isPositive ? "text-success" : "text-destructive"
                    )}
                >
                    {isPositive ? "+" : ""}
                    {formatPercentage(growth.percent)}
                </div>
                <p className="text-xs text-muted-foreground">
                    {selectedPeriod === "day" && "Last 24 hours"}
                    {selectedPeriod === "week" && "Last 7 days"}
                    {selectedPeriod === "year" && "Last 365 days"}
                    {selectedPeriod === "all" && "All time"}
                </p>
            </div>
        </div>
    );
}
