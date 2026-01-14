"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Activity } from "lucide-react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";

interface GrowthChartProps {
    getGrowth: (period: "day" | "week" | "year" | "all") => { value: number; percent: number };
    getHistoryForPeriod: (period: "day" | "week" | "year" | "all") => PortfolioSnapshot[];
}

type Period = "day" | "week" | "year" | "all";

export function GrowthChart({ getGrowth, getHistoryForPeriod }: GrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");

    const periods: { key: Period; label: string; shortLabel: string }[] = [
        { key: "day", label: "1 Hari", shortLabel: "1H" },
        { key: "week", label: "1 Minggu", shortLabel: "1M" },
        { key: "year", label: "1 Tahun", shortLabel: "1T" },
        { key: "all", label: "Semua", shortLabel: "All" },
    ];

    const growth = getGrowth(selectedPeriod);
    const isPositive = growth.value >= 0;

    // Get history data for chart
    const historyData = getHistoryForPeriod(selectedPeriod);

    // Format data for Recharts
    const chartData = historyData.map((snapshot) => ({
        time: new Date(snapshot.timestamp).toLocaleDateString('id-ID', {
            month: 'short',
            day: 'numeric',
            hour: selectedPeriod === 'day' ? '2-digit' : undefined,
            minute: selectedPeriod === 'day' ? '2-digit' : undefined,
        }),
        timestamp: snapshot.timestamp,
        value: snapshot.totalValue,
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {new Date(data.timestamp).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatIDR(data.value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl">
                            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Pertumbuhan Portfolio
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {periods.find(p => p.key === selectedPeriod)?.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Growth Stats */}
                <div className="flex items-baseline gap-3">
                    <div className={cn(
                        "text-3xl font-bold",
                        isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                    )}>
                        {isPositive ? "+" : ""}{formatPercentage(growth.percent)}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg",
                        isPositive
                            ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                            : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                    )}>
                        {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? "+" : ""}{formatIDR(growth.value)}
                    </div>
                </div>
            </div>

            {/* Period Selector */}
            <div className="px-6 pt-4 pb-2">
                <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    {periods.map((period) => (
                        <button
                            key={period.key}
                            onClick={() => setSelectedPeriod(period.key)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200",
                                selectedPeriod === period.key
                                    ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            {period.shortLabel}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="px-2 pb-4">
                {chartData.length > 0 ? (
                    <div className="min-h-[280px]">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor={isPositive ? "#10b981" : "#ef4444"}
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={isPositive ? "#10b981" : "#ef4444"}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e5e7eb"
                                    vertical={false}
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                        return value.toString();
                                    }}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPositive ? "#10b981" : "#ef4444"}
                                    strokeWidth={2.5}
                                    fill="url(#colorValue)"
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: isPositive ? "#10b981" : "#ef4444",
                                        stroke: "#fff",
                                        strokeWidth: 2
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                        <Calendar className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm font-medium">Belum ada data history</p>
                        <p className="text-xs mt-1">Tunggu beberapa saat untuk melihat grafik</p>
                    </div>
                )}
            </div>
        </div>
    );
}
