"use client";

import { useMemo } from "react";
import { PieChart, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";

interface DiversificationScoreProps {
    portfolio: PortfolioItem[];
    prices: Record<string, { price: number; change: number }>;
}

export function DiversificationScore({ portfolio, prices }: DiversificationScoreProps) {
    const analysis = useMemo(() => {
        if (portfolio.length === 0) return null;

        // Calculate total portfolio value
        let totalValue = 0;
        const stockValues: { ticker: string; value: number; percentage: number }[] = [];

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || item.averagePrice;
            const value = item.lots * 100 * livePrice;
            totalValue += value;
            stockValues.push({ ticker: item.ticker, value, percentage: 0 });
        });

        // Calculate percentages
        stockValues.forEach((stock) => {
            stock.percentage = (stock.value / totalValue) * 100;
        });

        // Sort by value descending
        stockValues.sort((a, b) => b.value - a.value);

        // Calculate concentration metrics
        const top1 = stockValues[0]?.percentage || 0;
        const top3 = stockValues.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0);
        const top5 = stockValues.slice(0, 5).reduce((sum, s) => sum + s.percentage, 0);

        // Calculate Herfindahl-Hirschman Index (HHI)
        const hhi = stockValues.reduce((sum, stock) => sum + Math.pow(stock.percentage, 2), 0);

        // Diversification Score (0-100, higher is better)
        // Perfect diversification (equal weights) = 100
        // All in one stock = 0
        const perfectHHI = 10000 / portfolio.length; // HHI for equal weights
        const worstHHI = 10000; // HHI for all in one stock
        const score = Math.max(0, Math.min(100, ((worstHHI - hhi) / (worstHHI - perfectHHI)) * 100));

        // Risk level
        let riskLevel: "low" | "medium" | "high";
        let riskColor: string;
        let recommendation: string;

        if (score >= 70) {
            riskLevel = "low";
            riskColor = "green";
            recommendation = "Portfolio well diversified";
        } else if (score >= 40) {
            riskLevel = "medium";
            riskColor = "yellow";
            recommendation = "Consider adding more stocks";
        } else {
            riskLevel = "high";
            riskColor = "red";
            recommendation = "High concentration risk - diversify!";
        }

        return {
            score,
            riskLevel,
            riskColor,
            recommendation,
            top1,
            top3,
            top5,
            totalStocks: portfolio.length,
            topHoldings: stockValues.slice(0, 5),
        };
    }, [portfolio, prices]);

    if (!analysis) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Diversification Score</h3>
                <p className="text-sm text-gray-500">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Diversification Score</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analisis risiko konsentrasi</p>
                </div>
            </div>

            {/* Score Display */}
            <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                    <div>
                        <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {analysis.score.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">out of 100</p>
                    </div>
                    <div className={cn(
                        "px-3 py-1.5 rounded-lg font-semibold text-sm",
                        analysis.riskColor === "green" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                        analysis.riskColor === "yellow" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                        analysis.riskColor === "red" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    )}>
                        {analysis.riskLevel.toUpperCase()} RISK
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            analysis.riskColor === "green" && "bg-gradient-to-r from-green-500 to-emerald-500",
                            analysis.riskColor === "yellow" && "bg-gradient-to-r from-yellow-500 to-amber-500",
                            analysis.riskColor === "red" && "bg-gradient-to-r from-red-500 to-rose-500"
                        )}
                        style={{ width: `${analysis.score}%` }}
                    />
                </div>

                {/* Recommendation */}
                <div className={cn(
                    "mt-3 p-3 rounded-lg flex items-start gap-2",
                    analysis.riskColor === "green" && "bg-green-50 dark:bg-green-900/10",
                    analysis.riskColor === "yellow" && "bg-yellow-50 dark:bg-yellow-900/10",
                    analysis.riskColor === "red" && "bg-red-50 dark:bg-red-900/10"
                )}>
                    <AlertCircle className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        analysis.riskColor === "green" && "text-green-600",
                        analysis.riskColor === "yellow" && "text-yellow-600",
                        analysis.riskColor === "red" && "text-red-600"
                    )} />
                    <p className={cn(
                        "text-sm font-medium",
                        analysis.riskColor === "green" && "text-green-700 dark:text-green-400",
                        analysis.riskColor === "yellow" && "text-yellow-700 dark:text-yellow-400",
                        analysis.riskColor === "red" && "text-red-700 dark:text-red-400"
                    )}>
                        {analysis.recommendation}
                    </p>
                </div>
            </div>

            {/* Concentration Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 1</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analysis.top1.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 3</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analysis.top3.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stocks</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analysis.totalStocks}</p>
                </div>
            </div>

            {/* Top Holdings */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Holdings</h4>
                <div className="space-y-2">
                    {analysis.topHoldings.map((holding, index) => (
                        <div key={`holding-${index}`} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{holding.ticker}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{holding.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                        style={{ width: `${holding.percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
