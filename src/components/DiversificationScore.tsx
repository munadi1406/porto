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
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">Diversification Score</h3>
                <p className="text-sm text-muted-foreground">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Diversification Score</h3>
                    <p className="text-xs text-muted-foreground">Analisis risiko konsentrasi</p>
                </div>
            </div>

            {/* Score Display */}
            <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                    <div>
                        <p className="text-4xl sm:text-5xl font-bold text-foreground">
                            {analysis.score.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                    </div>
                    <div className={cn(
                        "px-3 py-1.5 rounded-lg font-semibold text-sm",
                        analysis.riskColor === "green" && "bg-success/10 text-success",
                        analysis.riskColor === "yellow" && "bg-warning/10 text-warning",
                        analysis.riskColor === "red" && "bg-destructive/10 text-destructive"
                    )}>
                        {analysis.riskLevel.toUpperCase()} RISK
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            analysis.riskColor === "green" && "bg-success",
                            analysis.riskColor === "yellow" && "bg-warning",
                            analysis.riskColor === "red" && "bg-destructive"
                        )}
                        style={{ width: `${analysis.score}%` }}
                    />
                </div>

                {/* Recommendation */}
                <div className={cn(
                    "mt-3 p-3 rounded-lg flex items-start gap-2",
                    analysis.riskColor === "green" && "bg-success/10",
                    analysis.riskColor === "yellow" && "bg-warning/10",
                    analysis.riskColor === "red" && "bg-destructive/10"
                )}>
                    <AlertCircle className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        analysis.riskColor === "green" && "text-success",
                        analysis.riskColor === "yellow" && "text-warning",
                        analysis.riskColor === "red" && "text-destructive"
                    )} />
                    <p className={cn(
                        "text-sm font-medium",
                        analysis.riskColor === "green" && "text-success",
                        analysis.riskColor === "yellow" && "text-warning",
                        analysis.riskColor === "red" && "text-destructive"
                    )}>
                        {analysis.recommendation}
                    </p>
                </div>
            </div>

            {/* Concentration Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Top 1</p>
                    <p className="text-lg font-bold text-foreground">{analysis.top1.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Top 3</p>
                    <p className="text-lg font-bold text-foreground">{analysis.top3.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Stocks</p>
                    <p className="text-lg font-bold text-foreground">{analysis.totalStocks}</p>
                </div>
            </div>

            {/* Top Holdings */}
            <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Top Holdings</h4>
                <div className="space-y-2">
                    {analysis.topHoldings.map((holding, index) => (
                        <div key={`holding-${index}`} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-foreground">{holding.ticker}</span>
                                    <span className="text-sm font-bold text-foreground">{holding.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
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
