"use client";
import { useState, useMemo } from "react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { Activity, TrendingDown } from "lucide-react";

interface StressTestCardProps {
    beta: number;
    totalValue: number; // market value of portfolio (stock value)
}

export function StressTestCard({ beta, totalValue }: StressTestCardProps) {
    const [shock, setShock] = useState<number>(-10); // -5, -10, -20
    const betaSafe = Number.isFinite(beta) && beta !== 0 ? beta : 1;

    const { lossValue, lossPct } = useMemo(() => {
        const pct = betaSafe * shock; // e.g. beta 1.2 * -10% = -12%
        const val = (pct / 100) * totalValue; // negative
        return { lossValue: val, lossPct: pct };
    }, [betaSafe, shock, totalValue]);

    const options = [-5, -10, -20] as const;

    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-destructive/10 rounded-lg">
                    <Activity className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Portfolio Stress Test</h3>
                    <p className="text-[11px] text-muted-foreground">Estimasi kerugian jika IHSG turun · beta {betaSafe.toFixed(2)}</p>
                </div>
            </div>

            <div className="flex gap-2 mb-3">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => setShock(opt)}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold border transition-colors",
                            shock === opt
                                ? "bg-destructive text-destructive-foreground border-destructive"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                    >
                        IHSG {opt}%
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimasi Loss</p>
                    <p className="text-lg font-black text-destructive tabular-nums">{formatIDR(Math.abs(lossValue))}</p>
                    <p className="text-[10px] text-muted-foreground">{formatPercentage(lossPct)} dari portfolio</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sisa Portfolio</p>
                    <p className="text-lg font-black text-foreground tabular-nums">{formatIDR(totalValue + lossValue)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" /> skenario {shock}%</p>
                </div>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">Rumus: beta × shock × totalValue · murni kalkulasi client, tanpa endpoint baru.</p>

            {/* Slider for fine control */}
            <input
                type="range"
                min={-20}
                max={-1}
                step={1}
                value={shock}
                onChange={(e) => setShock(Number(e.target.value))}
                className="w-full mt-3 accent-destructive"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>-20%</span><span>-1%</span>
            </div>
        </div>
    );
}
