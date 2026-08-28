"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatPercentage, formatCompactIDR, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock, Search, BarChart3, PieChart, Zap, DollarSign, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TickerTape from "@/components/TickerTape";
import MarketStatusBar from "@/components/MarketStatusBar";
import LivePrice from "@/components/LivePrice";
import SectorHeatmap from "@/components/SectorHeatmap";
import BrokerSummaryPanel from "@/components/BrokerSummaryPanel";
import NewsCarousel from "@/components/NewsCarousel";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { useCountUp } from "@/hooks/useCountUp";
import { AlertChecker, AlertBadge } from "@/components/AlertChecker";
import { TechnicalAlertChecker } from "@/components/TechnicalAlertChecker";
import { useAlerts } from "@/hooks/useAlerts";

const IHSGChart = dynamic(() => import("@/components/IHSGChart"), { ssr: false, loading: () => <div className="h-[300px] bg-muted animate-pulse rounded-lg" /> });

type TabKey = "overview" | "gainers" | "brokers" | "all-stocks" | "sectors";

interface MarketIndex { symbol: string; name: string; label: string; lastPrice: number; change: number; changePercent: number; previousClose: number; open: number; dayHigh: number; dayLow: number; volume: number; }
interface MostActiveStock { ticker: string; name: string; price: number; change: number; changePercent: number; volume: number; value: number; }
interface SectorSummary { sector: string; stocks: number; totalVolume: number; totalValue: number; avgChangePercent: number; gainers: number; losers: number; }
interface ForeignFlowItem { investor: string; buyValue: number; sellValue: number; netValue: number; }
interface GainerLoserItem { KODE_SAHAM: string; NAMA_SAHAM: string; HARGA_PENUTUPAN: number; PERSEN_PERUBAHAN: number; }
interface AllStock { code: string; name: string; close: number; change: number; changePercent: number; volume: number; value: number; high: number; low: number; open: number; }

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 28;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    return (
        <svg width={w} height={h} className="shrink-0">
            <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
        </svg>
    );
}

function IndexCard({ index, sparkData, live }: { index: MarketIndex; sparkData: number[]; live?: any }) {
    const target = live?.price ?? index.lastPrice;
    const price = useCountUp(target);
    const chgPct = live ? live.changePercent : index.changePercent;
    const isUp = (chgPct ?? index.change ?? 0) >= 0;
    return (
        <div className="card-glow bg-card border border-border rounded-lg p-3 cursor-default">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-muted-foreground">{index.name}</span>
                <MiniSparkline data={sparkData} color={isUp ? "var(--success)" : "var(--danger)"} />
            </div>
            <LivePrice value={price} className="text-lg font-bold text-foreground" format={(v) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 })} />
            <span className={cn(
                "inline-flex items-center gap-1 mt-1 text-[10px] font-black rounded-full px-2 py-0.5",
                isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
                {isUp ? "▲" : "▼"} {formatPercentage(chgPct ?? index.change)}
            </span>
        </div>
    );
}

function MarketBreadthSection({ breadth, total }: { breadth: { advancing: number; declining: number; unchanged: number }; total: number }) {
    const { advancing, declining, unchanged } = breadth;
    const totalCount = advancing + declining + unchanged || 1;
    return (
        <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Market Breadth {total > 0 && <span className="text-muted-foreground/60">({total} saham)</span>}</h3>
            <div className="flex items-end gap-6 mb-3">
                <div><p className="text-2xl font-bold text-success">{advancing}</p><p className="text-[10px] font-bold text-success uppercase">Advancing</p></div>
                <div><p className="text-2xl font-bold text-destructive">{declining}</p><p className="text-[10px] font-bold text-destructive uppercase">Declining</p></div>
                <div><p className="text-2xl font-bold text-muted-foreground">{unchanged}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Unchanged</p></div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="bg-success h-full" style={{ width: `${(advancing / totalCount) * 100}%` }} />
                <div className="bg-muted-foreground/30 h-full" style={{ width: `${(unchanged / totalCount) * 100}%` }} />
                <div className="bg-destructive h-full" style={{ width: `${(declining / totalCount) * 100}%` }} />
            </div>
        </div>
    );
}

