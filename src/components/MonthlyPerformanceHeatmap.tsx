"use client";

import { useMemo } from "react";
import { PortfolioSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Calendar, TrendingUp, TrendingDown, Info } from "lucide-react";

interface MonthlyPerformanceHeatmapProps {
    history: PortfolioSnapshot[];
}

export function MonthlyPerformanceHeatmap({ history }: MonthlyPerformanceHeatmapProps) {
    const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];

    const performanceData = useMemo(() => {
        if (!history || history.length < 2) return null;

        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
        const yearsMap = new Map<number, Map<number, number>>();

        // Group snapshots by year and month, taking the LAST snapshot of each month
        sortedHistory.forEach(snapshot => {
            const date = new Date(snapshot.timestamp);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11

            if (!yearsMap.has(year)) {
                yearsMap.set(year, new Map<number, number>());
            }

            // Always update to the latest snapshot found for this month
            yearsMap.get(year)!.set(month, snapshot.totalValue);
        });

        const years = Array.from(yearsMap.keys()).sort((a, b) => b - a); // Newest year first

        const data = years.map(year => {
            const monthlyReturns: (number | null)[] = new Array(12).fill(null);
            const monthValues = yearsMap.get(year)!;

            let yearlyStartValue = 0;
            let yearlyEndValue = 0;

            for (let m = 0; m < 12; m++) {
                const currentMonthValue = monthValues.get(m);
                if (currentMonthValue === undefined) continue;

                // To calculate monthly return, we need the end value of the PREVIOUS month
                let prevValue: number | undefined;

                if (m === 0) {
                    // Look at Dec of previous year
                    prevValue = yearsMap.get(year - 1)?.get(11);
                } else {
                    prevValue = monthValues.get(m - 1);
                }

                // Fallback: If no previous month value, use the first value recorded in current month as "base"
                // (This happens for the very first month of data)
                if (prevValue === undefined) {
                    const monthSnapshots = sortedHistory.filter(s => {
                        const d = new Date(s.timestamp);
                        return d.getFullYear() === year && d.getMonth() === m;
                    });
                    if (monthSnapshots.length > 0) {
                        prevValue = monthSnapshots[0].totalValue;
                    }
                }

                if (prevValue && prevValue > 0) {
                    const ret = ((currentMonthValue - prevValue) / prevValue) * 100;
                    monthlyReturns[m] = ret;
                }

                // Track for yearly return
                if (yearlyStartValue === 0 && prevValue) yearlyStartValue = prevValue;
                yearlyEndValue = currentMonthValue;
            }

            const yearlyReturn = yearlyStartValue > 0
                ? ((yearlyEndValue - yearlyStartValue) / yearlyStartValue) * 100
                : null;

            return {
                year,
                returns: monthlyReturns,
                yearlyReturn
            };
        });

        return data;
    }, [history]);

    if (!performanceData || performanceData.length === 0) {
        return (
            <div className="bg-card p-8 rounded-3xl border border-border text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Belum Ada Data Historis</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Data heatmap bulanan akan muncul setelah aplikasi merekam riwayat portfolio Anda selama beberapa periode.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-xl">
                        <Calendar className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground tracking-tight">Performa Bulanan</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Monthly Performance Heatmap</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 bg-muted/50 p-2 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Profit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Loss</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="p-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Tahun</th>
                            {months.map(m => (
                                <th key={m} className="p-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m}</th>
                            ))}
                            <th className="p-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 rounded-t-lg text-center">YTD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {performanceData.map((row) => (
                            <tr key={row.year}>
                                <td className="p-3 text-sm font-black text-foreground bg-muted/50 rounded-xl border border-border">{row.year}</td>
                                {row.returns.map((ret, idx) => (
                                    <td
                                        key={idx}
                                        className={cn(
                                            "p-3 text-[11px] font-black text-center rounded-xl transition-all duration-300 border border-transparent",
                                            ret === null ? "bg-muted/30 text-muted-foreground" :
                                                ret > 0 ? "bg-success/10 text-success border-success/20" :
                                                    ret < 0 ? "bg-destructive/10 text-destructive border-destructive/20" :
                                                        "bg-muted/50 text-muted-foreground"
                                        )}
                                    >
                                        {ret !== null ? (ret > 0 ? `+${ret.toFixed(1)}%` : `${ret.toFixed(1)}%`) : "—"}
                                    </td>
                                ))}
                                <td className={cn(
                                    "p-3 text-sm font-black text-center rounded-xl ml-1",
                                    row.yearlyReturn === null ? "bg-primary/5 text-muted-foreground" :
                                        row.yearlyReturn > 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                                            row.yearlyReturn < 0 ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" :
                                                "bg-muted-foreground text-muted"
                                )}>
                                    {row.yearlyReturn !== null ? (row.yearlyReturn > 0 ? `+${row.yearlyReturn.toFixed(1)}%` : `${row.yearlyReturn.toFixed(1)}%`) : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-muted/50 rounded-2xl border border-border">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Heatmap ini dihitung berdasarkan <span className="font-bold text-muted-foreground">Total Equity</span> (Saham + Cash).
                    Persentase didapat dengan membandingkan nilai akhir bulan dengan nilai akhir bulan sebelumnya.
                </p>
            </div>

            <div className="absolute -bottom-4 -right-4 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
                <TrendingUp className="w-32 h-32" />
            </div>
        </div>
    );
}
