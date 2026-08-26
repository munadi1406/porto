"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Building2, Users, User } from "lucide-react";

interface Props {
    insidersPercent?: number | null;
    institutionsPercent?: number | null;
    institutionsCount?: number | null;
    sharia?: boolean | null;
}

const COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-violet-500', 'bg-rose-500', 'bg-cyan-500',
    'bg-orange-500', 'bg-pink-500', 'bg-lime-500',
];

export default function ShareholderChart({ insidersPercent, institutionsPercent, institutionsCount, sharia }: Props) {
    const data = useMemo(() => {
        const insiders = insidersPercent != null ? insidersPercent * 100 : null;
        const institutions = institutionsPercent != null ? institutionsPercent * 100 : null;
        const retail = (insiders != null && institutions != null)
            ? Math.max(0, 100 - insiders - institutions)
            : null;

        return [
            { label: 'Insider', value: insiders, color: 'bg-violet-500', icon: User },
            { label: 'Institutional', value: institutions, color: 'bg-blue-500', icon: Building2 },
            { label: 'Retail / Public', value: retail, color: 'bg-emerald-500', icon: Users },
        ].filter(d => d.value != null && d.value >= 0);
    }, [insidersPercent, institutionsPercent]);

    const total = data.reduce((s, d) => s + (d.value || 0), 0);

    if (data.length === 0) return null;

    return (
        <div className="space-y-4">
            <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-3">
                    Shareholder Structure
                    {institutionsCount != null && (
                        <span className="ml-2 text-[8px] font-normal text-muted-foreground/60">
                            ({institutionsCount} institutions)
                        </span>
                    )}
                </p>

                {/* Stacked Horizontal Bar */}
                <div className="h-6 bg-muted/30 rounded-full overflow-hidden flex">
                    {data.map((d, i) => (
                        d.value != null && d.value > 0 ? (
                            <div
                                key={d.label}
                                className={cn("h-full flex items-center justify-center text-[7px] font-black text-white uppercase transition-all duration-700", d.color)}
                                style={{ width: `${(d.value / total) * 100}%` }}
                            >
                                {d.value > 15 ? `${Math.round(d.value)}%` : ''}
                            </div>
                        ) : null
                    ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3">
                    {data.map((d, i) => (
                        d.value != null && (
                            <div key={d.label} className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-full", d.color)} />
                                <span className="text-[9px] font-medium text-muted-foreground">{d.label}</span>
                                <span className="text-[9px] font-bold text-foreground">{Math.round(d.value)}%</span>
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Sharia Badge */}
            {sharia && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Sharia Compliant</p>
                        <p className="text-[8px] text-muted-foreground">Termasuk Daftar Efek Syariah (DES) OJK</p>
                    </div>
                </div>
            )}
        </div>
    );
}
