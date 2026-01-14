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
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.ticker}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Cost Basis:</span>
                            <span className="font-semibold">{formatIDR(data.cost)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Current:</span>
                            <span className="font-semibold">{formatIDR(data.current)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Difference:</span>
                            <span className={cn(
                                "font-bold",
                                data.isProfit ? "text-green-600" : "text-red-600"
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cost Basis Analysis</h3>
                <p className="text-sm text-gray-500">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                    <DollarSign className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Cost Basis Analysis</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Harga beli vs harga sekarang</p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[300px] sm:h-[350px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="horizontal"
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <YAxis
                            type="category"
                            dataKey="ticker"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="cost"
                            fill="#94a3b8"
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
                                    fill={entry.isProfit ? "#10b981" : "#ef4444"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Cost Basis</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Profit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Loss</span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1">Above Cost</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-500">
                        {chartData.filter(d => d.isProfit).length}
                    </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-400 mb-1">Below Cost</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-500">
                        {chartData.filter(d => !d.isProfit).length}
                    </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Best</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-500">
                        {chartData[0]?.ticker} +{chartData[0]?.percentDiff.toFixed(0)}%
                    </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Worst</p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-500">
                        {chartData[chartData.length - 1]?.ticker} {chartData[chartData.length - 1]?.percentDiff.toFixed(0)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
