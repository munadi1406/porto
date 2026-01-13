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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
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
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
                        isPositive ? "text-green-600" : "text-red-600"
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
                        isPositive ? "text-green-600" : "text-red-600"
                    )}
                >
                    {isPositive ? "+" : ""}
                    {formatPercentage(growth.percent)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedPeriod === "day" && "Last 24 hours"}
                    {selectedPeriod === "week" && "Last 7 days"}
                    {selectedPeriod === "year" && "Last 365 days"}
                    {selectedPeriod === "all" && "All time"}
                </p>
            </div>
        </div>
    );
}
