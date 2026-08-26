"use client";

import { useEffect, useState, use, useMemo } from "react";
import dynamic from "next/dynamic";
import { analyzeCandlesticks, AnalysisResult } from "@/lib/analysis-utils";
import { detectChartDrawings, detectChartMarkers } from "@/lib/patternDetection";
import { formatIDR, cn, formatCompactIDR } from "@/lib/utils";
import { ArrowLeft, Search, Loader2, ShieldCheck, Building2, Users, Briefcase, TrendingUp, TrendingDown, Share2, Link2, Star, Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFundamentals } from "@/hooks/useFundamentals";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AlertsPopover } from "@/components/AlertsPopover";
import { useCompanyDetail, useFinancialStatement } from "@/hooks/useIdxExtended";
import TechnicalSignals from "@/components/TechnicalSignals";
import StockStatistics from "@/components/StockStatistics";
import FundamentalSummary from "@/components/FundamentalSummary";
import NewsPanel from "@/components/NewsPanel";
import FinancialReports from "@/components/FinancialReports";
import ShareholderChart from "@/components/ShareholderChart";
import ChartPatterns from "@/components/ChartPatterns";
import OrderBookPanel from "@/components/OrderBookPanel";
import RiskMetricsCard from "@/components/RiskMetricsCard";
import SeasonalityHeatmap from "@/components/SeasonalityHeatmap";
import FairValueCard from "@/components/FairValueCard";

const StockChart = dynamic(() => import("@/components/StockChart"), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
    ),
});

type Tab = "overview" | "chart" | "summary" | "financial" | "company" | "news" | "ownership" | "technical";

const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "chart", label: "Chart" },
    { key: "summary", label: "Summary" },
    { key: "financial", label: "Financials" },
    { key: "company", label: "Company" },
    { key: "news", label: "News" },
    { key: "ownership", label: "Ownership" },
    { key: "technical", label: "Technical" },
];

