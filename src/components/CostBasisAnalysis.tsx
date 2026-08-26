"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign } from "lucide-react";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";

interface CostBasisAnalysisProps {
    portfolio: PortfolioItem[];
    prices: Record<string, { price: number; change: number }>;
}

export function CostBasisAnalysis({ portfolio, prices }: CostBasisAnalysisProps) {
    const chartData = useMemo(() => {
        return portfolio.map((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const costBasis = item.averagePrice;
            // Use live price if available, otherwise use cost basis
            const currentPrice = livePrice > 0 ? livePrice : costBasis;
            const difference = currentPrice - costBasis;
            const percentDiff = costBasis > 0 ? ((difference / costBasis) * 100) : 0;

            return {
                ticker: item.ticker,
                cost: costBasis,
                current: currentPrice,
                difference,
                percentDiff,
                isProfit: difference >= 0,
            };
        }).sort((a, b) => b.percentDiff - a.percentDiff);
    }, [portfolio, prices]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-card p-3 rounded-lg shadow-xl border border-border">
                    <p className="font-bold text-foreground mb-2">{data.ticker}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Cost Basis:</span>
                            <span className="font-semibold">{formatIDR(data.cost)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-semibold">{formatIDR(data.current)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Difference:</span>
                            <span className={cn(
                                "font-bold",
                                data.isProfit ? "text-success" : "text-destructive"
                            )}>
                                {data.isProfit ? "+" : ""}{data.percentDiff.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">Cost Basis Analysis</h3>
                <p className="text-sm text-muted-foreground">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Cost Basis Analysis</h3>
                    <p className="text-xs text-muted-foreground">Harga beli vs harga sekarang</p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[300px] sm:h-[350px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
                        />
                        <YAxis
                            type="category"
                            dataKey="ticker"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            width={70}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="cost"
                            fill="hsl(var(--muted-foreground))"
                            radius={[0, 4, 4, 0]}
                            name="Cost Basis"
                            barSize={20}
                        />
                        <Bar
                            dataKey="current"
                            radius={[0, 4, 4, 0]}
                            name="Current Price"
                            barSize={20}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isProfit ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted-foreground/30 rounded"></div>
                    <span className="text-muted-foreground">Cost Basis</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-success rounded"></div>
                    <span className="text-muted-foreground">Profit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-destructive rounded"></div>
                    <span className="text-muted-foreground">Loss</span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-xs text-success mb-1">Above Cost</p>
                    <p className="text-lg font-bold text-success">
                        {chartData.filter(d => d.isProfit).length}
                    </p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-xs text-destructive mb-1">Below Cost</p>
                    <p className="text-lg font-bold text-destructive">
                        {chartData.filter(d => !d.isProfit).length}
                    </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs text-primary mb-1">Best</p>
                    <p className="text-sm font-bold text-primary">
                        {chartData[0]?.ticker} +{chartData[0]?.percentDiff.toFixed(0)}%
                    </p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                    <p className="text-xs text-warning mb-1">Worst</p>
                    <p className="text-sm font-bold text-warning">
                        {chartData[chartData.length - 1]?.ticker} {chartData[chartData.length - 1]?.percentDiff.toFixed(0)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
