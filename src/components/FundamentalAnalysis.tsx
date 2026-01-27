"use client";

import { useState } from "react";
import { Building2, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, AlertCircle, CheckCircle, XCircle, Loader2, Activity } from "lucide-react";
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
        ratingColor = "text-green-600";
    } else if (score >= 60) {
        rating = "Baik";
        ratingColor = "text-blue-600";
    } else if (score >= 40) {
        rating = "Cukup";
        ratingColor = "text-yellow-600";
    } else if (score >= 20) {
        rating = "Kurang";
        ratingColor = "text-orange-600";
    } else {
        rating = "Buruk";
        ratingColor = "text-red-600";
    }

    return { score, insights, rating, ratingColor };
};

export function FundamentalAnalysis({ portfolio }: FundamentalAnalysisProps) {
    const [selectedStock, setSelectedStock] = useState<string>(portfolio[0]?.ticker || "");
    const { data, loading, error } = useFundamentals(selectedStock);

    const analysis = data ? analyzeFundamentals(data) : null;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Analisa Fundamental</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Penilaian kesehatan keuangan dan harga wajar</p>
                </div>
            </div>

            {/* Fair Value Section */}
            {data && !loading && (
                <div className="mb-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                        <h4 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-wider">Estimasi Harga Wajar</h4>
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
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Rata-rata Harga Wajar</div>
                                        <div className="text-3xl font-black text-gray-900 dark:text-white">
                                            {avgFairValue > 0 ? formatIDR(avgFairValue) : "Data tidak cukup"}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Margin of Safety</div>
                                        <div className={cn(
                                            "text-2xl font-black",
                                            isUndervalued ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {isUndervalued ? "+" : ""}{marginOfSafety.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-amber-200/50 dark:border-amber-800/50">
                                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
                                        <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Graham Number</div>
                                        <div className="text-sm font-black dark:text-white">{grahamNumber > 0 ? formatIDR(grahamNumber) : "-"}</div>
                                    </div>
                                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
                                        <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">PE-Based (15x)</div>
                                        <div className="text-sm font-black dark:text-white">{peFair > 0 ? formatIDR(peFair) : "-"}</div>
                                    </div>
                                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
                                        <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">PBV-Based (1.5x)</div>
                                        <div className="text-sm font-black dark:text-white">{pbvFair > 0 ? formatIDR(pbvFair) : "-"}</div>
                                    </div>
                                </div>

                                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed italic">
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pilih Saham:</label>
                <select
                    value={selectedStock}
                    onChange={(e) => setSelectedStock(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    {portfolio.map((item) => (
                        <option key={item.ticker} value={item.ticker}>
                            {item.ticker} - {item.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-purple-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Memuat data fundamental...</span>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">Error: {error}</p>
                </div>
            )}

            {data && analysis && !loading && (
                <>
                    {/* Overall Score */}
                    <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skor Fundamental</span>
                            <span className={cn("text-2xl font-bold", analysis.ratingColor)}>
                                {analysis.score}/100
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
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
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">P/E Ratio</p>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-500">{data.peRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.pbRatio !== null && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">P/B Ratio</p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-500">{data.pbRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.roe !== null && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">ROE</p>
                                <p className="text-lg font-bold text-purple-600 dark:text-purple-500">{(data.roe * 100).toFixed(1)}%</p>
                            </div>
                        )}

                        {data.profitMargin !== null && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-1">Margin Laba</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-500">{(data.profitMargin * 100).toFixed(1)}%</p>
                            </div>
                        )}

                        {data.currentRatio !== null && (
                            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                                <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mb-1">Rasio Lancar</p>
                                <p className="text-lg font-bold text-teal-600 dark:text-teal-500">{data.currentRatio.toFixed(2)}</p>
                            </div>
                        )}

                        {data.debtToEquity !== null && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">Hutang/Modal</p>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-500">{data.debtToEquity.toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    {/* Insights */}
                    <div className="mb-8">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Analisa Detail:</h4>
                        <div className="space-y-2">
                            {analysis.insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "p-3 rounded-lg border flex items-start gap-3",
                                        insight.status === "good" && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                                        insight.status === "warning" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                                        insight.status === "bad" && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                    )}
                                >
                                    {insight.status === "good" && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                                    {insight.status === "warning" && <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                                    {insight.status === "bad" && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{insight.category}</p>
                                        <p className={cn(
                                            "text-sm",
                                            insight.status === "good" && "text-green-700 dark:text-green-400",
                                            insight.status === "warning" && "text-yellow-700 dark:text-yellow-400",
                                            insight.status === "bad" && "text-red-700 dark:text-red-400"
                                        )}>
                                            {insight.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Price Prediction & Sentiment */}
                    <div className="bg-gray-900 dark:bg-black p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <TrendingUp className="w-24 h-24 text-white" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Activity className="w-5 h-5 text-blue-400" />
                                </div>
                                <h4 className="font-black text-white text-base uppercase tracking-widest">Price Forecast & Sentiment</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Analyst Targets */}
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Konsensus Analis</div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Target Rata-rata</div>
                                            <div className="text-3xl font-black text-white">
                                                {data.targetMeanPrice ? formatIDR(data.targetMeanPrice) : "Data tdk tersedia"}
                                            </div>
                                            {data.targetMeanPrice && data.currentPrice && (
                                                <div className={cn(
                                                    "text-sm font-bold mt-1",
                                                    data.targetMeanPrice > data.currentPrice ? "text-emerald-400" : "text-rose-400"
                                                )}>
                                                    Potensi Upside: {(((data.targetMeanPrice - data.currentPrice) / data.currentPrice) * 100).toFixed(1)}%
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                                                <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">Target Tertinggi</div>
                                                <div className="text-sm font-black text-white">{data.targetHighPrice ? formatIDR(data.targetHighPrice) : "-"}</div>
                                            </div>
                                            <div className="flex-1 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                                                <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">Target Terendah</div>
                                                <div className="text-sm font-black text-white">{data.targetLowPrice ? formatIDR(data.targetLowPrice) : "-"}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation Trend */}
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Sentimen Pasar</div>
                                    <div className="space-y-3">
                                        {(() => {
                                            const total = data.strongBuy + data.buy + data.hold + data.sell + data.strongSell;
                                            if (total === 0) return <p className="text-sm text-gray-500 italic">Belum ada rekomendasi dari analis.</p>;

                                            const getWidth = (val: number) => (val / total * 100) + "%";

                                            return (
                                                <div className="space-y-3">
                                                    <div className="h-6 w-full flex rounded-full overflow-hidden shadow-inner bg-gray-800">
                                                        <div style={{ width: getWidth(data.strongBuy) }} className="bg-emerald-600 h-full" title="Strong Buy" />
                                                        <div style={{ width: getWidth(data.buy) }} className="bg-emerald-400 h-full" title="Buy" />
                                                        <div style={{ width: getWidth(data.hold) }} className="bg-yellow-400 h-full" title="Hold" />
                                                        <div style={{ width: getWidth(data.sell) }} className="bg-rose-400 h-full" title="Sell" />
                                                        <div style={{ width: getWidth(data.strongSell) }} className="bg-rose-600 h-full" title="Strong Sell" />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                            <div className="text-[10px] text-emerald-400 font-black uppercase">BUY</div>
                                                            <div className="text-lg font-black text-white">{data.strongBuy + data.buy}</div>
                                                        </div>
                                                        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                                            <div className="text-[10px] text-yellow-400 font-black uppercase">HOLD</div>
                                                            <div className="text-lg font-black text-white">{data.hold}</div>
                                                        </div>
                                                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                                            <div className="text-[10px] text-rose-400 font-black uppercase">SELL</div>
                                                            <div className="text-lg font-black text-white">{data.sell + data.strongSell}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="mt-4 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                        <p className="text-[10px] text-blue-400 font-medium leading-relaxed">
                                            *Prediksi didasarkan pada konsensus rata-rata analis Wall Street/Regional. Gunakan sebagai referensi, bukan jaminan pasti.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