export default function StockAnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = use(params);
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("1y");
    const [activeTab, setActiveTab] = useState<Tab>("chart");

    const { data: smartMoney } = useFundamentals(ticker);
    const companyCode = ticker.replace('.JK', '');
    const { data: companyDetail } = useCompanyDetail(companyCode);
    const { data: idxFinancial } = useFinancialStatement(companyCode);

    useEffect(() => {
        if (!ticker) return;
        setLoading(true);
        fetch(`/api/stocks/history?ticker=${ticker}&period=${period}&interval=1d`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success && json.data?.length > 0) {
                    setData(json.data);
                    setAnalysis(analyzeCandlesticks(json.data));
                } else {
                    setData([]);
                    setAnalysis(null);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [ticker, period]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            let t = searchQuery.trim().toUpperCase();
            if (!t.includes(".")) t += ".JK";
            router.push(`/analysis/${t}`);
            setSearchQuery("");
        }
    };

    // Share handler — Web Share API atau clipboard fallback
    const [copied, setCopied] = useState(false);
    const handleShare = async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        const text = `Analisis ${ticker.replace(".JK", "")} — Porto`;
        if (navigator.share) {
            try { await navigator.share({ title: text, text, url }); } catch {}
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Watchlist
    const watchlist = useWatchlist();
    const isWatched = watchlist.has(ticker);

    const lastCandle = data.length > 0 ? data[data.length - 1] : null;
    const currentPrice = smartMoney?.currentPrice ?? lastCandle?.close ?? 0;
    const changePercent = smartMoney?.priceChangePercent ?? 0;
    const isUp = changePercent >= 0;

    // Deteksi pola chart untuk digambar langsung di chart (pakai data period terpilih, default 1 tahun)
    const chartDrawings = useMemo(() => detectChartDrawings(data), [data]);
    const chartMarkers = useMemo(() => detectChartMarkers(data), [data]);

    const periodMap: Record<string, string> = {
        "1D": "1d", "1W": "5d", "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y", "5Y": "5y",
    };

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">Market</Link>
                <span>/</span>
                <span className="text-foreground font-medium">{ticker.replace(".JK", "")}</span>
            </nav>

            {/* Metadata untuk SEO & share (React 19) */}
            <title>{ticker.replace(".JK", "")} — Analisis Saham | Porto</title>
            <meta name="description" content={`Analisis lengkap ${ticker.replace(".JK", "")}: grafik harga, pola chart, laporan keuangan, broker summary, dan proyeksi AI. IDX Indonesia.`} />
            <meta property="og:title" content={`${ticker.replace(".JK", "")} — Analisis Saham | Porto`} />
            <meta property="og:description" content={`Grafik live, pola teknikal, keuangan, dan proyeksi AI untuk ${ticker.replace(".JK", "")}.`} />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={`${ticker.replace(".JK", "")} — Analisis Saham | Porto`} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-foreground">{ticker.replace(".JK", "")}</h1>
                        {smartMoney?.sharia && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded">
                                <ShieldCheck className="w-3 h-3" /> Syariah
                            </span>
                        )}
                        <button
                            onClick={handleShare}
                            className="ml-1 p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
                            title="Bagikan link analisis"
                        >
                            {copied ? <Link2 className="w-3.5 h-3.5 text-success" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={() => watchlist.toggle(ticker)}
                            className={cn(
                                "p-1.5 rounded-lg border bg-card transition-colors cursor-pointer",
                                isWatched
                                    ? "border-amber-500/50 text-amber-500 bg-amber-500/5"
                                    : "border-border text-muted-foreground hover:text-foreground hover:border-amber-500/40"
                            )}
                            title={isWatched ? "Hapus dari watchlist" : "Tambah ke watchlist"}
                        >
                            <Star className={cn("w-3.5 h-3.5", isWatched && "fill-amber-500")} />
                        </button>
                        <AlertsPopover ticker={ticker} currentPrice={currentPrice} />
                    </div>
                    {smartMoney?.sector && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>{smartMoney.sector}</span>
                            {smartMoney?.industry && <><span>·</span><span>{smartMoney.industry}</span></>}
                        </div>
                    )}
                    {currentPrice > 0 && (
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-foreground tabular-nums">Rp {currentPrice.toLocaleString("id-ID")}</span>
                            <span className={cn("text-lg font-bold", isUp ? "text-success" : "text-destructive")}>
                                {isUp ? "+" : ""}{(changePercent * 100).toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>
                {lastCandle && (
                    <div className="flex gap-6 text-xs">
                        <div><p className="text-muted-foreground mb-0.5">Open</p><p className="font-bold text-foreground tabular-nums">{(lastCandle.open || 0).toLocaleString("id-ID")}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">High</p><p className="font-bold text-success tabular-nums">{(lastCandle.high || 0).toLocaleString("id-ID")}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">Low</p><p className="font-bold text-destructive tabular-nums">{(lastCandle.low || 0).toLocaleString("id-ID")}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">Volume</p><p className="font-bold text-foreground tabular-nums">{formatCompactIDR(lastCandle.volume || 0).replace("Rp", "")}</p></div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex gap-1 overflow-x-auto">
                    {["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(periodMap[p] || "3mo")}
                            className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap",
                                period === (periodMap[p] || "3mo")
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {lastCandle && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>O <b className="text-foreground">{lastCandle.open?.toLocaleString("id-ID")}</b></span>
                        <span>H <b className="text-foreground">{lastCandle.high?.toLocaleString("id-ID")}</b></span>
                        <span>L <b className="text-foreground">{lastCandle.low?.toLocaleString("id-ID")}</b></span>
                        <span>C <b className="text-foreground">{lastCandle.close?.toLocaleString("id-ID")}</b></span>
                        {analysis && analysis.indicators.ma20 > 0 && <span>MA20 <b className="text-chart-3">{analysis.indicators.ma20.toLocaleString("id-ID")}</b></span>}
                        {analysis && analysis.indicators.ma50 > 0 && <span>MA50 <b className="text-chart-1">{analysis.indicators.ma50.toLocaleString("id-ID")}</b></span>}
                        <span className="ml-auto">Vol <b className="text-foreground">{formatCompactIDR(lastCandle.volume || 0).replace("Rp", "")}</b></span>
                    </div>
                )}

                {/* Legend pola chart */}
                {chartDrawings.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
                        {[
                            ["sr-zone", "RANGE", "#6366f1"],
                            ["support", "SUPPORT", "#0eaa68"],
                            ["resistance", "RESISTANCE", "#df4b61"],
                            ["trendline-up", "UPTREND", "#14b8a6"],
                            ["trendline-down", "DOWNTREND", "#eaa82e"],
                            ["neckline", "NECKLINE", "#a967ff"],
                            ["target", "TARGET", "#10b981"],
                        ]
                            .filter(([k]) => chartDrawings.some(d => d.id.startsWith(k)))
                            .map(([k, label, color]) => (
                                <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                                    {label}
                                </span>
                            ))}
                    </div>
                )}

                <div className="card p-0 overflow-hidden">
                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                            Tidak ada data harga
                        </div>
                    ) : (
                        <StockChart
                            data={data}
                            markers={analysis?.markers || []}
                            prediction={[]}
                            buyPrice={analysis?.levels.dayTrade.buy}
                            maLines={analysis?.maLines}
                            drawings={chartDrawings}
                            patternMarkers={chartMarkers}
                        />
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-0 overflow-x-auto scrollbar-hide">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors",
                                    activeTab === tab.key
                                        ? "border-foreground text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overview tab */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        {smartMoney && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Market Cap", value: smartMoney.marketCap ? `Rp ${formatCompactIDR(smartMoney.marketCap)}` : "-" },
                                    { label: "PER (TTM)", value: smartMoney.peRatio ? `${smartMoney.peRatio.toFixed(1)}x` : "-" },
                                    { label: "PBV", value: smartMoney.pbRatio ? `${smartMoney.pbRatio.toFixed(1)}x` : "-" },
                                    { label: "ROE (TTM)", value: smartMoney.roe ? `${smartMoney.roe.toFixed(1)}%` : "-" },
                                    { label: "EPS (TTM)", value: smartMoney.trailingEps ? `Rp ${smartMoney.trailingEps.toLocaleString("id-ID")}` : "-" },
                                    { label: "Dividend Yield", value: smartMoney.dividendYield ? `${smartMoney.dividendYield.toFixed(1)}%` : "-" },
                                    { label: "52W High", value: smartMoney.fiftyTwoWeekHigh ? `Rp ${smartMoney.fiftyTwoWeekHigh.toLocaleString("id-ID")}` : "-" },
                                    { label: "52W Low", value: smartMoney.fiftyTwoWeekLow ? `Rp ${smartMoney.fiftyTwoWeekLow.toLocaleString("id-ID")}` : "-" },
                                ].map(m => (
                                    <div key={m.label} className="bg-card border border-border rounded-lg p-3">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{m.label}</p>
                                        <p className="text-sm font-bold text-foreground tabular-nums">{m.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* About */}
                        {smartMoney && (
                            <div className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="card-title">About {ticker.replace(".JK", "")}</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {smartMoney.sector && <div><span className="text-muted-foreground">Sector: </span><span className="font-medium text-foreground">{smartMoney.sector}</span></div>}
                                    {smartMoney.industry && <div><span className="text-muted-foreground">Industry: </span><span className="font-medium text-foreground">{smartMoney.industry}</span></div>}
                                </div>
                            </div>
                        )}

                        {/* Risiko vs IHSG */}
                        <RiskMetricsCard ticker={ticker} />

                        {/* Chart preview */}
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <h3 className="card-title">Price Chart</h3>
                            </div>
                            {loading ? (
                                <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                            ) : data.length > 0 ? (
                                <StockChart data={data} markers={analysis?.markers || []} prediction={[]} buyPrice={analysis?.levels.dayTrade.buy} maLines={analysis?.maLines} drawings={chartDrawings} />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Tidak ada data harga</div>
                            )}
                        </div>

                        {/* Financial summary */}
                        {smartMoney && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Valuation</h3>
                                    <div className="space-y-2">
                                        {smartMoney.peRatio && <div className="flex justify-between text-xs"><span className="text-muted-foreground">P/E Ratio</span><span className="font-bold text-foreground">{smartMoney.peRatio.toFixed(1)}x</span></div>}
                                        {smartMoney.pbRatio && <div className="flex justify-between text-xs"><span className="text-muted-foreground">P/B Ratio</span><span className="font-bold text-foreground">{smartMoney.pbRatio.toFixed(1)}x</span></div>}
                                        {smartMoney.psRatio && <div className="flex justify-between text-xs"><span className="text-muted-foreground">P/S Ratio</span><span className="font-bold text-foreground">{smartMoney.psRatio.toFixed(1)}x</span></div>}
                                    </div>
                                </div>
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Profitability</h3>
                                    <div className="space-y-2">
                                        {smartMoney.roe && <div className="flex justify-between text-xs"><span className="text-muted-foreground">ROE</span><span className="font-bold text-foreground">{smartMoney.roe.toFixed(1)}%</span></div>}
                                        {smartMoney.roa && <div className="flex justify-between text-xs"><span className="text-muted-foreground">ROA</span><span className="font-bold text-foreground">{smartMoney.roa.toFixed(1)}%</span></div>}
                                        {smartMoney.profitMargin && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Net Margin</span><span className="font-bold text-foreground">{smartMoney.profitMargin.toFixed(1)}%</span></div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pola musiman bulanan */}
                        <SeasonalityHeatmap ticker={ticker} />
                    </div>
                )}

                {activeTab === "chart" && (
                    <div className="space-y-4">
                        {analysis && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "RSI (14)", value: analysis.indicators.rsi.toFixed(1), color: analysis.indicators.rsi > 70 ? "text-danger" : analysis.indicators.rsi < 30 ? "text-success" : "" },
                                    { label: "MACD", value: analysis.indicators.macd.histogram.toFixed(2), color: analysis.indicators.macd.histogram > 0 ? "text-success" : "text-danger" },
                                    { label: "Signal", value: analysis.recommendation.replace("_", " "), color: analysis.recommendation.includes("BUY") ? "text-success" : analysis.recommendation.includes("SELL") ? "text-danger" : "text-warning" },
                                    { label: "Trend", value: analysis.indicators.trend, color: analysis.indicators.trend === "UP" ? "text-success" : analysis.indicators.trend === "DOWN" ? "text-danger" : "text-muted-foreground" },
                                ].map((item) => (
                                    <div key={item.label} className="card text-center py-3">
                                        <p className="text-[10px] text-muted-foreground uppercase mb-1">{item.label}</p>
                                        <p className={cn("text-sm font-bold uppercase", item.color)}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="card">
                            <h3 className="text-sm font-semibold mb-3">Sinyal Teknikal</h3>
                            <TechnicalSignals analysis={analysis} />
                        </div>

                        <div className="card">
                            <h3 className="text-sm font-semibold mb-3">Pola Chart</h3>
                            <ChartPatterns data={data} />
                        </div>
                    </div>
                )}

                {activeTab === "summary" && (
                    <div className="space-y-4">
                        {smartMoney && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-3">Statistik</h3>
                                <StockStatistics data={smartMoney} />
                            </div>
                        )}

                        {smartMoney && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-3">Fundamental</h3>
                                <FundamentalSummary data={smartMoney} />
                            </div>
                        )}

                        {/* Estimasi fair value (Graham Number) */}
                        <FairValueCard
                            price={smartMoney?.currentPrice ?? null}
                            eps={smartMoney?.trailingEps ?? null}
                            bvps={smartMoney?.bookValue ?? null}
                        />

                        {/* Broker Summary per Ticker */}
                        {smartMoney && ((smartMoney as any).topBuyBrokers?.length > 0 || (smartMoney as any).topSellBrokers?.length > 0) && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-3">Broker Summary ({ticker.replace('.JK', '')})</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-success" />
                                            <span className="text-[10px] font-black text-success uppercase tracking-wider">Top Net Buy</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {(smartMoney as any).topBuyBrokers?.slice(0, 8).map((b: string, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                        <span className="text-xs font-semibold text-foreground truncate">{b}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-success flex-shrink-0">BUY</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="w-4 h-4 text-destructive" />
                                            <span className="text-[10px] font-black text-destructive uppercase tracking-wider">Top Net Sell</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {(smartMoney as any).topSellBrokers?.slice(0, 8).map((b: string, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                        <span className="text-xs font-semibold text-foreground truncate">{b}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-destructive flex-shrink-0">SELL</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysis && analysis.volume.keySupport > 0 && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-3">Support & Resistance</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-success font-bold">Support</span>
                                        <span className="font-mono">{formatIDR(analysis.volume.keySupport)}</span>
                                    </div>
                                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 bg-success/30 rounded-full" style={{ width: "45%" }} />
                                        <div className="absolute inset-y-0 right-0 bg-danger/30 rounded-full" style={{ width: "55%" }} />
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-danger font-bold">Resistance</span>
                                        <span className="font-mono">{formatIDR(analysis.volume.keyResistance)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysis && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-3">Analisis Volume</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center py-2 bg-muted/50 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground">Signal</p>
                                        <p className={cn("text-sm font-bold",
                                            analysis.volume.signal === "ACCUMULATION" ? "text-success" :
                                            analysis.volume.signal === "DISTRIBUTION" ? "text-danger" : "text-muted-foreground"
                                        )}>{analysis.volume.signal}</p>
                                    </div>
                                    <div className="text-center py-2 bg-muted/50 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground">MFI</p>
                                        <p className={cn("text-sm font-bold",
                                            analysis.volume.mfi > 70 ? "text-danger" :
                                            analysis.volume.mfi < 30 ? "text-success" : ""
                                        )}>{analysis.volume.mfi}</p>
                                    </div>
                                    <div className="text-center py-2 bg-muted/50 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground">OBV Trend</p>
                                        <p className="text-sm font-bold">{analysis.volume.obvTrend}</p>
                                    </div>
                                    <div className="text-center py-2 bg-muted/50 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground">Volume Surge</p>
                                        <p className={cn("text-sm font-bold", analysis.volume.volumeSurge ? "text-warning" : "")}>
                                            {analysis.volume.volumeSurge ? "Ya" : "Tidak"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysis && (
                            <div className="card">
                                <h3 className="text-sm font-semibold mb-2">Rekomendasi</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.advice}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "financial" && <FinancialReports data={smartMoney} idxData={idxFinancial} code={companyCode} />}

                {activeTab === "company" && (
                    <div className="space-y-4">
                        {/* Order Book */}
                        <OrderBookPanel code={companyCode} />

                        {/* Company Profile */}
                        {companyDetail && (
                            <>
                                <div className="card">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Profil Perusahaan
                                    </h3>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Nama</span>
                                            <span className="font-bold text-right">{companyDetail.profile?.name || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sektor</span>
                                            <span className="font-bold">{companyDetail.profile?.sector || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sub Sektor</span>
                                            <span className="font-bold">{companyDetail.profile?.subSector || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Industri</span>
                                            <span className="font-bold">{companyDetail.profile?.industry || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Papan</span>
                                            <span className="font-bold">{companyDetail.profile?.board || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Listing Date</span>
                                            <span className="font-bold">{companyDetail.profile?.listingDate || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Website</span>
                                            <a href={companyDetail.profile?.website} target="_blank" rel="noopener" className="font-bold text-primary hover:underline">{companyDetail.profile?.website || '-'}</a>
                                        </div>
                                    </div>
                                </div>

                                {/* Directors */}
                                {companyDetail.directors && companyDetail.directors.length > 0 && (
                                    <div className="card">
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Direksi
                                        </h3>
                                        <div className="space-y-2">
                                            {companyDetail.directors.map((d: any, i: number) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="font-medium">{d.name}</span>
                                                    <span className="text-muted-foreground">{d.position}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Commissioners */}
                                {companyDetail.commissioners && companyDetail.commissioners.length > 0 && (
                                    <div className="card">
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Komisaris
                                        </h3>
                                        <div className="space-y-2">
                                            {companyDetail.commissioners.map((c: any, i: number) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="font-medium">{c.name}</span>
                                                    <span className="text-muted-foreground">{c.position}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shareholders */}
                                {companyDetail.shareholders && companyDetail.shareholders.length > 0 && (
                                    <div className="card">
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            Pemegang Saham Utama
                                        </h3>
                                        <div className="space-y-2">
                                            {companyDetail.shareholders.map((s: any, i: number) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="font-medium">{s.name}</span>
                                                    <span className="font-bold">{s.percentage?.toFixed(2)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Subsidiaries */}
                                {companyDetail.subsidiaries && companyDetail.subsidiaries.length > 0 && (
                                    <div className="card">
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            Anak Perusahaan
                                        </h3>
                                        <div className="space-y-2">
                                            {companyDetail.subsidiaries.slice(0, 10).map((s: any, i: number) => (
                                                <div key={i} className="text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium">{s.name}</span>
                                                        <span className="text-muted-foreground">{s.percentage?.toFixed(1)}%</span>
                                                    </div>
                                                    <p className="text-muted-foreground text-[10px]">{s.type} · {s.location}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {!companyDetail && (
                            <div className="card p-8 text-center">
                                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">Memuat data perusahaan...</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "news" && (
                    <div className="card"><NewsPanel symbol={ticker} /></div>
                )}

                {activeTab === "ownership" && (
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Ownership Structure</h3>
                        <ShareholderChart
                            insidersPercent={(smartMoney as any)?.insidersPercentHeld}
                            institutionsPercent={(smartMoney as any)?.institutionsPercentHeld}
                            institutionsCount={(smartMoney as any)?.institutionsCount}
                            sharia={smartMoney?.sharia}
                        />
                    </div>
                )}

                {activeTab === "technical" && (
                    <div className="space-y-4">
                        {analysis && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "RSI (14)", value: analysis.indicators.rsi.toFixed(1), color: analysis.indicators.rsi > 70 ? "text-destructive" : analysis.indicators.rsi < 30 ? "text-success" : "" },
                                    { label: "MACD", value: analysis.indicators.macd.histogram.toFixed(2), color: analysis.indicators.macd.histogram > 0 ? "text-success" : "text-destructive" },
                                    { label: "Signal", value: analysis.recommendation.replace("_", " "), color: analysis.recommendation.includes("BUY") ? "text-success" : analysis.recommendation.includes("SELL") ? "text-destructive" : "text-warning" },
                                    { label: "Trend", value: analysis.indicators.trend, color: analysis.indicators.trend === "UP" ? "text-success" : analysis.indicators.trend === "DOWN" ? "text-destructive" : "text-muted-foreground" },
                                ].map(item => (
                                    <div key={item.label} className="bg-card border border-border rounded-lg p-3 text-center">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
                                        <p className={cn("text-sm font-bold uppercase", item.color)}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-card border border-border rounded-lg p-4">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Technical Signals</h3>
                            <TechnicalSignals analysis={analysis} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
