"use client";

import { useState, useEffect, useRef } from "react";
import { formatIDR, formatPercentage, formatCompactIDR, cn } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Activity, BarChart3, LineChart,
    Search, Zap, Users, ArrowRight, Building2, Loader2
} from "lucide-react";
import Link from "next/link";

interface BrokerItem {
    name: string;
    code: string;
    netValue: number;
}

interface ForeignFlowItem {
    investor: string;
    buyValue: number;
    sellValue: number;
    netValue: number;
}

export default function StocksPage() {
    const [brokers, setBrokers] = useState<{ topBuy: BrokerItem[]; topSell: BrokerItem[] }>({ topBuy: [], topSell: [] });
    const [foreignFlow, setForeignFlow] = useState<ForeignFlowItem[]>([]);
    const [gainers, setGainers] = useState<any[]>([]);
    const [losers, setLosers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const retryRef = useRef(0);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(false);

            // Try direct IDX via CORS proxy
            try {
                const { getBrokerSummaryFromIDX, getForeignFlowFromIDX } = await import('@/lib/idxClient');
                const brokers = await getBrokerSummaryFromIDX();
                if (brokers && brokers.length > 0) {
                    const topBuy = [...brokers].sort((a, b) => (b.NET_BUY_VALUE || 0) - (a.NET_BUY_VALUE || 0)).slice(0, 5);
                    const topSell = [...brokers].sort((a, b) => (a.NET_BUY_VALUE || 0) - (b.NET_BUY_VALUE || 0)).slice(0, 5);
                    const flow = await getForeignFlowFromIDX(brokers);
                    setBrokers({
                        topBuy: topBuy.map(b => ({ name: b.BRK_NAME || '', code: b.BRK_CODE || '', netValue: b.NET_BUY_VALUE || 0 })),
                        topSell: topSell.map(b => ({ name: b.BRK_NAME || '', code: b.BRK_CODE || '', netValue: b.NET_BUY_VALUE || 0 })),
                    });
                    setForeignFlow(flow);
                    setLoading(false);
                    return;
                }
            } catch { /* IDX failed, try internal API */ }

            // Fallback: internal Yahoo-based API
            try {
                const res = await fetch('/api/idx/smart-money');
                const json = await res.json();
                if (json.success) {
                    setBrokers({
                        topBuy: json.data.topBuyBrokers?.slice(0, 5) || [],
                        topSell: json.data.topSellBrokers?.slice(0, 5) || [],
                    });
                    setForeignFlow(json.data.foreignFlow || []);
                } else {
                    setError(true);
                }
            } catch {
                setError(true);
            }
            setLoading(false);
        }
        fetchData();

        // Fetch top gainers/losers
        fetch('/api/idx/stock-summary')
            .then(r => r.json())
            .then(j => { if (j.success) { setGainers(j.gainers || []); setLosers(j.losers || []); } })
            .catch(() => {});
    }, []);

    const foreign = foreignFlow.find(f => f.investor === 'Foreign');
    const domestic = foreignFlow.find(f => f.investor === 'Domestic');

    const totalBrokerBuy = brokers.topBuy.reduce((s, b) => s + Math.abs(b.netValue), 0);
    const totalBrokerSell = brokers.topSell.reduce((s, b) => s + Math.abs(b.netValue), 0);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Stock Market</h1>
                <p className="text-sm text-muted-foreground">Market overview & analysis tools</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/screener" className="p-4 bg-card border border-border rounded-2xl hover:bg-muted transition-colors group">
                    <Search className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">Screener</p>
                    <p className="text-[10px] text-muted-foreground">959 IDX stocks</p>
                </Link>
                <Link href="/analysis/BBCA.JK" className="p-4 bg-card border border-border rounded-2xl hover:bg-muted transition-colors group">
                    <LineChart className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">Chart</p>
                    <p className="text-[10px] text-muted-foreground">Technical analysis</p>
                </Link>
                <Link href="/fundamentals" className="p-4 bg-card border border-border rounded-2xl hover:bg-muted transition-colors group">
                    <Building2 className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">Fundamental</p>
                    <p className="text-[10px] text-muted-foreground">PER, PBV, ROE, etc</p>
                </Link>
                <Link href="/analytics" className="p-4 bg-card border border-border rounded-2xl hover:bg-muted transition-colors group">
                    <Activity className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">Analytics</p>
                    <p className="text-[10px] text-muted-foreground">Growth & returns</p>
                </Link>
            </div>

            {/* Market Summary */}
            {loading ? (
                <div className="space-y-3">
                    <div className="h-24 bg-muted animate-pulse rounded-2xl" />
                    <div className="h-48 bg-muted animate-pulse rounded-2xl" />
                </div>
            ) : error ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>Market data unavailable (IDX API might be unreachable).</p>
                    <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/80 transition-colors">
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* Foreign Flow */}
                    {foreign && domestic && (
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Investor Flow</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-success/5 rounded-xl border border-success/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-success uppercase tracking-wider">Foreign</span>
                                        <span className={cn("text-xs font-black", foreign.netValue >= 0 ? "text-success" : "text-destructive")}>
                                            {foreign.netValue >= 0 ? '+' : ''}Rp{formatCompactIDR(foreign.netValue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Buy: Rp{formatCompactIDR(foreign.buyValue)}</span>
                                        <span>Sell: Rp{formatCompactIDR(foreign.sellValue)}</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Domestic</span>
                                        <span className={cn("text-xs font-black", domestic.netValue >= 0 ? "text-success" : "text-destructive")}>
                                            {domestic.netValue >= 0 ? '+' : ''}Rp{formatCompactIDR(domestic.netValue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Buy: Rp{formatCompactIDR(domestic.buyValue)}</span>
                                        <span>Sell: Rp{formatCompactIDR(domestic.sellValue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top Brokers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 bg-success/5 border-b border-border flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-success" />
                                <span className="text-[10px] font-black text-success uppercase tracking-wider">Top Net Buy Brokers</span>
                            </div>
                            <div className="divide-y divide-border">
                                {brokers.topBuy.length === 0 ? (
                                    <div className="p-4 text-xs text-muted-foreground text-center">No data</div>
                                ) : (
                                    brokers.topBuy.map((b, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <span className="text-xs font-mono font-bold text-foreground">{b.code || b.name.substring(0, 4).toUpperCase()}</span>
                                            </div>
                                            <span className="text-xs font-bold text-success flex-shrink-0">
                                                +Rp{formatCompactIDR(b.netValue)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 bg-destructive/5 border-b border-border flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-destructive" />
                                <span className="text-[10px] font-black text-destructive uppercase tracking-wider">Top Net Sell Brokers</span>
                            </div>
                            <div className="divide-y divide-border">
                                {brokers.topSell.length === 0 ? (
                                    <div className="p-4 text-xs text-muted-foreground text-center">No data</div>
                                ) : (
                                    brokers.topSell.map((b, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                <span className="text-xs font-mono font-bold text-foreground">{b.code || b.name.substring(0, 4).toUpperCase()}</span>
                                            </div>
                                            <span className="text-xs font-bold text-destructive flex-shrink-0">
                                                -Rp{formatCompactIDR(Math.abs(b.netValue))}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top Gainers / Losers */}
                    {(gainers.length > 0 || losers.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {gainers.length > 0 && (
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 bg-success/5 border-b border-border flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-success" />
                                        <span className="text-[10px] font-black text-success uppercase tracking-wider">Top Gainers</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {gainers.slice(0, 8).map((s: any, i: number) => (
                                            <Link key={s.KODE_SAHAM || i} href={`/analysis/${s.KODE_SAHAM}.JK`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                    <span className="text-xs font-mono font-bold text-foreground">{s.KODE_SAHAM}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{s.NAMA_SAHAM}</span>
                                                </div>
                                                <span className="text-xs font-bold text-success">
                                                    +{formatPercentage(s.PERSEN_PERUBAHAN)}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {losers.length > 0 && (
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 bg-destructive/5 border-b border-border flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-destructive" />
                                        <span className="text-[10px] font-black text-destructive uppercase tracking-wider">Top Losers</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {losers.slice(0, 8).map((s: any, i: number) => (
                                            <Link key={s.KODE_SAHAM || i} href={`/analysis/${s.KODE_SAHAM}.JK`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                                                    <span className="text-xs font-mono font-bold text-foreground">{s.KODE_SAHAM}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{s.NAMA_SAHAM}</span>
                                                </div>
                                                <span className="text-xs font-bold text-destructive">
                                                    {formatPercentage(s.PERSEN_PERUBAHAN)}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
