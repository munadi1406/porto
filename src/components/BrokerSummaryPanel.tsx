"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Globe, Landmark, CloudOff, Search, KeyRound } from "lucide-react";
import { formatCompactIDR, cn } from "@/lib/utils";

interface BrokerRow { code: string; name: string; value: number; volume: number; freq: number }
interface FlowRow { investor: string; buyValue: number; sellValue: number; netValue: number }
interface StockBrokerRow { code: string; name: string; buyValue: number; sellValue: number; buyVolume: number; sellVolume: number }

interface StockBrokerData {
    success?: boolean;
    stock?: string;
    date?: string;
    brokerCount?: number;
    totalBuy?: number;
    totalSell?: number;
    net?: number;
    topBuy?: StockBrokerRow[];
    topSell?: StockBrokerRow[];
    needsKey?: boolean;
    note?: string;
    error?: string;
    cached?: 'db' | 'fresh';
    quotaRemaining?: number;
}

interface BrokerSummaryData {
    topBrokers: BrokerRow[];
    foreignFlow: FlowRow[];
    summary: {
        totalBuyValue: number; totalSellValue: number; totalNetValue: number;
        brokerCount: number; foreignBuy: number; foreignSell: number;
        domesticBuy: number; domesticSell: number;
        totalVolume?: number; totalFreq?: number; foreignValue?: number; domesticValue?: number;
    };
}

const EMPTY: BrokerSummaryData = {
    topBrokers: [], foreignFlow: [],
    summary: { totalBuyValue: 0, totalSellValue: 0, totalNetValue: 0, brokerCount: 0, foreignBuy: 0, foreignSell: 0, domesticBuy: 0, domesticSell: 0 },
};

const fmtVol = (v: number) => formatCompactIDR(v).replace("Rp", "");

function StatCard({ label, value, cls }: { label: string; value: string; cls?: string }) {
    return (
        <div className="bg-card border border-border rounded-lg p-3">
            <p className="card-title">{label}</p>
            <p className={cn("text-base font-black tabular-nums mt-0.5", cls)}>{value}</p>
        </div>
    );
}

