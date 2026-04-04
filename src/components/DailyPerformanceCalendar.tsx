"use client";

import { useMemo, useState } from "react";
import { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Info,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";

interface DailyPerformanceCalendarProps {
    history: PortfolioSnapshot[];
}

export function DailyPerformanceCalendar({ history }: DailyPerformanceCalendarProps) {
    const [viewDate, setViewDate] = useState(new Date());

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    const performanceData = useMemo(() => {
        if (!history || history.length < 2) return new Map<string, number>();

        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
        const dailyPerformance = new Map<string, number>();
        const dailyValues = new Map<string, number>();

        // Group snapshots by unique day key and keep the LATEST value of each day
        sortedHistory.forEach(s => {
            const date = new Date(s.timestamp);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            dailyValues.set(key, s.totalValue);
        });

        // To calculate returns, we need to compare a day's latest value with the PREVIOUS day's latest value
        // We need all unique days in sorted order
        const dailyKeysSorted = Array.from(dailyValues.keys()).sort((a, b) => {
            const [y1, m1, d1] = a.split('-').map(Number);
            const [y2, m2, d2] = b.split('-').map(Number);
            return new Date(y1, m1, d1).getTime() - new Date(y2, m2, d2).getTime();
        });

        for (let i = 0; i < dailyKeysSorted.length; i++) {
            const currentKey = dailyKeysSorted[i];
            const currentValue = dailyValues.get(currentKey)!;

            // Look for previous day's value
            let prevValue: number | undefined;

            if (i > 0) {
                prevValue = dailyValues.get(dailyKeysSorted[i - 1]);
            } else {
                // For the very first day in history, we try to find the very first snapshot of THAT day 
                // to use as "opening price" if multiple snapshots exist for that day.
                const [y, m, d] = currentKey.split('-').map(Number);
                const firstDaySnapshots = sortedHistory.filter(s => {
                    const dt = new Date(s.timestamp);
                    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
                });
                if (firstDaySnapshots.length > 1) {
                    prevValue = firstDaySnapshots[0].totalValue;
                }
            }

            if (prevValue && prevValue > 0) {
                const percent = ((currentValue - prevValue) / prevValue) * 100;
                dailyPerformance.set(currentKey, percent);
            }
        }

        return dailyPerformance;
    }, [history]);

    const calendarGrid = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];

        // Padding for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }, [viewDate]);

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getPerfForDate = (date: Date) => {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return performanceData.get(key);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                        <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Kalender Performa</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Daily Performance Tracker</p>
                    </div>
                </div>

                <div className="flex items-center bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 text-sm font-black text-gray-900 dark:text-white min-w-[140px] text-center">
                        {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGrid.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;

                    const perf = getPerfForDate(date);
                    const hasPerf = perf !== undefined;
                    const _isToday = isToday(date);

                    return (
                        <div
                            key={date.toISOString()}
                            className={cn(
                                "aspect-square rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-between transition-all duration-300 border relative group",
                                _isToday ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800" : "",
                                !hasPerf ? "bg-gray-50/50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800/50 text-gray-300 dark:text-gray-700" :
                                    perf > 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400" :
                                        perf < 0 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30 text-rose-600 dark:text-rose-400" :
                                            "bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 text-gray-500"
                            )}
                        >
                            <span className={cn(
                                "text-[10px] font-black absolute top-1.5 left-2",
                                _isToday ? "text-indigo-600 dark:text-indigo-400" : ""
                            )}>
                                {date.getDate()}
                            </span>

                            <div className="mt-auto flex flex-col items-center gap-0.5">
                                {hasPerf ? (
                                    <>
                                        {perf > 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 opacity-50" /> :
                                            perf < 0 ? <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-50" /> :
                                                <Minus className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />}
                                        <span className="text-[9px] sm:text-[11px] font-black leading-none">
                                            {perf > 0 ? "+" : ""}{perf.toFixed(1)}%
                                        </span>
                                    </>
                                ) : (
                                    <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800 mt-2"></div>
                                )}
                            </div>

                            {/* Hover Tooltip - simple implementation */}
                            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-white/90 dark:bg-gray-900/90 rounded-2xl flex items-center justify-center p-2 text-center shadow-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-bold text-gray-900 dark:text-white">
                                    {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    <br />
                                    {hasPerf ? `${perf > 0 ? '+' : ''}${perf.toFixed(2)}%` : 'No Data'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        Persentase harian dihitung dari perbandingan <span className="font-bold text-gray-700 dark:text-gray-300">Total Equity</span> (Saham + Cash)
                        antara penutupan hari ini dengan penutupan hari sebelumnya.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Profit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Loss</span>
                    </div>
                </div>
            </div>

            <div className="absolute -top-10 -right-10 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
                <CalendarIcon className="w-48 h-48" />
            </div>
        </div>
    );
}
