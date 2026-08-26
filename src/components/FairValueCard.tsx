"use client";

import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { assessFairValue, grahamNumber, type FairValueVerdict } from "@/lib/quant";

const VERDICT_STYLE: Record<FairValueVerdict, { label: string; cls: string }> = {
    UNDERVALUED: { label: "Under-valued", cls: "bg-success/10 text-success border-success/30" },
    FAIR: { label: "Wajar", cls: "bg-warning/10 text-warning border-warning/30" },
    OVERVALUED: { label: "Over-valued", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    UNKNOWN: { label: "Data kurang", cls: "bg-muted text-muted-foreground border-border" },
};

/**
 * Estimasi fair value via Graham Number √(22.5 × EPS × BVPS).
 * Sumber EPS & BVPS dari fundamentals (Yahoo). Hanya relevan untuk
 * saham profitabel — jika EPS/BVPS tidak tersedia, tampilkan catatan.
 */
export default function FairValueCard({
    price,
    eps,
    bvps,
}: {
    price: number | null;
    eps: number | null;
    bvps: number | null;
}) {
    const graham = grahamNumber(eps, bvps);
    const assessment = assessFairValue(price, graham);
    const style = VERDICT_STYLE[assessment.verdict];

    return (
        <div className="card">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Fair Value
                <span className={cn("ml-auto text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 border", style.cls)}>
                    {style.label}
                </span>
            </h3>

            {!graham ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                    EPS atau nilai buku per saham tidak tersedia — Graham Number membutuhkan keduanya
                    (hanya berlaku untuk perusahaan profitabel).
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Harga</p>
                            <p className="text-sm font-bold tabular-nums">{price?.toLocaleString("id-ID") ?? "-"}</p>
                        </div>
                        <div className="py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Graham Number</p>
                            <p className="text-sm font-bold tabular-nums text-primary">{Math.round(graham).toLocaleString("id-ID")}</p>
                        </div>
                        <div className="py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Potensi</p>
                            <p className={cn("text-sm font-bold tabular-nums",
                                (assessment.upsidePct ?? 0) >= 0 ? "text-success" : "text-destructive")}>
                                {assessment.upsidePct != null ? `${assessment.upsidePct >= 0 ? "+" : ""}${assessment.upsidePct.toFixed(1)}%` : "-"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                        <span>EPS: <b className="text-foreground tabular-nums">{eps ?? "-"}</b></span>
                        <span>BVPS: <b className="text-foreground tabular-nums">{bvps ?? "-"}</b></span>
                    </div>
                    <p className="mt-1.5 text-[9px] text-muted-foreground/70 leading-relaxed">
                        Graham Number = √(22.5 × EPS × BVPS). Under-valued bila harga &lt; fair value −20%,
                        over-valued bila &gt; +20%. Patokan kasar — pertimbangkan juga prospek bisnis, utang, dan siklus industri.
                    </p>
                </>
            )}
        </div>
    );
}
