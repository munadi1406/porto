"use client";

import { useMemo } from "react";
import { Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { formatIDR, cn } from "@/lib/utils";
import { Transaction } from "@/lib/types";
import { PortfolioItem } from "@/lib/types";

interface HoldingPeriodAnalysisProps {
    portfolio: PortfolioItem[];
    transactions: Transaction[];
    prices: Record<string, { price: number; change: number }>;
}

export function HoldingPeriodAnalysis({ portfolio, transactions, prices }: HoldingPeriodAnalysisProps) {
    const analysis = useMemo(() => {
        if (portfolio.length === 0) return null;

        const now = Date.now();
        const holdingData = portfolio.map((item) => {
            // Find first buy transaction for this ticker
            const firstBuy = transactions
                .filter(t => t.ticker === item.ticker && t.type === 'buy')
                .sort((a, b) => a.timestamp - b.timestamp)[0];

            const holdingDays = firstBuy
                ? Math.floor((now - firstBuy.timestamp) / (1000 * 60 * 60 * 24))
                : 0;

            const livePrice = prices[item.ticker]?.price || 0;
            const currentPrice = livePrice > 0 ? livePrice : item.averagePrice;
            const returnPct = ((currentPrice - item.averagePrice) / item.averagePrice) * 100;
            const marketValue = item.lots * 100 * currentPrice;

            // Categorize holding period
            let category: "short" | "medium" | "long";
            if (holdingDays < 30) category = "short";
            else if (holdingDays < 365) category = "medium";
            else category = "long";

            return {
                ticker: item.ticker,
                name: item.name,
                holdingDays,
                category,
                returnPct,
                marketValue,
                firstBuyDate: firstBuy?.timestamp || now,
            };
        }).sort((a, b) => b.holdingDays - a.holdingDays);

        // Calculate category stats
        const shortTerm = holdingData.filter(d => d.category === "short");
        const mediumTerm = holdingData.filter(d => d.category === "medium");
        const longTerm = holdingData.filter(d => d.category === "long");

        const avgShortReturn = shortTerm.length > 0
            ? shortTerm.reduce((sum, d) => sum + d.returnPct, 0) / shortTerm.length
            : 0;
        const avgMediumReturn = mediumTerm.length > 0
            ? mediumTerm.reduce((sum, d) => sum + d.returnPct, 0) / mediumTerm.length
            : 0;
        const avgLongReturn = longTerm.length > 0
            ? longTerm.reduce((sum, d) => sum + d.returnPct, 0) / longTerm.length
            : 0;

        const avgHoldingDays = holdingData.length > 0
            ? holdingData.reduce((sum, d) => sum + d.holdingDays, 0) / holdingData.length
            : 0;

        // Best and worst performers
        const bestPerformer = [...holdingData].sort((a, b) => b.returnPct - a.returnPct)[0];
        const worstPerformer = [...holdingData].sort((a, b) => a.returnPct - b.returnPct)[0];

        return {
            holdingData,
            shortTerm,
            mediumTerm,
            longTerm,
            avgShortReturn,
            avgMediumReturn,
            avgLongReturn,
            avgHoldingDays,
            bestPerformer,
            worstPerformer,
        };
    }, [portfolio, transactions, prices]);

    if (!analysis) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Holding Period Analysis</h3>
                <p className="text-sm text-gray-500">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    const formatDays = (days: number) => {
        if (days < 30) return `${days} hari`;
        if (days < 365) return `${Math.floor(days / 30)} bulan`;
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        return months > 0 ? `${years}th ${months}bl` : `${years} tahun`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Holding Period Analysis</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analisis berdasarkan waktu holding</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Avg Period</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-500">
                        {formatDays(analysis.avgHoldingDays)}
                    </p>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Short Term</span>
                    </div>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-500">
                        {analysis.shortTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgShortReturn >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {analysis.avgShortReturn >= 0 ? "+" : ""}{analysis.avgShortReturn.toFixed(1)}% avg
                    </p>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Medium Term</span>
                    </div>
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500">
                        {analysis.mediumTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgMediumReturn >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {analysis.avgMediumReturn >= 0 ? "+" : ""}{analysis.avgMediumReturn.toFixed(1)}% avg
                    </p>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Long Term</span>
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-500">
                        {analysis.longTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgLongReturn >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {analysis.avgLongReturn >= 0 ? "+" : ""}{analysis.avgLongReturn.toFixed(1)}% avg
                    </p>
                </div>
            </div>

            {/* Best & Worst */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Best Performer</span>
                    </div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-500">{analysis.bestPerformer?.ticker}</p>
                    <p className="text-sm text-green-600/80 dark:text-green-400/80">
                        +{analysis.bestPerformer?.returnPct.toFixed(1)}% • {formatDays(analysis.bestPerformer?.holdingDays || 0)}
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-400">Worst Performer</span>
                    </div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-500">{analysis.worstPerformer?.ticker}</p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                        {analysis.worstPerformer?.returnPct.toFixed(1)}% • {formatDays(analysis.worstPerformer?.holdingDays || 0)}
                    </p>
                </div>
            </div>

            {/* Holdings List */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">All Holdings</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {analysis.holdingData.map((holding) => (
                        <div key={`holding-${holding.ticker}`} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{holding.ticker}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(holding.firstBuyDate).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-sm font-bold",
                                        holding.returnPct >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {holding.returnPct >= 0 ? "+" : ""}{holding.returnPct.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDays(holding.holdingDays)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-xs font-semibold",
                                    holding.category === "short" && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                                    holding.category === "medium" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                                    holding.category === "long" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                )}>
                                    {holding.category === "short" && "< 1 month"}
                                    {holding.category === "medium" && "1-12 months"}
                                    {holding.category === "long" && "> 1 year"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
