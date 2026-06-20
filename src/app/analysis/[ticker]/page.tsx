"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { analyzeCandlesticks, AnalysisResult } from "@/lib/analysis-utils";
import { formatIDR, cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Target, Rocket, Activity, Brain, BarChart3, Repeat, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFundamentals } from "@/hooks/useFundamentals";

const StockChart = dynamic(() => import("@/components/StockChart"), {
    ssr: false,
    loading: () => (
        <div className="h-[480px] bg-muted rounded-[2.5rem] flex items-center justify-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4rem]">Initializing Graphics...</p>
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

    const { data: smartMoney, loading: smartMoneyLoading } = useFundamentals(ticker);

    // Auto redirect: /analysis/BBCA → /analysis/BBCA.JK
    useEffect(() => {
        if (ticker && !ticker.includes('.')) {
            router.replace(`/analysis/${ticker}.JK`);
        }
    }, [ticker]);

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

    const smStatus = smartMoney?.foreignAccumulationStatus || '';
    const smIsBuy = smStatus === 'Akumulasi';
    const smIsSell = smStatus === 'Distribusi';

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-background text-foreground">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 text-left">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{ticker}</h1>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Multi-Model engine v7.0</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 max-w-xs">
                        <input
                            type="text"
                            placeholder="Ticker (e.g. TLKM)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </form>
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                    {['1mo', '3mo', '6mo', '1y'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                                period === p ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="h-[480px] bg-muted rounded-[2.5rem] border border-border/50 p-6 animate-pulse flex items-center justify-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4rem]">Calculating Models...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="h-[480px] bg-muted rounded-[2.5rem] border border-border/10 p-6 flex items-center justify-center">
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No market data discovered for {ticker}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-700">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden relative group">
                            <StockChart
                                data={data}
                                markers={analysis?.markers || []}
                                prediction={activePrediction?.data || []}
                                buyPrice={analysis?.levels.dayTrade.buy}
                                maLines={analysis?.maLines}
                            />

                            <div className="absolute top-4 left-6 pointer-events-none flex items-center gap-3">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] group-hover:text-primary/40 transition-colors">{activePrediction?.name || 'Neural Terminal'}</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-[8px] font-black text-muted-foreground uppercase">MA20</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-destructive" />
                                        <span className="text-[8px] font-black text-muted-foreground uppercase">MA50</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {['scalping', 'dayTrade', 'swing'].map((type) => {
                                const level = (analysis?.levels as any)?.[type];
                                const icons: any = { scalping: <Zap />, dayTrade: <Target />, swing: <Rocket /> };
                                const colors: any = { scalping: 'text-warning', dayTrade: 'text-primary', swing: 'text-primary' };
                                return (
                                    <div key={type} className="bg-muted/40 p-5 rounded-3xl border border-border flex flex-col items-center group hover:bg-muted/60 transition-all">
                                        <div className="flex items-center gap-2 mb-2 opacity-50 group-hover:opacity-100 uppercase text-[10px] font-black">
                                            <span className={colors[type]}>{icons[type]}</span>
                                            <span className="text-muted-foreground">{type.replace(/([A-Z])/g, ' $1')}</span>
                                        </div>
                                        <div className="text-base font-black text-foreground">{formatIDR(level?.buy || 0)}</div>
                                        <div className="text-[9px] font-bold text-success mt-1 uppercase">TP: {formatIDR(level?.target || 0)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className={cn(
                            "p-6 rounded-[2.5rem] border overflow-hidden relative transition-all duration-700",
                            analysis?.recommendation.includes('BUY') ? "bg-success/5 border-success/20 shadow-lg shadow-success/10" :
                                analysis?.recommendation.includes('SELL') ? "bg-destructive/5 border-destructive/20 shadow-lg shadow-destructive/10" :
                                    "bg-muted/10 border-border"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-left">Master Signal</h3>
                                <div className={cn(
                                    "p-2.5 rounded-xl",
                                    analysis?.recommendation.includes('BUY') ? "bg-success/20 text-success" :
                                        analysis?.recommendation.includes('SELL') ? "bg-destructive/20 text-destructive" :
                                            "bg-muted text-muted-foreground"
                                )}>
                                    {analysis?.recommendation.includes('BUY') ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                </div>
                            </div>
                            <div className="space-y-1 text-left">
                                <div className={cn(
                                    "text-5xl font-black italic uppercase tracking-tighter transition-all duration-500",
                                    analysis?.recommendation.includes('STRONG_BUY') ? "text-success" :
                                        analysis?.recommendation.includes('BUY') ? "text-success" :
                                            analysis?.recommendation.includes('STRONG_SELL') ? "text-destructive" :
                                                analysis?.recommendation.includes('SELL') ? "text-destructive" :
                                                    "text-muted-foreground"
                                )}>
                                    {analysis?.recommendation.replace('_', ' ')}
                                </div>
                                <p className="text-xs font-bold text-muted-foreground leading-relaxed mt-4 bg-muted/5 p-4 rounded-3xl border border-border/5 shadow-inner">
                                    {analysis?.advice}
                                </p>
                            </div>
                        </div>

                        {/* Volume Flow Analysis */}
                        {analysis?.volume && (
                            <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-2xl space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-muted-foreground flex items-center gap-2 text-left">
                                    <BarChart3 className="w-4 h-4 text-primary" /> Volume Flow
                                </h3>

                                <div className={cn(
                                    "p-4 rounded-2xl border flex items-center gap-3",
                                    analysis.volume.signal === 'ACCUMULATION' ? "bg-success/10 border-success/20" :
                                    analysis.volume.signal === 'DISTRIBUTION' ? "bg-destructive/10 border-destructive/20" :
                                    "bg-muted/5 border-border/30"
                                )}>
                                    <div className={cn(
                                        "p-1.5 rounded-lg",
                                        analysis.volume.signal === 'ACCUMULATION' ? "bg-success/20" :
                                        analysis.volume.signal === 'DISTRIBUTION' ? "bg-destructive/20" : "bg-muted"
                                    )}>
                                        <TrendingUp className={cn(
                                            "w-4 h-4",
                                            analysis.volume.signal === 'ACCUMULATION' ? "text-success" :
                                            analysis.volume.signal === 'DISTRIBUTION' ? "text-destructive" : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <div>
                                        <p className={cn(
                                            "text-xs font-black uppercase tracking-wider",
                                            analysis.volume.signal === 'ACCUMULATION' ? "text-success" :
                                            analysis.volume.signal === 'DISTRIBUTION' ? "text-destructive" : "text-muted-foreground"
                                        )}>
                                            {analysis.volume.signal === 'ACCUMULATION' ? 'Strong Accumulation' :
                                             analysis.volume.signal === 'DISTRIBUTION' ? 'Distribution in Progress' : 'Neutral Flow'}
                                        </p>
                                        <p className="text-[9px] font-medium text-muted-foreground mt-0.5 leading-snug">
                                            Score: {analysis.volume.score > 0 ? '+' : ''}{analysis.volume.score} &middot;
                                            OBV: {analysis.volume.obvTrend === 'UP' ? 'Rising' : analysis.volume.obvTrend === 'DOWN' ? 'Falling' : 'Flat'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-2xl border border-border/50">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider mb-1">MFI</p>
                                        <p className={cn(
                                            "text-sm font-black",
                                            analysis.volume.mfioversold ? "text-success" :
                                            analysis.volume.mfioverbought ? "text-destructive" : "text-foreground"
                                        )}>
                                            {analysis.volume.mfi}
                                        </p>
                                        <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">
                                            {analysis.volume.mfioversold ? 'Oversold' : analysis.volume.mfioverbought ? 'Overbought' : 'Neutral'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-2xl border border-border/50">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider mb-1">Volume</p>
                                        <div className="flex items-center gap-1.5">
                                            {analysis.volume.volumeSurge ? (
                                                <Zap className={cn("w-3.5 h-3.5", analysis.volume.obvTrend === 'UP' ? "text-success" : "text-destructive")} />
                                            ) : (
                                                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <p className={cn(
                                                "text-sm font-black",
                                                analysis.volume.volumeSurge ? (
                                                    analysis.volume.obvTrend === 'UP' ? "text-success" : "text-destructive"
                                                ) : "text-foreground"
                                            )}>
                                                {analysis.volume.volumeSurge ? 'Surge' : 'Normal'}
                                            </p>
                                        </div>
                                        <p className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">+{analysis.volume.obvTrend === 'UP' ? 'Bullish' : analysis.volume.obvTrend === 'DOWN' ? 'Bearish' : 'Flat'} OBV</p>
                                    </div>
                                </div>

                                {analysis.volume.keySupport > 0 && analysis.volume.keyResistance > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-success/5 rounded-2xl border border-success/20">
                                            <p className="text-[8px] font-black text-success uppercase tracking-wider mb-1">Key Support</p>
                                            <p className="text-sm font-black text-success">
                                                {formatIDR(analysis.volume.keySupport)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-destructive/5 rounded-2xl border border-destructive/20">
                                            <p className="text-[8px] font-black text-destructive uppercase tracking-wider mb-1">Key Resistance</p>
                                            <p className="text-sm font-black text-destructive">
                                                {formatIDR(analysis.volume.keyResistance)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider justify-center">
                                    <span>Chaikin A/D</span>
                                    <div className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black",
                                        analysis.volume.score > 0 ? "bg-success/10 text-success" :
                                        analysis.volume.score < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                                    )}>
                                        {analysis.volume.score > 0 ? 'Bullish' : analysis.volume.score < 0 ? 'Bearish' : 'Flat'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Smart Money Flow — real data from IDX */}
                        {smartMoney && (smartMoney.dataSource === 'yahoo_institutions' || smartMoney.dataSource === 'idx' || smartMoney.dataSource === 'firecrawl') && (
                            <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-2xl space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-muted-foreground flex items-center gap-2 text-left">
                                    <Users className="w-4 h-4 text-warning" /> Smart Money Flow
                                </h3>

                                <div className={cn(
                                    "p-4 rounded-2xl border flex items-center gap-3",
                                    smIsBuy ? "bg-success/10 border-success/20" :
                                    smIsSell ? "bg-destructive/10 border-destructive/20" :
                                    "bg-muted/5 border-border/30"
                                )}>
                                    <div className={cn(
                                        "p-1.5 rounded-lg",
                                        smIsBuy ? "bg-success/20" : smIsSell ? "bg-destructive/20" : "bg-muted"
                                    )}>
                                        <TrendingUp className={cn(
                                            "w-4 h-4",
                                            smIsBuy ? "text-success" : smIsSell ? "text-destructive" : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <div>
                                        <p className={cn(
                                            "text-xs font-black uppercase tracking-wider",
                                            smIsBuy ? "text-success" : smIsSell ? "text-destructive" : "text-muted-foreground"
                                        )}>
                                            {smartMoney.smartMoneyPhase || 'Neutral'}
                                        </p>
                                        <p className="text-[9px] font-medium text-muted-foreground mt-0.5 leading-snug">
                                            {smartMoney.smartMoneyDescription}
                                        </p>
                                    </div>
                                </div>

                                {/* Foreign Flow */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-success/5 rounded-2xl border border-success/20">
                                        <p className="text-[8px] font-black text-success uppercase tracking-wider mb-1">Foreign Buy</p>
                                        <p className="text-sm font-black text-success">
                                            Rp{(smartMoney.foreignBuyValue / 1e9).toFixed(1)}M
                                        </p>
                                    </div>
                                    <div className="p-3 bg-destructive/5 rounded-2xl border border-destructive/20">
                                        <p className="text-[8px] font-black text-destructive uppercase tracking-wider mb-1">Foreign Sell</p>
                                        <p className="text-sm font-black text-destructive">
                                            Rp{(smartMoney.foreignSellValue / 1e9).toFixed(1)}M
                                        </p>
                                    </div>
                                </div>

                                {/* Top Brokers */}
                                {smartMoney.topBuyBrokers?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-2">Top Net Buy Brokers</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {smartMoney.topBuyBrokers.slice(0, 5).map((b: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-success/10 border border-success/20 rounded text-[9px] font-bold text-success">{b}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {smartMoney.topSellBrokers?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-2">Top Net Sell Brokers</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {smartMoney.topSellBrokers.slice(0, 5).map((b: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-destructive/10 border border-destructive/20 rounded text-[9px] font-bold text-destructive">{b}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider justify-center">
                                    <Building2 className="w-3 h-3" />
                                    <span>Data dari Yahoo Finance</span>
                                </div>
                            </div>
                        )}

                        {/* Forecast Selector */}
                        <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-2xl space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-muted-foreground mb-4 flex items-center gap-2 text-left">
                                <Activity className="w-4 h-4 text-success" /> Model Selection
                            </h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {analysis?.predictions.map((p, i) => (
                                    <button
                                        key={p.name}
                                        onClick={() => setSelectedPredictionIndex(i)}
                                        className={cn(
                                            "flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[90px]",
                                            selectedPredictionIndex === i ? "bg-primary/10 border-primary/40" : "bg-muted border-border grayscale hover:grayscale-0"
                                        )}
                                    >
                                        <span className={cn("p-2 rounded-lg mb-2", selectedPredictionIndex === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            {i === 0 ? <Brain className="w-4 h-4" /> : i === 1 ? <BarChart3 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                                        </span>
                                        <span className="text-[8px] font-black uppercase text-center">{p.name.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>

                            {activePrediction && (
                                <div className="p-4 bg-muted/5 rounded-2xl border border-border/5 text-left animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-[10px] font-black text-primary uppercase mb-1">{activePrediction.name}</h4>
                                    <p className="text-[9px] font-medium text-muted-foreground leading-normal">{activePrediction.description}</p>
                                </div>
                            )}

                            <div className="space-y-2.5 pt-2">
                                {activePrediction?.data.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-muted/40 rounded-2xl border border-border/50 group hover:border-primary/40 transition-all">
                                        <div className="flex flex-col text-left">
                                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">{new Date(p.time * 1000).toLocaleDateString('id-ID', { weekday: 'long' })}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground">{new Date(p.time * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                        <div className="text-base font-black text-primary group-hover:scale-105 transition-transform tracking-tight">
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
