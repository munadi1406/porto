"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
    totalReturnPercent?: number;
}

type Period = "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all";

const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Hari" }, { key: "day", label: "24J" }, { key: "week", label: "1M" },
    { key: "month", label: "1B" }, { key: "3month", label: "3B" }, { key: "ytd", label: "YTD" },
    { key: "year", label: "1T" }, { key: "all", label: "All" },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover border rounded-lg p-3 shadow-md text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                    {data.originalDate.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="font-semibold">{formatIDR(data.value)}</p>
            </div>
        );
    }
    return null;
};

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");
    const rawHistoryData = getHistoryForPeriod(selectedPeriod);

    const chartData = useMemo(() => {
        if (!rawHistoryData || rawHistoryData.length === 0) return [];
        const sorted = [...rawHistoryData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const firstDate = new Date(sorted[0].timestamp);
        const isSameDay = sorted.every(s => new Date(s.timestamp).toDateString() === firstDate.toDateString());
        const showTime = selectedPeriod === 'today' || selectedPeriod === 'day' || isSameDay;

        let processedData = sorted;
        if (!showTime && sorted.length > 1) {
            const groupedByDate = new Map<string, typeof sorted[0]>();
            sorted.forEach(sn => groupedByDate.set(new Date(sn.timestamp).toDateString(), sn));
            processedData = Array.from(groupedByDate.values());
        }

        return processedData.map(snapshot => {
            const date = new Date(snapshot.timestamp);
            return {
                timestamp: snapshot.timestamp,
                time: showTime ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                value: snapshot.totalValue ?? snapshot.close ?? 0,
                originalDate: date
            };
        });
    }, [rawHistoryData, selectedPeriod]);

    const performance = useMemo(() => {
        if (chartData.length === 0) return { nominal: 0, percent: 0 };
        const startPrice = chartData[0].value;
        const nominal = currentEquity - startPrice;
        const percent = startPrice !== 0 ? (nominal / startPrice) * 100 : 0;
        return { nominal, percent };
    }, [chartData, currentEquity]);

    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 0 };
        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || (max * 0.05);
        return { minValue: Math.floor((min - padding) / 100000) * 100000, maxValue: Math.ceil((max + padding) / 100000) * 100000 };
    }, [chartData]);

    const isPositive = performance.percent >= 0;
    const chartColor = isPositive ? "var(--chart-2)" : "var(--destructive)";

    return (
        <Card>
            <CardContent className="p-4 sm:p-6">
                <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Equity</p>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-semibold tracking-tight">{formatIDR(currentEquity)}</h2>
                        <span className={cn("text-sm font-medium", isPositive ? "text-success" : "text-destructive")}>
                            {performance.percent > 0 ? "+" : ""}{performance.percent.toFixed(2)}%
                        </span>
                    </div>
                </div>

                <div className="h-64 sm:h-80">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} dy={5} />
                                <YAxis domain={[minValue, maxValue]} orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={40}
                                    tickFormatter={(v) => { if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`; return v.toString(); }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#eqGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Belum ada data history</div>
                    )}
                </div>

                <div className="flex gap-1 mt-4 pt-3 border-t overflow-x-auto">
                    {periods.map((period) => (
                        <Button key={period.key} variant={selectedPeriod === period.key ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2" onClick={() => setSelectedPeriod(period.key)}>
                            {period.label}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
