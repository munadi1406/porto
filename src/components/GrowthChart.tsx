"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Activity } from "lucide-react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";

interface GrowthChartProps {
    getGrowth: (period: "today" | "day" | "week" | "month" | "year" | "all") => { value: number; percent: number };
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "year" | "all") => PortfolioSnapshot[];
    onResetHistory: () => void;
}

type Period = "today" | "day" | "week" | "month" | "year" | "all";

export function GrowthChart({ getGrowth, getHistoryForPeriod, onResetHistory }: GrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("today");

    const periods: { key: Period; label: string; shortLabel: string }[] = [
        { key: "today", label: "Hari Ini", shortLabel: "HI" },
        { key: "day", label: "24 Jam Terakhir", shortLabel: "24J" },
        { key: "week", label: "1 Minggu Terakhir", shortLabel: "1M" },
        { key: "month", label: "1 Bulan Terakhir", shortLabel: "1B" },
        { key: "year", label: "1 Tahun Terakhir", shortLabel: "1T" },
        { key: "all", label: "Semua Waktu", shortLabel: "All" },
    ];

    const growth = getGrowth(selectedPeriod);
    const isPositive = growth.value >= 0;

    // Get history data for chart
    const historyData = getHistoryForPeriod(selectedPeriod);

    // Format data for Recharts
    const chartData = historyData.map((snapshot: any) => ({
        time: new Date(snapshot.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        }),
        timestamp: snapshot.timestamp,
        value: snapshot.close || snapshot.totalValue,
        open: snapshot.open,
        high: snapshot.high,
        low: snapshot.low,
        close: snapshot.close,
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isOHLC = data.open !== undefined;

            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-md bg-opacity-95">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {new Date(data.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between gap-8">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatIDR(data.value)}
                            </span>
                        </div>
                        {isOHLC && (
                            <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/50 mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-gray-400">O:</span>
                                    <span className="text-[10px] font-mono text-gray-600 dark:text-gray-300">{formatIDR(data.open)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-gray-400">H:</span>
                                    <span className="text-[10px] font-mono text-green-500">{formatIDR(data.high)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-gray-400">L:</span>
                                    <span className="text-[10px] font-mono text-red-500">{formatIDR(data.low)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-gray-400">C:</span>
                                    <span className="text-[10px] font-mono text-gray-600 dark:text-gray-300">{formatIDR(data.close)}</span>
                                </div>
                            </div>
                        )}
                    </div>
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

            {/* Period Selector & Reset */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
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

                <button
                    onClick={() => {
                        if (confirm('Bersihkan semua riwayat pertumbuhan portfolio?')) {
                            onResetHistory();
                        }
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors uppercase font-bold tracking-wider"
                >
                    Reset Data
                </button>
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
