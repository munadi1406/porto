"use client";

import { useState, useEffect, useMemo } from "react";
import { cn, formatIDR } from "@/lib/utils";
import { CheckCircle2, XCircle, Search, Filter, Moon, Sun } from "lucide-react";
import Link from "next/link";

type FilterMode = "all" | "sharia" | "non-sharia";

interface ShariaStock {
    ticker: string;
    sharia: boolean;
}

interface ShariaResponse {
    success: boolean;
    data: {
        totalStocks: number;
        shariaStocks: number;
        nonSharia: number;
        lastUpdated: string;
        list: ShariaStock[];
    };
}

function CardSkeleton() {
    return <div className="h-20 bg-muted animate-pulse rounded-xl" />;
}

export default function ShariaPage() {
    const [data, setData] = useState<ShariaResponse["data"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<FilterMode>("all");
    const [search, setSearch] = useState("");

    async function fetchData() {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch("/api/idx/sharia-list");
            if (!res.ok) { setError(true); setLoading(false); return; }
            const json: ShariaResponse = await res.json();
            if (json.success) setData(json.data);
            else setError(true);
        } catch {
            setError(true);
        }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    const filteredList = useMemo(() => {
        if (!data) return [];
        let list = data.list;
        if (filter === "sharia") list = list.filter(s => s.sharia);
        if (filter === "non-sharia") list = list.filter(s => !s.sharia);
        if (search.trim()) {
            const q = search.trim().toUpperCase();
            list = list.filter(s => s.ticker.includes(q));
        }
        return list;
    }, [data, filter, search]);

    const filterOptions: { key: FilterMode; label: string }[] = [
        { key: "all", label: `All (${data?.totalStocks ?? "—"})` },
        { key: "sharia", label: `Sharia (${data?.shariaStocks ?? "—"})` },
        { key: "non-sharia", label: `Non-Sharia (${data?.nonSharia ?? "—"})` },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">IDX Sharia Stock List</h1>
                    <p className="text-sm text-muted-foreground">
                        {data
                            ? `${formatIDR(data.totalStocks).replace("Rp", "").trim()} total stocks · Last updated: ${data.lastUpdated}`
                            : "Loading sharia stock data..."}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            {data && !loading && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{data.totalStocks.toLocaleString("id-ID")}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Stocks</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-success">{data.shariaStocks.toLocaleString("id-ID")}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sharia</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-destructive">{data.nonSharia.toLocaleString("id-ID")}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Non-Sharia</p>
                    </div>
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by ticker..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                </div>
                <div className="flex gap-1.5 p-1 bg-card border border-border rounded-xl">
                    {filterOptions.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setFilter(opt.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                filter === opt.key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {Array.from({ length: 18 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>Failed to load sharia stock list.</p>
                    <button
                        onClick={fetchData}
                        className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/80 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredList.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No stocks match your search.</p>
                </div>
            )}

            {/* Grid */}
            {!loading && !error && filteredList.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {filteredList.map(stock => (
                        <Link
                            key={stock.ticker}
                            href={`/analysis/${stock.ticker}.JK`}
                            className="bg-card border border-border rounded-xl p-4 hover:bg-muted/40 hover:border-primary/30 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                                    {stock.ticker}
                                </span>
                                {stock.sharia ? (
                                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                    stock.sharia
                                        ? "bg-success/10 text-success"
                                        : "bg-destructive/10 text-destructive"
                                )}
                            >
                                {stock.sharia ? "Sharia" : "Non-Sharia"}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Count */}
            {!loading && !error && filteredList.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Showing {filteredList.length.toLocaleString("id-ID")} of {data?.totalStocks.toLocaleString("id-ID") ?? "—"} stocks
                </p>
            )}
        </div>
    );
}
