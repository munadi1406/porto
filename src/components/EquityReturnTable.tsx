"use client";

import { useState, useMemo, useRef } from "react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { PortfolioSnapshot } from "@/lib/types";
import { Info } from "lucide-react";
import { ExportPDFButton } from "./ExportPDFButton";
import { exportToPDF } from "@/lib/exportPDF";

interface EquityReturnTableProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
}

type ViewMode = "hourly" | "daily" | "monthly";
type PeriodFilter = "1month" | "3month" | "6month" | "1year" | "all";

export function EquityReturnTable({ getHistoryForPeriod }: EquityReturnTableProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("daily");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1month");
    const tableRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = () => {
        if (tableRef.current) {
            exportToPDF(tableRef.current, {
                title: `Equity Return - ${viewMode === 'daily' ? 'Daily' : 'Monthly'}`,
            });
        }
    };

    // Get all history data
    const allHistory = getHistoryForPeriod("all");

    // Filter by period
    const filteredHistory = useMemo(() => {
        const now = Date.now();
        let startTime: number;

        switch (periodFilter) {
            case "1month":
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "3month":
                startTime = now - 90 * 24 * 60 * 60 * 1000;
                break;
            case "6month":
                startTime = now - 180 * 24 * 60 * 60 * 1000;
                break;
            case "1year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            case "all":
                startTime = 0;
                break;
        }

        return allHistory.filter(s => {
            const ts = typeof s.timestamp === 'string' ? new Date(s.timestamp).getTime() : s.timestamp;
            return ts >= startTime;
        });
    }, [allHistory, periodFilter]);

    // Group data by hour, day or month
    const groupedData = useMemo(() => {
        if (filteredHistory.length === 0) return [];

        const grouped = new Map<string, PortfolioSnapshot[]>();

        filteredHistory.forEach(snapshot => {
            const date = new Date(snapshot.timestamp);

            if (viewMode === "hourly") {
                // Only show today's snapshots for hourly view
                const now = new Date();
                if (date.toDateString() !== now.toDateString()) return;

                // Market hours focus (09:00 - 16:00)
                const hour = date.getHours();
                if (hour < 9 || hour > 16) return;

                const key = `${hour.toString().padStart(2, '0')}:00`;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(snapshot);
            } else {
                const key = viewMode === "daily"
                    ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
                    : date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key)!.push(snapshot);
            }
        });

        // Convert to array and calculate stats
        const result = Array.from(grouped.entries()).map(([dateKey, snapshots]) => {
            // Sort snapshots by timestamp
            const sorted = snapshots.sort((a, b) => a.timestamp - b.timestamp);
            const lastSnapshot = sorted[sorted.length - 1];
            const equity = lastSnapshot.totalValue;

            return {
                date: dateKey,
                timestamp: typeof lastSnapshot.timestamp === 'string' ? new Date(lastSnapshot.timestamp).getTime() : lastSnapshot.timestamp,
                equity,
                snapshots: sorted,
            };
        });

        // Sort by timestamp descending (newest first)
        return result.sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredHistory, viewMode]);

    // Calculate P&L for each entry
    const dataWithPL = useMemo(() => {
        return groupedData.map((item, index) => {
            // Compare with previous day/month
            const previousItem = groupedData[index + 1];

            if (!previousItem) {
                return {
                    ...item,
                    pl: 0,
                    plPercent: 0,
                };
            }

            const pl = item.equity - previousItem.equity;
            const plPercent = previousItem.equity > 0 ? (pl / previousItem.equity) * 100 : 0;

            return {
                ...item,
                pl,
                plPercent,
            };
        });
    }, [groupedData]);

    const periodOptions: { key: PeriodFilter; label: string }[] = [
        { key: "1month", label: "Last 1 Month" },
        { key: "3month", label: "Last 3 Months" },
        { key: "6month", label: "Last 6 Months" },
        { key: "1year", label: "Last 1 Year" },
        { key: "all", label: "All Time" },
    ];

    return (
        <div ref={tableRef} className="bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-2xl shadow-2xl border border-gray-800/50 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">Total Equity Return</h3>
                        <div className="group relative">
                            <Info className="w-4 h-4 text-gray-500 cursor-help" />
                            <div className="absolute left-0 top-6 w-64 p-2 bg-gray-800 text-xs text-gray-300 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Riwayat perubahan equity portfolio Anda per hari atau per bulan
                            </div>
                        </div>
                    </div>
                    <ExportPDFButton onClick={handleExportPDF} />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="inline-flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
                        <button
                            onClick={() => setViewMode("hourly")}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                viewMode === "hourly"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            Hourly
                        </button>
                        <button
                            onClick={() => setViewMode("daily")}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                viewMode === "daily"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setViewMode("monthly")}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                viewMode === "monthly"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Period Filter Dropdown - Only show for Daily/Monthly */}
                    {viewMode !== "hourly" && (
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                            className="px-4 py-1.5 text-sm font-medium bg-gray-800/50 text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                            {periodOptions.map(option => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                {dataWithPL.length > 0 ? (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {viewMode === "hourly" ? "Time" : "Date"}
                                </th>
                                <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Equity
                                </th>
                                <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    P&L
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {dataWithPL.map((item, index) => {
                                const isPositive = item.pl > 0;
                                const isNegative = item.pl < 0;

                                return (
                                    <tr
                                        key={index}
                                        className="hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {item.date}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                                            {formatIDR(item.equity).replace('Rp', '').trim()}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-semibold">
                                            {item.pl !== 0 ? (
                                                <span className={cn(
                                                    isPositive && "text-emerald-400",
                                                    isNegative && "text-red-400"
                                                )}>
                                                    {isPositive && "+"}
                                                    {formatIDR(item.pl).replace('Rp', '').trim()} ({isPositive && "+"}
                                                    {formatPercentage(item.plPercent)})
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-sm">Belum ada data untuk periode ini</p>
                    </div>
                )}
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx global>{`
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 3px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: #4b5563;
                }
            `}</style>
        </div>
    );
}
