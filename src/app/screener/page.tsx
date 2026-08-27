"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Zap, BarChart3, Activity,
    Search, ArrowUp, ArrowDown, Loader2, Play, AlertCircle, Info, Save, Clock, Building2, Target, Bot, Calculator
} from "lucide-react";
import Link from "next/link";
import stockData from "../../../stocks-idx.json";
import { useStockScreener } from "@/hooks/useIdxExtended";
import { PositionCalculator } from "@/components/PositionCalculator";

interface ScreenerItem {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    sharia: boolean;
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
    accumulationPercent: number;
    netFlow: number;
    divergence: string;
    investorIndication: string;
    bestStrategy: string;
    bestStrategyScore: number;
    consensus: string;
    buySignals: number;
    sellSignals: number;
    winRate: number;
    sharpe: number;
    maxDrawdown: number;
    totalReturn: number;
    tradeCount: number;
}

interface OfficialScreenerItem {
    code: string;
    name: string;
    sector: string;
    subSector: string;
    industry: string;
    subIndustry: string;
    marketCapital: number;
    totalRevenue: number;
    npm: number;
    per: number;
    pbv: number;
    roa: number;
    roe: number;
    der: number;
    week4: number;
    week13: number;
    week26: number;
    week52: number;
    ytd: number;
    mtd: number;
    umaDate: string | null;
    notation: string | null;
    status: string | null;
    corpAction: string | null;
    corpActionDate: string | null;
}

interface SavedScreen {
    id: string;
    label: string;
    resultsCount: number;
    buyCount: number;
    sellCount: number;
    createdAt: string;
}

type SortKey = 'score' | 'ticker' | 'changePercent' | 'rsi' | 'signal';
type FilterKey = 'all' | 'golden' | 'accumulation' | 'oversold' | 'surge' | 'buy' | 'distribution' | 'sharia';
type ScreenerTab = 'technical' | 'fundamental' | 'ai' | 'position';

