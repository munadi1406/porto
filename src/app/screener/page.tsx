"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Zap, Activity, BarChart3,
    Search, ArrowUp, ArrowDown, Loader2, Play, AlertCircle, Info
} from "lucide-react";
import Link from "next/link";
import stockData from "../../../stocks-idx.json";

interface ScreenerItem {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    ma20: number;
    ma50: number;
    goldenCross: boolean;
    deathCross: boolean;
    nearGoldenCross: boolean;
    rsi: number;
    rsiOversold: boolean;
    rsiOverbought: boolean;
    volumeSurge: boolean;
    accumulation: boolean;
    distribution: boolean;
    adSignal: string;
    obvTrend: string;
    mfi: number;
    signal: string;
    score: number;
    keySupport: number;
    keyResistance: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    reason: string;
}

type SortKey = 'score' | 'ticker' | 'changePercent' | 'rsi' | 'signal';
type FilterKey = 'all' | 'golden' | 'accumulation' | 'oversold' | 'surge' | 'buy' | 'distribution';

const BATCH_SIZE = 10;
const BATCH_DELAY = 1200;

export default function ScreenerPage() {
    const [results, setResults] = useState<ScreenerItem[]>([]);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortAsc, setSortAsc] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [search, setSearch] = useState('');
    const abortRef = useRef(false);

    const filterDescriptions: Record<FilterKey, { title: string; desc: string }> = {
        all: { title: 'All Stocks', desc: 'Menampilkan semua saham yang sudah di-scan tanpa filter.' },
        golden: { title: 'Golden Cross', desc: 'MA20 baru saja memotong MA50 dari bawah ke atas — sinyal bullish jangka menengah. Juga termasuk Near Golden Cross (jarak MA20-MA50 < 1%).' },
        accumulation: { title: 'Accumulation', desc: 'OBV naik atau Chaikin A/D positif + RSI < 60 (tidak overbought) + tidak ada lonjakan volume abnormal. Indikasi smart money sedang mengakumulasi.' },
        surge: { title: 'Volume Surge', desc: 'Volume hari ini > 1.8× rata-rata volume 20 hari terakhir. Menarik jika OBV juga naik (konfirmasi bullish) atau turun (konfirmasi bearish).' },
        oversold: { title: 'Oversold', desc: 'RSI < 30 — harga turun terlalu cepat dan berpotensi reversal naik. Cocok untuk strategi mean reversion dengan konfirmasi volume.' },
        buy: { title: 'Buy Signal', desc: 'Composite Score ≥ +20 — menggabungkan Golden Cross, Accumulation, OBV, RSI, dan Volume Surge. Sinyal beli paling kuat dari screener.' },
        distribution: { title: 'Distribution', desc: 'OBV turun atau A/D negatif + RSI > 40 + indikasi Death Cross. Smart money sedang mendistribusikan (melepas) saham — sinyal bearish.' },
    };

    const allTickers: string[] = (stockData.stocks as string[]).filter(t => /^[A-Z]{2,4}\.JK$/.test(t));

    const handleScreen = useCallback(async () => {
        abortRef.current = false;
        setScanning(true);
        setError(null);
        setResults([]);
        setProgress({ done: 0, total: allTickers.length, errors: 0 });

        const newResults: ScreenerItem[] = [];

        for (let i = 0; i < allTickers.length && !abortRef.current; i += BATCH_SIZE) {
            const batch = allTickers.slice(i, i + BATCH_SIZE);

            try {
                const res = await fetch(`/api/screener?tickers=${batch.join(',')}`);
                const json = await res.json();

                if (json.success && json.data) {
                    newResults.push(...json.data);
                    setResults([...newResults]);
                }

                setProgress(prev => ({
                    done: Math.min(prev.done + batch.length, prev.total),
                    total: prev.total,
                    errors: prev.errors + (json.errors?.length || 0),
                }));
            } catch {
                setProgress(prev => ({ ...prev, errors: prev.errors + batch.length }));
            }

            if (i + BATCH_SIZE < allTickers.length && !abortRef.current) {
                await new Promise(r => setTimeout(r, BATCH_DELAY));
            }
        }

        setScanning(false);
    }, [allTickers]);

    const handleStop = () => {
        abortRef.current = true;
        setScanning(false);
    };

    const filtered = useMemo(() => {
        let items = [...results];
        switch (filter) {
            case 'golden': items = items.filter(i => i.goldenCross || i.nearGoldenCross); break;
            case 'accumulation': items = items.filter(i => i.accumulation); break;
            case 'oversold': items = items.filter(i => i.rsiOversold); break;
            case 'surge': items = items.filter(i => i.volumeSurge); break;
            case 'buy': items = items.filter(i => i.signal === 'BUY'); break;
            case 'distribution': items = items.filter(i => i.distribution || i.deathCross); break;
        }
        if (search.trim()) {
            const q = search.toUpperCase();
            items = items.filter(i => i.ticker.includes(q) || i.name.toUpperCase().includes(q));
        }
        items.sort((a, b) => {
            const mul = sortAsc ? 1 : -1;
            switch (sortKey) {
                case 'score': return mul * ((b.score || 0) - (a.score || 0));
                case 'ticker': return mul * a.ticker.localeCompare(b.ticker);
                case 'changePercent': return mul * (Math.abs(b.changePercent) - Math.abs(a.changePercent));
                case 'rsi': return mul * ((a.rsi || 50) - (b.rsi || 50));
                case 'signal': return mul * ((b.score || 0) - (a.score || 0));
                default: return mul * ((b.score || 0) - (a.score || 0));
            }
        });
        return items;
    }, [results, filter, search, sortKey, sortAsc]);

    const topPicks = useMemo(() => {
        const buys = [...results].filter(r => r.signal === 'BUY').sort((a, b) => b.score - a.score).slice(0, 5);
        const sells = [...results].filter(r => r.signal === 'SELL').sort((a, b) => a.score - b.score).slice(0, 5);
        return { buys, sells };
    }, [results]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const formatScore = (score: number) => {
        if (score >= 30) return { label: 'Strong Buy', color: 'text-success', bg: 'bg-success/15' };
        if (score >= 10) return { label: 'Buy', color: 'text-primary', bg: 'bg-primary/10' };
        if (score <= -30) return { label: 'Strong Sell', color: 'text-destructive', bg: 'bg-destructive/15' };
        if (score <= -10) return { label: 'Sell', color: 'text-destructive', bg: 'bg-destructive/10' };
        return { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted' };
    };

    const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
            onClick={() => toggleSort(k)}>
            <div className="flex items-center gap-1">
                {label}
                {sortKey === k && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
            </div>
        </th>
    );

    const count = (k: FilterKey) => {
        if (k === 'all') return results.length;
        return results.filter(i => {
            switch (k) {
                case 'golden': return i.goldenCross || i.nearGoldenCross;
                case 'accumulation': return i.accumulation;
                case 'oversold': return i.rsiOversold;
                case 'surge': return i.volumeSurge;
                case 'buy': return i.signal === 'BUY';
                case 'distribution': return i.distribution || i.deathCross;
                default: return true;
            }
        }).length;
    };

    const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Stock Screener</h1>
                    <p className="text-sm text-muted-foreground">
                        {results.length > 0
                            ? `${results.length} / ${allTickers.length} stocks scanned`
                            : `${allTickers.length} stocks ready to screen`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {scanning && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span>{progressPct}%</span>
                            {progress.errors > 0 && <span className="text-destructive">({progress.errors} err)</span>}
                        </div>
                    )}
                    {!scanning ? (
                        <button
                            onClick={handleScreen}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/80 transition-all shadow-lg"
                        >
                            <Play className="w-4 h-4" />
                            Screen Stocks
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:bg-destructive/80 transition-all"
                        >
                            Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {scanning && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl text-xs text-destructive font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Top 5 Picks */}
            {!scanning && results.length > 0 && (topPicks.buys.length > 0 || topPicks.sells.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {topPicks.buys.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 bg-success/5 border-b border-border flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-success" />
                                <span className="text-xs font-black text-success uppercase tracking-wider">Top 5 Buy</span>
                            </div>
                            <div className="divide-y divide-border">
                                {topPicks.buys.map((item, idx) => (
                                    <div key={item.ticker} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-muted-foreground w-4">#{idx+1}</span>
                                                <Link href={`/analysis/${item.ticker}.JK`} className="font-bold text-sm text-foreground hover:text-primary font-mono">{item.ticker}</Link>
                                                <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-success">+{item.score}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground ml-6">
                                            <span>Entry: <span className="font-semibold text-foreground">{formatIDR(item.entryPrice)}</span></span>
                                            <span>SL: <span className="font-semibold text-destructive">{formatIDR(item.stopLoss)}</span></span>
                                            <span>TP: <span className="font-semibold text-success">{formatIDR(item.takeProfit)}</span></span>
                                            <span className="text-[9px]">R:R <span className="font-semibold text-foreground">1:{(Math.abs(item.takeProfit - item.entryPrice) / Math.abs(item.stopLoss - item.entryPrice)).toFixed(1)}</span></span>
                                        </div>
                                        <div className="ml-6 mt-1 text-[8px] text-muted-foreground leading-tight">{item.reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {topPicks.sells.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 bg-destructive/5 border-b border-border flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-destructive" />
                                <span className="text-xs font-black text-destructive uppercase tracking-wider">Top 5 Sell</span>
                            </div>
                            <div className="divide-y divide-border">
                                {topPicks.sells.map((item, idx) => (
                                    <div key={item.ticker} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-muted-foreground w-4">#{idx+1}</span>
                                                <Link href={`/analysis/${item.ticker}.JK`} className="font-bold text-sm text-foreground hover:text-primary font-mono">{item.ticker}</Link>
                                                <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-destructive">{item.score}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground ml-6">
                                            <span>Entry: <span className="font-semibold text-foreground">{formatIDR(item.entryPrice)}</span></span>
                                            <span>SL: <span className="font-semibold text-success">{formatIDR(item.stopLoss)}</span></span>
                                            <span>TP: <span className="font-semibold text-destructive">{formatIDR(item.takeProfit)}</span></span>
                                            <span className="text-[9px]">R:R <span className="font-semibold text-foreground">1:{(Math.abs(item.takeProfit - item.entryPrice) / Math.abs(item.stopLoss - item.entryPrice)).toFixed(1)}</span></span>
                                        </div>
                                        <div className="ml-6 mt-1 text-[8px] text-muted-foreground leading-tight">{item.reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Search + Filter */}
            {results.length > 0 && (
                <>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari ticker atau nama..."
                            className="w-full pl-9 pr-4 py-2 bg-muted border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {([
                            ['all', 'All'],
                            ['golden', `Golden Cross (${count('golden')})`],
                            ['accumulation', `Accumulation (${count('accumulation')})`],
                            ['surge', `Volume Surge (${count('surge')})`],
                            ['oversold', `Oversold (${count('oversold')})`],
                            ['buy', `Buy Signal (${count('buy')})`],
                            ['distribution', `Distribution (${count('distribution')})`],
                        ] as [FilterKey, string][]).map(([k, label]) => (
                            <button
                                key={k}
                                onClick={() => setFilter(k)}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all",
                                    filter === k
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-card text-muted-foreground border-border hover:border-primary/30"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Filter Description */}
                    {filter !== 'all' && (
                        <div className="flex items-start gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-foreground">{filterDescriptions[filter].title}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{filterDescriptions[filter].desc}</p>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                                        <SortHeader label="Ticker" k="ticker" />
                                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Name</th>
                                        <SortHeader label="Price" k="changePercent" />
                                        <SortHeader label="Change" k="changePercent" />
                                        <SortHeader label="Signal" k="signal" />
                                        <SortHeader label="Score" k="score" />
                                        <SortHeader label="RSI" k="rsi" />
                                        <SortHeader label="MFI" k="rsi" />
                                        <SortHeader label="Cross" k="score" />
                                        <SortHeader label="Volume" k="score" />
                                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filtered.map((item) => {
                                        const sc = formatScore(item.score);
                                        const isUp = item.changePercent >= 0;
                                        return (
                                            <tr key={item.ticker} className="hover:bg-muted/40 transition-colors">
                                                <td className="px-3 py-3">
                                                    <span className="font-bold text-foreground font-mono text-xs">{item.ticker}</span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{item.name}</td>
                                                <td className="px-3 py-3 font-semibold text-xs">{formatIDR(item.price)}</td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-xs font-semibold", isUp ? "text-success" : "text-destructive")}>
                                                        {isUp ? '+' : ''}{formatPercentage(item.changePercent)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded", sc.color, sc.bg)}>
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-xs font-black", sc.color)}>
                                                        {item.score > 0 ? '+' : ''}{item.score}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-xs font-semibold",
                                                        item.rsiOversold ? "text-success" : item.rsiOverbought ? "text-destructive" : "text-foreground"
                                                    )}>
                                                        {item.rsi}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={cn("text-xs font-semibold",
                                                        item.mfi < 30 ? "text-success" : item.mfi > 70 ? "text-destructive" : "text-foreground"
                                                    )}>
                                                        {item.mfi}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    {item.goldenCross ? (
                                                        <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded">GOLDEN</span>
                                                    ) : item.deathCross ? (
                                                        <span className="text-[10px] font-black text-destructive bg-destructive/10 px-2 py-0.5 rounded">DEATH</span>
                                                    ) : item.nearGoldenCross ? (
                                                        <span className="text-[10px] font-black text-warning bg-warning/10 px-2 py-0.5 rounded">NEAR GC</span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1">
                                                        {item.volumeSurge && <Zap className="w-3 h-3 text-warning" />}
                                                        <span className={cn("text-[10px] font-semibold",
                                                            item.obvTrend === 'UP' ? "text-success" : item.obvTrend === 'DOWN' ? "text-destructive" : "text-muted-foreground"
                                                        )}>
                                                            {item.accumulation ? 'ACC' : item.distribution ? 'DIST' : '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Link
                                                        href={`/analysis/${item.ticker}.JK`}
                                                        className="text-[10px] font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                                                    >
                                                        Analyze
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filtered.length === 0 && !scanning && (
                            <div className="p-12 text-center">
                                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">No matches found</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {results.length === 0 && !scanning && (
                <div className="p-24 text-center">
                    <BarChart3 className="w-16 h-16 text-muted-foreground/40 mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Ready to Screen</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
                        Scan {allTickers.length} IDX stocks for golden cross, accumulation, volume surge, and more.
                        Results appear progressively as each batch completes.
                    </p>
                    <button
                        onClick={handleScreen}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-base font-bold hover:bg-primary/80 transition-all shadow-xl hover:shadow-2xl"
                    >
                        <Play className="w-6 h-6" />
                        Start Screening
                    </button>
                </div>
            )}

            {scanning && results.length === 0 && (
                <div className="p-24 text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
                    <h2 className="text-lg font-bold text-foreground mb-2">Scanning Market...</h2>
                    <p className="text-sm text-muted-foreground">
                        Processing {allTickers.length} stocks in batches of {BATCH_SIZE} to avoid rate limits
                    </p>
                </div>
            )}
        </div>
    );
}
