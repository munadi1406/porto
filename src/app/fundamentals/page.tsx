"use client";

import { useState, useMemo } from "react";
import { Search, Building2, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, AlertCircle, CheckCircle, XCircle, Loader2, ArrowLeft, Target, Wallet, Zap, Activity, Scale, Users, Info, ChevronRight } from "lucide-react";
import { cn, formatIDR, formatCompactIDR, formatNumber } from "@/lib/utils";
import { useFundamentals } from "@/hooks/useFundamentals";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";

// --- Types & Interfaces ---

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    subtitle?: string;
    className?: string;
}

// --- Helper Components ---

const Section = ({ title, icon, subtitle, children, className }: SectionProps) => (
    <div className={cn("bg-white dark:bg-[#1a1d23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden", className)}>
        <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800/50 flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
                    {subtitle && <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const MetricCard = ({ label, value, subtext, trend, colorClass }: { label: string; value: string | number; subtext?: string; trend?: 'up' | 'down' | 'neutral'; colorClass?: string }) => (
    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50 group hover:border-blue-500/20 transition-all">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">{label}</p>
        <div className="flex items-end gap-2">
            <span className={cn("text-xl font-black tracking-tight dark:text-white", colorClass)}>{value}</span>
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500 mb-1" />}
        </div>
        {subtext && <p className="text-[9px] text-gray-500 mt-1 font-medium">{subtext}</p>}
    </div>
);

// --- Main Page Component ---

export default function FundamentalsPage() {
    const [searchTicker, setSearchTicker] = useState("");
    const [selectedTicker, setSelectedTicker] = useState("");
    const { data, loading, error } = useFundamentals(selectedTicker);

    // --- Computed Data ---

    const analysis = useMemo(() => {
        if (!data) return null;
        let score = 0;
        const insights: Array<{ category: string; status: "good" | "warning" | "bad"; message: string }> = [];

        if (data.peRatio !== null) {
            if (data.peRatio < 15) { score += 20; insights.push({ category: "Valuasi", status: "good", message: "P/E Ratio menarik (di bawah 15x)." }); }
            else if (data.peRatio < 25) { score += 10; insights.push({ category: "Valuasi", status: "warning", message: "P/E Ratio wajar." }); }
            else { insights.push({ category: "Valuasi", status: "bad", message: "P/E Ratio tergolong tinggi." }); }
        }

        if (data.roe !== null) {
            const roePercent = data.roe * 100;
            if (roePercent > 15) { score += 20; insights.push({ category: "Profitabilitas", status: "good", message: "ROE sangat kuat (>15%)." }); }
            else if (roePercent > 10) { score += 10; insights.push({ category: "Profitabilitas", status: "warning", message: "ROE cukup baik." }); }
            else { insights.push({ category: "Profitabilitas", status: "bad", message: "ROE rendah, efisiensi modal kurang." }); }
        }

        if (data.currentRatio !== null) {
            if (data.currentRatio > 2) { score += 15; insights.push({ category: "Likuiditas", status: "good", message: "Likuiditas sangat aman." }); }
            else if (data.currentRatio > 1) { score += 8; insights.push({ category: "Likuiditas", status: "warning", message: "Likuiditas memadai." }); }
            else { insights.push({ category: "Likuiditas", status: "bad", message: "Risiko likuiditas jangka pendek." }); }
        }

        let rating: string, color: string;
        if (score >= 80) { rating = "Sangat Baik"; color = "text-emerald-500"; }
        else if (score >= 60) { rating = "Baik"; color = "text-blue-500"; }
        else if (score >= 40) { rating = "Cukup"; color = "text-amber-500"; }
        else { rating = "Kurang"; color = "text-rose-500"; }

        return { score, insights, rating, color };
    }, [data]);

    const smartMoney = useMemo(() => {
        if (!data) return null;
        if (data.smartMoneyPhase) {
            const isPositive = data.smartMoneyColor === 'emerald' || data.smartMoneyColor === 'green';
            const isNegative = data.smartMoneyColor === 'rose' || data.smartMoneyColor === 'red';
            return {
                power: data.concentrationScore ? `${data.concentrationScore}%` : 'N/A',
                signal: data.smartMoneyPhase,
                message: data.smartMoneyDescription,
                colorClass: isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-blue-500',
                bgClass: isPositive ? 'bg-emerald-500/10' : isNegative ? 'bg-rose-500/10' : 'bg-blue-500/10',
                topBuy: data.topBuyBrokers,
                topSell: data.topSellBrokers
            };
        }
        return null;
    }, [data]);

    const valAnalysis = useMemo(() => {
        if (!data || data.currentPrice === null || data.trailingEps === null || data.bookValue === null) return null;
        const graham = data.trailingEps > 0 && data.bookValue > 0 ? Math.sqrt(22.5 * data.trailingEps * data.bookValue) : 0;
        const growth = Math.min(Math.max((data.earningsGrowth || 0) * 100, 0), 15);
        const intrinsic = data.trailingEps * (8.5 + 2 * growth);
        const fairValue = graham > 0 ? (intrinsic + graham) / 2 : intrinsic;
        const mos = ((fairValue - data.currentPrice) / fairValue) * 100;
        const status = mos > 20 ? 'Undervalued' : mos < -10 ? 'Overvalued' : 'Fair Value';
        return { fairValue, mos, status, graham, intrinsic };
    }, [data]);

    // --- Handlers ---

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTicker.trim()) setSelectedTicker(searchTicker.trim().toUpperCase());
    };

    const isJK = selectedTicker.includes('.JK');

    return (
        <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d1117] transition-colors">
            {/* --- Navigation & Search --- */}
            <div className="bg-white dark:bg-[#1a1d23] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 max-w-7xl h-20 flex items-center gap-6">
                    <Link href="/analytics" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    
                    <form onSubmit={handleSearch} className="flex-1 relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTicker}
                            onChange={(e) => setSearchTicker(e.target.value)}
                            placeholder="Cari Ticker (e.g: BBCA.JK, TLKM, AAPL)..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all dark:text-white"
                        />
                    </form>

                    <div className="hidden md:flex items-center gap-2">
                        {["BBCA.JK", "TLKM.JK", "AAPL"].map(t => (
                            <button key={t} onClick={() => { setSearchTicker(t); setSelectedTicker(t); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                                {t.replace('.JK', '')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* --- States --- */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Synchronizing Market Data...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 text-center max-w-xl mx-auto">
                        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase mb-2">Discovery Error</h3>
                        <p className="text-sm text-rose-600 dark:text-rose-400 mb-6">{error}</p>
                        <button onClick={() => setSelectedTicker("")} className="px-6 py-2 bg-rose-500 text-white text-xs font-black uppercase rounded-xl">Coba Lagi</button>
                    </div>
                )}

                {!selectedTicker && !loading && (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                        <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                            <Building2 className="w-16 h-16 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Financial Terminal</h2>
                        <p className="text-sm text-gray-500 mt-2">Masukkan ticker di kolom pencarian untuk memulai analisa mendalam.</p>
                    </div>
                )}

                {/* --- Main Dashboard Content --- */}
                {data && analysis && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        
                        {/* --- Hero Header Section --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            <div className="lg:col-span-8 bg-white dark:bg-[#1a1d23] rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                                    <Activity className="w-48 h-48 text-blue-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{selectedTicker}</h1>
                                                {isJK && <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg">IDX</span>}
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                                                        <Activity className="w-3.5 h-3.5" />
                                                        Analisa Per Hari Ini: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </div>
                                                    {data.mostRecentQuarter && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                            <Info className="w-3.5 h-3.5" />
                                                            Lapkeu: {new Date(data.mostRecentQuarter).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{data.sector || 'Market Equities'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{data.industry || 'Global Asset'}</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Current Price</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                                {isJK ? formatIDR(data.currentPrice || 0) : `$${(data.currentPrice || 0).toFixed(2)}`}
                                            </p>
                                            <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black mt-2", (data.priceChangePercent || 0) >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                                {(data.priceChangePercent || 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                {(data.priceChangePercent || 0).toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-gray-50 dark:border-gray-800/50">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Market Cap</p>
                                            <p className="text-sm font-black dark:text-white">{isJK ? formatCompactIDR(data.marketCap || 0) : `$${((data.marketCap || 0) / 1e9).toFixed(1)}B`}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Avg Volume</p>
                                            <p className="text-sm font-black dark:text-white">{formatCompactIDR(data.averageVolume || 0).replace('Rp', '')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">52W Low</p>
                                            <p className="text-sm font-black text-rose-500">{isJK ? formatIDR(data.fiftyTwoWeekLow || 0) : `$${(data.fiftyTwoWeekLow || 0).toFixed(2)}`}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">52W High</p>
                                            <p className="text-sm font-black text-emerald-500">{isJK ? formatIDR(data.fiftyTwoWeekHigh || 0) : `$${(data.fiftyTwoWeekHigh || 0).toFixed(2)}`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                                            <Scale className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Health Rating</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-6xl font-black italic tracking-tighter">{analysis.score}<span className="text-2xl opacity-50 not-italic">/100</span></p>
                                        <p className="text-xl font-bold uppercase tracking-widest">{analysis.rating}</p>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase opacity-60">Status Valuasi</p>
                                            <p className="text-xl font-black">{valAnalysis?.status || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase opacity-60">Potensi Upside</p>
                                            <p className="text-xl font-black">{valAnalysis ? `${valAnalysis.mos.toFixed(1)}%` : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- Flow & Sentiment: Smart Money & Foreign --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-7">
                                <Section title="Flow Analysis" icon={<Users className="w-4 h-4" />} subtitle="Foreign & Big Player Activity">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Foreign Flow */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Investor Asing</span>
                                                </div>
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", data.foreignAccumulationStatus === 'Akumulasi' ? "bg-emerald-500/10 text-emerald-500" : data.foreignAccumulationStatus === 'Distribusi' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500")}>
                                                    {data.foreignAccumulationStatus}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase mb-1">Buy</p>
                                                        <p className="text-sm font-black text-emerald-600">{formatCompactIDR(data.foreignBuyValue || 0)}</p>
                                                    </div>
                                                    <div className="p-3 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                                        <p className="text-[9px] text-rose-600 dark:text-rose-400 font-black uppercase mb-1">Sell</p>
                                                        <p className="text-sm font-black text-rose-600">{formatCompactIDR(data.foreignSellValue || 0)}</p>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase">Net Foreign</span>
                                                        <span className={cn("text-lg font-black", data.foreignNetBuyValue >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                            {data.foreignNetBuyValue >= 0 ? "+" : ""}{formatCompactIDR(data.foreignNetBuyValue)}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-emerald-500" 
                                                            style={{ width: `${(data.foreignBuyValue / (data.foreignBuyValue + data.foreignSellValue)) * 100}%` }} 
                                                        />
                                                        <div 
                                                            className="h-full bg-rose-500" 
                                                            style={{ width: `${(data.foreignSellValue / (data.foreignBuyValue + data.foreignSellValue)) * 100}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Domestic Flow */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Investor Domestik</span>
                                                </div>
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", data.domesticNetBuyValue >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                                    {data.domesticNetBuyValue >= 0 ? 'Accum' : 'Dist'}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase mb-1">Buy</p>
                                                        <p className="text-sm font-black text-emerald-600">{formatCompactIDR(data.domesticBuyValue || 0)}</p>
                                                    </div>
                                                    <div className="p-3 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                                        <p className="text-[9px] text-rose-600 dark:text-rose-400 font-black uppercase mb-1">Sell</p>
                                                        <p className="text-sm font-black text-rose-600">{formatCompactIDR(data.domesticSellValue || 0)}</p>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase">Net Domestic</span>
                                                        <span className={cn("text-lg font-black", data.domesticNetBuyValue >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                            {data.domesticNetBuyValue >= 0 ? "+" : ""}{formatCompactIDR(data.domesticNetBuyValue)}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-emerald-500" 
                                                            style={{ width: `${(data.domesticBuyValue / (data.domesticBuyValue + data.domesticSellValue)) * 100}%` }} 
                                                        />
                                                        <div 
                                                            className="h-full bg-rose-500" 
                                                            style={{ width: `${(data.domesticSellValue / (data.domesticBuyValue + data.domesticSellValue)) * 100}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Smart Money */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-amber-500" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Smart Money</span>
                                                </div>
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", smartMoney?.bgClass, smartMoney?.colorClass)}>
                                                    {smartMoney?.signal || 'Neutral'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 tracking-widest">Top Buyers</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {smartMoney?.topBuy.map((b, idx) => (
                                                            <div key={`${b}-${idx}`} className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] font-black text-blue-500">{b}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 tracking-widest text-right">Top Sellers</p>
                                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                                        {smartMoney?.topSell.map((b, idx) => (
                                                            <div key={`${b}-${idx}`} className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] font-black text-gray-400">{b}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex justify-between items-center mb-3">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Concentration Score</p>
                                                    <span className={cn("text-xs font-black", smartMoney?.colorClass)}>{smartMoney?.power || '0%'}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className={cn("h-full transition-all duration-1000", smartMoney?.colorClass.replace('text-', 'bg-'))} style={{ width: smartMoney?.power || '0%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
                                        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                            "{smartMoney?.message || 'Data aliran dana menunjukkan aktivitas pasar yang normal.'}"
                                        </p>
                                    </div>
                                </Section>
                            </div>
                            
                            <div className="lg:col-span-5">
                                <Section title="Fair Value Calculator" icon={<Scale className="w-4 h-4" />} subtitle="Intrinsic Value & Strategy">
                                    <div className="space-y-6">
                                        <div className="text-center pb-6 border-b border-gray-50 dark:border-gray-800/50">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Rata-rata Harga Wajar</p>
                                            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                                {valAnalysis ? (isJK ? formatIDR(valAnalysis.fairValue) : `$${valAnalysis.fairValue.toFixed(2)}`) : 'N/A'}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-2 mb-2 text-rose-500">
                                                    <Wallet className="w-4 h-4" />
                                                    <span className="text-[9px] font-black uppercase">Buy Area</span>
                                                </div>
                                                <p className="text-sm font-black dark:text-white">
                                                    {data.fiftyTwoWeekLow ? (isJK ? formatIDR(data.fiftyTwoWeekLow * 1.1) : `$${(data.fiftyTwoWeekLow * 1.1).toFixed(2)}`) : '-'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                                    <Target className="w-4 h-4" />
                                                    <span className="text-[9px] font-black uppercase">Take Profit</span>
                                                </div>
                                                <p className="text-sm font-black dark:text-white">
                                                    {valAnalysis ? (isJK ? formatIDR(valAnalysis.fairValue * 0.95) : `$${(valAnalysis.fairValue * 0.95).toFixed(2)}`) : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <span>Graham Number</span>
                                                <span className="text-gray-900 dark:text-gray-100">{valAnalysis ? (isJK ? formatIDR(valAnalysis.graham) : `$${valAnalysis.graham.toFixed(2)}`) : '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <span>Intrinsic Value</span>
                                                <span className="text-gray-900 dark:text-gray-100">{valAnalysis ? (isJK ? formatIDR(valAnalysis.intrinsic) : `$${valAnalysis.intrinsic.toFixed(2)}`) : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            </div>
                        </div>

                        {/* --- Fundamental Deep Dive Metrics --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 space-y-6">
                                <Section title="Fundamental Statistics" icon={<BarChart3 className="w-4 h-4" />} subtitle="Comprehensive Financial Metrics">
                                    <div className="space-y-8">
                                        {/* Group: Valuation */}
                                        <div>
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <div className="w-1 h-3 bg-blue-500 rounded-full" /> Valuasi Saham
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <MetricCard label="P/E Ratio" value={data.peRatio?.toFixed(2) || 'N/A'} subtext="Trailing 12M" />
                                                <MetricCard label="P/B Ratio" value={data.pbRatio?.toFixed(2) || 'N/A'} subtext="Price to Book" />
                                                <MetricCard label="Forward P/E" value={data.forwardPE?.toFixed(2) || 'N/A'} subtext="Projected" />
                                            </div>
                                        </div>

                                        {/* Group: Profitability */}
                                        <div>
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <div className="w-1 h-3 bg-emerald-500 rounded-full" /> Profitabilitas
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <MetricCard label="ROE" value={data.roe ? (data.roe * 100).toFixed(1) + '%' : 'N/A'} subtext="Return on Equity" trend={data.roe && data.roe > 0.15 ? 'up' : 'neutral'} />
                                                <MetricCard label="Profit Margin" value={data.profitMargin ? (data.profitMargin * 100).toFixed(1) + '%' : 'N/A'} subtext="Net Margin" />
                                                <MetricCard label="ROA" value={data.roa ? (data.roa * 100).toFixed(1) + '%' : 'N/A'} subtext="Return on Assets" />
                                            </div>
                                        </div>

                                        {/* Group: Health & Growth */}
                                        <div>
                                            <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <div className="w-1 h-3 bg-purple-500 rounded-full" /> Kesehatan & Pertumbuhan
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <MetricCard label="Current Ratio" value={data.currentRatio?.toFixed(2) || 'N/A'} subtext="Likuiditas" />
                                                <MetricCard label="Debt to Equity" value={data.debtToEquity?.toFixed(2) || 'N/A'} subtext="Leverage" trend={data.debtToEquity && data.debtToEquity > 1.5 ? 'down' : 'neutral'} />
                                                <MetricCard label="Revenue Growth" value={data.revenueGrowth ? (data.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'} subtext="YoY Growth" trend={(data.revenueGrowth || 0) > 0 ? 'up' : 'down'} />
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <Section title="Analyst Consensus" icon={<BarChart3 className="w-4 h-4" />} subtitle="Professional Sentiment">
                                    <div className="space-y-6">
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={[
                                                        { name: 'Strong Buy', value: data.strongBuy, color: '#10b981' },
                                                        { name: 'Buy', value: data.buy, color: '#34d399' },
                                                        { name: 'Hold', value: data.hold, color: '#94a3b8' },
                                                        { name: 'Sell', value: data.sell, color: '#f87171' },
                                                        { name: 'Strong Sell', value: data.strongSell, color: '#ef4444' },
                                                    ].filter(d => d.value > 0)}
                                                    layout="vertical"
                                                >
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }} />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                                                        {[
                                                            { name: 'Strong Buy', color: '#10b981' },
                                                            { name: 'Buy', color: '#34d399' },
                                                            { name: 'Hold', color: '#94a3b8' },
                                                            { name: 'Sell', color: '#f87171' },
                                                            { name: 'Strong Sell', color: '#ef4444' },
                                                        ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Analyst Target Price</p>
                                            <p className="text-2xl font-black text-white">{data.targetMeanPrice ? (isJK ? formatIDR(data.targetMeanPrice) : `$${data.targetMeanPrice.toFixed(2)}`) : 'N/A'}</p>
                                            {data.targetMeanPrice && data.currentPrice && (
                                                <p className={cn("text-[10px] font-black mt-2", data.targetMeanPrice > data.currentPrice ? "text-emerald-400" : "text-rose-400")}>
                                                    POTENSI UPSIDE: {(((data.targetMeanPrice - data.currentPrice) / data.currentPrice) * 100).toFixed(1)}%
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Section>

                                <Section title="Detailed Insights" icon={<CheckCircle className="w-4 h-4" />} subtitle="Critical Observations">
                                    <div className="space-y-3">
                                        {analysis.insights.map((insight, index) => (
                                            <div key={index} className={cn("p-4 rounded-2xl border flex items-start gap-3", insight.status === 'good' ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30" : insight.status === 'warning' ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30" : "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30")}>
                                                {insight.status === 'good' ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" /> : insight.status === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-500 mt-0.5" />}
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{insight.category}</p>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">{insight.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                                <div className="mt-8 flex items-center justify-center gap-2">
                                    <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            Data Terakhir Diperbarui: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Real-time'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