function SortHeader({ label, k, sortKey, sortAsc, onSort }: {
    label: string;
    k: SortKey;
    sortKey: SortKey;
    sortAsc: boolean;
    onSort: (key: SortKey) => void;
}) {
    return (
        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
            onClick={() => onSort(k)}>
            <div className="flex items-center gap-1">
                {label}
                {sortKey === k && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
            </div>
        </th>
    );
}

const BATCH_SIZE = 10;
const BATCH_DELAY = 1200;

export default function ScreenerPage() {
    const [activeTab, setActiveTab] = useState<ScreenerTab>('technical');
    const [results, setResults] = useState<ScreenerItem[]>([]);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0, errorSummary: {} as Record<string, number> });
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortAsc, setSortAsc] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [search, setSearch] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveLabel, setSaveLabel] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const abortRef = useRef(false);

    const { data: officialData, isLoading: officialLoading } = useStockScreener();
    const [officialSearch, setOfficialSearch] = useState('');
    const [officialSortKey, setOfficialSortKey] = useState<'marketCapital' | 'per' | 'pbv' | 'roe' | 'npm' | 'ytd'>('marketCapital');
    const [officialSortDir, setOfficialSortDir] = useState<'asc' | 'desc'>('desc');

    const filterDescriptions: Record<FilterKey, { title: string; desc: string }> = {
        all: { title: 'Semua', desc: 'Menampilkan semua saham yang sudah di-scan.' },
        golden: { title: 'Golden Cross', desc: 'MA20 memotong MA50 dari bawah ke atas — sinyal bullish jangka menengah.' },
        accumulation: { title: 'Accumulation', desc: 'Smart money sedang mengakumulasi — OBV naik, RSI tidak overbought.' },
        surge: { title: 'Volume Surge', desc: 'Volume > 1.8× rata-rata 20 hari — perhatikan konfirmasi OBV.' },
        oversold: { title: 'Oversold', desc: 'RSI < 30 — potensi reversal naik untuk mean reversion.' },
        buy: { title: 'Buy Signal', desc: 'Composite Score ≥ +20 — sinyal beli paling kuat.' },
        distribution: { title: 'Distribution', desc: 'Smart money mendistribusikan — OBV turun, death cross.' },
        sharia: { title: 'Sharia', desc: 'Saham dalam Daftar Efek Syariah (DES) OJK.' },
    };

    const allTickers: string[] = (stockData.stocks as string[]).filter(t => /^[A-Z]{2,4}\.JK$/.test(t));

    const handleScreen = useCallback(async () => {
        abortRef.current = false;
        setScanning(true);
        setError(null);
        setResults([]);
        setProgress({ done: 0, total: allTickers.length, errors: 0, errorSummary: {} });

        const newResults: ScreenerItem[] = [];

        for (let i = 0; i < allTickers.length && !abortRef.current; i += BATCH_SIZE) {
            const batch = allTickers.slice(i, i + BATCH_SIZE);

            try {
                const res = await fetch(`/api/screener?tickers=${batch.join(',')}`);
                const json = await res.json();

                if (json.success && json.data && json.data.length > 0) {
                    newResults.push(...json.data);
                    setResults([...newResults]);
                }

                setProgress(prev => ({
                    done: Math.min(prev.done + batch.length, prev.total),
                    total: prev.total,
                    errors: prev.errors + (json.errors?.length || 0),
                    errorSummary: json.errorSummary || {},
                }));

                if (!json.success && json.error) {
                    setError(json.error);
                }
            } catch (e: any) {
                setProgress(prev => ({ ...prev, errors: prev.errors + batch.length }));
                setError(e.message || 'Network error');
            }

            if (i + BATCH_SIZE < allTickers.length && !abortRef.current) {
                await new Promise(r => setTimeout(r, BATCH_DELAY));
            }
        }

        setScanning(false);
    }, [allTickers]);

    useEffect(() => {
        fetch('/api/screener/history')
            .then(r => r.json())
            .then(j => { if (j.success) setSavedScreens(j.data); })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        if (!saveLabel.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/screener/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: saveLabel.trim(), label: saveLabel.trim(), results }),
            });
            const json = await res.json();
            if (json.success) {
                setSavedScreens(prev => [json.data, ...prev]);
                setShowSaveDialog(false);
                setSaveLabel('');
            }
        } catch {}
        setSaving(false);
    };

    const handleLoadSaved = async (id: string) => {
        try {
            const res = await fetch(`/api/screener/history/${id}`);
            const json = await res.json();
            if (json.success && json.data.results) {
                setResults(json.data.results);
                setShowHistory(false);
            }
        } catch {}
    };

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
            case 'sharia': items = items.filter(i => i.sharia); break;
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
                case 'sharia': return i.sharia;
                default: return true;
            }
        }).length;
    };

    const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    const filteredOfficial = useMemo(() => {
        if (!officialData) return [];
        let items = [...officialData] as OfficialScreenerItem[];
        if (officialSearch.trim()) {
            const q = officialSearch.toUpperCase();
            items = items.filter(i => i.code.includes(q) || i.name.toUpperCase().includes(q));
        }
        items.sort((a, b) => {
            const mul = officialSortDir === 'asc' ? 1 : -1;
            return mul * ((a[officialSortKey] || 0) - (b[officialSortKey] || 0));
        });
        return items;
    }, [officialData, officialSearch, officialSortKey, officialSortDir]);

    const tabs = [
        { id: "technical" as const, label: "Technical", icon: Zap },
        { id: "fundamental" as const, label: "Fundamental", icon: Building2 },
        { id: "position" as const, label: "Position", icon: Calculator },
    ];

    const selectedStock = selectedTicker ? results.find(r => r.ticker === selectedTicker) : null;

    return (
        <div className="space-y-3">
            {/* Header + Controls */}
            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Stock Screener
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {results.length > 0 ? `${results.length} / ${allTickers.length} stocks scanned` : `${allTickers.length} stocks ready`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {scanning && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span>{progressPct}%</span>
                                </div>
                            )}
                            {!scanning ? (
                                <div className="flex items-center gap-2">
                                    {results.length > 0 && (
                                        <>
                                            <button
                                                onClick={() => { setSaveLabel(''); setShowSaveDialog(true); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setShowHistory(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
                                            >
                                                <Clock className="w-3.5 h-3.5" />
                                                History
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={handleScreen}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/80 transition-colors"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        Screen Stocks
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/80 transition-colors"
                                >
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {scanning && (
                    <div className="h-1 w-full bg-muted">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="card flex items-center gap-2 p-3 border-destructive/40 bg-destructive/5 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="card p-0 overflow-hidden">
                <div className="flex items-center border-b border-border bg-muted/10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            disabled={!results.length && tab.id !== 'technical' && tab.id !== 'fundamental'}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 -mb-px transition-colors",
                                activeTab === tab.id
                                    ? "border-primary text-primary bg-background"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
                                !results.length && tab.id !== 'technical' && tab.id !== 'fundamental' && "opacity-40 cursor-not-allowed hover:text-muted-foreground hover:bg-transparent"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-4 min-h-[400px]">
                    {/* Technical Tab */}
                    {activeTab === 'technical' && (
                        <TechnicalScreener
                            results={results}
                            filtered={filtered}
                            topPicks={topPicks}
                            scanning={scanning}
                            progress={progress}
                            sortKey={sortKey}
                            sortAsc={sortAsc}
                            toggleSort={toggleSort}
                            filter={filter}
                            setFilter={setFilter}
                            search={search}
                            setSearch={setSearch}
                            count={count}
                            filterDescriptions={filterDescriptions}
                            formatScore={formatScore}
                            onSelectTicker={(t) => { setSelectedTicker(t); setActiveTab('position'); }}
                        />
                    )}

                    {/* Fundamental Tab */}
                    {activeTab === 'fundamental' && (
                        <FundamentalScreener
                            data={filteredOfficial}
                            isLoading={officialLoading}
                            search={officialSearch}
                            setSearch={setOfficialSearch}
                            sortKey={officialSortKey}
                            setSortKey={setOfficialSortKey}
                            sortDir={officialSortDir}
                            setSortDir={setOfficialSortDir}
                        />
                    )}

                    {/* Position Tab */}
                    {activeTab === 'position' && selectedStock && (
                        <div className="space-y-4">
                            <div className="card p-3 border-primary/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-bold">Position Calculator</h3>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {selectedStock.ticker} · Rp {selectedStock.price.toLocaleString("id-ID")}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-3">
                                    Kalkulasi lot & alokasi untuk {selectedStock.ticker} berdasarkan entry price dari screener.
                                </p>
                                <PositionCalculator
                                    ticker={selectedStock.ticker}
                                    lastClose={selectedStock.price}
                                    technicalData={{
                                        nextEntry: {
                                            kind: "rsi_below",
                                            price: selectedStock.entryPrice,
                                            lastClose: selectedStock.price,
                                            distancePct: ((selectedStock.entryPrice / selectedStock.price - 1) * 100),
                                            ready: true,
                                            indicatorNow: `RSI ${selectedStock.rsi.toFixed(1)}`
                                        },
                                        indicators: {
                                            rsi14: selectedStock.rsi,
                                            support: selectedStock.keySupport,
                                            resistance: selectedStock.keyResistance,
                                        },
                                    }}
                                    strategyLabel={`Screener Score: ${selectedStock.score}`}
                                    showCalculator={true}
                                />
                            </div>
                        </div>
                    )}

                    {/* Empty state for Position */}
                    {activeTab === 'position' && !selectedStock && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <BarChart3 className="w-12 h-12 mb-4 text-muted-foreground/30" />
                            <p className="text-sm font-medium">
                                Pilih saham dari tab Technical untuk kalkulasi posisi
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSaveDialog(false)}>
                    <div className="bg-card p-6 rounded-xl w-full max-w-md border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-foreground mb-1">Save Screener Results</h3>
                        <p className="text-xs text-muted-foreground mb-4">{results.length} stocks — {topPicks.buys.length} buy, {topPicks.sells.length} sell</p>
                        <input
                            type="text"
                            value={saveLabel}
                            onChange={e => setSaveLabel(e.target.value)}
                            placeholder="e.g. IDX Scan 19 Jun 2026"
                            className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving || !saveLabel.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/80 disabled:opacity-50 transition-all">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Panel */}
            {showHistory && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHistory(false)}>
                    <div className="bg-card p-6 rounded-xl w-full max-w-lg border border-border shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-foreground">Saved Screens</h3>
                            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground text-sm font-medium">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {savedScreens.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No saved screens yet</p>
                            ) : (
                                savedScreens.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border hover:bg-muted/60 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{s.label}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {s.resultsCount} stocks · {s.buyCount} buy · {s.sellCount} sell · {new Date(s.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleLoadSaved(s.id)}
                                            className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
                                        >
                                            Load
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TechnicalScreener({
    results, filtered, topPicks, scanning, progress, sortKey, sortAsc, toggleSort, filter, setFilter, search, setSearch, count, filterDescriptions, formatScore, onSelectTicker,
}: {
    results: ScreenerItem[];
    filtered: ScreenerItem[];
    topPicks: { buys: ScreenerItem[]; sells: ScreenerItem[] };
    scanning: boolean;
    progress: { done: number; total: number; errors: number; errorSummary: Record<string, number> };
    sortKey: SortKey;
    sortAsc: boolean;
    toggleSort: (key: SortKey) => void;
    filter: FilterKey;
    setFilter: (f: FilterKey) => void;
    search: string;
    setSearch: (s: string) => void;
    count: (k: FilterKey) => void;
    filterDescriptions: Record<FilterKey, { title: string; desc: string }>;
    formatScore: (score: number) => { label: string; color: string; bg: string };
    onSelectTicker: (ticker: string) => void;
}) {
    if (results.length === 0 && !scanning) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BarChart3 className="w-16 h-16 mb-4 text-muted-foreground/30" />
                <p className="text-sm font-medium mb-2">Belum ada hasil scan</p>
                <p className="text-xs">Klik "Screen Stocks" untuk memulai scanning</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Scanning indicator */}
            {scanning && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="font-bold">Scanning... ({results.length} stocks found)</span>
                    </div>
                    {progress.errors > 0 && (
                        <div className="text-[10px] text-warning">
                            {progress.errors} stocks failed
                            {Object.keys(progress.errorSummary).length > 0 && (
                                <span className="ml-1">
                                    ({Object.entries(progress.errorSummary).map(([k, v]) => `${k}: ${v}`).join(', ')})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Top Picks Summary */}
            {!scanning && topPicks.buys.length > 0 && (
                <div className="card p-3 bg-success/5 border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-xs font-black text-success">Top Buys</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {topPicks.buys.slice(0, 5).map((item, idx) => (
                            <button
                                key={item.ticker}
                                onClick={() => onSelectTicker(item.ticker)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 text-success text-[10px] font-bold hover:bg-success/20 transition-colors"
                            >
                                #{idx + 1} {item.ticker} (+{item.score})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Search + Filter */}
            {results.length > 0 && (
                <>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari ticker..."
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {([
                                ['all', 'All'],
                                ['buy', `Buy (${count('buy')})`],
                                ['golden', `GC (${count('golden')})`],
                                ['accumulation', `Acc (${count('accumulation')})`],
                                ['oversold', `Oversold (${count('oversold')})`],
                                ['surge', `Surge (${count('surge')})`],
                                ['sharia', `Sharia (${count('sharia')})`],
                            ] as [FilterKey, string][]).map(([k, label]) => (
                                <button
                                    key={k}
                                    onClick={() => setFilter(k)}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors",
                                        filter === k
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/30"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filter !== 'all' && (
                        <div className="flex items-start gap-2 p-2.5 bg-muted/30 border border-border rounded-lg text-[11px]">
                            <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{filterDescriptions[filter].desc}</span>
                        </div>
                    )}
                </>
            )}

            {/* Table */}
            {filtered.length > 0 && (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-xs tabular-nums">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Ticker" k="ticker" />
                                <th className="px-3 py-2 text-[10px] font-black uppercase">Name</th>
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Price" k="changePercent" />
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Signal" k="signal" />
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Score" k="score" />
                                <th className="px-3 py-2 text-[10px] font-black uppercase">Best Strategy</th>
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Win%" k="score" />
                                <SortHeader sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} label="Sharpe" k="score" />
                                <th className="px-3 py-2 text-[10px] font-black uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((item) => {
                                const sc = formatScore(item.score);
                                return (
                                    <tr key={item.ticker} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-foreground font-mono">{item.ticker}</span>
                                                {item.sharia && <span className="text-[7px] font-black px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500">S</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{item.name}</td>
                                        <td className="px-3 py-2 font-semibold">{formatIDR(item.price)}</td>
                                        <td className="px-3 py-2">
                                            <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", sc.color, sc.bg)}>
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={cn("font-black", sc.color)}>{item.score > 0 ? '+' : ''}{item.score}</span>
                                        </td>
                                        <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[120px] truncate">
                                            {item.bestStrategy !== '-' ? item.bestStrategy.replace(/\(.*\)/, '').trim() : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={cn("font-semibold",
                                                item.winRate >= 50 ? "text-success" : item.winRate >= 40 ? "text-warning" : "text-destructive"
                                            )}>{item.winRate}%</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={cn("font-semibold",
                                                item.sharpe >= 1 ? "text-success" : item.sharpe >= 0.5 ? "text-warning" : "text-destructive"
                                            )}>{item.sharpe?.toFixed(2) || '-'}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => onSelectTicker(item.ticker)}
                                                className="text-[10px] font-black text-primary hover:underline"
                                            >
                                                Position →
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {filtered.length === 0 && !scanning && results.length > 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p>Tidak ada saham yang cocok dengan filter ini</p>
                </div>
            )}

            {/* AI Recommendation - muncul setelah scanning selesai */}
            {!scanning && topPicks.buys.length > 0 && (
                <div className="card p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">AI Recommendation</h3>
                        <span className="ml-auto text-[9px] text-muted-foreground">8 strategi backtest</span>
                    </div>
                    <div className="space-y-2">
                        {topPicks.buys.slice(0, 5).map((item, idx) => (
                            <div key={item.ticker} className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border">
                                <span className="text-xs font-black text-muted-foreground w-5">#{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold font-mono">{item.ticker}</span>
                                        <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded",
                                            item.consensus === 'STRONG_BUY' ? "bg-success/20 text-success" :
                                            item.score >= 30 ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                                        )}>{item.consensus === 'STRONG_BUY' ? 'STRONG' : '+' + item.score}</span>
                                        <span className="text-[9px] text-muted-foreground">
                                            {item.buySignals}B/{item.sellSignals}S
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.reason}</p>
                                </div>
                                <button
                                    onClick={() => onSelectTicker(item.ticker)}
                                    className="shrink-0 text-[10px] font-bold text-primary hover:underline"
                                >
                                    Position →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FundamentalScreener({
    data, isLoading, search, setSearch, sortKey, setSortKey, sortDir, setSortDir,
}: {
    data: OfficialScreenerItem[];
    isLoading: boolean;
    search: string;
    setSearch: (s: string) => void;
    sortKey: 'marketCapital' | 'per' | 'pbv' | 'roe' | 'npm' | 'ytd';
    setSortKey: (k: 'marketCapital' | 'per' | 'pbv' | 'roe' | 'npm' | 'ytd') => void;
    sortDir: 'asc' | 'desc';
    setSortDir: (d: 'asc' | 'desc') => void;
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-sm">Memuat data fundamental...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm">{search ? `Tidak ditemukan "${search}"` : 'Tidak ada data'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari saham..."
                        className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
                    {([['marketCapital', 'Cap'], ['per', 'PER'], ['pbv', 'PBV'], ['roe', 'ROE'], ['npm', 'NPM'], ['ytd', 'YTD']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => { setSortKey(key); setSortDir(sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'); }}
                            className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors",
                                sortKey === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card overflow-x-auto p-0">
                <table className="w-full text-xs tabular-nums">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                            <th className="px-3 py-2 text-[10px] font-black uppercase">Code</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase">Name</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase">Sector</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-right">PER</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-right">PBV</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-right">ROE</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-right">DER</th>
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-right">YTD</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.slice(0, 100).map((item) => (
                            <tr key={item.code} className="hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2 font-bold font-mono">
                                    <Link href={`/analysis/${item.code}.JK`} className="hover:text-primary">{item.code}</Link>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">{item.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{item.sector}</td>
                                <td className="px-3 py-2 text-right">{item.per?.toFixed(2) || '-'}</td>
                                <td className="px-3 py-2 text-right">{item.pbv?.toFixed(2) || '-'}</td>
                                <td className="px-3 py-2 text-right">{item.roe?.toFixed(1) || '-'}</td>
                                <td className="px-3 py-2 text-right">{item.der?.toFixed(2) || '-'}</td>
                                <td className={cn("px-3 py-2 text-right font-bold", (item.ytd || 0) >= 0 ? "text-success" : "text-destructive")}>
                                    {item.ytd != null ? `${item.ytd >= 0 ? '+' : ''}${item.ytd.toFixed(1)}%` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

