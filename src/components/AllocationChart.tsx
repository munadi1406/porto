"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatIDR } from "@/lib/utils";

interface DataItem {
    name: string;
    value: number;
    [key: string]: any;
}

interface AllocationChartProps {
    data: DataItem[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function AllocationChart({ data }: AllocationChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-sm text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                Belum ada data portofolio
            </div>
        );
    }

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6">
            <h3 className="font-medium text-[var(--fg)] mb-4">Alokasi Aset</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => formatIDR(Number(value))}
                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                        />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle"
                            wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
