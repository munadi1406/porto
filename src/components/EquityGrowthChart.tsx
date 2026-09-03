"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioItem, PortfolioSnapshot, Transaction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EquityGrowthChartProps {
    getHistoryForPeriod: (period: "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all") => PortfolioSnapshot[];
    currentEquity: number;
    portfolio: PortfolioItem[];
    currentCash: number;
    transactions: Transaction[];
}

type Period = "today" | "day" | "week" | "month" | "3month" | "ytd" | "year" | "all";
type Frequency = "daily" | "monthly";

const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Hari" }, { key: "day", label: "24J" }, { key: "week", label: "1M" },
    { key: "month", label: "1B" }, { key: "3month", label: "3B" }, { key: "ytd", label: "YTD" },
    { key: "year", label: "1T" }, { key: "all", label: "All" },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="min-w-44 rounded-lg border bg-popover p-3 text-sm shadow-md">
                <p className="mb-2 border-b pb-2 text-xs font-bold text-muted-foreground">{data.originalDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span className="text-xs text-muted-foreground">Equity</span><span className="font-mono font-semibold">{formatIDR(data.value)}</span></div>
                    {data.dividendValue > 0 && <div className="flex justify-between gap-4"><span className="text-xs text-muted-foreground">Dividen</span><span className="font-mono font-semibold text-success">+{formatIDR(data.dividendValue)}</span></div>}
                </div>
            </div>
        );
    }
    return null;
};

const historyPeriodMap: Record<Exclude<Period, "today" | "day">, string> = {
    week: "5d", month: "1mo", "3month": "3mo", ytd: "ytd", year: "1y", all: "max",
};

function periodStart(period: Exclude<Period, "today" | "day">) {
    const now = new Date();
    if (period === "week") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
    if (period === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
    if (period === "3month") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).getTime();
    if (period === "ytd") return new Date(now.getFullYear(), 0, 1).getTime();
    if (period === "year") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
    return 0;
}

