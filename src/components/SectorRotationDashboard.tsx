"use client";

import { useMemo, useState } from "react";
import { cn, formatCompactIDR, formatPercentage } from "@/lib/utils";
import { PieChart, LayoutGrid, Table2, TrendingUp, TrendingDown, Compass } from "lucide-react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
    ZAxis,
} from "recharts";

interface SectorSummary {
    sector: string;
    stocks: number;
    totalVolume: number;
    totalValue: number;
    avgChangePercent: number;
    gainers: number;
    losers: number;
}

type Quad = "leading" | "improving" | "lagging" | "weakening";

interface Point {
    sector: string;
    short: string;
    x: number;
    y: number;
    z: number;
    totalValue: number;
    stocks: number;
    gainers: number;
    losers: number;
    avgChangePercent: number;
    quad: Quad;
}

function getQuad(x: number, y: number): Quad {
    if (x >= 0 && y >= 0) return "leading";
    if (x < 0 && y >= 0) return "improving";
    if (x < 0 && y < 0) return "lagging";
    return "weakening";
}

function quadColor(quad: Quad): string {
    switch (quad) {
        case "leading":
            return "var(--success)";
        case "lagging":
            return "var(--destructive)";
        case "improving":
            return "#3b82f6";
        case "weakening":
            return "#f59e0b";
    }
}

function quadLabel(quad: Quad): string {
    switch (quad) {
        case "leading":
            return "Leading";
        case "improving":
            return "Improving";
        case "lagging":
            return "Lagging";
        case "weakening":
            return "Weakening";
    }
}

function shortSector(name: string): string {
    const map: Record<string, string> = {
        Energi: "ENRG",
        "Bahan Baku": "BASIC",
        Perindustrian: "INDU",
        "Barang Konsumen Primer": "CONS-P",
        "Barang Konsumen Non-Primer": "CONS-NP",
        Kesehatan: "HLTH",
        Keuangan: "FIN",
        "Properti & Real Estate": "PROP",
        Teknologi: "TECH",
        Infrastruktur: "INFR",
        "Transportasi & Logistik": "TRANS",
        Lainnya: "OTH",
    };
    if (map[name]) return map[name];
    return name.slice(0, 4).toUpperCase();
}

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null;
    const p: Point = payload[0].payload;
    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs min-w-[160px]">
            <p className="font-bold text-foreground truncate">{p.sector}</p>
            <div className="mt-1 space-y-0.5 text-[11px]">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Momentum (x)</span><span className={cn("font-bold", p.x >= 0 ? "text-success" : "text-destructive")}>{formatPercentage(p.x)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Rel. Strength (y)</span><span className={cn("font-bold", p.y >= 0 ? "text-success" : "text-destructive")}>{p.y >= 0 ? "+" : ""}{p.y.toFixed(1)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Breadth</span><span className="font-mono text-foreground">{p.gainers}↑ {p.losers}↓ / {p.stocks}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Value</span><span className="font-mono text-foreground">{formatCompactIDR(p.totalValue)}</span></div>
                <div className="mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border" style={{ color: quadColor(p.quad), borderColor: quadColor(p.quad), background: `color-mix(in srgb, ${quadColor(p.quad)} 12%, transparent)` }}>{quadLabel(p.quad)}</div>
            </div>
        </div>
    );
}

