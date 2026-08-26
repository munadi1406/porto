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
            <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">Holding Period Analysis</h3>
                <p className="text-sm text-muted-foreground">Tambahkan saham untuk analisis</p>
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
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Holding Period Analysis</h3>
                    <p className="text-xs text-muted-foreground">Analisis berdasarkan waktu holding</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Avg Period</span>
                    </div>
                    <p className="text-lg font-bold text-primary">
                        {formatDays(analysis.avgHoldingDays)}
                    </p>
                </div>

                <div className="p-3 bg-warning/10 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs font-semibold text-warning">Short Term</span>
                    </div>
                    <p className="text-sm font-bold text-warning">
                        {analysis.shortTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgShortReturn >= 0 ? "text-success" : "text-destructive"
                    )}>
                        {analysis.avgShortReturn >= 0 ? "+" : ""}{analysis.avgShortReturn.toFixed(1)}% avg
                    </p>
                </div>

                <div className="p-3 bg-warning/10 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs font-semibold text-warning">Medium Term</span>
                    </div>
                    <p className="text-sm font-bold text-warning">
                        {analysis.mediumTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgMediumReturn >= 0 ? "text-success" : "text-destructive"
                    )}>
                        {analysis.avgMediumReturn >= 0 ? "+" : ""}{analysis.avgMediumReturn.toFixed(1)}% avg
                    </p>
                </div>

                <div className="p-3 bg-success/10 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs font-semibold text-success">Long Term</span>
                    </div>
                    <p className="text-sm font-bold text-success">
                        {analysis.longTerm.length} stocks
                    </p>
                    <p className={cn(
                        "text-xs mt-0.5",
                        analysis.avgLongReturn >= 0 ? "text-success" : "text-destructive"
                    )}>
                        {analysis.avgLongReturn >= 0 ? "+" : ""}{analysis.avgLongReturn.toFixed(1)}% avg
                    </p>
                </div>
            </div>

            {/* Best & Worst */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-success/10 rounded-xl border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-xs font-semibold text-success">Best Performer</span>
                    </div>
                    <p className="text-lg font-bold text-success">{analysis.bestPerformer?.ticker}</p>
                    <p className="text-sm text-success/80">
                        +{analysis.bestPerformer?.returnPct.toFixed(1)}% • {formatDays(analysis.bestPerformer?.holdingDays || 0)}
                    </p>
                </div>

                <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">Worst Performer</span>
                    </div>
                    <p className="text-lg font-bold text-destructive">{analysis.worstPerformer?.ticker}</p>
                    <p className="text-sm text-destructive/80">
                        {analysis.worstPerformer?.returnPct.toFixed(1)}% • {formatDays(analysis.worstPerformer?.holdingDays || 0)}
                    </p>
                </div>
            </div>

            {/* Holdings List */}
            <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">All Holdings</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {analysis.holdingData.map((holding) => (
                        <div key={`holding-${holding.ticker}`} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{holding.ticker}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(holding.firstBuyDate).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-sm font-bold",
                                        holding.returnPct >= 0 ? "text-success" : "text-destructive"
                                    )}>
                                        {holding.returnPct >= 0 ? "+" : ""}{holding.returnPct.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDays(holding.holdingDays)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-xs font-semibold",
                                    holding.category === "short" && "bg-warning/10 text-warning",
                                    holding.category === "medium" && "bg-warning/10 text-warning",
                                    holding.category === "long" && "bg-success/10 text-success"
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
