"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownRight, ArrowUpRight, Sparkles, RefreshCw } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";

const RechartsArea = dynamic(() => import("recharts").then((mod) => {
    const { ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } = mod;
    return {
        default: function Chart({
            data, pivots, showPivots, isIntraday,
        }: {
            data: any[]; pivots: any | null; showPivots: boolean; isIntraday: boolean;
        }) {
            const hasVolume = data.some(d => (d.Volume || 0) > 0);
            const maxVol = Math.max(...data.map(d => d.Volume || 0), 1);
            const fmtTick = (v: string) => {
                try {
                    const iso = v.length === 10 ? v + 'T00:00:00Z' : v + ':00Z';
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) return v;
                    return isIntraday
                        ? d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                        : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' });
                } catch { return v; }
            };
            const pivotDefs = showPivots && isIntraday && pivots ? [
                { v: pivots.pp, c: "var(--muted-foreground)", lb: "PP" },
                { v: pivots.r1, c: "var(--destructive)", lb: "R1" },
                { v: pivots.s1, c: "var(--success)", lb: "S1" },
                { v: pivots.r2, c: "var(--destructive)", lb: "R2" },
                { v: pivots.s2, c: "var(--success)", lb: "S2" },
            ].filter(p => p.v != null) : [];

            return (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="ihsgGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.16} />
                                <stop offset="90%" stopColor="var(--success)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="Date" tickFormatter={fmtTick} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={48} />
                        <YAxis yAxisId="price" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 0 })} />
                        {hasVolume && <YAxis yAxisId="vol" hide domain={[0, maxVol * 4]} />}
                        {pivotDefs.map(p => (
                            <ReferenceLine key={p.lb} yAxisId="price" y={p.v} stroke={p.c} strokeDasharray="5 4" strokeOpacity={0.65}
                                label={{ value: p.lb, position: "insideTopLeft", fontSize: 9, fill: p.c }} />
                        ))}
                        <Tooltip
                            contentStyle={{ fontSize: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)" }}
                            formatter={(v: any, name: any) => [
                                name === "Vol" ? Number(v).toLocaleString("id-ID") : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 }),
                                name,
                            ]}
                            labelStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                        />
                        {hasVolume && <Bar yAxisId="vol" dataKey="Volume" name="Vol" fill="var(--primary)" fillOpacity={0.18} isAnimationActive={false} />}
                        <Area yAxisId="price" type="monotone" dataKey="Close" name="IHSG" stroke="var(--success)" strokeWidth={2} fill="url(#ihsgGrad)" isAnimationActive animationDuration={280} animationEasing="linear" connectNulls={false} />
                        <Line yAxisId="price" type="monotone" dataKey="ma20" name="MA20" stroke="#f59e0b" strokeWidth={1.3} dot={false} connectNulls={false} isAnimationActive={false} />
                        <Line yAxisId="price" type="monotone" dataKey="ma50" name="MA50" stroke="#a967ff" strokeWidth={1.3} dot={false} connectNulls={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            );
        },
    };
}), { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse rounded" /> });

const PERIODS = [
    { label: "1D", value: "1d", interval: "1m" },
    { label: "5D", value: "5d", interval: "5m" },
    { label: "1M", value: "1mo", interval: "30m" },
    { label: "3M", value: "3mo", interval: "60m" },
    { label: "6M", value: "6mo", interval: "1d" },
    { label: "1Y", value: "1y", interval: "1d" },
];

const fmtNum = (v: number | null | undefined): string =>
    v == null ? "-" : v.toLocaleString("id-ID", { maximumFractionDigits: 2 });

function smaSeries(data: any[], period: number): any[] {
    const pts = data.filter(d => typeof d.Close === 'number');
    if (pts.length < period) return [];
    const out: any[] = [];
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
        sum += pts[i].Close;
        if (i >= period) sum -= pts[i - period].Close;
        if (i >= period - 1) out.push({ Date: pts[i].Date, value: +(sum / period).toFixed(1) });
    }
    return out;
}