export function SectorRotationDashboard({ sectors, onViewAll }: { sectors: SectorSummary[]; onViewAll?: () => void }) {
    const [view, setView] = useState<"chart" | "table">("chart");

    const points = useMemo<Point[]>(() => {
        if (!sectors.length) return [];
        return sectors.map(s => {
            const y = s.stocks > 0 ? ((s.gainers - s.losers) / s.stocks) * 100 : 0;
            const x = s.avgChangePercent;
            const z = Math.log10(Math.max(1, s.totalValue));
            return {
                sector: s.sector,
                short: shortSector(s.sector),
                x: Math.round(x * 100) / 100,
                y: Math.round(y * 10) / 10,
                z,
                totalValue: s.totalValue,
                stocks: s.stocks,
                gainers: s.gainers,
                losers: s.losers,
                avgChangePercent: s.avgChangePercent,
                quad: getQuad(x, y),
            };
        });
    }, [sectors]);

    const sortedTable = useMemo(() => [...sectors].sort((a, b) => b.totalValue - a.totalValue), [sectors]);

    const quadCounts = useMemo(() => {
        const c: Record<Quad, number> = { leading: 0, improving: 0, lagging: 0, weakening: 0 };
        points.forEach(p => c[p.quad]++);
        return c;
    }, [points]);

    const xVals = points.map(p => p.x);
    const yVals = points.map(p => p.y);
    const xMin = xVals.length ? Math.min(...xVals, -0.4) : -1;
    const xMax = xVals.length ? Math.max(...xVals, 0.4) : 1;
    const yMin = yVals.length ? Math.min(...yVals, -8) : -10;
    const yMax = yVals.length ? Math.max(...yVals, 8) : 10;
    const xPad = Math.max(0.6, (xMax - xMin) * 0.18);
    const yPad = Math.max(8, (yMax - yMin) * 0.18);

    if (!sectors.length) {
        return (
            <div className="card-flush p-8 text-center text-sm text-muted-foreground">No sector data</div>
        );
    }

    return (
        <div className="card-flush overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="card-title">Sector Rotation — Quadrant</h3>
                <span className="hidden sm:inline text-[10px] font-medium text-muted-foreground ml-1">x: momentum (avg %chg) · y: relative strength (breadth) · bubble = value</span>
                <div className="ml-auto flex items-center gap-1">
                    <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
                        <button
                            onClick={() => setView("chart")}
                            className={cn("inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors", view === "chart" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <LayoutGrid className="w-3 h-3" /> Chart
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={cn("inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Table2 className="w-3 h-3" /> Table
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-3 flex flex-wrap items-center gap-2 text-[10px]">
                {(["leading", "improving", "lagging", "weakening"] as Quad[]).map(q => (
                    <span key={q} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-bold" style={{ borderColor: quadColor(q), color: quadColor(q), background: `color-mix(in srgb, ${quadColor(q)} 10%, transparent)` }}>
                        <span className="size-2 rounded-full" style={{ background: quadColor(q) }} />
                        {quadLabel(q)} {quadCounts[q] > 0 && <span className="opacity-80">· {quadCounts[q]}</span>}
                    </span>
                ))}
                <span className="ml-auto text-muted-foreground hidden sm:inline">Thresholds at 0 — top-right is Leaders (strong momentum + strong breadth)</span>
            </div>

            {view === "chart" ? (
                <>
                    <div className="w-full h-[300px] sm:h-[360px] px-1 sm:px-2 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name="Momentum"
                                    domain={[xMin - xPad, xMax + xPad]}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
                                    label={{ value: "Momentum — avg sector % change", position: "insideBottom", offset: -14, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 } }}
                                    axisLine={{ stroke: "hsl(var(--border))" }}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name="Rel Strength"
                                    domain={[yMin - yPad, yMax + yPad]}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}`}
                                    label={{ value: "Relative Strength — breadth", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 } }}
                                    axisLine={{ stroke: "hsl(var(--border))" }}
                                    tickLine={false}
                                    width={42}
                                />
                                <ZAxis type="number" dataKey="z" range={[60, 420]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} strokeDasharray="4 4" />
                                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} strokeDasharray="4 4" />
                                <Scatter data={points} fill="var(--primary)">
                                    {points.map((p, i) => (
                                        <Cell key={i} fill={quadColor(p.quad)} stroke="hsl(var(--card))" strokeWidth={1.2} fillOpacity={0.88} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 text-[9px] font-black uppercase tracking-wider px-4 pb-2 -mt-1 gap-1">
                        <div className="text-center rounded bg-success/10 text-success py-1 border border-success/20">↗ Leading — momentum & breadth +</div>
                        <div className="text-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 py-1 border border-amber-500/20">↘ Weakening — momentum + but breadth −</div>
                        <div className="text-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1 border border-blue-500/15">↖ Improving — breadth + but momentum −</div>
                        <div className="text-center rounded bg-destructive/10 text-destructive py-1 border border-destructive/20">↙ Lagging — both −</div>
                    </div>

                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-1.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Top Leading</p>
                            <div className="space-y-1">
                                {[...points].sort((a, b) => (b.x + b.y) - (a.x + a.y)).slice(0, 3).map(p => (
                                    <div key={p.sector} className="flex items-center justify-between rounded border border-success/20 bg-success/5 px-2 py-1 text-xs">
                                        <span className="font-bold text-foreground truncate pr-2">{p.sector}</span>
                                        <span className="shrink-0 font-mono text-success text-[11px]">{formatPercentage(p.avgChangePercent)} · {p.gainers}↑</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1.5 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Lagging</p>
                            <div className="space-y-1">
                                {[...points].sort((a, b) => (a.x + a.y) - (b.x + b.y)).slice(0, 3).map(p => (
                                    <div key={p.sector} className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 px-2 py-1 text-xs">
                                        <span className="font-bold text-foreground truncate pr-2">{p.sector}</span>
                                        <span className="shrink-0 font-mono text-destructive text-[11px]">{formatPercentage(p.avgChangePercent)} · {p.losers}↓</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="px-4 pb-3 text-[10px] leading-relaxed text-muted-foreground">
                        Derived 100% from <code className="font-mono bg-muted px-1 py-0.5 rounded">GET /api/idx/market-scan</code> — momentum is each sector&apos;s <code className="font-mono">avgChangePercent</code>, relative strength is breadth <code className="font-mono">(gainers−losers)/stocks×100</code>, bubble size ∝ log(value). Use the Table toggle as fallback on small screens.
                    </p>
                </>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-4 py-2 font-bold text-muted-foreground">Sector</th>
                                <th className="text-right px-4 py-2 font-bold text-muted-foreground">Momentum</th>
                                <th className="text-right px-4 py-2 font-bold text-muted-foreground">Rel. Str.</th>
                                <th className="text-right px-4 py-2 font-bold text-muted-foreground">Quadrant</th>
                                <th className="text-right px-4 py-2 font-bold text-muted-foreground hidden sm:table-cell">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedTable.map(s => {
                                const y = s.stocks > 0 ? ((s.gainers - s.losers) / s.stocks) * 100 : 0;
                                const q = getQuad(s.avgChangePercent, y);
                                return (
                                    <tr key={s.sector} className="hover:bg-muted/40">
                                        <td className="px-4 py-2 font-medium text-foreground">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="size-2 rounded-full shrink-0" style={{ background: quadColor(q) }} />
                                                {s.sector}
                                            </span>
                                            <span className="ml-2 text-[10px] text-muted-foreground hidden sm:inline">· {s.stocks} saham</span>
                                        </td>
                                        <td className={cn("px-4 py-2 text-right font-bold tabular-nums", s.avgChangePercent >= 0 ? "text-success" : "text-destructive")}>{formatPercentage(s.avgChangePercent)}</td>
                                        <td className={cn("px-4 py-2 text-right font-bold tabular-nums", y >= 0 ? "text-success" : "text-destructive")}>{y >= 0 ? "+" : ""}{y.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border" style={{ color: quadColor(q), borderColor: quadColor(q), background: `color-mix(in srgb, ${quadColor(q)} 12%, transparent)` }}>{quadLabel(q)}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCompactIDR(s.totalValue)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {onViewAll && (
                <button onClick={onViewAll} className="w-full px-4 py-2 border-t border-border text-center text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                    {view === "chart" ? `View table · ${sectors.length} sectors` : `View all (${sectors.length})`}
                </button>
            )}
        </div>
    );
}

export function SectorRotationTeaser({ sectors, onViewAll }: { sectors: SectorSummary[]; onViewAll: () => void }) {
    const leaders = useMemo(() => {
        const pts = sectors.map(s => ({ s, y: s.stocks > 0 ? ((s.gainers - s.losers) / s.stocks) * 100 : 0, score: s.avgChangePercent + (s.stocks > 0 ? ((s.gainers - s.losers) / s.stocks) * 100 * 0.04 : 0) }));
        return pts.sort((a, b) => b.score - a.score).slice(0, 4).map(p => p.s);
    }, [sectors]);

    if (!sectors.length) return null;

    return (
        <div className="card-flush">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="card-title">Sector Rotation — Leaders</h3>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2 py-0.5">C9</span>
            </div>
            <div className="p-3">
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {leaders.map(s => {
                        const up = s.avgChangePercent >= 0;
                        return (
                            <div key={s.sector} className={cn("rounded-lg border p-2 text-center", up ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                                <p className="text-[9px] font-bold text-muted-foreground truncate leading-tight">{s.sector}</p>
                                <p className={cn("text-xs font-black tabular-nums", up ? "text-success" : "text-destructive")}>{formatPercentage(s.avgChangePercent)}</p>
                                <p className="text-[9px] text-muted-foreground">{s.gainers}↑ {s.losers}↓</p>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground leading-snug">Momentum vs breadth quadrant — see who&apos;s actually leading.</p>
                    <button onClick={onViewAll} className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                        <PieChart className="w-3 h-3" /> Full chart →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SectorRotationDashboard;
