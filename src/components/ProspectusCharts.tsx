"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Props {
    revenue: number;
    netProfit: number;
    totalAssets: number;
    totalEquity: number;
    totalLiabilities: number;
    eps: number;
    per: number;
    pbv: number;
    roe: number;
    der: number;
    currentRatio: number;
    revenueGrowth: number;
    profitGrowth: number;
    grossMargin?: number;
    netMargin?: number;
    ipoPrice: number;
    fairValue: number;
    priceTargets: { month1: number; month3: number; year1: number };
    aPrices: number[];
}

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground w-16 text-right shrink-0">{label}</span>
            <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-bold text-foreground w-10 text-right shrink-0">{pct}%</span>
        </div>
    );
}

export default function ProspectusCharts({ revenue, netProfit, totalAssets, totalEquity, totalLiabilities, eps, per, pbv, roe, der, currentRatio, revenueGrowth, profitGrowth, grossMargin, netMargin, ipoPrice, fairValue, priceTargets, aPrices }: Props) {
    const finBars = useMemo(() => [
        { label: 'ROE', value: roe, color: 'bg-emerald-500', suffix: '%', goodIf: 'high' as const },
        { label: 'PER', value: per, color: per < 15 ? 'bg-emerald-500' : per < 25 ? 'bg-amber-500' : 'bg-red-500', suffix: 'x', goodIf: 'low' as const },
        { label: 'PBV', value: pbv, color: pbv < 2 ? 'bg-emerald-500' : pbv < 4 ? 'bg-amber-500' : 'bg-red-500', suffix: 'x', goodIf: 'low' as const },
        { label: 'DER', value: der, color: der < 1 ? 'bg-emerald-500' : der < 2 ? 'bg-amber-500' : 'bg-red-500', suffix: 'x', goodIf: 'low' as const },
        { label: 'CR', value: currentRatio, color: currentRatio > 1.5 ? 'bg-emerald-500' : currentRatio > 1 ? 'bg-amber-500' : 'bg-red-500', suffix: 'x', goodIf: 'high' as const },
        { label: 'EPS', value: eps, color: eps > 0 ? 'bg-emerald-500' : 'bg-red-500', suffix: '', goodIf: 'high' as const },
    ], [roe, per, pbv, der, currentRatio, eps]);

    const maxFin = Math.max(...finBars.map(b => Math.abs(b.value || 0.01)));

    const maxBalance = Math.max(totalAssets, totalEquity, totalLiabilities, 1);

    const maxTarget = Math.max(priceTargets.month1, priceTargets.month3, priceTargets.year1, ipoPrice, fairValue || 0, 1);

    const maxAra = Math.max(...aPrices.filter(p => p > 0), 1);

    return (
        <div className="space-y-5">
            {/* Revenue & Profit */}
            {(revenue > 0 || netProfit > 0) && (
                <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">Revenue & Profit</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                            <div className="flex items-baseline justify-between mb-1">
                                <span className="text-[9px] text-muted-foreground font-medium">Revenue</span>
                                <span className="text-sm font-black text-foreground">Rp{(revenue / 1e9).toFixed(1)}M</span>
                            </div>
                            {revenueGrowth !== 0 && (
                                <span className={cn("text-[10px] font-bold", revenueGrowth >= 0 ? "text-success" : "text-destructive")}>
                                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% YoY
                                </span>
                            )}
                        </div>
                        <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                            <div className="flex items-baseline justify-between mb-1">
                                <span className="text-[9px] text-muted-foreground font-medium">Net Profit</span>
                                <span className="text-sm font-black text-foreground">Rp{(netProfit / 1e9).toFixed(1)}M</span>
                            </div>
                            {profitGrowth !== 0 && (
                                <span className={cn("text-[10px] font-bold", profitGrowth >= 0 ? "text-success" : "text-destructive")}>
                                    {profitGrowth >= 0 ? '+' : ''}{profitGrowth.toFixed(1)}% YoY
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Sheet Stacked Bar */}
            {(totalAssets > 0 || totalEquity > 0 || totalLiabilities > 0) && (
                <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">Balance Sheet</p>
                    <div className="space-y-2">
                        <MiniBar value={totalAssets} max={maxBalance} color="bg-blue-500" label="Assets" />
                        <MiniBar value={totalEquity} max={maxBalance} color="bg-emerald-500" label="Equity" />
                        <MiniBar value={totalLiabilities} max={maxBalance} color="bg-amber-500" label="Liabilities" />
                    </div>
                </div>
            )}

            {/* Margins */}
            {(grossMargin || netMargin) && (
                <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">Profitability Margins</p>
                    <div className="grid grid-cols-2 gap-3">
                        {grossMargin != null && (
                            <div className="p-3 bg-muted/20 rounded-xl text-center border border-border/50">
                                <p className="text-[10px] text-muted-foreground font-medium">Gross Margin</p>
                                <p className={cn("text-xl font-black", grossMargin >= 30 ? "text-success" : grossMargin >= 15 ? "text-amber-500" : "text-destructive")}>
                                    {grossMargin.toFixed(1)}%
                                </p>
                            </div>
                        )}
                        {netMargin != null && (
                            <div className="p-3 bg-muted/20 rounded-xl text-center border border-border/50">
                                <p className="text-[10px] text-muted-foreground font-medium">Net Margin</p>
                                <p className={cn("text-xl font-black", netMargin >= 10 ? "text-success" : netMargin >= 5 ? "text-amber-500" : "text-destructive")}>
                                    {netMargin.toFixed(1)}%
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Financial Ratios Bar */}
            <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">Key Ratios</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {finBars.map(b => (
                        <div key={b.label} className="p-2.5 bg-muted/20 rounded-xl text-center border border-border/50">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">{b.label}</p>
                            <p className={cn("text-sm font-black", b.color.includes('red') ? 'text-destructive' : b.color.includes('amber') ? 'text-amber-500' : 'text-foreground')}>
                                {typeof b.value === 'number' ? b.value.toFixed(b.label === 'CR' ? 1 : 0) : '-'}{b.suffix}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ARA Projection Chart */}
            <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">ARA Price Projection</p>
                <div className="bg-muted/10 rounded-xl border border-border/50 p-4">
                    <div className="flex items-end justify-between h-32 gap-1">
                        {aPrices.map((p, i) => {
                            const pct = maxAra > 0 ? (p / maxAra) * 100 : 0;
                            const isMax = p >= maxAra;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className={cn("text-[9px] font-bold", isMax ? "text-warning" : "text-foreground")}>
                                        {p > 0 ? `Rp${(p / 1000).toFixed(0)}` : '-'}
                                    </span>
                                    <div className="w-full bg-muted/30 rounded-t-md overflow-hidden" style={{ height: `${Math.max(pct, 2)}%` }}>
                                        <div className={cn(
                                            "w-full h-full rounded-t-md transition-all duration-700",
                                            isMax ? "bg-gradient-to-t from-warning/80 to-warning/30" : "bg-gradient-to-t from-primary/80 to-primary/30"
                                        )} />
                                    </div>
                                    <span className={cn("text-[7px] font-bold", isMax ? "text-warning" : "text-muted-foreground")}>
                                        ARA #{i + 1}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Price Targets */}
            <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">Price Targets vs IPO / Fair Value</p>
                <div className="bg-muted/10 rounded-xl border border-border/50 p-4">
                    <div className="flex items-end justify-between h-24 gap-2">
                        {[
                            { label: 'IPO', value: ipoPrice, color: 'bg-blue-500' },
                            { label: '1 Bulan', value: priceTargets.month1, color: 'bg-emerald-500' },
                            { label: '3 Bulan', value: priceTargets.month3, color: 'bg-amber-500' },
                            { label: '1 Tahun', value: priceTargets.year1, color: 'bg-violet-500' },
                            { label: 'Fair Value', value: fairValue, color: 'bg-rose-500' },
                        ].map(({ label, value, color }) => {
                            const pct = maxTarget > 0 ? (value / maxTarget) * 100 : 0;
                            return (
                                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold text-foreground">{value > 0 ? `Rp${(value / 1000).toFixed(0)}` : '-'}</span>
                                    <div className="w-full bg-muted/30 rounded-t-md overflow-hidden" style={{ height: `${Math.max(pct, 2)}%` }}>
                                        <div className={cn("w-full h-full rounded-t-md transition-all duration-700", color)} />
                                    </div>
                                    <span className="text-[7px] font-bold text-muted-foreground">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