async function fetchHistoricalEquity(portfolio: PortfolioItem[], transactions: Transaction[], cash: number, period: Exclude<Period, "today" | "day">) {
    const normalizedTransactions = transactions.map(tx => ({ ...tx, timestamp: new Date(tx.timestamp).getTime() }));
    const requestedStart = periodStart(period);
    const holdingsByTicker = new Map(portfolio.map(item => [item.ticker, item]));
    const tickers = [...new Set([...portfolio.map(item => item.ticker), ...normalizedTransactions.map(tx => tx.ticker)])];
    const portfolioId = portfolio[0]?.portfolioId || transactions[0]?.portfolioId;
    const [results, cashPayload] = await Promise.all([
        Promise.all(tickers.map(async ticker => {
        const holding = holdingsByTicker.get(ticker);
        const holdingCreatedAt = holding?.createdAt ? new Date(holding.createdAt).getTime() : undefined;
        const tickerTransactions = normalizedTransactions
            .filter(tx => tx.ticker === ticker && (!holdingCreatedAt || tx.timestamp >= holdingCreatedAt))
            .sort((a, b) => a.timestamp - b.timestamp);
        const createdAt = holdingCreatedAt ?? tickerTransactions[0]?.timestamp ?? requestedStart;
        const acquiredAt = Number.isFinite(createdAt) ? createdAt : requestedStart;
        const from = Math.max(requestedStart, acquiredAt || 0);
        const response = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(ticker)}&period=${historyPeriodMap[period]}&interval=1d&from=${from}`);
        if (!response.ok) return { holding, acquiredAt, tickerTransactions, quotes: [] as { time: number; close: number }[], dividends: [] as { time: number; amount: number }[] };
        const payload = await response.json();
        return {
            holding, acquiredAt, tickerTransactions,
            quotes: (payload.success && Array.isArray(payload.data) ? payload.data : []) as { time: number; close: number }[],
            dividends: (payload.success && Array.isArray(payload.dividends) ? payload.dividends : []) as { time: number; amount: number }[],
        };
        })),
        portfolioId
            ? fetch(`/api/cash?portfolioId=${encodeURIComponent(portfolioId)}&history=true`).then(response => response.ok ? response.json() : null).catch(() => null)
            : Promise.resolve(null),
    ]);
    const cashLedger = Array.isArray(cashPayload?.data?.ledger) ? cashPayload.data.ledger.map((entry: any) => ({
        timestamp: new Date(entry.timestamp).getTime(), amount: Number(entry.amount) || 0, kind: String(entry.kind),
    })) : [];

    const allTimestamps = new Set<number>();
    const quoteMaps = results.map(({ holding, acquiredAt, tickerTransactions, quotes, dividends }) => {
        const prices = new Map<number, number>();
        const dividendsByDate = new Map<number, number>();
        for (const quote of quotes) {
            if (!Number.isFinite(quote.close)) continue;
            const date = new Date(quote.time * 1000);
            const timestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            prices.set(timestamp, quote.close);
            allTimestamps.add(timestamp);
        }
        for (const dividend of dividends) {
            const date = new Date(dividend.time * 1000);
            const timestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            dividendsByDate.set(timestamp, (dividendsByDate.get(timestamp) || 0) + dividend.amount);
        }
        const transactionLotDelta = tickerTransactions.reduce((sum, tx) => sum + (tx.type === "buy" ? Number(tx.lots) : -Number(tx.lots)), 0);
        const initialLots = Math.max(0, Number(holding?.lots || 0) - transactionLotDelta);
        return { holding, acquiredAt, tickerTransactions, initialLots, prices, dividendsByDate, lastClose: undefined as number | undefined };
    });

    return Array.from(allTimestamps).sort((a, b) => a - b).flatMap(timestamp => {
        let stockValue = 0;
        let dividendValue = 0;
        for (const item of quoteMaps) {
            if (timestamp < item.acquiredAt) continue;
            item.lastClose = item.prices.get(timestamp) ?? item.lastClose;
            if (item.lastClose == null) continue;
            const endOfDay = timestamp + 24 * 60 * 60 * 1000 - 1;
            const lots = item.tickerTransactions.reduce((sum, tx) => tx.timestamp <= endOfDay ? sum + (tx.type === "buy" ? Number(tx.lots) : -Number(tx.lots)) : sum, item.initialLots);
            stockValue += item.lastClose * Math.max(0, lots) * 100;
            dividendValue += (item.dividendsByDate.get(timestamp) || 0) * Math.max(0, lots) * 100;
        }
        if (stockValue <= 0) return [];
        return [{
            portfolioId: portfolioId ?? "",
            timestamp,
            stockValue,
            cashValue: cash - cashLedger.reduce((sum: number, entry: { timestamp: number; amount: number }) => entry.timestamp > timestamp ? sum + entry.amount : sum, 0),
            totalValue: stockValue + cash - cashLedger.reduce((sum: number, entry: { timestamp: number; amount: number }) => entry.timestamp > timestamp ? sum + entry.amount : sum, 0),
            dividendValue,
            externalCashFlow: cashLedger.reduce((sum: number, entry: { timestamp: number; amount: number; kind: string }) => {
                const endOfDay = timestamp + 24 * 60 * 60 * 1000 - 1;
                return entry.timestamp >= timestamp && entry.timestamp <= endOfDay && ['deposit', 'withdrawal', 'adjustment'].includes(entry.kind) ? sum + entry.amount : sum;
            }, 0),
        } satisfies PortfolioSnapshot & { dividendValue: number; externalCashFlow: number }];
    });
}

export function EquityGrowthChart({ getHistoryForPeriod, currentEquity, portfolio, currentCash, transactions }: EquityGrowthChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const isIntraday = selectedPeriod === "today" || selectedPeriod === "day";
    const { data: historicalData = [], isLoading: historicalLoading, isError: historicalError, dataUpdatedAt } = useQuery({
        queryKey: ["historical-portfolio-equity", selectedPeriod, currentCash, portfolio.map(item => `${item.ticker}:${item.lots}:${item.createdAt ?? ""}`).join("|"), transactions.map(tx => `${tx.id}:${tx.type}:${tx.lots}:${tx.timestamp}`).join("|")],
        queryFn: () => fetchHistoricalEquity(portfolio, transactions, currentCash, selectedPeriod as Exclude<Period, "today" | "day">),
        enabled: !isIntraday && portfolio.length > 0,
        staleTime: 15 * 60 * 1000,
    });
    const rawHistoryData = isIntraday ? getHistoryForPeriod(selectedPeriod) : historicalData;
    const jakartaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const marketOpen = jakartaNow.getDay() >= 1 && jakartaNow.getDay() <= 5 && jakartaNow.getHours() >= 9 && (jakartaNow.getHours() < 16 || (jakartaNow.getHours() === 16 && jakartaNow.getMinutes() === 0));

    const chartData = useMemo(() => {
        if (!rawHistoryData || rawHistoryData.length === 0) return [];
        const sorted = [...rawHistoryData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const firstDate = new Date(sorted[0].timestamp);
        const isSameDay = sorted.every(s => new Date(s.timestamp).toDateString() === firstDate.toDateString());
        const showTime = selectedPeriod === 'today' || selectedPeriod === 'day' || isSameDay;

        let processedData = sorted;
        if (!showTime && sorted.length > 1) {
            const groupedByDate = new Map<string, typeof sorted[0]>();
            sorted.forEach(sn => groupedByDate.set(new Date(sn.timestamp).toDateString(), sn));
            processedData = Array.from(groupedByDate.values());
        }

        const points = processedData.map(snapshot => {
            const date = new Date(snapshot.timestamp);
            return {
                timestamp: snapshot.timestamp,
                time: showTime ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                value: snapshot.totalValue ?? 0,
                dividendValue: (snapshot as PortfolioSnapshot & { dividendValue?: number }).dividendValue ?? 0,
                externalCashFlow: (snapshot as PortfolioSnapshot & { externalCashFlow?: number }).externalCashFlow ?? 0,
                originalDate: date
            };
        });
        const now = new Date();
        const currentPoint = {
            timestamp: now.getTime(),
            time: showTime ? now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            value: currentEquity,
            dividendValue: 0,
            externalCashFlow: 0,
            originalDate: now,
        };
        if (points.length === 0) return [currentPoint];
        const last = points[points.length - 1];
        if (new Date(last.timestamp).toDateString() === now.toDateString()) points[points.length - 1] = currentPoint;
        else points.push(currentPoint);
        return points;
    }, [rawHistoryData, selectedPeriod, currentEquity]);

    const performance = useMemo(() => {
        if (chartData.length === 0) return { nominal: 0, percent: 0 };
        const startPrice = chartData.find(point => Number.isFinite(point.value) && point.value > 0)?.value ?? 0;
        const endPrice = chartData[chartData.length - 1].value;
        const nominal = startPrice > 0 ? endPrice - startPrice : 0;
        const percent = startPrice > 0 ? (nominal / startPrice) * 100 : 0;
        return { nominal, percent };
    }, [chartData]);

    const displayData = useMemo(() => {
        let index = 100;
        const normalized = chartData.map((point, pointIndex) => {
            const previous = chartData[pointIndex - 1];
            if (!previous) return { ...point, pnl: 0, returnPercent: 0, index };
            // Only external cash flows are normalized out. Buy/sell transactions remain
            // internal transfers between cash and securities and must not alter return.
            const pnl = point.value - previous.value - point.externalCashFlow + point.dividendValue;
            const returnPercent = previous.value > 0 ? (pnl / previous.value) * 100 : 0;
            index *= 1 + returnPercent / 100;
            return { ...point, pnl, returnPercent, index };
        });

        if (frequency === "monthly" && normalized.length > 1) {
            const monthly = new Map<string, typeof normalized>();
            for (const point of normalized) {
                const key = `${point.originalDate.getFullYear()}-${point.originalDate.getMonth()}`;
                const bucket = monthly.get(key) || [];
                bucket.push(point);
                monthly.set(key, bucket);
            }
            return Array.from(monthly.values()).map(bucket => {
                const first = bucket[0];
                const last = bucket[bucket.length - 1];
                const previousIndex = first.index / (1 + first.returnPercent / 100);
                const monthlyReturn = previousIndex > 0 ? ((last.index / previousIndex) - 1) * 100 : 0;
                const monthlyPnl = bucket.reduce((sum, point) => sum + point.pnl, 0);
                return { ...last, pnl: monthlyPnl, returnPercent: monthlyReturn, displayValue: last.value, dividendValue: bucket.reduce((sum, point) => sum + point.dividendValue, 0) };
            });
        }
        return normalized.map(point => ({ ...point, displayValue: point.value }));
    }, [chartData, frequency]);

    const returnSummary = useMemo(() => {
        const nominal = displayData.reduce((sum, point) => sum + point.pnl, 0);
        const index = displayData.reduce((value, point) => value * (1 + point.returnPercent / 100), 100);
        return { nominal, percent: index - 100 };
    }, [displayData]);

    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 0 };
        const values = chartData.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || (max * 0.05);
        return {
            minValue: Math.max(0, Math.floor((min - padding) / 100000) * 100000),
            maxValue: Math.ceil((max + padding) / 100000) * 100000,
        };
    }, [chartData]);

    const isPositive = performance.percent >= 0;
    const chartColor = isPositive ? "var(--chart-2)" : "var(--destructive)";

    return (
        <Card>
            <CardContent className="p-4 sm:p-6">
                <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Equity</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{selectedPeriod === "month" ? "Last 1 Month" : periods.find(item => item.key === selectedPeriod)?.label} · {displayData.length > 0 ? `${displayData[0].originalDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${displayData[displayData.length - 1].originalDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : "Date"}</p>
                        </div>
                        <div className="text-right">
                            <span className={cn("rounded-full px-2 py-1 text-[9px] font-bold", historicalError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{historicalError ? "Provider gagal" : isIntraday ? "Snapshot intraday" : "Yahoo Finance + Cash Ledger"}</span>
                            <p className="mt-1 text-[9px] text-muted-foreground">{dataUpdatedAt ? `Diperbarui ${new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : historicalLoading ? "Memuat data…" : "Belum diperbarui"}</p>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-semibold tracking-tight">{formatIDR(currentEquity)}</h2>
                        <span className={cn("text-sm font-medium", isPositive ? "text-success" : "text-destructive")}>
                            {performance.percent > 0 ? "+" : ""}{performance.percent.toFixed(2)}%
                        </span>
                    </div>
                </div>

                <div className="h-64 sm:h-80">
                    {historicalLoading && !isIntraday ? (
                        <div className="h-full animate-pulse rounded-lg bg-muted" />
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} dy={5} />
                                <YAxis domain={[minValue, maxValue]} orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={46}
                                    tickFormatter={(v) => { if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`; return v.toString(); }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#eqGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">{historicalError ? "Data gagal dimuat" : !marketOpen && isIntraday ? "Pasar sedang tutup" : "Belum ada riwayat"}</p>
                            <p className="text-xs">{historicalError ? "Provider harga tidak merespons. Coba muat ulang beberapa saat lagi." : !marketOpen && isIntraday ? "Data intraday akan kembali bergerak saat sesi IDX dibuka." : "Riwayat akan terbentuk setelah portfolio memiliki posisi dan harga."}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-1 mt-4 pt-3 border-t overflow-x-auto">
                    {periods.map((period) => (
                        <Button key={period.key} variant={selectedPeriod === period.key ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2" onClick={() => setSelectedPeriod(period.key)}>
                            {period.label}
                        </Button>
                    ))}
                </div>

                <section className="mt-6 border-t pt-5" aria-labelledby="equity-return-title">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h3 id="equity-return-title" className="text-sm font-semibold">Total Equity Return</h3>
                            <p className="mt-1 text-xs text-muted-foreground">P&amp;L telah dinormalisasi dari transaksi masuk/keluar dan sudah mencakup dividen.</p>
                        </div>
                        <div className="flex w-fit rounded-lg border p-1" role="tablist" aria-label="Periode tabel return">
                            {([['daily', 'Daily'], ['monthly', 'Monthly']] as const).map(([key, label]) => (
                                <button key={key} role="tab" aria-selected={frequency === key} onClick={() => setFrequency(key)} className={cn("min-h-8 rounded-md px-3 text-xs font-bold", frequency === key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/60 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nominal Return</p>
                            <p className={cn("mt-1 font-mono text-sm font-bold", returnSummary.nominal >= 0 ? "text-success" : "text-destructive")}>{returnSummary.nominal >= 0 ? "+" : ""}{formatIDR(returnSummary.nominal)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Percentage Return</p>
                            <p className={cn("mt-1 font-mono text-sm font-bold", returnSummary.percent >= 0 ? "text-success" : "text-destructive")}>{returnSummary.percent >= 0 ? "+" : ""}{returnSummary.percent.toFixed(2)}%</p>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-auto rounded-lg border">
                        <table className="w-full min-w-[620px] text-xs">
                            <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Equity</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">P&amp;L</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Return</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">Dividen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[...displayData].reverse().map(point => (
                                    <tr key={`${frequency}-${point.timestamp}`} className="hover:bg-muted/40">
                                        <td className="whitespace-nowrap px-3 py-2.5 font-medium">{point.originalDate.toLocaleDateString('id-ID', frequency === 'monthly' ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{formatIDR(point.value)}</td>
                                        <td className={cn("whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold", point.pnl >= 0 ? "text-success" : "text-destructive")}>{point.pnl >= 0 ? "+" : ""}{formatIDR(point.pnl)}</td>
                                        <td className={cn("whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold", point.returnPercent >= 0 ? "text-success" : "text-destructive")}>{point.returnPercent >= 0 ? "+" : ""}{point.returnPercent.toFixed(2)}%</td>
                                        <td className={cn("whitespace-nowrap px-3 py-2.5 text-right font-mono", point.dividendValue > 0 ? "text-success" : "text-muted-foreground")}>{point.dividendValue > 0 ? `+${formatIDR(point.dividendValue)}` : formatIDR(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </CardContent>
        </Card>
    );
}
