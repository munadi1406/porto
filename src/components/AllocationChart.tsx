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

const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
];

export function AllocationChart({ data }: AllocationChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                Belum ada data portofolio
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider opacity-60">Alokasi Aset</h3>
            <div className="flex-1 min-h-[260px] md:min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 100}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => formatIDR(Number(value))}
                            contentStyle={{
                                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                borderRadius: '12px',
                                border: '1px solid rgba(75, 85, 99, 0.2)',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{
                                paddingTop: '20px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
