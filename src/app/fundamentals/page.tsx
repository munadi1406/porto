"use client";

import { useState, useMemo } from "react";
import { Search, Building2, TrendingUp, TrendingDown, DollarSign, Shield, BarChart3, AlertCircle, CheckCircle, XCircle, Loader2, ArrowLeft, Target, Wallet, Zap, Activity, Scale } from "lucide-react";
import { cn, formatIDR, formatCompactIDR, formatNumber } from "@/lib/utils";
import { useFundamentals } from "@/hooks/useFundamentals";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";

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

export default function FundamentalsPage() {
    const [searchTicker, setSearchTicker] = useState("");
    const [selectedTicker, setSelectedTicker] = useState("");
    const { data, loading, error } = useFundamentals(selectedTicker);

    const analysis = data ? analyzeFundamentals(data) : null;

    const smartMoney = useMemo(() => {
        if (!data || data.volume === null || data.averageVolume === null || data.priceChangePercent === null) {
            return {
                power: 'N/A',
                signal: 'Normal / Sideways',
                message: 'Data perdagangan hari ini belum tersedia untuk dianalisa.',
                colorClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            };
        }

        const volPower = (data.volume / data.averageVolume) * 100;
        const isHighVolume = data.volume > data.averageVolume * 1.2;
        const isPriceUp = data.priceChangePercent >= 0;

        let signal = 'Normal / Sideways';
        let message = 'Volume perdagangan masih di bawah rata-rata, belum ada pergerakan signifikan.';
        let colorClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

        if (isHighVolume) {
            if (isPriceUp) {
                signal = 'Akumulasi Kuat';
                message = 'Smart money terdeteksi masuk dalam jumlah besar seiring kenaikan harga.';
                colorClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            } else {
                signal = 'Distribusi Masif';
                message = 'Tekanan jual sangat tinggi, kemungkinan distribusi oleh institusi.';
                colorClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            }
        }

        return {
            power: volPower.toFixed(0) + '%',
            signal,
            message,
            colorClass
        };
    }, [data]);

    const valAnalysis = useMemo(() => {
        if (!data || data.currentPrice === null || data.trailingEps === null || data.bookValue === null) {
            return null;
        }

        // 1. Graham Number = sqrt(22.5 * EPS * BVPS)
        let grahamNumber = null;
        if (data.trailingEps > 0 && data.bookValue > 0) {
            grahamNumber = Math.sqrt(22.5 * data.trailingEps * data.bookValue);
        }

        // 2. Intrinsic Value (Simplified Benjamin Graham)
        // EPS * (8.5 + 2g), g max 15% to be conservative
        const growth = Math.min(Math.max((data.earningsGrowth || 0) * 100, 0), 15);
        const intrinsicValue = data.trailingEps * (8.5 + 2 * growth);

        // Average Fair Value
        let fairValue = intrinsicValue;
        if (grahamNumber) {
            fairValue = (intrinsicValue + grahamNumber) / 2;
        }

        const marginOfSafety = ((fairValue - data.currentPrice) / fairValue) * 100;
        const status = data.currentPrice < fairValue * 0.8 ? 'Undervalued' :
            data.currentPrice < fairValue * 1.2 ? 'Fair Value' : 'Overvalued';

        const statusIndo = status === 'Undervalued' ? 'Di Bawah Harga Wajar' :
            status === 'Fair Value' ? 'Harga Wajar' : 'Di Atas Harga Wajar';

        const colorClass = status === 'Undervalued' ? 'text-green-600 dark:text-green-400' :
            status === 'Fair Value' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

        const bgClass = status === 'Undervalued' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            status === 'Fair Value' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

        return {
            grahamNumber,
            intrinsicValue,
            fairValue,
            marginOfSafety,
            status: statusIndo,
            colorClass,
            bgClass
        };
    }, [data]);

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
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2 uppercase">{selectedTicker}</h2>
                                    {data.sector && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                {data.sector}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {data.industry || '- Regional'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {data.marketCap && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-start sm:items-end min-w-[200px]">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Kapitalisasi Pasar</p>
                                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                            {isIndonesianStock
                                                ? formatCompactIDR(data.marketCap)
                                                : `$${(data.marketCap / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                        <p className="text-[8px] text-gray-400 mt-1 leading-none font-medium text-left sm:text-right">
                                            {isIndonesianStock ? formatIDR(data.marketCap) : ''}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Price Range */}
                            {(data.fiftyTwoWeekHigh || data.fiftyTwoWeekLow) && (
                                <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    {data.fiftyTwoWeekLow && (
                                        <div className="p-3 sm:p-4 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                                            <p className="text-[10px] text-red-700/60 dark:text-red-400/60 mb-1 font-bold uppercase tracking-wider">Terendah 52-Mgu</p>
                                            <p className="text-sm sm:text-xl font-black text-red-600 dark:text-red-500 tracking-tight">
                                                {isIndonesianStock ? formatIDR(data.fiftyTwoWeekLow) : `$${data.fiftyTwoWeekLow.toFixed(2)}`}
                                            </p>
                                        </div>
                                    )}
                                    {data.fiftyTwoWeekHigh && (
                                        <div className="p-3 sm:p-4 bg-green-50/50 dark:bg-green-500/5 rounded-2xl border border-green-100 dark:border-green-500/10 text-right">
                                            <p className="text-[10px] text-green-700/60 dark:text-green-400/60 mb-1 font-bold uppercase tracking-wider">Tertinggi 52-Mgu</p>
                                            <p className="text-sm sm:text-xl font-black text-green-600 dark:text-green-500 tracking-tight">
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
                                        <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Total Kas</p>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-500">
                                            {isIndonesianStock
                                                ? formatCompactIDR(data.totalCash)
                                                : `$${(data.totalCash / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Kas & Setara</p>
                                    </div>
                                )}

                                {data.totalDebt !== null && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                        <p className="text-xs text-red-700 dark:text-red-400 font-semibold mb-1">Total Hutang</p>
                                        <p className="text-lg font-bold text-red-600 dark:text-red-500">
                                            {isIndonesianStock
                                                ? formatCompactIDR(data.totalDebt)
                                                : `$${(data.totalDebt / 1e9).toFixed(2)}B`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Total Kewajiban</p>
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
                                                <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">Pertumbuhan Pendapatan</p>
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    data.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {data.revenueGrowth >= 0 ? "+" : ""}{(data.revenueGrowth * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">YoY Pendapatan</p>
                                            </div>
                                        )}

                                        {data.earningsGrowth !== null && (
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-1">Pertumbuhan Laba</p>
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    data.earningsGrowth >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {data.earningsGrowth >= 0 ? "+" : ""}{(data.earningsGrowth * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">YoY Laba Bersih</p>
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
                                                <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Yield Dividen</p>
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                                                    {(data.dividendYield * 100).toFixed(2)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Imbal Hasil Tahunan</p>
                                            </div>
                                        )}

                                        {data.dividendRate !== null && (
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Nilai Dividen</p>
                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                                                    {isIndonesianStock
                                                        ? formatCompactIDR(data.dividendRate)
                                                        : `$${data.dividendRate.toFixed(2)}`
                                                    }
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Per Saham</p>
                                            </div>
                                        )}

                                        {data.payoutRatio !== null && (
                                            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                                                <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mb-1">Rasio Pembayaran</p>
                                                <p className="text-2xl font-bold text-teal-600 dark:text-teal-500">
                                                    {(data.payoutRatio * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Laba Dibagikan</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fair Value Calculator (Intrinsic Value) */}
                            {valAnalysis && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                        <Scale className="w-32 h-32 text-indigo-600" />
                                    </div>

                                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                            <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        Fair Value (Nilai Intrinsik)
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Hero Calculation */}
                                        <div className={cn(
                                            "p-8 rounded-[2rem] border-2 flex flex-col items-center text-center gap-3 relative transition-all",
                                            valAnalysis.bgClass
                                        )}>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Estimasi Harga Wajar</p>
                                                <p className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
                                                    {isIndonesianStock ? formatIDR(valAnalysis.fairValue) : `$${valAnalysis.fairValue.toFixed(2)}`}
                                                </p>
                                            </div>
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/80 dark:bg-black/40 shadow-sm border border-black/5 dark:border-white/5",
                                                valAnalysis.colorClass
                                            )}>
                                                {valAnalysis.status}
                                            </div>
                                        </div>

                                        {/* Margin of Safety & Progress */}
                                        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/40 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">Margin of Safety (MoS)</p>
                                                    <p className={cn(
                                                        "text-2xl font-black leading-none",
                                                        valAnalysis.marginOfSafety >= 20 ? "text-green-600" : (valAnalysis.marginOfSafety < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100")
                                                    )}>
                                                        {valAnalysis.marginOfSafety.toFixed(1)}%
                                                    </p>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium max-w-[150px] text-right leading-tight">
                                                    MoS {valAnalysis.marginOfSafety >= 0 ? 'Diskon' : 'Premi'} harga pasar vs intrinsik.
                                                </p>
                                            </div>

                                            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden flex">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-1000",
                                                        valAnalysis.marginOfSafety >= 20 ? "bg-green-500" : (valAnalysis.marginOfSafety < 0 ? "bg-red-500" : "bg-indigo-500")
                                                    )}
                                                    style={{ width: `${Math.min(Math.max(valAnalysis.marginOfSafety, 0), 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Breakdown Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">Graham Number</p>
                                                <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                                                    {valAnalysis.grahamNumber ? (isIndonesianStock ? formatIDR(valAnalysis.grahamNumber) : `$${valAnalysis.grahamNumber.toFixed(2)}`) : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">Graham Formula</p>
                                                <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                                                    {isIndonesianStock ? formatIDR(valAnalysis.intrinsicValue) : `$${valAnalysis.intrinsicValue.toFixed(2)}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detailed Methodology Footer with Calculations */}
                                        <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/20">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center gap-2 pb-3 border-b border-indigo-100/30 dark:border-indigo-800/20">
                                                    <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                    <p className="text-[10px] text-indigo-900 dark:text-indigo-300 font-black uppercase tracking-widest">Detail Perhitungan Matematis</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Graham Number Details */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-[10px] text-gray-900 dark:text-gray-100 font-black">1. Graham Number (Aset)</p>
                                                            <span className="text-[9px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-md font-bold">Konservatif</span>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-indigo-100/20">
                                                            √ (22.5 × EPS × BVPS)
                                                        </p>
                                                        <div className="space-y-1 text-[9px] text-gray-500 font-medium italic">
                                                            <p>• EPS: {isIndonesianStock ? formatNumber(data.trailingEps || 0) : `$${(data.trailingEps || 0).toFixed(2)}`}</p>
                                                            <p>• BVPS: {isIndonesianStock ? formatNumber(data.bookValue || 0) : `$${(data.bookValue || 0).toFixed(2)}`}</p>
                                                        </div>
                                                    </div>

                                                    {/* Graham Formula Details */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-[10px] text-gray-900 dark:text-gray-100 font-black">2. Graham Formula (Growth)</p>
                                                            <span className="text-[9px] px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-md font-bold">Potensi Laba</span>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-green-600 dark:text-green-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-green-100/20">
                                                            EPS × (8.5 + 2g)
                                                        </p>
                                                        <div className="space-y-1 text-[9px] text-gray-500 font-medium italic">
                                                            <p>• g (Pertumbuhan): {((data.earningsGrowth || 0) * 100).toFixed(1)}% {data.earningsGrowth && data.earningsGrowth > 0.15 ? '(Dibatasi 15%)' : ''}</p>
                                                            <p>• Base P/E: 8.5 (Tanpa Pertumbuhan)</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-indigo-100/30 dark:border-indigo-800/20">
                                                    <p className="text-[9px] text-gray-400 text-center font-medium">
                                                        * Harga wajar akhir adalah rata-rata dari kedua metode di atas untuk hasil yang lebih seimbang.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Recommendation & Smart Money Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Strategy Card */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-red-600" />
                                    Strategi Rekomendasi
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                                        <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                                            <Wallet className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Area Beli (Buy Area)</span>
                                        </div>
                                        <p className="text-lg font-black text-red-600 dark:text-red-500">
                                            {data.fiftyTwoWeekLow && (
                                                isIndonesianStock
                                                    ? `${formatIDR(data.fiftyTwoWeekLow)} - ${formatIDR(data.fiftyTwoWeekLow * 1.15)}`
                                                    : `$${data.fiftyTwoWeekLow.toFixed(2)} - $${(data.fiftyTwoWeekLow * 1.15).toFixed(2)}`
                                            )}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 italic">Rentang 0-15% di atas harga terendah 52-minggu</p>
                                    </div>

                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                                        <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400">
                                            <Target className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Target Jual (Take Profit)</span>
                                        </div>
                                        <p className="text-lg font-black text-green-600 dark:text-green-500">
                                            {data.currentPrice && (
                                                isIndonesianStock
                                                    ? formatIDR(data.currentPrice * 1.25)
                                                    : `$${(data.currentPrice * 1.25).toFixed(2)}`
                                            )}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 italic">Target konservatif 25% dari harga saat ini</p>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Money / Volume Card */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Analisa "Smart Money"
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="p-4 flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Kekuatan Volume</p>
                                            <div className="flex items-end gap-2">
                                                <p className="text-xl font-black text-gray-900 dark:text-white">
                                                    {smartMoney.power}
                                                </p>
                                                <p className="text-xs text-gray-500 mb-1 font-medium italic">vs Rata-rata</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signal Status */}
                                    <div className={cn("p-4 rounded-xl border flex flex-col gap-2", smartMoney.colorClass)}>
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Status Akumulasi</span>
                                        </div>
                                        <p className="text-xl font-black uppercase tracking-tight">
                                            {smartMoney.signal}
                                        </p>
                                        <p className="text-[10px] opacity-70 leading-tight">
                                            {smartMoney.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Analyst Consensus Chart */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Konsensus Analis Profesional
                            </h3>
                            <div className="h-[250px] w-full">
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
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={80}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#fff'
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            {[
                                                { name: 'Strong Buy', value: data.strongBuy, color: '#10b981' },
                                                { name: 'Buy', value: data.buy, color: '#34d399' },
                                                { name: 'Hold', value: data.hold, color: '#94a3b8' },
                                                { name: 'Sell', value: data.sell, color: '#f87171' },
                                                { name: 'Strong Sell', value: data.strongSell, color: '#ef4444' },
                                            ].filter(d => d.value > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-center text-gray-500 mt-4 italic">
                                * Berdasarkan data konsensus analis terbaru dari berbagai sekuritas/institusi finansial global.
                            </p>
                        </div>
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
        </div >
    );
}
