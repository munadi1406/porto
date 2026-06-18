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
            <div className="bg-card p-6 rounded-2xl border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground">Tambahkan saham untuk melihat metrics</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-4 sm:p-6 rounded-2xl shadow-sm border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Performance Metrics</h3>
                    <p className="text-xs text-muted-foreground">Analisis performa portfolio</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Win Rate */}
                <div className="p-3 sm:p-4 bg-primary/5 rounded-xl border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Win Rate</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                        {metrics.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                        {metrics.winningStocks} of {portfolio.length} stocks
                    </p>
                </div>

                {/* Profit Factor */}
                <div className="p-3 sm:p-4 bg-success/5 rounded-xl border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-xs font-semibold text-success">Profit Factor</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-success">
                        {metrics.profitFactor === Infinity ? "8" : metrics.profitFactor.toFixed(2)}
                    </p>
                    <p className="text-xs text-success/70 mt-1">
                        Gain/Loss ratio
                    </p>
                </div>

                {/* Max Drawdown */}
                <div className="p-3 sm:p-4 bg-destructive/5 rounded-xl border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">Max Drawdown</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-destructive">
                        {metrics.maxDrawdown.toFixed(1)}%
                    </p>
                    <p className="text-xs text-destructive/70 mt-1">
                        Worst decline
                    </p>
                </div>

                {/* Average Gain */}
                <div className="p-3 sm:p-4 bg-success/5 rounded-xl border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-success" />
                        <span className="text-xs font-semibold text-success">Avg Gain</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-success">
                        {formatIDR(metrics.avgGain)}
                    </p>
                    <p className="text-xs text-success/70 mt-1">
                        Per winning stock
                    </p>
                </div>

                {/* Average Loss */}
                <div className="p-3 sm:p-4 bg-warning/5 rounded-xl border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-xs font-semibold text-warning">Avg Loss</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-warning">
                        {formatIDR(metrics.avgLoss)}
                    </p>
                    <p className="text-xs text-warning/70 mt-1">
                        Per losing stock
                    </p>
                </div>

                {/* Best Performer */}
                <div className="p-3 sm:p-4 bg-primary/5 rounded-xl border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Best</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-primary">
                        {metrics.bestPerformer.ticker}
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                        +{metrics.bestPerformer.return.toFixed(1)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
