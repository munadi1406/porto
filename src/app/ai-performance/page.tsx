"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Trash2, Clock, TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAiRecommendations, getAiStats, clearAiRecommendations, logAiRecommendation, type AiRec } from "@/lib/aiTrackRecord";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function AiPerformancePage() {
  const [recs, setRecs] = useState<AiRec[]>([]);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");

  const refresh = () => setRecs(getAiRecommendations());
  useEffect(() => { refresh(); }, []);
  // also log current view if coming from screener/backtest — placeholder cron badge
  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const stats = getAiStats(recs);
  const filtered = recs.filter(r => {
    if (filter === "buy") return r.signal.toUpperCase().includes("BUY");
    if (filter === "sell") return r.signal.toUpperCase().includes("SELL");
    return true;
  });

  const handleClear = () => {
    if (!confirm("Hapus semua log AI?")) return;
    clearAiRecommendations();
    refresh();
  };

  const handleSeed = () => {
    // seed demo entries (non-destructive, local only) — useful to show table; uses log infra
    logAiRecommendation({ ticker: "BBCA", strategy: "Screener • RSI Oversold", signal: "BUY", score: 42, price: 9750, source: "screener" });
    logAiRecommendation({ ticker: "BBRI", strategy: "Backtest • Golden Cross", signal: "BUY", score: 31, price: 4850, source: "backtest" });
    logAiRecommendation({ ticker: "TLKM", strategy: "Analysis • MA Support", signal: "HOLD", score: 5, price: 3050, source: "analysis" });
    refresh();
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Pasar", href: "/" }, { label: "Analisis Saham", href: "/screener" }, { label: "Kinerja AI" }]} />
      <title>Kinerja AI — Porto</title>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Kinerja AI
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">D13</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track record rekomendasi AI (localStorage) — cron placeholder Evaluasi otomatis T+7 (belum real, mock outcomePct).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeed} className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted">Seed demo</button>
          <button onClick={refresh} className="p-2 rounded-lg border border-border hover:bg-muted" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={handleClear} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: String(stats.total), icon: BarChart3 },
          { label: "Buy", value: String(stats.buy), icon: TrendingUp, cls: "text-success" },
          { label: "Sell", value: String(stats.sell), icon: TrendingDown, cls: "text-destructive" },
          { label: "Netral", value: String(stats.neutral), icon: Minus },
          { label: "Win Rate", value: stats.winRate != null ? `${stats.winRate}%` : "—", icon: Sparkles, sub: stats.winRate != null ? "outcome mock" : "cron T+7 placeholder" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </div>
            <p className={cn("text-xl font-black mt-1 tabular-nums", (c as any).cls)}>{c.value}</p>
            {(c as any).sub && <p className="text-[9px] text-muted-foreground">{(c as any).sub}</p>}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["all","buy","sell"] as const).map(k=> (
          <button key={k} onClick={()=> setFilter(k)} className={cn("px-3 py-1.5 rounded-md text-xs font-bold capitalize", filter===k ? "bg-card shadow border border-border" : "text-muted-foreground")}>
            {k === "all" ? "Semua" : k === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
        <span className="ml-2 text-[10px] text-muted-foreground self-center">Cron: evaluasi 7 hari pasca sinyal (placeholder)</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Bot className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-bold">Belum ada rekomendasi AI tercatat</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Log diisi otomatis ketika AI memberi sinyal di Screener / Backtest / Analisis. Sementara, klik Seed demo untuk melihat format tabel.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">Storage: porto_ai_recommendations (localStorage, max 200). Cron placeholder T+7 akan isi outcomePct.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase text-muted-foreground">
                  <th className="text-left px-3 py-2">Waktu</th>
                  <th className="text-left px-3 py-2">Ticker</th>
                  <th className="text-left px-3 py-2">Sumber</th>
                  <th className="text-left px-3 py-2">Strategi</th>
                  <th className="text-center px-3 py-2">Sinyal</th>
                  <th className="text-right px-3 py-2">Skor</th>
                  <th className="text-right px-3 py-2">Harga</th>
                  <th className="text-right px-3 py-2">Outcome*</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(r=> (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" />{new Date(r.createdAt).toLocaleString("id-ID", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"})}</span>
                    </td>
                    <td className="px-3 py-2 font-black font-mono">
                      <Link href={`/analysis/${r.ticker}.JK`} className="hover:text-primary hover:underline">{r.ticker}</Link>
                    </td>
                    <td className="px-3 py-2"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border">{r.source}</span></td>
                    <td className="px-3 py-2 max-w-[220px] truncate text-muted-foreground">{r.strategy}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border", r.signal.toUpperCase().includes("BUY") ? "bg-success/10 text-success border-success/20" : r.signal.toUpperCase().includes("SELL") ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground")}>
                        {r.signal}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{r.score ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.price != null ? `Rp ${Number(r.price).toLocaleString("id-ID")}` : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.outcomePct != null ? (
                        <span className={cn("font-bold", r.outcomePct >0 ? "text-success" : r.outcomePct <0 ? "text-destructive" : "text-muted-foreground")}>
                          {r.outcomePct >0 ? "+" : ""}{r.outcomePct.toFixed(2)}%
                        </span>
                      ) : <span className="text-muted-foreground text-[11px]">pending T+7</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length>0 && (
          <p className="px-3 py-2 text-[9px] text-muted-foreground/60 border-t border-border">
            * Outcome diisi oleh cron job harian (placeholder): hitung return T+7 vs harga sinyal. Belum ada endpoint — mock pending.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border p-3 bg-muted/20">
        <p className="text-[11px] font-bold">Integrasi</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Screener & Backtest dapat memanggil <code className="px-1 py-0.5 bg-muted rounded text-[10px]">logAiRecommendation</code> saat AI memberi rekomendasi — sudah tersedia di <code className="text-[10px]">src/lib/aiTrackRecord.ts</code>.
          Posisi tab di Screener juga bisa embed ringkas widget ini (link ke halaman ini).
        </p>
      </div>
    </div>
  );
}
