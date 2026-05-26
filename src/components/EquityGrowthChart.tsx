"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
    totalReturnPercent?: number;
}

type Period = "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all";

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");

    const periods: { key: Period; label: string }[] = [
        { key: "today", label: "Hari" },
        { key: "day", label: "24J" },
        { key: "week", label: "1M" },
        { key: "month", label: "1B" },
        { key: "3month", label: "3B" },
        { key: "ytd", label: "YTD" },
        { key: "year", label: "1T" },
        { key: "all", label: "All" },
    ];

    const rawHistoryData = getHistoryForPeriod(selectedPeriod);

    const chartData = useMemo(() => {
        if (!rawHistoryData || rawHistoryData.length === 0) return [];
        const sorted = [...rawHistoryData].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const firstDate = new Date(sorted[0].timestamp);
        const isSameDay = sorted.every(s => new Date(s.timestamp).toDateString() === firstDate.toDateString());
        const showTime = selectedPeriod === 'today' || selectedPeriod === 'day' || isSameDay;

        let processedData = sorted;
        if (!showTime && sorted.length > 1) {
            const groupedByDate = new Map<string, typeof sorted[0]>();
            sorted.forEach(snapshot => {
                const dateKey = new Date(snapshot.timestamp).toDateString();
                groupedByDate.set(dateKey, snapshot);
            });
            processedData = Array.from(groupedByDate.values());
        }

        return processedData.map((snapshot) => {
            const date = new Date(snapshot.timestamp);
            const val = snapshot.totalValue ?? snapshot.close ?? 0;
            return {
                timestamp: snapshot.timestamp,
                time: showTime
                    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                value: val,
                originalDate: date
            };
        });
    }, [rawHistoryData, selectedPeriod]);

    const performance = useMemo(() => {
        if (chartData.length === 0) return { nominal: 0, percent: 0, startPrice: 0 };
        const startPrice = chartData[0].value;
        const currentPrice = currentEquity;
        const nominal = currentPrice - startPrice;
        const percent = startPrice !== 0 ? (nominal / startPrice) * 100 : 0;
        return { nominal, percent, startPrice };
    }, [chartData, currentEquity]);

    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 0 };
        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || (max * 0.05);
        return {
            minValue: Math.floor((min - padding) / 100000) * 100000,
            maxValue: Math.ceil((max + padding) / 100000) * 100000,
        };
    }, [chartData]);

    const isPositive = performance.percent >= 0;
    const chartColor = isPositive ? "var(--success)" : "var(--danger)";

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 shadow-[var(--shadow-md)]">
                    <p className="text-xs text-[var(--muted)] mb-1">
                        {data.originalDate.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-semibold text-[var(--fg)]">{formatIDR(data.value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6">
            <div className="mb-6">
                <p className="text-xs font-medium text-[var(--muted)] mb-1">Total Equity</p>
                <div className="flex items-baseline gap-3">
                    <h2 className="text-3xl font-semibold text-[var(--fg)] tracking-tight">
                        {formatIDR(currentEquity)}
                    </h2>
                    <span className={cn(
                        "text-sm font-medium px-2 py-0.5 rounded",
                        isPositive ? "text-[var(--success)] bg-[var(--success-bg)]" : "text-[var(--danger)] bg-[var(--danger-bg)]"
                    )}>
                        {performance.percent > 0 ? "+" : ""}{performance.percent.toFixed(2)}%
                    </span>
                </div>
            </div>

            <div className="h-64 sm:h-80">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="eqChartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} dy={5} />
                            <YAxis domain={[minValue, maxValue]} orientation="right" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={40}
                                tickFormatter={(value) => {
                                    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
                                    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
                                    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
                                    return value.toString();
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#eqChartGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-sm text-[var(--muted)]">
                        Belum ada data history
                    </div>
                )}
            </div>

            <div className="flex gap-1 mt-4 pt-3 border-t border-[var(--border)] overflow-x-auto">
                {periods.map((period) => (
                    <button key={period.key} onClick={() => setSelectedPeriod(period.key)}
                        className={cn(
                            "px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                            selectedPeriod === period.key
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]"
                        )}
                    >
                        {period.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
