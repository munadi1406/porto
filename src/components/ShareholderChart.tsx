"use client";

import { cn } from "@/lib/utils";
import { Building2, Users, User } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface ShareholderItem {
    name?: string | null;
    percentage?: number | null;
    count?: number | null;
}

interface Props {
    shareholders?: ShareholderItem[] | null;
    insidersPercent?: number | null;
    institutionsPercent?: number | null;
    institutionsCount?: number | null;
    sharia?: boolean | null;
}

const CHART_COLORS = [
    "#2563eb", "#10b981", "#f59e0b", "#8b5cf6",
    "#f43f5e", "#06b6d4", "#f97316", "#84cc16",
];

export function formatOwnershipPercentage(value: unknown): string {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    const digits = number > 0 && number < 0.01 ? 6 : number > 0 && number < 1 ? 4 : 2;
    return `${number.toLocaleString("id-ID", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    })}%`;
}

export function formatShareCount(value: unknown): string {
    const number = Number(value);
    return Number.isFinite(number) ? `${Math.round(number).toLocaleString("id-ID")} lembar` : "-";
}

export default function ShareholderChart({ shareholders, insidersPercent, institutionsPercent, institutionsCount, sharia }: Props) {
    const reported = (shareholders ?? [])
        .map((item, index) => ({
            label: String(item.name || `Pemegang saham ${index + 1}`).trim(),
            value: Number(item.percentage),
            count: Number(item.count),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0)
        .sort((a, b) => b.value - a.value);

    if (reported.length > 0) {
        const primary = reported.slice(0, 6);
        const remainingValue = reported.slice(6).reduce((sum, item) => sum + item.value, 0);
        const chartData = remainingValue > 0
            ? [...primary, { label: "Lainnya", value: remainingValue, count: 0 }]
            : primary;
        const reportedTotal = reported.reduce((sum, item) => sum + item.value, 0);
        const unidentified = Math.max(0, 100 - reportedTotal);
        if (unidentified >= 0.001) chartData.push({ label: "Belum teridentifikasi", value: unidentified, count: 0 });

        return (
            <div className="space-y-4">
                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
                    <div className="relative mx-auto h-[240px] w-full max-w-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={98}
                                    paddingAngle={1.5}
                                    cornerRadius={4}
                                    stroke="hsl(var(--card))"
                                    strokeWidth={2}
                                >
                                    {chartData.map((item, index) => (
                                        <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    cursor={false}
                                    content={({ active, payload }) => {
                                        const item = payload?.[0]?.payload;
                                        if (!active || !item) return null;
                                        return (
                                            <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
                                                <p className="max-w-52 text-xs font-bold text-popover-foreground">{item.label}</p>
                                                <p className="mt-1 font-mono text-sm font-black text-primary">{formatOwnershipPercentage(item.value)}</p>
                                                {item.count > 0 ? <p className="text-[10px] text-muted-foreground">{formatShareCount(item.count)}</p> : null}
                                            </div>
                                        );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-xl font-black">{reportedTotal.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">teridentifikasi</span>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <p className="mb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Komposisi Kepemilikan IDX</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {chartData.map((item, index) => (
                                <div key={item.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{item.label}</span>
                                    <span className="shrink-0 font-mono text-[10px] font-black">{formatOwnershipPercentage(item.value)}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-[10px] text-muted-foreground">
                            {reported.length} pemegang saham dengan persentase di atas 0 tercatat pada data IDX.
                        </p>
                    </div>
                </div>

                {sharia ? <ShariaBadge /> : null}
            </div>
        );
    }

    const insiders = insidersPercent != null ? insidersPercent * 100 : null;
    const institutions = institutionsPercent != null ? institutionsPercent * 100 : null;
    const retail = insiders != null && institutions != null ? Math.max(0, 100 - insiders - institutions) : null;
    const fallbackData = [
        { label: "Insider", value: insiders, color: "bg-violet-500", icon: User },
        { label: "Institutional", value: institutions, color: "bg-blue-500", icon: Building2 },
        { label: "Retail / Public", value: retail, color: "bg-emerald-500", icon: Users },
    ].filter(item => item.value != null && item.value >= 0);
    const total = fallbackData.reduce((sum, item) => sum + (item.value || 0), 0);

    if (fallbackData.length === 0) return null;

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Shareholder Structure
                    {institutionsCount != null ? <span className="ml-2 text-[8px] font-normal text-muted-foreground/60">({institutionsCount} institutions)</span> : null}
                </p>
                <div className="flex h-6 overflow-hidden rounded-full bg-muted/30">
                    {fallbackData.map(item => item.value != null && item.value > 0 ? (
                        <div
                            key={item.label}
                            className={cn("flex h-full items-center justify-center text-[7px] font-black uppercase text-white transition-all duration-700", item.color)}
                            style={{ width: `${(item.value / total) * 100}%` }}
                        >
                            {item.value > 15 ? `${Math.round(item.value)}%` : ""}
                        </div>
                    ) : null)}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                    {fallbackData.map(item => item.value != null ? (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div className={cn("h-2 w-2 rounded-full", item.color)} />
                            <span className="text-[9px] font-medium text-muted-foreground">{item.label}</span>
                            <span className="text-[9px] font-bold">{formatOwnershipPercentage(item.value)}</span>
                        </div>
                    ) : null)}
                </div>
            </div>
            {sharia ? <ShariaBadge /> : null}
        </div>
    );
}

function ShariaBadge() {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <div className="rounded-lg bg-emerald-500/20 p-1.5"><User className="h-3.5 w-3.5 text-emerald-500" /></div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Sharia Compliant</p>
                <p className="text-[8px] text-muted-foreground">Termasuk Daftar Efek Syariah (DES) OJK</p>
            </div>
        </div>
    );
}
