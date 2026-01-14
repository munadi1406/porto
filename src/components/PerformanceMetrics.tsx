"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, BarChart3 } from "lucide-react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";

interface PerformanceMetricsProps {
    portfolio: PortfolioItem[];
    prices: Record<string, { price: number; change: number }>;
}

export function PerformanceMetrics({ portfolio, prices }: PerformanceMetricsProps) {
    const metrics = useMemo(() => {
        if (portfolio.length === 0) return null;

        let totalGain = 0;
        let totalLoss = 0;
        let winningStocks = 0;
        let losingStocks = 0;
        let bestPerformer = { ticker: "", return: -Infinity };
        let worstPerformer = { ticker: "", return: Infinity };
        let maxDrawdown = 0;

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            if (livePrice === 0) return;

            const marketValue = item.lots * 100 * livePrice;
            const costBasis = item.lots * 100 * item.averagePrice;
            const gainLoss = marketValue - costBasis;
            const returnPct = ((livePrice - item.averagePrice) / item.averagePrice) * 100;

            if (gainLoss > 0) {
                totalGain += gainLoss;
                winningStocks++;
            } else if (gainLoss < 0) {
                totalLoss += Math.abs(gainLoss);
                losingStocks++;
                maxDrawdown = Math.min(maxDrawdown, returnPct);
            }

            if (returnPct > bestPerformer.return) {
                bestPerformer = { ticker: item.ticker, return: returnPct };
            }
            if (returnPct < worstPerformer.return) {
                worstPerformer = { ticker: item.ticker, return: returnPct };
            }
        });

        const totalStocks = portfolio.length;
        const winRate = totalStocks > 0 ? (winningStocks / totalStocks) * 100 : 0;
        const avgGain = winningStocks > 0 ? totalGain / winningStocks : 0;
        const avgLoss = losingStocks > 0 ? totalLoss / losingStocks : 0;
        const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? Infinity : 0;

        return {
            winRate,
            avgGain,
            avgLoss,
            profitFactor,
            maxDrawdown,
            bestPerformer,
            worstPerformer,
            winningStocks,
            losingStocks,
        };
    }, [portfolio, prices]);

    if (!metrics) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Performance Metrics</h3>
                <p className="text-sm text-gray-500">Tambahkan saham untuk melihat metrics</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Performance Metrics</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analisis performa portfolio</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Win Rate */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Win Rate</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-500">
                        {metrics.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                        {metrics.winningStocks} of {portfolio.length} stocks
                    </p>
                </div>

                {/* Profit Factor */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Profit Factor</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500">
                        {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                        Gain/Loss ratio
                    </p>
                </div>

                {/* Max Drawdown */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-400">Max Drawdown</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-500">
                        {metrics.maxDrawdown.toFixed(1)}%
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                        Worst decline
                    </p>
                </div>

                {/* Average Gain */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Avg Gain</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500">
                        {formatIDR(metrics.avgGain)}
                    </p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                        Per winning stock
                    </p>
                </div>

                {/* Average Loss */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Avg Loss</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-500">
                        {formatIDR(metrics.avgLoss)}
                    </p>
                    <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                        Per losing stock
                    </p>
                </div>

                {/* Best Performer */}
                <div className="p-3 sm:p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Best</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-violet-600 dark:text-violet-500">
                        {metrics.bestPerformer.ticker}
                    </p>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">
                        +{metrics.bestPerformer.return.toFixed(1)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
