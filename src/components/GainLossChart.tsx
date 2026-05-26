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
    profit: ["#059669", "#34d399"],
    loss: ["#dc2626", "#f87171"],
};

export function GainLossChart({ data }: GainLossChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-80 flex flex-col items-center justify-center text-sm text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                <p>Belum ada data portfolio</p>
            </div>
        );
    }

    const profitStocks = data.filter(d => d.gainLoss > 0);
    const lossStocks = data.filter(d => d.gainLoss < 0);
    const totalProfit = profitStocks.reduce((sum, d) => sum + d.gainLoss, 0);
    const totalLoss = Math.abs(lossStocks.reduce((sum, d) => sum + d.gainLoss, 0));
    const netGainLoss = totalProfit - totalLoss;

    const chartData = data.map(item => ({ ...item, displayValue: Math.abs(item.gainLoss) }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 shadow-[var(--shadow-md)] text-sm">
                    <p className="font-medium text-[var(--fg)] mb-1">{data.name}</p>
                    <div className="space-y-0.5">
                        <div className="flex justify-between gap-4">
                            <span className="text-[var(--muted)]">Gain/Loss:</span>
                            <span className={cn("font-medium", data.gainLoss >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                {data.gainLoss >= 0 ? "+" : ""}{formatIDR(data.gainLoss)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-[var(--muted)]">Kontribusi:</span>
                            <span className="font-medium text-[var(--fg)]">{data.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6">
            <h3 className="font-medium text-[var(--fg)] mb-1">Kontribusi Gain/Loss</h3>
            <p className="text-sm text-[var(--muted)] mb-4">Per saham terhadap total P/L</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-3 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
                            <span className="text-xs font-medium text-[var(--success)]">Profit</span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">{profitStocks.length}</span>
                    </div>
                    <p className="font-semibold text-[var(--success)]">+{formatIDR(totalProfit)}</p>
                </div>
                <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-[var(--danger)]" />
                            <span className="text-xs font-medium text-[var(--danger)]">Loss</span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">{lossStocks.length}</span>
                    </div>
                    <p className="font-semibold text-[var(--danger)]">-{formatIDR(totalLoss)}</p>
                </div>
                <div className={cn("p-3 rounded-lg border", netGainLoss >= 0 ? "bg-[var(--success-bg)] border-[var(--success)]/20" : "bg-[var(--danger-bg)] border-[var(--danger)]/20")}>
                    <p className="text-xs font-medium mb-1" style={{ color: netGainLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>Net Total</p>
                    <p className="font-semibold" style={{ color: netGainLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {netGainLoss >= 0 ? "+" : ""}{formatIDR(netGainLoss)}
                    </p>
                </div>
            </div>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="displayValue" stroke="none">
                            {chartData.map((entry: any, index: number) => {
                                const isProfit = entry.gainLoss > 0;
                                const colorArray = isProfit ? COLORS.profit : COLORS.loss;
                                return <Cell key={`cell-${index}`} fill={colorArray[index % colorArray.length]} />;
                            })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={30}
                            formatter={(value: any, entry: any) => {
                                const data = entry.payload;
                                return <span className="text-xs" style={{ color: data.gainLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {value} ({data.gainLoss >= 0 ? "+" : ""}{data.percentage.toFixed(0)}%)
                                </span>;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
