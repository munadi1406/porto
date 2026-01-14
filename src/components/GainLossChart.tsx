"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DataItem {
    name: string;
    value: number;
    gainLoss: number;
    percentage: number;
    [key: string]: any;
}

interface GainLossChartProps {
    data: DataItem[];
}

const COLORS = {
    profit: [
        "#10b981", // emerald-500
        "#059669", // emerald-600
        "#34d399", // emerald-400
        "#6ee7b7", // emerald-300
    ],
    loss: [
        "#ef4444", // red-500
        "#dc2626", // red-600
        "#f87171", // red-400
        "#fca5a5", // red-300
    ],
};

export function GainLossChart({ data }: GainLossChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Belum ada data portfolio</p>
                <p className="text-xs mt-1">Tambahkan saham untuk melihat gain/loss</p>
            </div>
        );
    }

    // Separate profit and loss stocks
    const profitStocks = data.filter(d => d.gainLoss > 0);
    const lossStocks = data.filter(d => d.gainLoss < 0);

    // Calculate totals
    const totalProfit = profitStocks.reduce((sum, d) => sum + d.gainLoss, 0);
    const totalLoss = Math.abs(lossStocks.reduce((sum, d) => sum + d.gainLoss, 0));
    const netGainLoss = totalProfit - totalLoss;

    // Prepare chart data with absolute values for visualization
    const chartData = data.map(item => ({
        ...item,
        displayValue: Math.abs(item.gainLoss),
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Gain/Loss:</span>
                            <span className={cn(
                                "font-bold",
                                data.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                                {data.gainLoss >= 0 ? "+" : ""}{formatIDR(data.gainLoss)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Kontribusi:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {data.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <div className="mb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Kontribusi Gain/Loss</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per saham terhadap total P/L</p>
            </div>

            {/* Summary Stats - Stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Profit</span>
                        </div>
                        <span className="text-xs text-green-600/70 dark:text-green-400/70">{profitStocks.length}</span>
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-500 mt-1">
                        +{formatIDR(totalProfit)}
                    </p>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span className="text-xs font-semibold text-red-700 dark:text-red-400">Loss</span>
                        </div>
                        <span className="text-xs text-red-600/70 dark:text-red-400/70">{lossStocks.length}</span>
                    </div>
                    <p className="text-sm font-bold text-red-600 dark:text-red-500 mt-1">
                        -{formatIDR(totalLoss)}
                    </p>
                </div>

                <div className={cn(
                    "p-3 rounded-lg border",
                    netGainLoss >= 0
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}>
                    <div className="flex items-center justify-between">
                        <span className={cn(
                            "text-xs font-semibold",
                            netGainLoss >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                        )}>
                            Net Total
                        </span>
                    </div>
                    <p className={cn(
                        "text-sm font-bold mt-1",
                        netGainLoss >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                    )}>
                        {netGainLoss >= 0 ? "+" : ""}{formatIDR(netGainLoss)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[300px] sm:h-[350px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="displayValue"
                        >
                            {chartData.map((entry, index) => {
                                const isProfit = entry.gainLoss > 0;
                                const colorArray = isProfit ? COLORS.profit : COLORS.loss;
                                const colorIndex = index % colorArray.length;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={colorArray[colorIndex]}
                                        stroke={isProfit ? "#10b981" : "#ef4444"}
                                        strokeWidth={1}
                                    />
                                );
                            })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => {
                                const data = entry.payload;
                                return (
                                    <span className={cn(
                                        "text-xs font-medium",
                                        data.gainLoss >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                    )}>
                                        {value} ({data.gainLoss >= 0 ? "+" : ""}{data.percentage.toFixed(0)}%)
                                    </span>
                                );
                            }}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
