"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataItem {
    name: string;
    value: number;
    gainLoss: number;
    percentage: number;
    [key: string]: any;
}

interface GainLossChartProps { data: DataItem[] }

const COLORS = { profit: ["#059669", "#34d399"], loss: ["#dc2626", "#f87171"] };

export function GainLossChart({ data }: GainLossChartProps) {
    if (data.length === 0) {
        return <Card><CardContent className="h-40 flex items-center justify-center text-muted-foreground">Belum ada data</CardContent></Card>;
    }

    const profitStocks = data.filter(d => d.gainLoss > 0);
    const lossStocks = data.filter(d => d.gainLoss < 0);
    const totalProfit = profitStocks.reduce((sum, d) => sum + d.gainLoss, 0);
    const totalLoss = Math.abs(lossStocks.reduce((sum, d) => sum + d.gainLoss, 0));
    const netGainLoss = totalProfit - totalLoss;
    const chartData = data.map(item => ({ ...item, displayValue: Math.abs(item.gainLoss) }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-popover border rounded-lg p-3 shadow-md text-sm">
                    <p className="font-medium mb-1">{d.name}</p>
                    <p className={d.gainLoss >= 0 ? "text-success" : "text-destructive"}>{d.gainLoss >= 0 ? "+" : ""}{formatIDR(d.gainLoss)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Kontribusi Gain/Loss</CardTitle>
                <CardDescription>Per saham terhadap total P/L</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-success" /><span className="text-xs font-medium text-success">Profit</span></div>
                            <span className="text-xs text-muted-foreground">{profitStocks.length}</span>
                        </div>
                        <p className="font-semibold text-success">+{formatIDR(totalProfit)}</p>
                    </div>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-destructive" /><span className="text-xs font-medium text-destructive">Loss</span></div>
                            <span className="text-xs text-muted-foreground">{lossStocks.length}</span>
                        </div>
                        <p className="font-semibold text-destructive">-{formatIDR(totalLoss)}</p>
                    </div>
                    <div className={cn("p-3 rounded-lg border", netGainLoss >= 0 ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20")}>
                        <p className="text-xs font-medium mb-1" style={{ color: netGainLoss >= 0 ? 'var(--success)' : 'var(--destructive)' }}>Net Total</p>
                        <p className="font-semibold" style={{ color: netGainLoss >= 0 ? 'var(--success)' : 'var(--destructive)' }}>{netGainLoss >= 0 ? "+" : ""}{formatIDR(netGainLoss)}</p>
                    </div>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="displayValue" stroke="none">
                                {chartData.map((entry: any, index: number) => {
                                    const isProfit = entry.gainLoss > 0;
                                    return <Cell key={`cell-${index}`} fill={(isProfit ? COLORS.profit : COLORS.loss)[index % 2]} />;
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={30} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
