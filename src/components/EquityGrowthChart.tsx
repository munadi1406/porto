"use client";

import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
    totalReturnPercent?: number;
}

type Period = "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all";

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");

    const periods: { key: Period; label: string }[] = [
        { key: "today", label: "Hi" },  // Hari ini
        { key: "day", label: "24J" },   // 24 Jam
        { key: "week", label: "1M" },   // 1 Minggu (Label disesuaikan)
        { key: "month", label: "1B" },  // 1 Bulan
        { key: "3month", label: "3B" },
        { key: "ytd", label: "YTD" },
        { key: "year", label: "1T" },
        { key: "all", label: "All" },
    ];

    // 1. Ambil data history mentah
    const rawHistoryData = getHistoryForPeriod(selectedPeriod);

    // 2. SORTING & MAPPING: Pastikan urut dari LAMA -> BARU
    const chartData = useMemo(() => {
        if (!rawHistoryData || rawHistoryData.length === 0) return [];

        // Copy & Sort Ascending (Waktu lama di index 0)
        const sorted = [...rawHistoryData].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Deteksi apakah perlu menampilkan jam (untuk grafik harian)
        const firstDate = new Date(sorted[0].timestamp);
        const isSameDay = sorted.every(s => new Date(s.timestamp).toDateString() === firstDate.toDateString());
        const showTime = selectedPeriod === 'today' || selectedPeriod === 'day' || isSameDay;

        // Untuk periode mingguan/bulanan/tahunan, agregasi data per hari
        // Hanya ambil 1 snapshot terakhir per hari untuk menghindari duplikasi
        let processedData = sorted;

        if (!showTime && sorted.length > 1) {
            // Group by date (tanpa jam)
            const groupedByDate = new Map<string, typeof sorted[0]>();

            sorted.forEach(snapshot => {
                const date = new Date(snapshot.timestamp);
                const dateKey = date.toDateString(); // "Wed Feb 05 2026"

                // Selalu ambil snapshot terakhir untuk tanggal tersebut (overwrite)
                groupedByDate.set(dateKey, snapshot);
            });

            // Convert map back to array
            processedData = Array.from(groupedByDate.values());
        }

        return processedData.map((snapshot) => {
            const date = new Date(snapshot.timestamp);

            // PRIORITAS: Ambil totalValue dulu. Jika null, baru ambil close.
            // Ini mencegah bug perbandingan antara "Harga Saham" vs "Total Equity"
            const val = snapshot.totalValue ?? snapshot.close ?? 0;

            return {
                timestamp: snapshot.timestamp,
                // Format label X-Axis
                time: showTime
                    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                value: val,
                originalDate: date // Simpan untuk tooltip lengkap
            };
        });
    }, [rawHistoryData, selectedPeriod]);

    // 3. LOGIKA PERSENTASE (The Fix)
    const performance = useMemo(() => {
        // Fallback jika tidak ada data history
        if (chartData.length === 0) return { nominal: 0, percent: 0, startPrice: 0 };

        // HARGA AWAL: Selalu ambil data pertama dari grafik periode yang dipilih
        // Jika tab "Today", index 0 adalah Open Price pagi ini.
        // Jika tab "Week", index 0 adalah Equity minggu lalu.
        const startPrice = chartData[0].value;

        // HARGA AKHIR: Selalu Current Equity (Realtime)
        const currentPrice = currentEquity;

        // Hitung
        const nominal = currentPrice - startPrice;
        const percent = startPrice !== 0 ? (nominal / startPrice) * 100 : 0;

        return { nominal, percent, startPrice };
    }, [chartData, currentEquity]);

    // --- DEBUGGING (Opsional: Cek di Console Browser) ---
    useEffect(() => {
        console.log(`[Chart Debug] Period: ${selectedPeriod}`);
        console.log(`- Start Value (Chart Index 0):`, performance.startPrice);
        console.log(`- End Value (Current Equity):`, currentEquity);
        console.log(`- Calculated Percent:`, performance.percent);
    }, [performance, currentEquity, selectedPeriod]);

    // --- SETUP VISUAL CHART ---
    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 0 };
        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || (max * 0.05); // Padding 10%
        return {
            minValue: Math.floor((min - padding) / 100000) * 100000,
            maxValue: Math.ceil((max + padding) / 100000) * 100000,
        };
    }, [chartData]);

    const isPositive = performance.percent >= 0;
    const chartColor = isPositive ? "#19d57a" : "#ff5d5d";

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[#1e232d]/90 p-3 rounded-lg border border-gray-700 backdrop-blur-md shadow-2xl">
                    <p className="text-[10px] text-gray-400 mb-1">
                        {data.originalDate.toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        })}
                    </p>
                    <p className="text-sm font-bold text-white tracking-wide">
                        {formatIDR(data.value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-[#12151c] rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-200 dark:border-[#1e232d] overflow-hidden p-3 sm:p-10 shadow-sm w-full">
            {/* --- HEADER SECTION --- */}
            <div className="mb-4 sm:mb-12">
                <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Total Equity</h3>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-6">
                    {/* Nominal Besar */}
                    <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {formatIDR(currentEquity)}
                    </h2>

                    {/* Persentase Indikator */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold w-fit",
                        isPositive
                            ? "bg-[#19d57a]/10 text-[#19d57a]"
                            : "bg-[#ff5d5d]/10 text-[#ff5d5d]"
                    )}>
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>{performance.percent > 0 ? "+" : ""}{performance.percent.toFixed(2)}%</span>

                        {/* Opsional: Tampilkan nominal perubahan kecil di samping */}
                        <span className="text-[10px] opacity-80 font-medium ml-1">
                            ({performance.nominal > 0 ? "+" : ""}{formatIDR(performance.nominal)})
                        </span>
                    </div>
                </div>
            </div>

            {/* --- CHART SECTION --- */}
            <div className="h-[280px] sm:h-[350px] w-[calc(100%+0.75rem)] sm:w-full -mr-3 sm:mr-0 relative group">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
                                axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: '#374151' }}
                                dy={8}
                                minTickGap={25}
                            />
                            <YAxis
                                domain={[minValue, maxValue]}
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
                                axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: '#374151' }}
                                tickFormatter={(value) => {
                                    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                    return value.toString();
                                }}
                                width={30}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: chartColor, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                animationDuration={200}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                strokeWidth={3}
                                fill="url(#chartGradient)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    // State Kosong / Loading
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 opacity-40">
                        <TrendingUp className="w-12 h-12 mb-2 stroke-1" />
                        <span className="text-xs">Belum ada data history</span>
                    </div>
                )}
            </div>

            {/* --- PERIOD SELECTOR (TABS) --- */}
            <div className="flex justify-between md:justify-start md:gap-3 mt-4 sm:mt-10 pt-2 overflow-x-auto no-scrollbar">
                {periods.map((period) => (
                    <button
                        key={period.key}
                        onClick={() => setSelectedPeriod(period.key)}
                        className={cn(
                            "relative px-3 py-2 text-xs font-bold transition-all duration-300 rounded-lg min-w-[3rem]",
                            selectedPeriod === period.key
                                ? "text-[#19d57a] bg-[#19d57a]/10"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                    >
                        {period.label}
                    </button>
                ))}
            </div>
        </div>
    );
}