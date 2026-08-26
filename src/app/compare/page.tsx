"use client";

import { useState } from "react";
import Link from "next/link";
import { Columns2, Loader2, Plus, X } from "lucide-react";
import { cn, formatCompactIDR } from "@/lib/utils";
import type { FundamentalData } from "@/hooks/useFundamentals";

interface RiskData {
    beta: number;
    correlation: number;
    annualVolatilityPct: number;
    maxDrawdownPct: number;
    returnPct: number;
}

interface StockBundle {
    code: string;
    fundamentals?: FundamentalData | null;
    risk?: RiskData | null;
}

const MAX_STOCKS = 3;

type Row = {
    label: string;
    get: (b: StockBundle) => string | null;
    better?: (vals: (number | null)[]) => number; // index paling bagus; null = netral
    num: (b: StockBundle) => number | null;
};

const pct = (v: number | null | undefined, digits = 1) =>
    v == null || !isFinite(v) ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;

const x = (v: number | null | undefined) => (v == null || !isFinite(v) ? "-" : `${v.toFixed(1)}x`);

/** Index nilai terbaik dalam baris; -1 jika tidak ada kandidat valid. */
function bestIdxBy(vals: (number | null)[], prefer: "max" | "min", pred?: (v: number) => boolean): number {
    let best = -1;
    let bestVal: number | null = null;
    vals.forEach((v, i) => {
        if (v == null || !isFinite(v)) return;
        if (pred && !pred(v)) return;
        if (bestVal == null || (prefer === "max" ? v > bestVal : v < bestVal)) { best = i; bestVal = v; }
    });
    return best;
}

const ROWS: Row[] = [
    {
        label: "Harga",
        num: b => b.fundamentals?.currentPrice ?? null,
        get: b => (b.fundamentals?.currentPrice ? `Rp ${b.fundamentals.currentPrice.toLocaleString("id-ID")}` : "-"),
    },
    {
        label: "Perubahan Hari Ini",
        num: b => b.fundamentals?.priceChangePercent ?? null,
        get: b => pct(b.fundamentals?.priceChangePercent ?? null),
        better: vals => bestIdxBy(vals, "max"),
    },
    {
        label: "Market Cap",
        num: b => b.fundamentals?.marketCap ?? null,
        get: b => (b.fundamentals?.marketCap ? formatCompactIDR(b.fundamentals.marketCap) : "-"),
    },
    {
        label: "PER",
        num: b => b.fundamentals?.peRatio ?? null,
        get: b => x(b.fundamentals?.peRatio),
        better: vals => bestIdxBy(vals, "min", v2 => v2 > 0),
    },
    {
        label: "PBV",
        num: b => b.fundamentals?.pbRatio ?? null,
        get: b => x(b.fundamentals?.pbRatio),
        better: vals => bestIdxBy(vals, "min", v2 => v2 > 0),
    },
    {
        label: "ROE",
        // Yahoo memberi ROE sebagai fraksi (0.25 = 25%)
        num: b => b.fundamentals?.roe ?? null,
        get: b => pct(b.fundamentals?.roe != null ? b.fundamentals.roe * 100 : null),
        better: vals => bestIdxBy(vals, "max"),
    },
    {
        label: "DER",
        // Yahoo memberi debtToEquity dalam persen (145 ≈ 1.45x)
        num: b => (b.fundamentals?.debtToEquity != null ? b.fundamentals.debtToEquity / 100 : null),
        get: b => x(b.fundamentals?.debtToEquity != null ? b.fundamentals.debtToEquity / 100 : null),
        better: vals => bestIdxBy(vals, "min", v2 => v2 >= 0),
    },
    {
        label: "Dividend Yield",
        // Yahoo memberi dividendYield sebagai fraksi
        num: b => b.fundamentals?.dividendYield ?? null,
        get: b => pct(b.fundamentals?.dividendYield != null ? b.fundamentals.dividendYield * 100 : null, 2),
        better: vals => bestIdxBy(vals, "max"),
    },
    {
        label: "EPS (TTM)",
        num: b => b.fundamentals?.trailingEps ?? null,
        get: b => (b.fundamentals?.trailingEps != null ? `Rp ${b.fundamentals.trailingEps.toLocaleString("id-ID")}` : "-"),
    },
    {
        label: "Book Value / saham",
        num: b => b.fundamentals?.bookValue ?? null,
        get: b => (b.fundamentals?.bookValue != null ? `Rp ${Math.round(b.fundamentals.bookValue).toLocaleString("id-ID")}` : "-"),
    },
    {
        label: "Beta vs IHSG",
        num: b => (b.risk && isFinite(b.risk.beta) ? b.risk.beta : null),
        get: b => (b.risk && isFinite(b.risk.beta) ? b.risk.beta.toFixed(2) : "-"),
    },
    {
        label: "Volatilitas Tahunan",
        num: b => (b.risk ? b.risk.annualVolatilityPct : null),
        get: b => (b.risk ? `${b.risk.annualVolatilityPct.toFixed(1)}%` : "-"),
        better: vals => bestIdxBy(vals, "min"),
    },
    {
        label: "Max Drawdown 1T",
        num: b => (b.risk ? b.risk.maxDrawdownPct : null),
        get: b => (b.risk ? `${b.risk.maxDrawdownPct.toFixed(1)}%` : "-"),
        better: vals => bestIdxBy(vals, "max"),
    },
    {
        label: "Return 1 Tahun",
        num: b => (b.risk ? b.risk.returnPct : null),
        get: b => pct(b.risk?.returnPct ?? null),
        better: vals => bestIdxBy(vals, "max"),
    },
];

