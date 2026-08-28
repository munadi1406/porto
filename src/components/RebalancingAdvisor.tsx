"use client";
import { useMemo } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { formatIDR, cn } from "@/lib/utils";
import { ArrowRightLeft, Target } from "lucide-react";

interface RebalancingAdvisorProps {
    portfolio: PortfolioItem[];
    prices: Record<string, StockPrice>;
}

export function RebalancingAdvisor({ portfolio, prices }: RebalancingAdvisorProps) {
    const advice = useMemo(() => {
        if (portfolio.length === 0) return [];
        const total = portfolio.reduce((sum, item) => {
            const price = prices[item.ticker]?.price || item.averagePrice;
            return sum + item.lots * 100 * price;
        }, 0);
        if (total <= 0) return [];

        const hasTarget = portfolio.some(p => (p.targetPercentage ?? 0) > 0);
        // fallback to equal weight if no target set
        const equalPct = portfolio.length > 0 ? 100 / portfolio.length : 0;

        const list = portfolio.map(item => {
            const price = prices[item.ticker]?.price || item.averagePrice || 1;
            const marketValue = item.lots * 100 * price;
            const actualPct = (marketValue / total) * 100;
            const targetPct = hasTarget ? (item.targetPercentage ?? 0) : equalPct;
            const diffPct = actualPct - targetPct;
            const diffValue = (diffPct / 100) * total;
            const lotDiff = Math.round(Math.abs(diffValue) / (price * 100));
            return { ticker: item.ticker, actualPct, targetPct, diffPct, diffValue, lotDiff, price };
        }).filter(a => Math.abs(a.diffPct) >= 1 && a.lotDiff > 0);

        // sort biggest absolute diff first
        list.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
        return list.slice(0, 5);
    }, [portfolio, prices]);

    if (portfolio.length === 0) return null;

    const hasTarget = portfolio.some(p => (p.targetPercentage ?? 0) > 0);

    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground">Rebalancing Advisor</h3>
                    <p className="text-[11px] text-muted-foreground">
                        {hasTarget ? "Bandingkan alokasi aktual vs target" : "Belum ada target% — pakai bobot merata sebagai acuan"}
                    </p>
                </div>
            </div>

            {advice.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Portfolio sudah seimbang dengan target alokasi.</p>
            ) : (
                <div className="space-y-2">
                    {advice.map(a => {
                        const action = a.diffPct > 0 ? "jual" : "beli";
                        return (
                            <div key={a.ticker} className={cn("flex items-center justify-between gap-3 p-2.5 rounded-lg border", a.diffPct > 0 ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20")}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-black">{a.ticker.slice(0,2)}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">
                                            {action} ~{a.lotDiff} lot {a.ticker.replace(".JK","")} untuk kembali ke {a.targetPct.toFixed(0)}%
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            saat ini {a.actualPct.toFixed(1)}% · selisih {a.diffPct > 0 ? "+" : ""}{a.diffPct.toFixed(1)}% ({formatIDR(Math.abs(a.diffValue))})
                                        </p>
                                    </div>
                                </div>
                                <span className={cn("text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap", a.diffPct > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                                    {action.toUpperCase()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {!hasTarget && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Target className="w-3 h-3" /> Atur target% per saham via API PUT /api/portfolio untuk saran yang lebih akurat.</p>
            )}
        </div>
    );
}
