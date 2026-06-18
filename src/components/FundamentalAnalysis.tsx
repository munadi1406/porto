"use client";

import { useState } from "react";
import { Building2, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, AlertCircle, CheckCircle, XCircle, Loader2, Activity, Users, Zap } from "lucide-react";
import { cn, formatIDR, formatCompactIDR } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";
import { useFundamentals } from "@/hooks/useFundamentals";

interface FundamentalAnalysisProps {
    portfolio: PortfolioItem[];
}

// Fungsi untuk analisa fundamental
const analyzeFundamentals = (data: any) => {
    let score = 0;
    const insights: Array<{ category: string; status: "good" | "warning" | "bad"; message: string }> = [];

    // 1. Valuasi (Rasio P/E)
    if (data.peRatio !== null) {
        if (data.peRatio < 15) {
            score += 20;
            insights.push({ category: "Valuasi", status: "good", message: `Rasio P/E ${data.peRatio.toFixed(1)} - Valuasi menarik, saham terlihat murah (undervalued)` });
        } else if (data.peRatio < 25) {
            score += 10;
            insights.push({ category: "Valuasi", status: "warning", message: `Rasio P/E ${data.peRatio.toFixed(1)} - Valuasi wajar, harga cukup masuk akal` });
        } else {
            insights.push({ category: "Valuasi", status: "bad", message: `Rasio P/E ${data.peRatio.toFixed(1)} - Valuasi tinggi, saham mungkin kemahalan (overvalued)` });
        }
    }

    // 2. Profitabilitas (ROE)
    if (data.roe !== null) {
        const roePercent = data.roe * 100;
        if (roePercent > 15) {
            score += 20;
            insights.push({ category: "Profitabilitas", status: "good", message: `ROE ${roePercent.toFixed(1)}% - Sangat profitable, manajemen efektif menggunakan modal` });
        } else if (roePercent > 10) {
            score += 10;
            insights.push({ category: "Profitabilitas", status: "warning", message: `ROE ${roePercent.toFixed(1)}% - Profitabilitas cukup baik` });
        } else {
            insights.push({ category: "Profitabilitas", status: "bad", message: `ROE ${roePercent.toFixed(1)}% - Profitabilitas rendah, perlu perhatian` });
        }
    }

    // 3. Margin Laba
    if (data.profitMargin !== null) {
        const marginPercent = data.profitMargin * 100;
        if (marginPercent > 15) {
            score += 15;
            insights.push({ category: "Margin", status: "good", message: `Margin Laba ${marginPercent.toFixed(1)}% - Margin sangat sehat, bisnis efisien` });
        } else if (marginPercent > 5) {
            score += 8;
            insights.push({ category: "Margin", status: "warning", message: `Margin Laba ${marginPercent.toFixed(1)}% - Margin cukup baik` });
        } else {
            insights.push({ category: "Margin", status: "bad", message: `Margin Laba ${marginPercent.toFixed(1)}% - Margin tipis, kompetisi ketat` });
        }
    }

    // 4. Kesehatan Keuangan (Rasio Lancar)
    if (data.currentRatio !== null) {
        if (data.currentRatio > 2) {
            score += 15;
            insights.push({ category: "Likuiditas", status: "good", message: `Rasio Lancar ${data.currentRatio.toFixed(2)} - Likuiditas sangat baik, mampu bayar hutang jangka pendek` });
        } else if (data.currentRatio > 1) {
            score += 8;
            insights.push({ category: "Likuiditas", status: "warning", message: `Rasio Lancar ${data.currentRatio.toFixed(2)} - Likuiditas cukup` });
        } else {
            insights.push({ category: "Likuiditas", status: "bad", message: `Rasio Lancar ${data.currentRatio.toFixed(2)} - Likuiditas rendah, risiko kesulitan bayar hutang` });
        }
    }

    // 5. Debt to Equity
    if (data.debtToEquity !== null) {
        if (data.debtToEquity < 0.5) {
            score += 15;
            insights.push({ category: "Leverage", status: "good", message: `Debt/Equity ${data.debtToEquity.toFixed(2)} - Hutang rendah, struktur modal konservatif` });
        } else if (data.debtToEquity < 1.5) {
            score += 8;
            insights.push({ category: "Leverage", status: "warning", message: `Debt/Equity ${data.debtToEquity.toFixed(2)} - Hutang moderat` });
        } else {
            insights.push({ category: "Leverage", status: "bad", message: `Debt/Equity ${data.debtToEquity.toFixed(2)} - Hutang tinggi, risiko finansial meningkat` });
        }
    }

    // 6. Pertumbuhan
    if (data.revenueGrowth !== null) {
        const growthPercent = data.revenueGrowth * 100;
        if (growthPercent > 10) {
            score += 15;
            insights.push({ category: "Pertumbuhan", status: "good", message: `Pertumbuhan Pendapatan ${growthPercent.toFixed(1)}% - Pertumbuhan kuat, bisnis ekspansif` });
        } else if (growthPercent > 0) {
            score += 8;
            insights.push({ category: "Pertumbuhan", status: "warning", message: `Pertumbuhan Pendapatan ${growthPercent.toFixed(1)}% - Pertumbuhan positif tapi lambat` });
        } else {
            insights.push({ category: "Pertumbuhan", status: "bad", message: `Pertumbuhan Pendapatan ${growthPercent.toFixed(1)}% - Pendapatan menurun, perlu waspada` });
        }
    }

    // Rating keseluruhan
    let rating: "Sangat Baik" | "Baik" | "Cukup" | "Kurang" | "Buruk";
    let ratingColor: string;

    if (score >= 80) {
        rating = "Sangat Baik";
        ratingColor = "text-success";
    } else if (score >= 60) {
        rating = "Baik";
        ratingColor = "text-primary";
    } else if (score >= 40) {
        rating = "Cukup";
        ratingColor = "text-warning";
    } else if (score >= 20) {
        rating = "Kurang";
        ratingColor = "text-warning";
    } else {
        rating = "Buruk";
        ratingColor = "text-destructive";
    }

    return { score, insights, rating, ratingColor };
};