// Tanam MA20/MA50 ke baris data utama agar sejajar sempurna dengan sumbu kategori
function withMa(data: any[]): any[] {
    const pts = data.filter(d => typeof d.Close === 'number');
    const closes = pts.map(d => d.Close as number);

    const build = (period: number): Map<string, number | null> => {
        const m = new Map<string, number | null>();
        if (pts.length < period) return m;
        let sum = 0;
        const vals: (number | null)[] = [];
        for (let i = 0; i < closes.length; i++) {
            sum += closes[i];
            if (i >= period) sum -= closes[i - period];
            vals.push(i >= period - 1 ? +(sum / period).toFixed(1) : null);
        }
        pts.forEach((p, i) => m.set(p.Date, vals[i]));
        return m;
    };

    const m20 = build(20);
    const m50 = build(50);
    return data.map(d => ({
        ...d,
        ma20: m20.get(d.Date) ?? null,
        ma50: m50.get(d.Date) ?? null,
    }));
}

export default function IHSGChart({ height = 300 }: { height?: number }) {
    const [periodIdx, setPeriodIdx] = useState(1); // default 5D
    const period = PERIODS[periodIdx];
    const [data, setData] = useState<any[]>([]);
    const [pivots, setPivots] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string>("");
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [tickDir, setTickDir] = useState<"up" | "down" | "flat">("flat");
    const [showPivots, setShowPivots] = useState(true);

    // ── AI ──
    const [aiLoading, setAiLoading] = useState(false);
    const [aiData, setAiData] = useState<any>(null);
    const [aiError, setAiError] = useState<string>("");

    const baseRef = useRef<number | null>(null);
    const liveRef = useRef<number | null>(null);
    const dataRef = useRef<any[]>([]);

    const applyReal = useCallback((p: number) => {
        if (liveRef.current != null && p !== liveRef.current) setTickDir(p >= liveRef.current ? "up" : "down");
        baseRef.current = p;
        liveRef.current = p;
        setLivePrice(p);
    }, []);

    const mergeTail = (arr: any[], price: number): any[] => {
        if (!arr.length) return arr;
        const out = [...arr];
        const last: any = { ...out[out.length - 1], Close: price };
        if (last.High != null) last.High = Math.max(last.High, price);
        if (last.Low != null) last.Low = Math.min(last.Low, price);
        out[out.length - 1] = last;
        return out;
    };

    const loadChart = useCallback(async (showLoading: boolean) => {
        try {
            if (showLoading) setLoading(true);
            const r = await fetch(`/api/idx/index-chart?period=${period.value}&interval=${period.interval}`, { cache: "no-store" });
            const res = await r.json();
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                if (res.quote) setQuote(res.quote);
                if (res.pivots) setPivots(res.pivots); else setPivots(null);
                let chart = res.data;
                const p = res.lastPrice ?? res.quote?.price ?? null;
                if (p) {
                    applyReal(p);
                    chart = mergeTail(chart, p);
                }
                dataRef.current = chart;
                setData(chart);
                setLastUpdate(new Date().toLocaleTimeString("id-ID"));
            }
        } catch {} finally {
            if (showLoading) setLoading(false);
        }
    }, [period.value, period.interval, applyReal]);

    useEffect(() => { loadChart(true); }, [loadChart]);
    useEffect(() => {
        const t = setInterval(() => loadChart(false), 10_000);
        return () => clearInterval(t);
    }, [loadChart]);

    // WebSocket harga real
    const { connected, marketOpen, prices, subscribe, unsubscribe } = useWebSocket({ autoConnect: true });
    useEffect(() => {
        if (!connected) return;
        subscribe(["^JKSE"]);
        return () => unsubscribe(["^JKSE"]);
    }, [connected, subscribe, unsubscribe]);
    useEffect(() => {
        const q = prices["^JKSE"];
        if (q && q.price > 0) {
            applyReal(q.price);
            if (q.changePercent != null) setQuote((prev: any) => ({ ...prev, change: q.change, changePercent: q.changePercent }));
            const chart = mergeTail(dataRef.current, q.price);
            dataRef.current = chart;
            setData(chart);
            setLastUpdate(new Date().toLocaleTimeString("id-ID"));
        }
    }, [prices, applyReal]);

    // Tick engine — hanya saat market buka
    useEffect(() => {
        if (!marketOpen) { setTickDir("flat"); return; }
        const id = setInterval(() => {
            const base = baseRef.current;
            if (base == null || base <= 0) return;
            const cur = liveRef.current ?? base;
            const step = base * (Math.random() - 0.5) * 0.0008;
            const band = base * 0.0012;
            const next = Math.max(base - band, Math.min(base + band, cur + step));
            setTickDir(next >= cur ? "up" : "down");
            liveRef.current = next;
            setLivePrice(next);
            const chart = mergeTail(dataRef.current, next);
            dataRef.current = chart;
            setData(chart);
        }, 600);
        return () => clearInterval(id);
    }, [marketOpen]);

    const chartData = useMemo(() => withMa(data), [data]);
    const isIntraday = ["1d", "5d"].includes(period.value);
    const hasVolume = useMemo(() => data.some(d => (d.Volume || 0) > 0), [data]);

    const runAi = async () => {
        setAiLoading(true);
        setAiError("");
        try {
            const r = await fetch(`/api/idx/ai-analysis?period=${period.value}&interval=${period.interval}`);
            const j = await r.json();
            if (j.success) setAiData(j); else setAiError(j.error || "Analisis gagal");
        } catch {
            setAiError("Gagal menghubungi server AI");
        } finally {
            setAiLoading(false);
        }
    };

    const display = livePrice ?? quote?.price ?? (data.length > 0 ? data[data.length - 1].Close : null);
    const pct = quote?.changePercent;
    const chg = quote?.change;
    const dirUp = tickDir === "up" || (tickDir === "flat" && (pct == null || pct >= 0));
    const dirColor = tickDir === "flat" ? "text-foreground" : dirUp ? "text-success" : "text-destructive";
    const a = aiData?.analysis;

    return (
        <div className="w-full">
            {/* Header ala sekuritas */}
            <div className="px-3 pt-2 pb-2">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">IHSG</span>
                    {marketOpen ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-success">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-success" />
                            </span>
                            LIVE
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">PASAR TUTUP</span>
                    )}
                    {lastUpdate && <span className="ml-auto text-[10px] text-muted-foreground">{lastUpdate}</span>}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={cn("text-2xl font-black tabular-nums transition-colors duration-300", dirColor)}>
                        {display != null ? fmtNum(display) : "-"}
                    </span>
                    {pct != null && (
                        <span className={cn("flex items-center gap-0.5 text-sm font-bold tabular-nums", pct >= 0 ? "text-success" : "text-destructive")}>
                            {pct >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {fmtNum(chg)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
                        </span>
                    )}
                </div>
                {(quote?.open != null || quote?.high != null || quote?.low != null) && (
                    <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground tabular-nums">
                        <span>O <b className="text-foreground">{fmtNum(quote?.open)}</b></span>
                        <span>H <b className="text-success">{fmtNum(quote?.high)}</b></span>
                        <span>L <b className="text-destructive">{fmtNum(quote?.low)}</b></span>
                        {quote?.prevClose != null && <span>Prev <b className="text-foreground">{fmtNum(quote?.prevClose)}</b></span>}
                    </div>
                )}
            </div>

            {/* Period selector + toggle pivot */}
            <div className="flex items-center justify-between px-3 pb-2 flex-wrap gap-2">
                <div className="flex gap-1">
                    {PERIODS.map((p, i) => (
                        <button
                            key={p.value}
                            onClick={() => { setPeriodIdx(i); setAiData(null); setAiError(""); }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                                periodIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                    <div className="flex items-center gap-2">
                        {isIntraday && pivots && (
                            <button
                                onClick={() => setShowPivots(s => !s)}
                                className={cn(
                                    "px-2 py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer",
                                    showPivots ? "border-primary/50 text-primary bg-primary/5" : "border-border text-muted-foreground"
                                )}
                            >
                                Pivot PP/R/S
                            </button>
                        )}
                        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 inline-block" />MA20</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-purple-400 inline-block" />MA50</span>
                            {!hasVolume && <span className="normal-case font-medium text-muted-foreground/60">· Volume n/a (intraday IDX)</span>}
                        </div>
                    </div>
            </div>

            <div style={{ height }}>
                {loading && data.length === 0 ? (
                    <div className="h-full w-full bg-muted animate-pulse rounded" />
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Tidak ada data chart</div>
                ) : (
                    <RechartsArea
                        data={chartData}
                        pivots={pivots}
                        showPivots={showPivots}
                        isIntraday={isIntraday}
                    />
                )}
            </div>

            {/* ── Panel Analisa AI ── */}
            <div className="mx-3 mb-3 mt-2 rounded-xl border border-border bg-card overflow-hidden">
                <div className="card-hd !py-2">
                    <Sparkles className="size-3.5 text-primary" />
                    <h4 className="card-title">Proyeksi AI · OpenCode Zen</h4>
                    {aiData?.model && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{aiData.model}</span>
                    )}
                    <button
                        onClick={runAi}
                        disabled={aiLoading}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                    >
                        {aiLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {aiLoading ? "Menganalisis…" : aiData ? "Analisa Ulang" : "Analisa dengan AI"}
                    </button>
                </div>

                <div className="p-4">
                    {aiError && (
                        <p className="text-xs text-destructive">{aiError}</p>
                    )}

                    {!aiError && !a && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Klik <b>Analisa dengan AI</b> — model akan membaca candle {period.label}, RSI, MA20/50,
                            dan pivot hari sebelumnya untuk menyusun proyeksi arah IHSG beserta skenario naik/turunnya.
                        </p>
                    )}

                    {a && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5",
                                    a.tren === "bullish" ? "bg-success/10 text-success"
                                    : a.tren === "bearish" ? "bg-destructive/10 text-destructive"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                    {a.tren || "netral"}
                                </span>
                                {typeof a.probabilitas_bullish === "number" && (
                                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px] max-w-xs">
                                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${a.probabilitas_bullish}%` }} />
                                        </div>
                                        <span className="text-[10px] font-bold tabular-nums text-muted-foreground">Bull {a.probabilitas_bullish}%</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs leading-relaxed text-foreground">{a.ringkasan}</p>

                            {(a.skenario_bullish || a.skenario_bearish) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-success/25 bg-success/5 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-success mb-1">Skenario Naik</p>
                                        <p className="text-[11px] text-foreground leading-relaxed">{a.skenario_bullish || "-"}</p>
                                    </div>
                                    <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-destructive mb-1">Skenario Turun</p>
                                        <p className="text-[11px] text-foreground leading-relaxed">{a.skenario_bearish || "-"}</p>
                                    </div>
                                </div>
                            )}

                            {(Array.isArray(a.support) || Array.isArray(a.resistance)) && (
                                <div className="flex gap-4 flex-wrap text-[11px]">
                                    {Array.isArray(a.support) && a.support.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black uppercase text-[9px] tracking-wider text-success">Support</span>
                                            {a.support.map((s: number, i: number) => (
                                                <span key={i} className="rounded-md bg-success/10 text-success font-bold tabular-nums px-1.5 py-0.5">{fmtNum(s)}</span>
                                            ))}
                                        </div>
                                    )}
                                    {Array.isArray(a.resistance) && a.resistance.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black uppercase text-[9px] tracking-wider text-destructive">Resistance</span>
                                            {a.resistance.map((s: number, i: number) => (
                                                <span key={i} className="rounded-md bg-destructive/10 text-destructive font-bold tabular-nums px-1.5 py-0.5">{fmtNum(s)}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {a.proyeksi_berikutnya && (
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    <b className="text-foreground">Proyeksi: </b>{a.proyeksi_berikutnya}
                                </p>
                            )}
                            {a.catatan && (
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    <b className="text-foreground">Catatan: </b>{a.catatan}
                                </p>
                            )}
                            <p className="text-[9px] text-muted-foreground/60 border-t border-border pt-2">
                                Bukan rekomendasi resmi — hanya proyeksi teknikal berbasis data. DYOR.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
