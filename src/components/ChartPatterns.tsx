"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { detectChartPatterns, detectSupportResistance, type OHLCBar, type DetectedPattern } from "@/lib/patternDetection";
import { TrendingUp, TrendingDown, Minus, LineChart, Shield, ArrowUpRight, Activity } from "lucide-react";

function DirectionBadge({ direction }: { direction: DetectedPattern['direction'] }) {
    if (direction === 'bullish') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded"><TrendingUp className="w-3 h-3" /> Bullish</span>;
    }
    if (direction === 'bearish') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded"><TrendingDown className="w-3 h-3" /> Bearish</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded"><Minus className="w-3 h-3" /> Netral</span>;
}

function CategoryIcon({ category }: { category: DetectedPattern['category'] }) {
    switch (category) {
        case 'reversal': return <ArrowUpRight className="w-4 h-4 text-warning" />;
        case 'continuation': return <Activity className="w-4 h-4 text-primary" />;
        case 'level': return <Shield className="w-4 h-4 text-success" />;
        default: return <LineChart className="w-4 h-4 text-muted-foreground" />;
    }
}

export default function ChartPatterns({ data }: { data: OHLCBar[] }) {
    const patterns = useMemo(() => detectChartPatterns(data), [data]);
    const levels = useMemo(() => detectSupportResistance(data), [data]);

    if (patterns.length === 0 && !levels.support && !levels.resistance) {
        return <p className="text-xs text-muted-foreground">Data belum cukup untuk mendeteksi pola chart.</p>;
    }

    return (
        <div className="space-y-4">
            {/* Support & Resistance */}
            {(levels.support || levels.resistance) && (
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Level Kunci</p>
                    <div className="flex gap-3">
                        {levels.resistance && (
                            <div className="flex-1 bg-destructive/5 border border-destructive/20 rounded-lg p-2.5">
                                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Resistance</p>
                                <p className="text-sm font-bold text-destructive font-mono">Rp {levels.resistance.toLocaleString('id-ID')}</p>
                            </div>
                        )}
                        {levels.support && (
                            <div className="flex-1 bg-success/5 border border-success/20 rounded-lg p-2.5">
                                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Support</p>
                                <p className="text-sm font-bold text-success font-mono">Rp {levels.support.toLocaleString('id-ID')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detected patterns */}
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pola Chart Terdeteksi</p>
                <div className="space-y-2">
                    {patterns.map((p) => (
                        <div key={p.id} className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <CategoryIcon category={p.category} />
                                    <span className="text-xs font-bold text-foreground">{p.name}</span>
                                </div>
                                <DirectionBadge direction={p.direction} />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                            {p.price != null && (
                                <p className="text-[10px] text-muted-foreground mt-1.5">
                                    Level kunci: <span className="font-bold text-foreground font-mono">Rp {p.price.toLocaleString('id-ID')}</span>
                                </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full",
                                            p.confidence >= 70 ? "bg-success" : p.confidence >= 50 ? "bg-warning" : "bg-muted-foreground"
                                        )}
                                        style={{ width: `${p.confidence}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{p.confidence}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