export function FundamentalAnalysis({ portfolio }: FundamentalAnalysisProps) {
    const [selectedStock, setSelectedStock] = useState<string>(portfolio[0]?.ticker || "");
    const { data, loading, error } = useFundamentals(selectedStock);

    const analysis = data ? analyzeFundamentals(data) : null;

    return (
        <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Analisa Fundamental</h3>
                    <p className="text-xs text-muted-foreground">Penilaian kesehatan keuangan dan harga wajar</p>
                </div>
            </div>

            {/* Fair Value Section */}
            {data && !loading && (
                <div className="mb-6 p-5 bg-warning/5 rounded-2xl border border-warning/20">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-warning" />
                        <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Estimasi Harga Wajar</h4>
                    </div>

                    {(() => {
                        const eps = data.trailingEps || 0;
                        const bv = data.bookValue || 0;
                        const curPrice = data.currentPrice || 0;

                        // 1. Graham Number (Conservative)
                        // Formula: sqrt(22.5 * EPS * BookValue)
                        const grahamNumber = eps > 0 && bv > 0 ? Math.sqrt(22.5 * eps * bv) : 0;

                        // 2. PE Based (Fair PE 15)
                        const peFair = eps > 0 ? eps * 15 : 0;

                        // 3. PBV Based (Standard PBV 1.5)
                        const pbvFair = bv > 0 ? bv * 1.5 : 0;

                        // Average Fair Value
                        const validMethods = [grahamNumber, peFair, pbvFair].filter(v => v > 0);
                        const avgFairValue = validMethods.length > 0
                            ? validMethods.reduce((a, b) => a + b, 0) / validMethods.length
                            : 0;

                        const marginOfSafety = avgFairValue > 0 ? ((avgFairValue - curPrice) / avgFairValue) * 100 : 0;
                        const isUndervalued = marginOfSafety > 0;

                        return (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Rata-rata Harga Wajar</div>
                                        <div className="text-3xl font-black text-foreground">
                                            {avgFairValue > 0 ? formatIDR(avgFairValue) : "Data tidak cukup"}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Margin of Safety</div>
                                        <div className={cn(
                                            "text-2xl font-black",
                                            isUndervalued ? "text-success" : "text-destructive"
                                        )}>
                                            {isUndervalued ? "+" : ""}{marginOfSafety.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-warning/20">
                                    <div className="p-3 bg-muted rounded-xl">
                                        <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Graham Number</div>
                                        <div className="text-sm font-black text-foreground">{grahamNumber > 0 ? formatIDR(grahamNumber) : "-"}</div>
                                    </div>
                                    <div className="p-3 bg-muted rounded-xl">
                                        <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">PE-Based (15x)</div>
                                        <div className="text-sm font-black text-foreground">{peFair > 0 ? formatIDR(peFair) : "-"}</div>
                                    </div>
                                    <div className="p-3 bg-muted rounded-xl">
                                        <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">PBV-Based (1.5x)</div>
                                        <div className="text-sm font-black text-foreground">{pbvFair > 0 ? formatIDR(pbvFair) : "-"}</div>
                                    </div>
                                </div>

                                <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
                                    <p className="text-[10px] text-warning font-medium leading-relaxed italic">
                                        *Graham Number: Metode konservatif Benjamin Graham. PE-Based: Valuasi wajar berdasarkan laba. PBV-Based: Valuasi berdasarkan nilai buku perusahaan.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Stock Selector */}
            <div className="mb-4">
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Pilih Saham:</label>
                <select
                    value={selectedStock}
                    onChange={(e) => setSelectedStock(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    {portfolio.map((item) => (
                        <option key={item.ticker} value={item.ticker}>
                            {item.ticker} - {item.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Memuat data fundamental...</span>
                </div>
            )}

            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">Error: {error}</p>
                </div>
            )}

            {data && analysis && !loading && (
                <>
                    {/* Overall Score */}
                    <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-muted-foreground">Skor Fundamental</span>
                            <span className={cn("text-2xl font-bold", analysis.ratingColor)}>
                                {analysis.score}/100
                            </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                                style={{ width: `${analysis.score}%` }}
                            />
                        </div>
                        <p className={cn("text-lg font-bold text-center", analysis.ratingColor)}>
                            {analysis.rating}
                        </p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {data.peRatio !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">P/E Ratio</p>
                                <p className="text-lg font-bold text-primary">{data.peRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.pbRatio !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">P/B Ratio</p>
                                <p className="text-lg font-bold text-primary">{data.pbRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.roe !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">ROE</p>
                                <p className="text-lg font-bold text-primary">{(data.roe * 100).toFixed(1)}%</p>
                            </div>
                        )}

                        {data.profitMargin !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">Margin Laba</p>
                                <p className="text-lg font-bold text-primary">{(data.profitMargin * 100).toFixed(1)}%</p>
                            </div>
                        )}

                        {data.currentRatio !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">Rasio Lancar</p>
                                <p className="text-lg font-bold text-primary">{data.currentRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.debtToEquity !== null && (
                            <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-primary font-semibold mb-1">Hutang/Modal</p>
                                <p className="text-lg font-bold text-primary">{data.debtToEquity.toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    {/* Insights */}
                    <div className="mb-8">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Analisa Detail:</h4>
                        <div className="space-y-2">
                            {analysis.insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "p-3 rounded-lg border flex items-start gap-3",
                                        insight.status === "good" && "bg-success/10 border-success/20",
                                        insight.status === "warning" && "bg-warning/10 border-warning/20",
                                        insight.status === "bad" && "bg-destructive/10 border-destructive/20"
                                    )}
                                >
                                    {insight.status === "good" && <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />}
                                    {insight.status === "warning" && <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />}
                                    {insight.status === "bad" && <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />}
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">{insight.category}</p>
                                        <p className={cn(
                                            "text-sm",
                                            insight.status === "good" && "text-success",
                                            insight.status === "warning" && "text-warning",
                                            insight.status === "bad" && "text-destructive"
                                        )}>
                                            {insight.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Foreign Flow Analysis */}
                    <div className="mb-6 p-5 bg-primary/5 rounded-2xl border border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Analisa Foreign Flow</h4>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight",
                                data.foreignAccumulationStatus === "Akumulasi" ? "bg-success/10 text-success" :
                                data.foreignAccumulationStatus === "Distribusi" ? "bg-destructive/10 text-destructive" :
                                "bg-muted text-muted-foreground"
                            )}>
                                {data.foreignAccumulationStatus}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Net Foreign Buy/Sell (Value)</div>
                                <div className={cn(
                                    "text-2xl font-black",
                                    data.foreignNetBuyValue >= 0 ? "text-success" : "text-destructive"
                                )}>
                                    {data.foreignNetBuyValue >= 0 ? "+" : ""}{formatCompactIDR(data.foreignNetBuyValue)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Net Foreign Buy/Sell (Volume)</div>
                                <div className={cn(
                                    "text-2xl font-black",
                                    data.foreignNetBuyVolume >= 0 ? "text-success" : "text-destructive"
                                )}>
                                    {data.foreignNetBuyVolume >= 0 ? "+" : ""}{Intl.NumberFormat('id-ID').format(data.foreignNetBuyVolume)} <span className="text-sm font-normal text-muted-foreground">lot</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-muted rounded-xl border border-border">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {data.foreignAccumulationStatus === "Akumulasi" 
                                    ? "Investor asing terpantau sedang melakukan akumulasi beli bersih pada saham ini. Ini merupakan sinyal positif untuk tren harga jangka menengah."
                                    : data.foreignAccumulationStatus === "Distribusi"
                                    ? "Investor asing terpantau sedang melakukan distribusi atau jual bersih. Tetap waspada terhadap tekanan jual yang mungkin berlanjut."
                                    : "Aliran dana asing terpantau netral atau tidak signifikan. Pergerakan harga kemungkinan akan didominasi oleh investor domestik."
                                }
                            </p>
                        </div>
                    </div>

                    {/* Smart Money (Bandarmology) Analysis */}
                    <div className="mb-6 p-5 bg-warning/5 rounded-2xl border border-warning/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-warning" />
                                <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Analisa Smart Money</h4>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight",
                                data.smartMoneyColor === "emerald" || data.smartMoneyColor === "green" ? "bg-success/10 text-success" :
                                data.smartMoneyColor === "rose" || data.smartMoneyColor === "red" ? "bg-destructive/10 text-destructive" :
                                "bg-primary/10 text-primary"
                            )}>
                                {data.smartMoneyPhase}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Top Buyer Brokers</div>
                                <div className="flex gap-2">
                                    {data.topBuyBrokers.map(broker => (
                                        <div key={broker} className="px-3 py-1.5 bg-card border border-success/30 rounded-lg text-xs font-black text-success">
                                            {broker}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Top Seller Brokers</div>
                                <div className="flex gap-2">
                                    {data.topSellBrokers.map(broker => (
                                        <div key={broker} className="px-3 py-1.5 bg-card border border-destructive/30 rounded-lg text-xs font-black text-destructive">
                                            {broker}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Concentration Score</span>
                                    <span className="text-xs font-black text-foreground">{data.concentrationScore}/100</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full transition-all",
                                            data.smartMoneyPhase.includes("Accumulation") ? "bg-success" : 
                                            data.smartMoneyPhase.includes("Distribution") ? "bg-destructive" : "bg-primary"
                                        )}
                                        style={{ width: `${data.concentrationScore}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex-shrink-0 w-full sm:w-auto p-3 bg-card rounded-xl border border-warning/20">
                                <p className="text-xs font-medium text-muted-foreground italic leading-snug">
                                    "{data.smartMoneyDescription}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Price Prediction & Sentiment */}
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-primary" />
                            <h4 className="font-black text-foreground text-base uppercase tracking-widest">Price Forecast & Sentiment</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Analyst Targets */}
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">Konsensus Analis</div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Target Rata-rata</div>
                                        <div className="text-3xl font-black text-foreground">
                                            {data.targetMeanPrice ? formatIDR(data.targetMeanPrice) : "Data tdk tersedia"}
                                        </div>
                                        {data.targetMeanPrice && data.currentPrice && (
                                            <div className={cn(
                                                "text-sm font-bold mt-1",
                                                data.targetMeanPrice > data.currentPrice ? "text-success" : "text-destructive"
                                            )}>
                                                Potensi Upside: {(((data.targetMeanPrice - data.currentPrice) / data.currentPrice) * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3 bg-muted rounded-xl border border-border">
                                            <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Target Tertinggi</div>
                                            <div className="text-sm font-black text-foreground">{data.targetHighPrice ? formatIDR(data.targetHighPrice) : "-"}</div>
                                        </div>
                                        <div className="flex-1 p-3 bg-muted rounded-xl border border-border">
                                            <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Target Terendah</div>
                                            <div className="text-sm font-black text-foreground">{data.targetLowPrice ? formatIDR(data.targetLowPrice) : "-"}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Trend */}
                            <div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">Sentimen Pasar</div>
                                <div className="space-y-3">
                                    {(() => {
                                        const total = data.strongBuy + data.buy + data.hold + data.sell + data.strongSell;
                                        if (total === 0) return <p className="text-sm text-muted-foreground italic">Belum ada rekomendasi dari analis.</p>;

                                        const getWidth = (val: number) => (val / total * 100) + "%";

                                        return (
                                            <div className="space-y-3">
                                                <div className="h-6 w-full flex rounded-full overflow-hidden shadow-inner bg-muted">
                                                    <div style={{ width: getWidth(data.strongBuy) }} className="bg-success h-full" title="Strong Buy" />
                                                    <div style={{ width: getWidth(data.buy) }} className="bg-success/60 h-full" title="Buy" />
                                                    <div style={{ width: getWidth(data.hold) }} className="bg-warning h-full" title="Hold" />
                                                    <div style={{ width: getWidth(data.sell) }} className="bg-destructive/60 h-full" title="Sell" />
                                                    <div style={{ width: getWidth(data.strongSell) }} className="bg-destructive h-full" title="Strong Sell" />
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                                                        <div className="text-[10px] text-success font-black uppercase">BUY</div>
                                                        <div className="text-lg font-black text-foreground">{data.strongBuy + data.buy}</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                                                        <div className="text-[10px] text-warning font-black uppercase">HOLD</div>
                                                        <div className="text-lg font-black text-foreground">{data.hold}</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                                                        <div className="text-[10px] text-destructive font-black uppercase">SELL</div>
                                                        <div className="text-lg font-black text-foreground">{data.sell + data.strongSell}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <p className="text-[10px] text-primary font-medium leading-relaxed">
                                        *Prediksi didasarkan pada konsensus rata-rata analis Wall Street/Regional. Gunakan sebagai referensi, bukan jaminan pasti.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
