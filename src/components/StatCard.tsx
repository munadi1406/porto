"use client";
import { cn } from "@/lib/utils";
export function StatCard({ label, value, delta, icon: Icon, tone = "neutral" }: { label: string; value: string; delta?: string; icon?: any; tone?: "success"|"danger"|"neutral" }) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                {Icon && <Icon className={cn("w-4 h-4", tone==="success"?"text-success": tone==="danger"?"text-destructive":"text-muted-foreground")} />}
            </div>
            <div className="mt-1 text-lg font-black tabular-nums">{value}</div>
            {delta && <div className={cn("text-xs font-bold", tone==="success"?"text-success": tone==="danger"?"text-destructive":"text-muted-foreground")}>{delta}</div>}
        </div>
    );
}
