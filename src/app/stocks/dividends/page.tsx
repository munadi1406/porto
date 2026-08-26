"use client";

import { useState, useEffect } from "react";
import { formatIDR } from "@/lib/utils";
import {
    DollarSign, Calendar, TrendingUp, PieChart, Sparkles
} from "lucide-react";
import Link from "next/link";

interface DividendStock {
    ticker: string;
    name: string;
    dividendRate: number;
    dividendYield: number;
    exDividendDate: string;
    nextDividendDate: string;
    frequency: string;
}

function YieldBadge({ value }: { value: number }) {
    const color = value >= 5 ? "text-success bg-success/10 border-success/20" :
        value >= 2 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
            "text-muted-foreground bg-muted/30 border-border/50";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${color}`}>
            {value.toFixed(2)}%
        </span>
    );
}

function CardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            <div className="flex justify-between">
                <div className="h-3 bg-muted animate-pulse rounded w-20" />
                <div className="h-5 bg-muted animate-pulse rounded w-14" />
            </div>
            <div className="flex justify-between">
                <div className="h-3 bg-muted animate-pulse rounded w-16" />
                <div className="h-3 bg-muted animate-pulse rounded w-24" />
            </div>
        </div>
    );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
        </div>
    );
}

export default function DividendsPage() {
    const [dividends, setDividends] = useState<DividendStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    async function fetchData() {
        setLoading(true);
        setError(false);
        const res = await fetch('/api/idx/corporate-actions')
            .then(r => r.json())
            .catch(() => ({ success: false }));
        if (res.success) {
            const sorted = (res.data.dividends || []).sort(
                (a: DividendStock, b: DividendStock) => b.dividendYield - a.dividendYield
            );
            setDividends(sorted);
        } else {
            setError(true);
        }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    const avgYield = dividends.length
        ? dividends.reduce((sum, d) => sum + d.dividendYield, 0) / dividends.length
        : 0;
    const highestYield = dividends.length
        ? Math.max(...dividends.map(d => d.dividendYield))
        : 0;
    const highestStock = dividends.find(d => d.dividendYield === highestYield);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Dividend Calendar</h1>
                <p className="text-sm text-muted-foreground">Dividend-paying stocks & corporate actions</p>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="h-20 bg-muted animate-pulse rounded-xl" />
                        <div className="h-20 bg-muted animate-pulse rounded-xl" />
                        <div className="h-20 bg-muted animate-pulse rounded-xl" />
                    </div>
                    <div className="hidden sm:block"><TableSkeleton rows={6} /></div>
                    <div className="grid grid-cols-1 sm:hidden gap-3">
                        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                </div>
            ) : error ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <PieChart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>Dividend data unavailable.</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/80 transition-colors">
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* Summary Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="card-title">Dividend Stocks</p>
                                <p className="text-xl font-bold text-foreground tabular-nums">{dividends.length}</p>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <p className="card-title">Avg Yield</p>
                                <p className="text-xl font-bold text-foreground tabular-nums">{avgYield.toFixed(2)}%</p>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="card-title">Highest Yield</p>
                                <p className="text-xl font-bold text-foreground tabular-nums">
                                    {highestYield.toFixed(2)}%
                                    {highestStock && <span className="text-sm font-mono text-muted-foreground ml-1">({highestStock.ticker})</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {dividends.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p>No dividend data available at this time.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden sm:block card-flush">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Ticker</th>
                                                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                                                <th className="text-right px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Dividend Rate</th>
                                                <th className="text-right px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Yield</th>
                                                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Ex-Date</th>
                                                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Frequency</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {dividends.map((d) => (
                                                <tr key={d.ticker} className="hover:bg-muted/40 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <Link href={`/analysis/${d.ticker}.JK`} className="font-mono font-bold text-primary hover:underline">
                                                            {d.ticker}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{d.name}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-foreground font-bold">{formatIDR(d.dividendRate)}</td>
                                                    <td className="px-4 py-3 text-right"><YieldBadge value={d.dividendYield} /></td>
                                                    <td className="px-4 py-3 text-muted-foreground">{d.exDividendDate}</td>
                                                    <td className="px-4 py-3 text-muted-foreground capitalize">{d.frequency}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Cards */}
                            <div className="grid grid-cols-1 sm:hidden gap-3">
                                {dividends.map((d) => (
                                    <div key={d.ticker} className="bg-card border border-border rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/analysis/${d.ticker}.JK`} className="font-mono font-bold text-primary hover:underline text-sm">
                                                {d.ticker}
                                            </Link>
                                            <YieldBadge value={d.dividendYield} />
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{d.name}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Rate</span>
                                            <span className="font-mono font-bold text-foreground">{formatIDR(d.dividendRate)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Ex-Date</span>
                                            <span className="text-foreground">{d.exDividendDate}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Frequency</span>
                                            <span className="text-foreground capitalize">{d.frequency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