export default function ComparePage() {
    const [input, setInput] = useState("");
    const [stocks, setStocks] = useState<StockBundle[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCodes, setLoadingCodes] = useState<string[]>([]);

    const addStock = async () => {
        const t = input.trim().toUpperCase().replace(".JK", "");
        if (!t || stocks.some(s => s.code === t) || stocks.length >= MAX_STOCKS) return;
        setInput("");
        setLoading(true);
        setLoadingCodes(prev => [...prev, t]);
        setStocks(prev => [...prev.filter(s => s.code !== t), { code: t }]);

        try {
            const [fRes, rRes] = await Promise.all([
                fetch(`/api/fundamentals?ticker=${t}.JK`).then(r => r.json()).catch(() => null),
                fetch(`/api/risk?ticker=${t}&period=1y`).then(r => r.json()).catch(() => null),
            ]);
            // Kedua route membungkus payload di dalam .data
            const fresh: StockBundle = {
                code: t,
                fundamentals: fRes?.success && fRes.data ? fRes.data : null,
                risk: rRes?.success ? rRes.data : null,
            };
            setStocks(prev => prev.map(s => (s.code === t ? fresh : s)));
        } finally {
            setLoading(false);
            setLoadingCodes(prev => prev.filter(c => c !== t));
        }
    };

    const removeStock = (code: string) => setStocks(prev => prev.filter(s => s.code !== code));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Columns2 className="w-6 h-6 text-primary" />
                    Bandingkan Saham
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Bandingkan hingga {MAX_STOCKS} saham — valuasi, profitabilitas &amp; risiko</p>
            </div>

            <div className="card">
                <form onSubmit={e => { e.preventDefault(); addStock(); }} className="flex gap-2 items-center">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Kode saham, mis. BBRI"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                        type="submit"
                        disabled={loading || stocks.length >= MAX_STOCKS}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Tambah
                    </button>
                </form>

                {stocks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {stocks.map(s => (
                            <span key={s.code} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-black">
                                {loadingCodes.includes(s.code) && <Loader2 className="w-3 h-3 animate-spin" />}
                                <Link href={`/analysis/${s.code}.JK`} className="hover:underline">{s.code}</Link>
                                <button onClick={() => removeStock(s.code)} className="hover:text-destructive cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {stocks.length === 0 ? (
                <div className="card py-12 text-center text-sm text-muted-foreground">
                    Tambahkan minimal 2 saham untuk mulai membandingkan
                </div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-xs tabular-nums min-w-[480px]">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 pr-3 text-[10px] uppercase text-muted-foreground w-40">Metrik</th>
                                {stocks.map(s => (
                                    <th key={s.code} className="text-center py-2 px-2 font-black text-sm">{s.code}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ROWS.map(row => {
                                const nums = stocks.map(row.num);
                                const bestIdx = row.better && nums.some(v => v != null) ? row.better(nums) : -1;
                                return (
                                    <tr key={row.label} className="border-b border-border/40 last:border-b-0">
                                        <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
                                        {stocks.map((s, i) => (
                                            <td key={s.code} className={cn(
                                                "py-2 px-2 text-center font-semibold",
                                                bestIdx === i && "bg-success/10 text-success rounded font-bold",
                                            )}>
                                                {row.get(s)}
                                                {bestIdx === i && nums[i] != null && <span className="ml-1 text-[9px]">★</span>}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="mt-2 text-[9px] text-muted-foreground/70">
                        ★ = terbaik di baris tersebut (PER/PBV/DER/volatilitas lebih rendah lebih baik). Risiko dihitung vs IHSG 1 tahun harian.
                    </p>
                </div>
            )}
        </div>
    );
}
