"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { analyzeCandlesticks, AnalysisResult } from "@/lib/analysis-utils";
import { formatIDR, cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Target, Shield, Rocket, Activity, Brain, BarChart3, Repeat } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const StockChart = dynamic(() => import("@/components/StockChart"), {
    ssr: false,
    loading: () => (
        <div className="h-[480px] bg-gray-900/10 rounded-[2.5rem] flex items-center justify-center">
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4rem]">Initializing Graphics...</p>
        </div>
    )
});

export default function StockAnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = use(params);
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("3mo");
    const [selectedPredictionIndex, setSelectedPredictionIndex] = useState(0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            let ticker = searchQuery.trim().toUpperCase();
            if (!ticker.includes('.')) ticker += '.JK';
            router.push(`/analysis/${ticker}`);
            setSearchQuery("");
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/stocks/history?ticker=${ticker}&period=${period}&interval=1d`);
                const json = await res.json();

                if (json.success && json.data && json.data.length > 0) {
                    setData(json.data);
                    setAnalysis(analyzeCandlesticks(json.data));
                } else {
                    setData([]);
                    setAnalysis(null);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [ticker, period]);

    const activePrediction = analysis?.predictions[selectedPredictionIndex];

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#080a0f] text-gray-100">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 text-left">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">{ticker}</h1>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Multi-Model engine v7.0</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 max-w-xs">
                        <input
                            type="text"
                            placeholder="Ticker (e.g. TLKM)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                    </form>
                </div>

                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
                    {['1mo', '3mo', '6mo', '1y'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                                period === p ? "bg-gray-800 text-blue-500" : "text-gray-500 hover:text-white"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="h-[480px] bg-gray-900/30 rounded-[2.5rem] border border-gray-800/50 p-6 animate-pulse flex items-center justify-center">
                    <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.4rem]">Calculating Models...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="h-[480px] bg-gray-900/30 rounded-[2.5rem] border border-gray-100/10 p-6 flex items-center justify-center">
                    <p className="text-xs font-black uppercase text-gray-400 tracking-widest">No market data discovered for {ticker}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-700">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-[#0d1117] rounded-[2.5rem] border border-gray-800 shadow-2xl overflow-hidden relative group">
                            <StockChart
                                data={data}
                                markers={analysis?.markers || []}
                                prediction={activePrediction?.data || []}
                                buyPrice={analysis?.levels.dayTrade.buy}
                                maLines={analysis?.maLines}
                            />

                            <div className="absolute top-4 left-6 pointer-events-none flex items-center gap-3">
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] group-hover:text-blue-500/40 transition-colors">{activePrediction?.name || 'Neural Terminal'}</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-[#3498db]" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase">MA20</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-[#e84393]" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase">MA50</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {['scalping', 'dayTrade', 'swing'].map((type) => {
                                const level = (analysis?.levels as any)?.[type];
                                const icons: any = { scalping: <Zap />, dayTrade: <Target />, swing: <Rocket /> };
                                const colors: any = { scalping: 'text-yellow-500', dayTrade: 'text-blue-500', swing: 'text-purple-500' };
                                return (
                                    <div key={type} className="bg-gray-900/40 p-5 rounded-3xl border border-gray-800 flex flex-col items-center group hover:bg-gray-900/60 transition-all">
                                        <div className="flex items-center gap-2 mb-2 opacity-50 group-hover:opacity-100 uppercase text-[10px] font-black">
                                            <span className={colors[type]}>{icons[type]}</span>
                                            <span className="text-gray-400">{type.replace(/([A-Z])/g, ' $1')}</span>
                                        </div>
                                        <div className="text-base font-black text-white">{formatIDR(level?.buy || 0)}</div>
                                        <div className="text-[9px] font-bold text-green-500 mt-1 uppercase">TP: {formatIDR(level?.target || 0)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className={cn(
                            "p-6 rounded-[2.5rem] border overflow-hidden relative transition-all duration-700",
                            analysis?.recommendation.includes('BUY') ? "bg-green-500/5 border-green-500/20 shadow-lg shadow-green-500/10" :
                                analysis?.recommendation.includes('SELL') ? "bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/10" :
                                    "bg-gray-800/10 border-gray-800"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-left">Master Signal</h3>
                                <div className={cn(
                                    "p-2.5 rounded-xl",
                                    analysis?.recommendation.includes('BUY') ? "bg-green-500/20 text-green-500" :
                                        analysis?.recommendation.includes('SELL') ? "bg-red-500/20 text-red-500" :
                                            "bg-gray-800 text-gray-500"
                                )}>
                                    {analysis?.recommendation.includes('BUY') ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                </div>
                            </div>
                            <div className="space-y-1 text-left">
                                <div className={cn(
                                    "text-5xl font-black italic uppercase tracking-tighter transition-all duration-500",
                                    analysis?.recommendation.includes('STRONG_BUY') ? "text-green-400" :
                                        analysis?.recommendation.includes('BUY') ? "text-green-500" :
                                            analysis?.recommendation.includes('STRONG_SELL') ? "text-red-400" :
                                                analysis?.recommendation.includes('SELL') ? "text-red-500" :
                                                    "text-gray-500"
                                )}>
                                    {analysis?.recommendation.replace('_', ' ')}
                                </div>
                                <p className="text-xs font-bold text-gray-400 leading-relaxed mt-4 bg-white/[0.03] p-4 rounded-3xl border border-white/5 shadow-inner">
                                    {analysis?.advice}
                                </p>
                            </div>
                        </div>

                        {/* Forecast Selector */}
                        <div className="bg-[#0d1117] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-gray-600 mb-4 flex items-center gap-2 text-left">
                                <Activity className="w-4 h-4 text-emerald-500" /> Model Selection
                            </h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {analysis?.predictions.map((p, i) => (
                                    <button
                                        key={p.name}
                                        onClick={() => setSelectedPredictionIndex(i)}
                                        className={cn(
                                            "flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[90px]",
                                            selectedPredictionIndex === i ? "bg-blue-500/10 border-blue-500/40" : "bg-gray-900 border-gray-800 grayscale hover:grayscale-0"
                                        )}
                                    >
                                        <span className={cn("p-2 rounded-lg mb-2", selectedPredictionIndex === i ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400")}>
                                            {i === 0 ? <Brain className="w-4 h-4" /> : i === 1 ? <BarChart3 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                                        </span>
                                        <span className="text-[8px] font-black uppercase text-center">{p.name.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>

                            {activePrediction && (
                                <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-left animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-[10px] font-black text-blue-500 uppercase mb-1">{activePrediction.name}</h4>
                                    <p className="text-[9px] font-medium text-gray-500 leading-normal">{activePrediction.description}</p>
                                </div>
                            )}

                            <div className="space-y-2.5 pt-2">
                                {activePrediction?.data.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-gray-900/40 rounded-2xl border border-gray-800/50 group hover:border-blue-500/40 transition-all">
                                        <div className="flex flex-col text-left">
                                            <span className="text-[7px] font-black text-gray-600 uppercase tracking-tighter">{new Date(p.time * 1000).toLocaleDateString('id-ID', { weekday: 'long' })}</span>
                                            <span className="text-[9px] font-bold text-gray-400">{new Date(p.time * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                        <div className="text-base font-black text-blue-400 group-hover:scale-105 transition-transform tracking-tight">
                                            {formatIDR(p.value).replace('Rp', '')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