function ForeignFlowCard({ foreignFlow, official }: { foreignFlow: ForeignFlowItem[]; official?: boolean }) {
    const foreign = foreignFlow.find(f => f.investor === "Foreign");
    if (!foreign) return null;
    const max = Math.max(Math.abs(foreign.buyValue), Math.abs(foreign.sellValue), 1);
    return (
        <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Foreign Flow (All Market)</h3>
                {official && (
                    <span className="text-[8px] font-black uppercase tracking-wider rounded-full bg-success/10 text-success px-1.5 py-0.5">Resmi IDX</span>
                )}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Net {foreign.netValue >= 0 ? "Buy" : "Sell"}</span>
                <span className={cn("text-lg font-bold tabular-nums", foreign.netValue >= 0 ? "text-success" : "text-destructive")}>
                    {foreign.netValue >= 0 ? "+" : ""}{formatCompactIDR(foreign.netValue)}
                </span>
            </div>
            <div className="mt-3 space-y-2">
                <div>
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-0.5"><span>BUY</span><span className="tabular-nums">{formatCompactIDR(foreign.buyValue)}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${(Math.abs(foreign.buyValue) / max) * 100}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-0.5"><span>SELL</span><span className="tabular-nums">{formatCompactIDR(foreign.sellValue)}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-destructive transition-all duration-700" style={{ width: `${(Math.abs(foreign.sellValue) / max) * 100}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TableCard({ title, icon: Icon, items, type, onViewAll, livePrices }: { title: string; icon: any; items: any[]; type: "active" | "volume" | "gainer" | "loser"; onViewAll: () => void; livePrices?: Record<string, any> }) {
    const router = useRouter();
    return (
        <div className="card-flush">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="card-title">{title}</h3>
                {livePrices && Object.keys(livePrices).length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-success uppercase">
                        <span className="relative flex size-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                        </span>
                        Live
                    </span>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2 font-bold text-muted-foreground">Ticker</th>
                            <th className="text-right px-4 py-2 font-bold text-muted-foreground">Price</th>
                            <th className="text-right px-4 py-2 font-bold text-muted-foreground">Change</th>
                            {(type === "active" || type === "volume") && <th className="text-right px-4 py-2 font-bold text-muted-foreground">{type === "volume" ? "Volume" : "Value"}</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.slice(0, 8).map((s: any) => {
                            const ticker = s.ticker || s.code || s.KODE_SAHAM || "";
                            const tkFull = ticker.includes(".") ? ticker : `${ticker}.JK`;
                            const lp = livePrices?.[tkFull];
                            const price = lp?.price || s.price || s.HARGA_PENUTUPAN || 0;
                            const chg = lp ? lp.changePercent : (s.changePercent || s.PERSEN_PERUBAHAN || 0);
                            const isUp = (chg ?? 0) >= 0;
                            return (
                                <tr key={ticker} onClick={() => router.push(`/analysis/${ticker}.JK`)} className="hover:bg-muted/40 cursor-pointer">
                                    <td className="px-4 py-2 font-bold text-foreground">
                                        <span className="flex items-center gap-1.5">
                                            {lp && <span className={cn("size-1 rounded-full shrink-0", isUp ? "bg-success" : "bg-destructive")} />}
                                            {ticker}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                                        <LivePrice value={price} format={(v) => v.toLocaleString("id-ID", { maximumFractionDigits: 0 })} />
                                    </td>
                                    <td className={cn("px-4 py-2 text-right font-bold", isUp ? "text-success" : "text-destructive")}>{formatPercentage(chg)}</td>
                                    {type === "active" && <td className="px-4 py-2 text-right text-muted-foreground">{formatCompactIDR(s.value || 0)}</td>}
                                    {type === "volume" && <td className="px-4 py-2 text-right text-muted-foreground">{formatCompactIDR(s.volume || 0).replace("Rp", "")}</td>}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <button
                onClick={onViewAll}
                className="w-full px-4 py-2 border-t border-border text-center text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
                View all ({items.length})
            </button>
        </div>
    );
}

function SectorPerformanceCard({ sectors, onViewAll }: { sectors: SectorSummary[]; onViewAll: () => void }) {
    const sorted = [...sectors].sort((a, b) => b.totalValue - a.totalValue).slice(0, 8);
    return (
        <div className="card-flush">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="card-title">Sector Performance</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2 font-bold text-muted-foreground">Sector</th>
                            <th className="text-right px-4 py-2 font-bold text-muted-foreground">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sorted.map(s => (
                            <tr key={s.sector} className="hover:bg-muted/40">
                                <td className="px-4 py-2 font-medium text-foreground">{s.sector}</td>
                                <td className={cn("px-4 py-2 text-right font-bold", s.avgChangePercent >= 0 ? "text-success" : "text-destructive")}>{formatPercentage(s.avgChangePercent)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={onViewAll}
                className="w-full px-4 py-2 border-t border-border text-center text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
                View all ({sectors.length})
            </button>
        </div>
    );
}

export default function MarketPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [mostActive, setMostActive] = useState<{ byVolume: MostActiveStock[]; byValue: MostActiveStock[] }>({ byVolume: [], byValue: [] });
    const [sectors, setSectors] = useState<SectorSummary[]>([]);
    const [gainers, setGainers] = useState<GainerLoserItem[]>([]);
    const [losers, setLosers] = useState<GainerLoserItem[]>([]);
    const [breadth, setBreadth] = useState<{ advancing: number; declining: number; unchanged: number }>({ advancing: 0, declining: 0, unchanged: 0 });
    const [totalStocks, setTotalStocks] = useState(0);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [foreignFlow, setForeignFlow] = useState<ForeignFlowItem[]>([]);
    // Payload foreign-flow: {source:'indexalpha', netValue...} atau {source:'idx-monthly', participationValue...}
    const [officialFF, setOfficialFF] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [idxLoading, setIdxLoading] = useState(true);
    const [activeLoading, setActiveLoading] = useState(true);
    const [sectorLoading, setSectorLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [sparkDataMap, setSparkDataMap] = useState<Record<string, number[]>>({});

    // Ticker tape: saham portofolio, fallback ke top movers
    const { portfolio } = usePortfolio();
    const portfolioTickers = useMemo(
        () => Array.from(new Set((portfolio || []).map((s: any) => s.ticker))).slice(0, 15),
        [portfolio]
    );
    const fallbackTickers = useMemo(() => {
        const t = [...mostActive.byValue, ...mostActive.byVolume]
            .map((s: any) => s.ticker)
            .filter(Boolean)
            .map((t: string) => (t.includes(".") ? t : `${t}.JK`));
        return Array.from(new Set(t)).slice(0, 15);
    }, [mostActive]);
    const tapeTickers = portfolioTickers.length > 0 ? portfolioTickers : fallbackTickers;

    // Ticker live: kartu indeks (^JKSE dll) + top movers — satu koneksi WS gabungan
    const moverTickers = useMemo(() => {
        const t = [
            ...indices.map((i: any) => i.symbol),
            ...mostActive.byValue.map((s: any) => s.ticker),
            ...mostActive.byVolume.map((s: any) => s.ticker),
            ...gainers.map((g: any) => g.KODE_SAHAM),
            ...losers.map((l: any) => l.KODE_SAHAM),
        ]
            .filter(Boolean)
            .map((t: string) => (t.startsWith("^") || t.includes(".") ? t : `${t}.JK`));
        return Array.from(new Set(t)).slice(0, 40);
    }, [indices, mostActive, gainers, losers]);
    const liveTickers = useMemo(
        () => Array.from(new Set([...tapeTickers, ...moverTickers])),
        [tapeTickers, moverTickers]
    );
    const { prices: livePrices } = useMarketData(liveTickers);
    const { alerts } = useAlerts();
    const activeAlertCount = alerts.filter(a => !a.triggeredAt).length;

    // Fetch market index dari Yahoo Finance (cepat)
    useEffect(() => {
        fetch("/api/idx/market-index")
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    setIndices(res.data);
                    setLastUpdate(new Date());
                    res.data.forEach((idx: any) => {
                        const pts: number[] = [];
                        for (let i = 0; i < 20; i++) {
                            const base = idx.lastPrice || 100;
                            pts.push(base + (Math.random() - 0.5) * base * 0.02 * (i / 20));
                        }
                        pts.push(idx.lastPrice || 100);
                        setSparkDataMap(prev => ({ ...prev, [idx.symbol]: pts }));
                    });
                }
            })
            .catch(() => {})
            .finally(() => setIdxLoading(false));
    }, []);

    // Market Scan — fetch SEMUA 959 saham, derive most-active/gainers/losers/sector/breadth
    useEffect(() => {
        fetch("/api/idx/market-scan")
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    const d = res.data;
                    setTotalStocks(d.total || 0);
                    setBreadth(d.breadth || { advancing: 0, declining: 0, unchanged: 0 });
                    setMostActive(d.mostActive || { byVolume: [], byValue: [] });
                    setGainers((d.gainers || []).map((s: any) => ({
                        KODE_SAHAM: s.code, NAMA_SAHAM: s.name, HARGA_PENUTUPAN: s.price, PERSEN_PERUBAHAN: s.changePercent,
                    })));
                    setLosers((d.losers || []).map((s: any) => ({
                        KODE_SAHAM: s.code, NAMA_SAHAM: s.name, HARGA_PENUTUPAN: s.price, PERSEN_PERUBAHAN: s.changePercent,
                    })));
                    setSectors(d.sectors || []);
                    setAllStocks(d.all || []);
                    setLastUpdate(new Date());
                }
            })
            .catch(() => {})
            .finally(() => { setActiveLoading(false); setSectorLoading(false); });

        // Broker summary — fire-and-forget
        fetch("/api/idx/broker-summary")
            .then(r => r.json())
            .then(res => { if (res.success && res.data?.foreignFlow) setForeignFlow(res.data.foreignFlow); })
            .catch(() => {});

        // Net Foreign RESMI (Index Alpha) / partisipasi asing (IDX bulanan)
        fetch("/api/idx/foreign-flow")
            .then(r => r.json())
            .then(res => { if (res.success) setOfficialFF(res); })
            .catch(() => {});
    }, []);

    const ihsg = indices.find(i => i.symbol === "^JKSE" || i.name?.includes("IHSG"));
    const tabs: { key: TabKey; label: string }[] = [
        { key: "overview", label: "Overview" },
        { key: "gainers", label: "Gainers / Losers" },
        { key: "brokers", label: "Broker Summary" },
        { key: "all-stocks", label: "All Stocks" },
        { key: "sectors", label: "Sector" },
    ];

    return (
        <div className="space-y-6">
            <MarketStatusBar />
            <AlertChecker prices={livePrices} />
            <TechnicalAlertChecker />

            {/* Hero header ala terminal */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-5">
                <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">IDX · Bursa Efek Indonesia</p>
                        <h1 className="text-2xl font-black tracking-tight"><span className="text-gradient">Market Overview</span></h1>
                        <p className="text-xs text-muted-foreground mt-1">Pantau pasar real-time — indeks, breadth, arus dana & sektor</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 shrink-0">
                        {(() => {
                            const proxyNet = foreignFlow.find(f => f.investor === "Foreign")?.netValue;
                            const realNet: number | null = officialFF?.netValue ?? null;
                            const partVal: number | null = officialFF?.participationValue ?? null;

                            const tiles: { label: string; value: string | number; cls: string; sub?: string }[] = [
                                { label: "Naik", value: breadth.advancing, cls: "text-success" },
                                { label: "Turun", value: breadth.declining, cls: "text-destructive" },
                                { label: "Tetap", value: breadth.unchanged, cls: "text-muted-foreground" },
                            ];
                            if (realNet != null) {
                                tiles.push({ label: "Net Foreign", value: `${realNet >= 0 ? "+" : ""}${formatCompactIDR(realNet)}`, cls: realNet >= 0 ? "text-success" : "text-destructive", sub: "Resmi IDX" });
                            } else if (partVal != null) {
                                tiles.push({ label: "Foreign Value", value: formatCompactIDR(partVal), cls: "text-primary", sub: "IDX bulanan" });
                            } else if (proxyNet != null) {
                                tiles.push({ label: "Net Foreign", value: `${proxyNet >= 0 ? "+" : ""}${formatCompactIDR(proxyNet)}`, cls: proxyNet >= 0 ? "text-success" : "text-destructive", sub: "≈ proxy" });
                            } else {
                                tiles.push({ label: "Net Foreign", value: "—", cls: "text-muted-foreground" });
                            }
                            tiles.push({ label: "Saham", value: totalStocks, cls: "text-foreground" });

                            return tiles.map(s => (
                                <div key={s.label} className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-center backdrop-blur-sm">
                                    <p className={cn("text-lg font-black tabular-nums leading-none", s.cls)}>{s.value}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
                                    {s.sub && <p className="text-[8px] text-muted-foreground/70 leading-none">{s.sub}</p>}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
                {lastUpdate && (
                    <span className="absolute bottom-1.5 right-3 text-[9px] text-muted-foreground/70 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{lastUpdate.toLocaleTimeString("id-ID")}
                    </span>
                )}
                <AlertBadge count={activeAlertCount} className="absolute bottom-1.5 left-3" />
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-border">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={cn("px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px",
                            activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* News Carousel — IHSG, geopolitik/emas + semua ticker trending (auto) */}
                    <NewsCarousel symbols={["IHSG", "EMAS", "GEOPOLITIK", "FED", ...tapeTickers.slice(0, 4).map(t => t.replace(".JK","")), ...mostActive.byValue.slice(0, 4).map((s:any) => (s.ticker || s.code || "").replace(".JK","")), ...gainers.slice(0, 2).map((g:any) => g.KODE_SAHAM)]} />

                    {/* Ticker Tape live */}
                    {tapeTickers.length > 0 && <TickerTape tickers={tapeTickers} prices={livePrices} />}

                    {/* Index Strip */}
                    {idxLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {indices.slice(0, 4).map(idx => <IndexCard key={idx.symbol} index={idx} sparkData={sparkDataMap[idx.symbol] || []} live={livePrices[idx.symbol]} />)}
                        </div>
                    )}

                    {/* IHSG Chart + Market Breadth + Foreign Flow */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 card-flush">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <h3 className="card-title">IHSG Chart</h3>
                            </div>
                            <IHSGChart height={300} />
                        </div>
                        <div className="space-y-4">
                            <MarketBreadthSection breadth={breadth} total={totalStocks} />
                            <ForeignFlowCard foreignFlow={officialFF?.netValue != null ? [
                                { investor: "Foreign", buyValue: officialFF.buyValue ?? 0, sellValue: officialFF.sellValue ?? 0, netValue: officialFF.netValue },
                                { investor: "Domestic", buyValue: 0, sellValue: 0, netValue: 0 },
                            ] : foreignFlow} official={officialFF?.source === "indexalpha"} />
                        </div>
                    </div>

                    {/* 4-column grid: Value, Volume, Gainers, Losers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {activeLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />)
                        ) : (
                            <>
                                <TableCard title="Top Value" icon={DollarSign} items={mostActive.byValue} type="active" livePrices={livePrices} onViewAll={() => setActiveTab("all-stocks")} />
                                <TableCard title="Top Volume" icon={Layers} items={mostActive.byVolume} type="volume" livePrices={livePrices} onViewAll={() => setActiveTab("all-stocks")} />
                                <TableCard title="Top Gainers" icon={TrendingUp} items={gainers} type="gainer" livePrices={livePrices} onViewAll={() => setActiveTab("gainers")} />
                                <TableCard title="Top Losers" icon={TrendingDown} items={losers} type="loser" livePrices={livePrices} onViewAll={() => setActiveTab("gainers")} />
                            </>
                        )}
                    </div>

                    {/* Sector Heatmap ala Finviz */}
                    <SectorHeatmap sectors={sectors} />

                    {/* Sector Performance */}
                    <SectorPerformanceCard sectors={sectors} onViewAll={() => setActiveTab("sectors")} />
                </div>
            )}

            {activeTab === "gainers" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TableCard title="Top Gainers" icon={TrendingUp} items={gainers} type="gainer" onViewAll={() => setActiveTab("gainers")} />
                    <TableCard title="Top Losers" icon={TrendingDown} items={losers} type="loser" onViewAll={() => setActiveTab("gainers")} />
                </div>
            )}

            {activeTab === "brokers" && <BrokerSummaryPanel />}

            {activeTab === "all-stocks" && (
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari saham (BBCA, TLKM...)"
                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="card-flush">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground">#</th>
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground">Ticker</th>
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground hidden sm:table-cell">Nama</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground">Price</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground">Change</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground hidden md:table-cell">Volume</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground hidden lg:table-cell">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(() => {
                                        const q = search.toLowerCase();
                                        const filtered = q
                                            ? allStocks.filter((s: any) => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))
                                            : allStocks;
                                        return filtered.slice(0, 100).map((s: any, i: number) => (
                                            <tr key={s.code} onClick={() => router.push(`/analysis/${s.code}.JK`)} className="hover:bg-muted/40 cursor-pointer">
                                                <td className="px-4 py-2 text-[10px] font-bold text-muted-foreground">{i + 1}</td>
                                                <td className="px-4 py-2 font-mono font-bold text-foreground">{s.code}</td>
                                                <td className="px-4 py-2 text-muted-foreground truncate max-w-[180px] hidden sm:table-cell">{s.name}</td>
                                                <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-foreground">{s.price?.toLocaleString("id-ID")}</td>
                                                <td className={cn("px-4 py-2 text-right font-bold", (s.changePercent || 0) >= 0 ? "text-success" : "text-destructive")}>{formatPercentage(s.changePercent)}</td>
                                                <td className="px-4 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">{formatCompactIDR(s.volume || 0).replace("Rp", "")}</td>
                                                <td className="px-4 py-2 text-right font-mono text-muted-foreground hidden lg:table-cell">{formatCompactIDR(s.value || 0)}</td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 text-center border-t border-border">
                            <p className="text-[10px] text-muted-foreground">
                                Menampilkan {search ? "hasil pencarian" : "100 dari"} {allStocks.length} saham IDX
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "sectors" && (
                sectorLoading ? (
                    <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : (
                    <SectorPerformanceCard sectors={sectors} onViewAll={() => setActiveTab("sectors")} />
                )
            )}
        </div>
    );
}
