"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface MetricItem {
    key: string;
    label: string;
    getValue: (r: any) => number | null;
}

function abbreviateValue(v: number | null): string {
    if (v == null) return "-";
    if (Math.abs(v) >= 1e12) return `(${(v / 1e12).toFixed(0)} T)`;
    if (Math.abs(v) >= 1e9) return `(${(v / 1e9).toFixed(0)} B)`;
    if (Math.abs(v) >= 1e6) return `(${(v / 1e6).toFixed(0)} M)`;
    if (Math.abs(v) >= 1e3) return `(${(v / 1e3).toFixed(0)} K)`;
    return v.toLocaleString("id-ID");
}

function fmtValue(v: number | null, negative: boolean = false): string {
    if (v == null) return "-";
    const isNeg = v < 0 || negative;
    const abs = Math.abs(v);
    let formatted: string;
    if (abs >= 1e12) formatted = `${(abs / 1e12).toFixed(0)} T`;
    else if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(0)} B`;
    else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(0)} M`;
    else if (abs >= 1e3) formatted = `${(abs / 1e3).toFixed(0)} K`;
    else formatted = abs.toLocaleString("id-ID");
    return isNeg ? `(${formatted})` : formatted;
}

function quarterLabel(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q}`;
}

function getYear(dateStr: string): number {
    return new Date(dateStr).getFullYear();
}

function computeTTM(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v != null);
    if (valid.length < 4) return null;
    return valid.slice(-4).reduce((a, b) => a + b, 0);
}

interface FinancialStatementTableProps {
    incomeData: any[];
    balanceData: any[];
    cashflowData: any[];
    mode?: "annual" | "quarterly";
}

const METRICS: MetricItem[] = [
    { key: "revenue", label: "Revenue", getValue: (r) => r.totalRevenue },
    { key: "netIncome", label: "Net Income", getValue: (r) => r.netIncome },
    { key: "eps", label: "EPS", getValue: (r) => r.basicEPS ?? r.dilutedEPS },
    { key: "grossProfit", label: "Gross Profit", getValue: (r) => r.grossProfit },
    { key: "operatingIncome", label: "Operating Income", getValue: (r) => r.operatingIncome },
    { key: "ebitda", label: "EBITDA", getValue: (r) => r.ebitda },
    { key: "pretaxIncome", label: "Pretax Income", getValue: (r) => r.pretaxIncome },
    { key: "netInterestIncome", label: "Net Interest Income", getValue: (r) => r.netInterestIncome },
    { key: "interestExpense", label: "Interest Expense", getValue: (r) => r.interestExpense },
];

function buildQuarterlyTable(data: any[], metric: MetricItem): { rows: any[]; years: number[] } {
    // Group by year
    const byYear = new Map<number, any[]>();
    for (const item of data) {
        const d = item.rawPeriod || item.period || item.year || "";
        const year = getYear(d);
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push({ ...item, quarter: quarterLabel(d), rawDate: d });
    }

    // Sort quarters within each year
    for (const [, items] of byYear) {
        items.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    }

    const years = Array.from(byYear.keys()).sort();

    // Build rows: Q1-Q4 for each year, then Annualised
    const rows: any[] = [];

    // Get all unique quarter labels
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    for (const q of quarters) {
        const row: any = { period: q };
        let hasData = false;
        const annualisedValues: number[] = [];
        for (const year of years) {
            const items = byYear.get(year) || [];
            const match = items.find((i) => i.quarter === q);
            const val = match ? metric.getValue(match) : null;
            row[year] = val;
            if (val != null) { hasData = true; annualisedValues.push(val); }
        }
        // Add annualised column for this quarter
        row["annualised"] = computeTTM(annualisedValues);
        row.hasData = hasData;
        rows.push(row);
    }

    // Add Annualised row (sum of all quarters in each year)
    const annualRow: any = { period: "Annualised" };
    let hasAnnualData = false;
    for (const year of years) {
        const items = byYear.get(year) || [];
        const values = items.map((i) => metric.getValue(i)).filter((v): v is number => v != null);
        if (values.length > 0) {
            annualRow[year] = values.reduce((a, b) => a + b, 0);
            hasAnnualData = true;
        } else {
            annualRow[year] = null;
        }
    }
    annualRow.hasData = hasAnnualData;
    rows.push(annualRow);

    // Add TTM row
    const ttmRow: any = { period: "TTM" };
    for (const year of years) {
        const items = byYear.get(year) || [];
        const allValues = years
            .filter((y) => y <= year)
            .flatMap((y) => (byYear.get(y) || []).map((i) => metric.getValue(i)).filter((v): v is number => v != null));
        // TTM should be last 4 periods across all years
        const last4 = allValues.slice(-4);
        ttmRow[year] = last4.length === 4 ? last4.reduce((a, b) => a + b, 0) : null;
    }
    ttmRow.hasData = Object.values(ttmRow).some((v) => v != null && typeof v === "number");
    rows.push(ttmRow);

    return { rows, years };
}

function buildBalanceTable(data: any[], metric: MetricItem): { rows: any[]; years: number[] } {
    const byYear = new Map<number, any[]>();
    for (const item of data) {
        const d = item.year || item.period || "";
        const year = getYear(d);
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(item);
    }

    const years = Array.from(byYear.keys()).sort();
    const rows: any[] = [];

    // Balance sheet is annual — each year is one row
    for (const year of years) {
        const items = byYear.get(year) || [];
        const val = metric.getValue(items[0] || {});
        rows.push({ period: `FY${year}`, [year]: val, hasData: val != null });
    }

    return { rows, years };
}

export default function FinancialStatementTable({ incomeData, mode = "quarterly" }: FinancialStatementTableProps) {
    const [metric, setMetric] = useState("netIncome");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const currentMetric = METRICS.find((m) => m.key === metric) || METRICS[1];

    // Use incomeData for the table
    const { rows, years } = useMemo(() => {
        if (incomeData.length === 0) return { rows: [], years: [] };
        return buildQuarterlyTable(incomeData, currentMetric);
    }, [incomeData, currentMetric]);

    if (incomeData.length === 0 || mode !== "quarterly") return null;

    return (
        <div className="card-flush">
            {/* Header with metric selector */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors"
                    >
                        {currentMetric.label}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                        </svg>
                    </button>
                    {dropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
                            {METRICS.map((m) => (
                                <button
                                    key={m.key}
                                    onClick={() => { setMetric(m.key); setDropdownOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition-colors",
                                        metric === m.key ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    {m.label}
                                    {metric === m.key && <span className="text-primary">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2 font-bold text-muted-foreground w-28">Period</th>
                            {years.map((year) => (
                                <th key={year} className="text-right px-4 py-2 font-bold text-muted-foreground">{year}</th>
                            ))}
                            <th className="text-right px-4 py-2 font-bold text-muted-foreground">Annualised</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.map((row, i) => {
                            const isAnnual = row.period === "Annualised";
                            const isTTM = row.period === "TTM";
                            return (
                                <tr
                                    key={i}
                                    className={cn(
                                        "transition-colors",
                                        isAnnual && "bg-muted/20 font-bold",
                                        isTTM && "bg-muted/30 font-bold",
                                        !row.hasData && "opacity-40"
                                    )}
                                >
                                    <td className={cn("px-4 py-2.5 font-bold text-foreground", (isAnnual || isTTM) && "text-primary")}>
                                        {row.period}
                                    </td>
                                    {years.map((year) => {
                                        const val = row[year];
                                        return (
                                            <td key={year} className="px-4 py-2.5 text-right font-mono text-foreground tabular-nums">
                                                {fmtValue(val)}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2.5 text-right font-mono text-primary tabular-nums font-bold">
                                        {fmtValue(row.annualised)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
