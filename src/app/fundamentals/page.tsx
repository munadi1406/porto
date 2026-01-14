"use client";

import { useState } from "react";
import { Search, Building2, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, AlertCircle, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { cn, formatIDR } from "@/lib/utils";
import { useFundamentals } from "@/hooks/useFundamentals";
import Link from "next/link";

// Fungsi untuk analisa fundamental
const analyzeFundamentals = (data: any) => {
    let score = 0;
    const insights: Array<{ category: string; status: "good" | "warning" | "bad"; message: string }> = [];

    // 1. Valuasi (P/E Ratio)
    if (data.peRatio !== null) {
        if (data.peRatio < 15) {
            score += 20;
            insights.push({ category: "Valuasi", status: "good", message: `P/E Ratio ${data.peRatio.toFixed(1)} - Valuasi menarik, saham terlihat undervalued` });
        } else if (data.peRatio < 25) {
            score += 10;
            insights.push({ category: "Valuasi", status: "warning", message: `P/E Ratio ${data.peRatio.toFixed(1)} - Valuasi wajar, harga cukup reasonable` });
        } else {
            insights.push({ category: "Valuasi", status: "bad", message: `P/E Ratio ${data.peRatio.toFixed(1)} - Valuasi tinggi, saham mungkin overvalued` });
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

    // 3. Profit Margin
    if (data.profitMargin !== null) {
        const marginPercent = data.profitMargin * 100;
        if (marginPercent > 15) {
            score += 15;
            insights.push({ category: "Margin", status: "good", message: `Profit Margin ${marginPercent.toFixed(1)}% - Margin sangat sehat, bisnis efisien` });
        } else if (marginPercent > 5) {
            score += 8;
            insights.push({ category: "Margin", status: "warning", message: `Profit Margin ${marginPercent.toFixed(1)}% - Margin cukup baik` });
        } else {
            insights.push({ category: "Margin", status: "bad", message: `Profit Margin ${marginPercent.toFixed(1)}% - Margin tipis, kompetisi ketat` });
        }
    }

    // 4. Kesehatan Keuangan (Current Ratio)
    if (data.currentRatio !== null) {
        if (data.currentRatio > 2) {
            score += 15;
            insights.push({ category: "Likuiditas", status: "good", message: `Current Ratio ${data.currentRatio.toFixed(2)} - Likuiditas sangat baik, mampu bayar hutang jangka pendek` });
        } else if (data.currentRatio > 1) {
            score += 8;
            insights.push({ category: "Likuiditas", status: "warning", message: `Current Ratio ${data.currentRatio.toFixed(2)} - Likuiditas cukup` });
        } else {
            insights.push({ category: "Likuiditas", status: "bad", message: `Current Ratio ${data.currentRatio.toFixed(2)} - Likuiditas rendah, risiko kesulitan bayar hutang` });
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
            insights.push({ category: "Pertumbuhan", status: "good", message: `Revenue Growth ${growthPercent.toFixed(1)}% - Pertumbuhan kuat, bisnis ekspansif` });
        } else if (growthPercent > 0) {
            score += 8;
            insights.push({ category: "Pertumbuhan", status: "warning", message: `Revenue Growth ${growthPercent.toFixed(1)}% - Pertumbuhan positif tapi lambat` });
        } else {
            insights.push({ category: "Pertumbuhan", status: "bad", message: `Revenue Growth ${growthPercent.toFixed(1)}% - Pendapatan menurun, perlu waspada` });
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

export default function FundamentalsPage() {
    const [searchTicker, setSearchTicker] = useState("");
    const [selectedTicker, setSelectedTicker] = useState("");
    const { data, loading, error } = useFundamentals(selectedTicker);

    const analysis = data ? analyzeFundamentals(data) : null;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTicker.trim()) {
            setSelectedTicker(searchTicker.trim().toUpperCase());
        }
    };

    // Popular Indonesian stocks
    const popularStocks = [
        "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
        "UNVR.JK", "ICBP.JK", "INDF.JK", "KLBF.JK", "GGRM.JK"
    ];

    const isIndonesianStock = selectedTicker.includes('.JK');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/analytics" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Analytics
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                            <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analisa Fundamental</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cari dan analisa fundamental saham apapun</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTicker}
                                onChange={(e) => setSearchTicker(e.target.value)}
                                placeholder="Masukkan ticker saham (contoh: BBCA.JK, TLKM.JK, AAPL)"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                        >
                            Cari
                        </button>
                    </form>

                    {/* Popular Stocks */}
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Saham Populer:</p>
                        <div className="flex flex-wrap gap-2">
                            {popularStocks.map((ticker) => (
                                <button
                                    key={ticker}
                                    onClick={() => {
                                        setSearchTicker(ticker);
                                        setSelectedTicker(ticker);
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                >
                                    {ticker.replace('.JK', '')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center justify-center gap-4 text-purple-600">
                            <Loader2 className="w-12 h-12 animate-spin" />
                            <p className="text-lg font-semibold">Memuat data fundamental {selectedTicker}...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <XCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h3>
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Pastikan ticker yang Anda masukkan benar (contoh: BBCA.JK untuk saham Indonesia, AAPL untuk saham US)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!selectedTicker && !loading && (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <Search className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cari Saham untuk Analisa</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Masukkan ticker saham di atas atau pilih dari saham populer
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analysis Results */}
                {data && analysis && !loading && (
                    <div className="space-y-6">
                        {/* Company Info */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedTicker}</h2>
                                    {data.sector && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {data.sector} {data.industry && `• ${data.industry}`}
                                        </p>
                                    )}
                                </div>
                                {data.marketCap && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Market Cap</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {isIndonesianStock
                                                ? formatIDR(data.marketCap * 15000)
                                                : `$${(data.marketCap / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Price Range */}
                            {(data.fiftyTwoWeekHigh || data.fiftyTwoWeekLow) && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {data.fiftyTwoWeekLow && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">52-Week Low</p>
                                            <p className="text-lg font-bold text-red-600 dark:text-red-500">
                                                {isIndonesianStock ? formatIDR(data.fiftyTwoWeekLow) : `$${data.fiftyTwoWeekLow.toFixed(2)}`}
                                            </p>
                                        </div>
                                    )}
                                    {data.fiftyTwoWeekHigh && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">52-Week High</p>
                                            <p className="text-lg font-bold text-green-600 dark:text-green-500">
                                                {isIndonesianStock ? formatIDR(data.fiftyTwoWeekHigh) : `$${data.fiftyTwoWeekHigh.toFixed(2)}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Overall Score */}
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Skor Fundamental</span>
                                <span className={cn("text-4xl font-bold", analysis.ratingColor)}>
                                    {analysis.score}/100
                                </span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                                    style={{ width: `${analysis.score}%` }}
                                />
                            </div>
                            <p className={cn("text-2xl font-bold text-center", analysis.ratingColor)}>
                                {analysis.rating}
                            </p>
                        </div>

                        {/* Valuation Metrics */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                                Valuasi
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {data.peRatio !== null && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">P/E Ratio</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{data.peRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Trailing</p>
                                    </div>
                                )}

                                {data.forwardPE !== null && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">Forward P/E</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{data.forwardPE.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Estimasi</p>
                                    </div>
                                )}

                                {data.pbRatio !== null && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">P/B Ratio</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-500">{data.pbRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Price to Book</p>
                                    </div>
                                )}

                                {data.psRatio !== null && (
                                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                        <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mb-1">P/S Ratio</p>
                                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-500">{data.psRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Price to Sales</p>
                                    </div>
                                )}

                                {data.pegRatio !== null && (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-1">PEG Ratio</p>
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">{data.pegRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">P/E to Growth</p>
                                    </div>
                                )}

                                {data.beta !== null && (
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                        <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">Beta</p>
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{data.beta.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Volatilitas</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profitability Metrics */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Profitabilitas
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {data.profitMargin !== null && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Profit Margin</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-500">{(data.profitMargin * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Net Margin</p>
                                    </div>
                                )}

                                {data.operatingMargin !== null && (
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Operating Margin</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{(data.operatingMargin * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">EBIT Margin</p>
                                    </div>
                                )}

                                {data.grossMargin !== null && (
                                    <div className="p-4 bg-lime-50 dark:bg-lime-900/20 rounded-xl">
                                        <p className="text-xs text-lime-700 dark:text-lime-400 font-semibold mb-1">Gross Margin</p>
                                        <p className="text-2xl font-bold text-lime-600 dark:text-lime-500">{(data.grossMargin * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Gross Profit</p>
                                    </div>
                                )}

                                {data.roe !== null && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">ROE</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-500">{(data.roe * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Return on Equity</p>
                                    </div>
                                )}

                                {data.roa !== null && (
                                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                        <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mb-1">ROA</p>
                                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-500">{(data.roa * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Return on Assets</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Financial Health */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Kesehatan Keuangan
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {data.currentRatio !== null && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">Current Ratio</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{data.currentRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Likuiditas</p>
                                    </div>
                                )}

                                {data.quickRatio !== null && (
                                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                                        <p className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold mb-1">Quick Ratio</p>
                                        <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-500">{data.quickRatio.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Acid Test</p>
                                    </div>
                                )}

                                {data.debtToEquity !== null && (
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                                        <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">Debt/Equity</p>
                                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{data.debtToEquity.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Leverage</p>
                                    </div>
                                )}

                                {data.totalCash !== null && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Total Cash</p>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-500">
                                            {isIndonesianStock
                                                ? formatIDR(data.totalCash * 15000)
                                                : `$${(data.totalCash / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Kas & Setara</p>
                                    </div>
                                )}

                                {data.totalDebt !== null && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                        <p className="text-xs text-red-700 dark:text-red-400 font-semibold mb-1">Total Debt</p>
                                        <p className="text-lg font-bold text-red-600 dark:text-red-500">
                                            {isIndonesianStock
                                                ? formatIDR(data.totalDebt * 15000)
                                                : `$${(data.totalDebt / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Total Hutang</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Growth & Dividend */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Growth */}
                            {(data.revenueGrowth !== null || data.earningsGrowth !== null) && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-600" />
                                        Pertumbuhan
                                    </h3>
                                    <div className="space-y-4">
                                        {data.revenueGrowth !== null && (
                                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                                <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">Revenue Growth</p>
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    data.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {data.revenueGrowth >= 0 ? "+" : ""}{(data.revenueGrowth * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">YoY Revenue</p>
                                            </div>
                                        )}

                                        {data.earningsGrowth !== null && (
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-1">Earnings Growth</p>
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    data.earningsGrowth >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {data.earningsGrowth >= 0 ? "+" : ""}{(data.earningsGrowth * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">YoY Earnings</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dividend */}
                            {(data.dividendYield !== null || data.dividendRate !== null || data.payoutRatio !== null) && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Dividen
                                    </h3>
                                    <div className="space-y-4">
                                        {data.dividendYield !== null && (
                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                                <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Dividend Yield</p>
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                                                    {(data.dividendYield * 100).toFixed(2)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Annual Yield</p>
                                            </div>
                                        )}

                                        {data.dividendRate !== null && (
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Dividend Rate</p>
                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                                                    {isIndonesianStock
                                                        ? formatIDR(data.dividendRate)
                                                        : `$${data.dividendRate.toFixed(2)}`
                                                    }
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Per Share</p>
                                            </div>
                                        )}

                                        {data.payoutRatio !== null && (
                                            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                                <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mb-1">Payout Ratio</p>
                                                <p className="text-2xl font-bold text-teal-600 dark:text-teal-500">
                                                    {(data.payoutRatio * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Earnings Paid</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Detailed Insights */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Analisa Detail</h3>
                            <div className="space-y-3">
                                {analysis.insights.map((insight, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "p-4 rounded-xl border flex items-start gap-3",
                                            insight.status === "good" && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                                            insight.status === "warning" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                                            insight.status === "bad" && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                        )}
                                    >
                                        {insight.status === "good" && <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />}
                                        {insight.status === "warning" && <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />}
                                        {insight.status === "bad" && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />}
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{insight.category}</p>
                                            <p className={cn(
                                                "text-base",
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
                    </div>
                )}
            </div>
        </div>
    );
}
