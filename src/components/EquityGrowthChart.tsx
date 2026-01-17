"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
}

type Period = "week" | "month" | "3month" | "ytd" | "year" | "all";

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");

    const periods: { key: Period; label: string }[] = [
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

            // If all data is from same day, show time (HH:MM)
            // Otherwise show date (DD MMM)
            const timeLabel = isSameDay
                ? date.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                });

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
        const padding = (max - min) * 0.1;
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

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-2xl shadow-2xl border border-gray-800/50 overflow-hidden p-6">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Equity</h3>
                <div className="text-3xl font-bold text-white">
                    {formatIDR(currentEquity)}
                </div>
            </div>

            {/* Chart */}
            <div className="mb-4">
                {chartData.length > 0 ? (
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="#10b981"
                                            stopOpacity={0.5}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#10b981"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={tickInterval}
                                />
                                <YAxis
                                    orientation="right"
                                    domain={[minValue, maxValue]}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={formatYAxis}
                                    dx={10}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fill="url(#equityGradient)"
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: "#10b981",
                                        stroke: "#fff",
                                        strokeWidth: 2
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[240px] flex items-center justify-center text-gray-500">
                        <p className="text-sm">Belum ada data history</p>
                    </div>
                )}
            </div>

            {/* Period Selector */}
            <div className="flex items-center justify-center gap-2">
                {periods.map((period) => (
                    <button
                        key={period.key}
                        onClick={() => setSelectedPeriod(period.key)}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                            selectedPeriod === period.key
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                        )}
                    >
                        {period.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
