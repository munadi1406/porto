"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskData {
    ticker: string;
    beta: number;
    correlation: number;
    annualVolatilityPct: number;
    maxDrawdownPct: number;
    drawdownPeak: { date: string; price: number };
    drawdownTrough: { date: string; price: number };
    returnPct: number;
    sampleDays: number;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
    return (
        <div className="py-2 px-2 bg-muted/50 rounded-lg text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn("text-sm font-bold tabular-nums", tone)}>{value}</p>
            {sub && <p className="text-[9px] text-muted-foreground/80">{sub}</p>}
        </div>
    );
}

/** Beta vs IHSG, korelasi, volatilitas tahunan & max drawdown 1 tahun. */
export default function RiskMetricsCard({ ticker }: { ticker: string }) {
    const [data, setData] = useState<RiskData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setData(null);
        fetch(`/api/risk?ticker=${ticker}&period=1y`)
            .then(r => r.json())
            .then(j => { if (j.success) setData(j.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [ticker]);

    return (
        <div className="card">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                Risiko vs IHSG
                <span className="text-[9px] font-normal text-muted-foreground">1 tahun harian</span>
            </h3>

            {loading ? (
                <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">Menghitung metrik risiko…</div>
            ) : !data ? (
                <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">Data tidak tersedia</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Stat
                            label="Beta"
                            value={isFinite(data.beta) ? data.beta.toFixed(2) : "-"}
                            sub={data.beta > 1.15 ? "agresif" : data.beta < 0.85 ? "defensif" : "≈ pasar"}
                        />
                        <Stat
                            label="Korelasi IHSG"
                            value={isFinite(data.correlation) ? data.correlation.toFixed(2) : "-"}
                            sub={Math.abs(data.correlation) >= 0.7 ? "kuat" : Math.abs(data.correlation) >= 0.4 ? "sedang" : "lemah"}
                        />
                        <Stat label="Volatilitas" value={`${data.annualVolatilityPct.toFixed(1)}%`} sub="tahunan" />
                        <Stat
                            label="Max Drawdown"
                            value={`${data.maxDrawdownPct.toFixed(1)}%`}
                            tone="text-destructive"
                            sub={`return ${data.returnPct >= 0 ? "+" : ""}${data.returnPct.toFixed(1)}%`}
                        />
                    </div>
                    {data.maxDrawdownPct < -5 && (
                        <p className="mt-2 text-[10px] text-muted-foreground">
            Puncak {data.drawdownPeak.price.toLocaleString("id-ID")} ({data.drawdownPeak.date}) →
            dasar {data.drawdownTrough.price.toLocaleString("id-ID")} ({data.drawdownTrough.date})
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
