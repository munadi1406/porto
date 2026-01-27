"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
    totalReturnPercent?: number;
}

type Period = "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all";

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity, totalReturnPercent }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");

    const periods: { key: Period; label: string }[] = [
        { key: "today", label: "Hi" },
        { key: "day", label: "24J" },
        { key: "week", label: "1W" },
        { key: "month", label: "1M" },
        { key: "3month", label: "3M" },
        { key: "ytd", label: "YTD" },
        { key: "year", label: "1Y" },
        { key: "all", label: "All" },
    ];

    // Get history data for chart
    const historyData = getHistoryForPeriod(selectedPeriod);

    // Format data for Recharts
    const chartData = useMemo(() => {
        if (historyData.length === 0) return [];

        // Check if all data is from the same day
        const firstDate = new Date(historyData[0].timestamp);
        const isSameDay = historyData.every(snapshot => {
            const date = new Date(snapshot.timestamp);
            return date.toDateString() === firstDate.toDateString();
        });

        return historyData.map((snapshot: any) => {
            const date = new Date(snapshot.timestamp);

            // If all data is from same day, show time (HH.MM)
            // Otherwise show date (D MMM)
            const timeLabel = isSameDay
                ? date.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(':', '.')
                : `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`;

            return {
                time: timeLabel,
                timestamp: snapshot.timestamp,
                value: snapshot.close || snapshot.totalValue,
            };
        });
    }, [historyData]);

    // Calculate min and max for Y-axis
    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 0 };

        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Add padding
        let padding = (max - min) * 0.1;
        if (padding === 0) padding = max * 0.05; // 5% padding if flat

        return {
            minValue: Math.floor((min - padding) / 10000) * 10000,
            maxValue: Math.ceil((max + padding) / 10000) * 10000,
        };
    }, [chartData]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const date = new Date(data.timestamp);

            return (
                <div className="bg-gray-800/95 p-2.5 rounded-lg shadow-xl border border-gray-700 backdrop-blur-sm">
                    <p className="text-[10px] text-gray-400 mb-1">
                        {date.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })} • {date.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                    <p className="text-sm font-bold text-white">
                        {formatIDR(data.value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Format Y-axis values
    const formatYAxis = (value: number) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toString();
    };

    // Calculate tick interval to avoid overcrowding
    const tickInterval = useMemo(() => {
        const dataLength = chartData.length;
        if (dataLength <= 6) return 0; // Show all ticks
        if (dataLength <= 12) return 1; // Show every other tick
        if (dataLength <= 24) return Math.floor(dataLength / 6); // Show ~6 ticks
        return Math.floor(dataLength / 8); // Show ~8 ticks for larger datasets
    }, [chartData]);

    // Calculate performance metrics for the selected period
    const performance = useMemo(() => {
        // Prioritize actual portfolio performance if provided
        if (totalReturnPercent !== undefined) {
            return { nominal: 0, percent: totalReturnPercent };
        }

        if (chartData.length < 2) return { nominal: 0, percent: 0 };
        const first = chartData[0].value;
        const last = chartData[chartData.length - 1].value;
        const nominal = last - first;
        const percent = first > 0 ? (nominal / first) * 100 : 0;
        return { nominal, percent };
    }, [chartData, totalReturnPercent]);

    const chartColor = performance.percent >= 0 ? "#19d57a" : "#ff5d5d"; // Stockbit Green / Stockbit Red

    return (
        <div className="bg-white dark:bg-[#12151c] rounded-[1.5rem] md:rounded-[2rem] border border-gray-200 dark:border-[#1e232d] overflow-hidden p-4 sm:p-6 md:p-10 shadow-sm">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <h3 className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 md:mb-2 uppercase tracking-wider">Total Equity</h3>
                <div className="flex flex-wrap items-baseline gap-2 md:gap-3">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {formatIDR(currentEquity)}
                    </h2>
                    <div className={cn(
                        "text-xs md:text-sm font-semibold",
                        performance.percent >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
                    )}>
                        {performance.percent >= 0 ? "+" : ""}{performance.percent.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="relative">
                {chartData.length > 0 ? (
                    <div className="h-[220px] sm:h-[280px] md:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    minTickGap={30}
                                    interval={tickInterval}
                                />
                                <YAxis
                                    orientation="right"
                                    domain={[minValue, maxValue]}
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={formatYAxis}
                                    width={45}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={chartColor}
                                    strokeWidth={3}
                                    fill="url(#equityGradient)"
                                    dot={false}
                                    activeDot={{
                                        r: 4,
                                        fill: chartColor,
                                        stroke: "#fff",
                                        strokeWidth: 2
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[220px] sm:h-[280px] md:h-[320px] flex flex-col items-center justify-center text-gray-400 gap-4 opacity-40">
                        <TrendingUp className="w-10 h-10 md:w-12 md:h-12" />
                        <p className="text-[10px] md:text-xs font-medium">No performance data available</p>
                    </div>
                )}
            </div>

            {/* Period Selector Below Chart - Tab Style matching Stockbit */}
            <div className="flex items-center justify-center gap-1 md:gap-4 mt-6 md:mt-8 border-t border-gray-100 dark:border-[#3d4451] pt-4 md:pt-6">
                {periods.map((period) => (
                    <button
                        key={period.key}
                        type="button"
                        onClick={() => setSelectedPeriod(period.key)}
                        className="relative px-3 md:px-4 py-2 group overflow-visible"
                    >
                        <span className={cn(
                            "text-xs md:text-sm font-bold transition-all duration-300",
                            selectedPeriod === period.key
                                ? "text-[#19d57a]"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}>
                            {period.label}
                        </span>

                        {/* Active Underline Indicator */}
                        {selectedPeriod === period.key && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#19d57a] rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