export default function BrokerSummaryPanel() {
    const [data, setData] = useState<BrokerSummaryData>(EMPTY);
    const [source, setSource] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [secs, setSecs] = useState(60);
    const [subTab, setSubTab] = useState<"all" | "ticker">("all");
    // Net Foreign resmi (IDX Daily Trading by Investor Type) — lebih akurat dari proxy broker
    const [officialNet, setOfficialNet] = useState<number | null>(null);
    const [officialSrc, setOfficialSrc] = useState(false);

    useEffect(() => {
        fetch("/api/idx/foreign-flow")
            .then(r => r.json())
            .then(res => {
                if (res.success && res.source === "indexalpha" && res.netValue != null) {
                    setOfficialNet(res.netValue);
                    setOfficialSrc(true);
                }
            })
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        try {
            const r = await fetch("/api/idx/broker-summary", { cache: "no-store" });
            const res = await r.json();
            if (res.success && res.data) {
                setData(res.data);
                setSource(res.source);
                setDate(res.date || "");
            }
        } catch {} finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const unavailable = source === "unavailable" && data.summary.brokerCount === 0;

    // Hitung mundur auto-retry selama sumber belum terjangkau
    useEffect(() => {
        if (!unavailable) return;
        setSecs(20);
        const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [unavailable]);

    useEffect(() => {
        if (unavailable && secs === 0) {
            setLoading(true);
            load().finally(() => setSecs(20));
        }
    }, [secs, unavailable, load]);

    // ── Broksum per saham (Top Buy / Top Sell) — semua hook SEBELUM early-return ──
    const [stockQuery, setStockQuery] = useState("BBCA");
    const [stockData, setStockData] = useState<StockBrokerData | null>(null);
    const [stockLoading, setStockLoading] = useState(false);

    const loadStock = useCallback(async (stock: string) => {
        if (!stock.trim()) return;
        setStockLoading(true);
        try {
            const qs = new URLSearchParams({ stock: stock.trim().toUpperCase() });
            if (date) qs.set("date", date.replace(/-/g, ""));
            const r = await fetch(`/api/idx/broker-stock?${qs}`, { cache: "no-store" });
            setStockData(await r.json());
        } catch {
            setStockData({ success: false, error: "Gagal memuat" });
        } finally {
            setStockLoading(false);
        }
    }, [date]);

    // Auto-load default saat pertama membuka tab Per Ticker
    const hasLoadedRef = useRef(false);
    useEffect(() => {
        if (date && subTab === "ticker" && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadStock("BBCA");
        }
    }, [date, subTab, loadStock]);

    if (loading && data.summary.brokerCount === 0 && !unavailable) {
        return (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                Memuat ringkasan broker… (via browser anti-Cloudflare, bisa 30–90 detik pertama kali)
            </div>
        );
    }

    const ff = Object.fromEntries(data.foreignFlow.map(f => [f.investor, f]));
    const fdMax = Math.max(ff.Foreign?.buyValue ?? 0, ff.Domestic?.buyValue ?? 0, 1);
    const hasData = data.summary.brokerCount > 0;

    return (
        <div className="space-y-4">
            {/* Header status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {hasData ? (
                        <>
                            <span className="flex items-center gap-1.5 font-bold text-success">
                                <span className="relative flex size-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                                </span>
                                DATA IDX ASLI
                            </span>
                            <span>· {data.summary.brokerCount} broker · tanggal {date} · via browser</span>
                        </>
                    ) : (
                        <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
                            <CloudOff className="w-3.5 h-3.5" /> SUMBER IDX TIDAK TERJANGKAU
                        </span>
                    )}
                </div>
                <button
                    onClick={() => { setLoading(true); load(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-border bg-card hover:border-primary/40 transition-colors cursor-pointer"
                >
                    <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
                </button>
            </div>

            {/* Sub-tab: All / Per Ticker */}
            <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
                {([["all", "All Broker"], ["ticker", "Per Ticker"]] as const).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setSubTab(k)}
                        className={cn(
                            "px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer",
                            subTab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {subTab === "all" && unavailable && (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <CloudOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-black text-foreground">Ringkasan broker belum tersedia</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                        Browser anti-Cloudflare sedang mencoba mengambil data dari IDX.
                        Proses pertama bisa memakan waktu hingga beberapa menit.
                    </p>
                    <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
                        Mencoba ulang otomatis dalam <span className="font-mono tabular-nums text-foreground">{secs}</span> detik
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-3">Panel terisi sendiri begitu data berhasil diambil.</p>
                </div>
            )}

            {subTab === "all" && hasData && (
                <>
                    {/* Statistik utama — Net Foreign dikembalikan agar terlihat jelas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Total Nilai" value={formatCompactIDR(data.summary.totalBuyValue)} cls="text-foreground" />
                        <div className="bg-card border border-border rounded-lg p-3 relative">
                            {officialSrc && (
                                <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-success/10 text-success px-1.5 py-0.5">Resmi IDX</span>
                            )}
                            <p className="card-title">Net Foreign</p>
                            <p className={cn(
                                "text-base font-black tabular-nums mt-0.5",
                                officialNet != null
                                    ? (officialNet >= 0 ? "text-success" : "text-destructive")
                                    : ((ff.Foreign?.netValue ?? 0) >= 0 ? "text-success" : "text-destructive")
                            )}>
                                {(() => {
                                    const v = officialNet ?? ff.Foreign?.netValue ?? 0;
                                    return `${v >= 0 ? "+" : ""}${formatCompactIDR(v)}`;
                                })()}
                            </p>
                            {!officialSrc && <p className="text-[8px] text-muted-foreground/60 mt-0.5">≈ proxy broker asing</p>}
                        </div>
                        <StatCard label="Frekuensi" value={(data.summary.totalFreq ?? 0).toLocaleString("id-ID")} cls="text-chart-3" />
                        <StatCard label="Jumlah Broker" value={String(data.summary.brokerCount)} />
                    </div>
                    <p className="text-[11px] text-muted-foreground -mt-1">
                        Total Volume {fmtVol(data.summary.totalVolume ?? 0)} · Domestic {formatCompactIDR(ff.Domestic?.buyValue ?? 0)} ({((ff.Domestic?.buyValue ?? 0) / (data.summary.totalBuyValue || 1) * 100).toFixed(1)}%)
                    </p>

                    {/* Foreign vs Domestic */}
                    {(ff.Foreign || ff.Domestic) && (
                        <div className="bg-card border border-border rounded-lg p-4">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Foreign vs Domestic (Nilai Transaksi)</h3>
                            <div className="space-y-3">
                                {(["Foreign", "Domestic"] as const).map(k => {
                                    const row = ff[k];
                                    if (!row) return null;
                                    const pctVal = (row.buyValue / fdMax) * 100;
                                    return (
                                        <div key={k}>
                                            <div className="flex items-center gap-2 mb-1">
                                                {k === "Foreign" ? <Globe className="w-3.5 h-3.5 text-primary" /> : <Landmark className="w-3.5 h-3.5 text-chart-3" />}
                                                <span className="text-xs font-bold text-foreground">{k}</span>
                                                <span className={cn("ml-auto text-xs font-black tabular-nums", k === "Foreign" ? "text-primary" : "text-chart-3")}>
                                                    {formatCompactIDR(row.buyValue)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                                                    {((row.buyValue / (data.summary.totalBuyValue || 1)) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-700", k === "Foreign" ? "bg-primary" : "bg-chart-3")}
                                                    style={{ width: `${pctVal}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Top brokers */}
                    <div className="card-flush">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                            <h3 className="card-title">Top 10 Broker — Nilai Transaksi</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground">#</th>
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground">Kode</th>
                                        <th className="text-left px-4 py-2 font-bold text-muted-foreground hidden sm:table-cell">Nama</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground">Nilai</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground hidden md:table-cell">Volume</th>
                                        <th className="text-right px-4 py-2 font-bold text-muted-foreground hidden lg:table-cell">Freq</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.topBrokers.map((b, i) => (
                                        <tr key={b.code + i} className="hover:bg-muted/40">
                                            <td className={cn("px-4 py-2 font-black", i === 0 ? "text-primary" : "text-muted-foreground")}>{i + 1}</td>
                                            <td className="px-4 py-2 font-black text-foreground">{b.code}</td>
                                            <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">{b.name}</td>
                                            <td className="px-4 py-2 text-right font-mono tabular-nums font-bold text-success">{formatCompactIDR(b.value)}</td>
                                            <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">{fmtVol(b.volume)}</td>
                                            <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground hidden lg:table-cell">{b.freq.toLocaleString("id-ID")}</td>
                                        </tr>
                                    ))}
                                    {data.topBrokers.length === 0 && (
                                        <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">Tidak ada data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── Broksum PER SAHAM: Top Buy / Top Sell ── */}
            {subTab === "ticker" && (
            <div className="card-flush">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="card-title">Broksum per Saham</h3>
                    {stockData?.cached && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {stockData.cached === "db" ? "dari database" : `fresh · sisa kuota ${stockData.quotaRemaining ?? "?"}/5`}
                        </span>
                    )}
                    <form
                        className="ml-auto flex items-center gap-1.5"
                        onSubmit={e => { e.preventDefault(); loadStock(stockQuery); }}
                    >
                        <input
                            value={stockQuery}
                            onChange={e => setStockQuery(e.target.value.toUpperCase())}
                            placeholder="Kode saham (BBCA)"
                            className="w-40 px-2.5 py-1.5 text-xs font-bold uppercase bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button type="submit" disabled={stockLoading} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
                            {stockLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Cari
                        </button>
                    </form>
                </div>

                <div className="p-4">
                    {stockData?.needsKey ? (
                        <div className="text-center py-6">
                            <KeyRound className="w-8 h-8 mx-auto mb-2 text-amber-500/70" />
                            <p className="text-sm font-bold text-foreground">Butuh API key gratis untuk fitur ini</p>
                            <ol className="text-xs text-muted-foreground mt-2 space-y-1 max-w-md mx-auto text-left list-decimal list-inside">
                                <li>Daftar gratis di <a href="https://indexalpha.id" target="_blank" rel="noreferrer" className="text-primary underline">indexalpha.id</a> (5 request/hari gratis)</li>
                                <li>Buka dashboard → salin API key</li>
                                <li>Tambahkan ke file <code className="font-mono bg-muted px-1 rounded">.env</code>:<br /><code className="font-mono bg-muted px-1 rounded">INDEXALPHA_API_KEY=key_anda</code></li>
                                <li>Restart server (<code className="font-mono bg-muted px-1 rounded">npm run dev</code>)</li>
                            </ol>
                        </div>
                    ) : stockData && !stockData.success && stockData.error ? (
                        <p className="text-center text-xs text-destructive py-6">{stockData.error} — coba lagi nanti (kuota bisa habis).</p>
                    ) : stockLoading || !stockData || !stockData.topBuy ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memuat broksum {(stockData?.stock || stockQuery).replace(".JK", "")}…
                        </div>
                    ) : stockData.topBuy.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-6">{stockData.note || "Tidak ada transaksi pada tanggal ini."}</p>
                    ) : (
                        <>
                            {/* Statistik saham terpilih */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <StatCard label={`Total Buy ${stockData.stock}`} value={formatCompactIDR(stockData.totalBuy ?? 0)} cls="text-success" />
                                <StatCard label={`Total Sell ${stockData.stock}`} value={formatCompactIDR(stockData.totalSell ?? 0)} cls="text-destructive" />
                                <StatCard label="Net" value={formatCompactIDR(stockData.net ?? 0)} cls={(stockData.net ?? 0) >= 0 ? "text-success" : "text-destructive"} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {([
                                    { title: "Top Buy", icon: ArrowUpRight, rows: stockData.topBuy, valKey: "buyValue" as const, volKey: "buyVolume" as const, color: "text-success", barCls: "bg-success" },
                                    { title: "Top Sell", icon: ArrowDownRight, rows: stockData.topSell ?? [], valKey: "sellValue" as const, volKey: "sellVolume" as const, color: "text-destructive", barCls: "bg-destructive" },
                                ]).map(tbl => {
                                    const maxVal = Math.max(...tbl.rows.map(r => r[tbl.valKey]), 1);
                                    return (
                                        <div key={tbl.title}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <tbl.icon className={cn("w-3.5 h-3.5", tbl.color)} />
                                                <h4 className={cn("text-xs font-black uppercase tracking-wider", tbl.color)}>{tbl.title}</h4>
                                                <span className="text-[10px] text-muted-foreground">{stockData.stock} · {stockData.date}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {tbl.rows.map((r, i) => (
                                                    <div key={r.code + i} className="relative rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 overflow-hidden">
                                                        <div className={cn("absolute inset-y-0 left-0 opacity-[0.12]", tbl.barCls)} style={{ width: `${(r[tbl.valKey] / maxVal) * 100}%` }} />
                                                        <div className="relative flex items-center gap-2 text-xs">
                                                            <span className="w-5 font-black text-muted-foreground">{i + 1}</span>
                                                            <b className="w-7 font-black text-foreground">{r.code}</b>
                                                            <span className="truncate flex-1 text-muted-foreground hidden sm:inline">{r.name}</span>
                                                            <span className="font-mono tabular-nums font-bold text-foreground">{formatCompactIDR(r[tbl.valKey])}</span>
                                                        </div>
                                                        <div className="relative flex items-center gap-2 text-[9px] text-muted-foreground sm:hidden pl-9">
                                                            {r.name} · Vol {fmtVol(r[tbl.volKey])}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}
