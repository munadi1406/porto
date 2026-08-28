"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortfolios } from "@/hooks/usePortfolios";
import { cn, formatIDR, formatPercentage } from "@/lib/utils";
import { ArrowLeftRight, Loader2 } from "lucide-react";

type PVal = {
  id: string;
  name: string;
  color?: string;
  holdings?: number;
  marketValue?: number;
  cash?: number;
  totalEquity?: number;
  returnPct?: number | null;
  loading: boolean;
};

async function fetchPortfolioVal(portfolioId: string): Promise<Partial<PVal>> {
  try {
    const [pfRes, cashRes, snapRes] = await Promise.all([
      fetch(`/api/portfolio?portfolioId=${portfolioId}`).then(r=>r.json()).catch(()=>null),
      fetch(`/api/cash?portfolioId=${portfolioId}`).then(r=>r.json()).catch(()=>null),
      fetch(`/api/snapshots?portfolioId=${portfolioId}&period=all`).then(r=>r.json()).catch(()=>null),
    ]);
    const holdings = Array.isArray(pfRes?.data) ? pfRes.data.length : undefined;
    // crude marketValue via snapshots totalValue - cash if available
    let cash: number | undefined = undefined;
    if (cashRes?.success) cash = cashRes.data?.amount ?? undefined;
    let totalEquity: number | undefined = undefined;
    let marketValue: number | undefined = undefined;
    const snaps = snapRes?.data?.snapshots;
    if (Array.isArray(snaps) && snaps.length) {
      const last = snaps[snaps.length - 1];
      totalEquity = last?.totalValue ?? undefined;
      if (totalEquity != null && cash != null) marketValue = totalEquity - cash;
    }
    // returnPct from first vs last snapshot
    let returnPct: number | null = null;
    if (Array.isArray(snaps) && snaps.length >= 2) {
      const first = snaps[0]?.totalValue;
      const last = snaps[snaps.length - 1]?.totalValue;
      if (first && last) returnPct = ((last - first)/ first) * 100;
    }
    return { holdings, marketValue, cash, totalEquity, returnPct };
  } catch { return {}; }
}

export function PortfolioCompareTab() {
  const { portfolios } = usePortfolios();
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [vals, setVals] = useState<Record<string, PVal>>({});

  useEffect(() => {
    if (portfolios.length >= 2) {
      if (!a) setA(portfolios[0].id);
      if (!b) setB(portfolios[1].id);
    } else if (portfolios.length === 1 && !a) {
      setA(portfolios[0].id);
    }
  }, [portfolios, a, b]);

  useEffect(() => {
    const ids = [a, b].filter(Boolean) as string[];
    ids.forEach(async (pid) => {
      const meta = portfolios.find(p=> p.id===pid);
      setVals(prev => ({ ...prev, [pid]: { id: pid, name: meta?.name || pid, color: meta?.color, loading: true }}));
      const extra = await fetchPortfolioVal(pid);
      setVals(prev => ({ ...prev, [pid]: { ...(prev[pid] as PVal), ...extra, loading: false } as PVal }));
    });
  }, [a, b, portfolios]);

  const rows = useMemo(() => {
    const va = a ? vals[a] : undefined;
    const vb = b ? vals[b] : undefined;
    const r: { label: string; get: (v?: PVal)=> string; better?: "max"|"min" }[] = [
      { label: "Holdings", get: v=> v?.holdings != null ? String(v.holdings) : "—" , better: "max"},
      { label: "Market Value", get: v=> v?.marketValue != null ? formatIDR(v.marketValue) : (v?.totalEquity != null ? formatIDR(v.totalEquity) : "—") },
      { label: "Cash", get: v=> v?.cash != null ? formatIDR(v.cash) : "—" },
      { label: "Total Equity", get: v=> v?.totalEquity != null ? formatIDR(v.totalEquity) : "—", better: "max" },
      { label: "Return (snapshot)", get: v=> v?.returnPct != null ? formatPercentage(v.returnPct) : "—", better: "max" },
    ];
    return { va, vb, rows: r };
  }, [a,b,vals]);

  if (portfolios.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <ArrowLeftRight className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-bold">Butuh minimal 2 portofolio untuk membandingkan</p>
        <p className="text-xs text-muted-foreground mt-1">Buat portofolio baru di sidebar, lalu bandingkan di sini (pakai usePortfolios + useCashAndHistory per portfolioId).</p>
        {portfolios.length === 1 && (
          <p className="text-[11px] text-muted-foreground mt-2">Saat ini 1 portofolio: {portfolios[0].name}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px] flex-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Portofolio A</label>
          <select value={a} onChange={e=> setA(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold">
            {portfolios.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Portofolio B</label>
          <select value={b} onChange={e=> setB(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold">
            {portfolios.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-0 text-xs">
          <div className="bg-muted/30 px-4 py-2 font-black text-muted-foreground uppercase text-[10px]">Metrik</div>
          <div className="px-4 py-2 font-black text-center flex items-center justify-center gap-2">
            {(rows.va?.loading) && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background: rows.va?.color || "#3b82f6"}} />{rows.va?.name || "A"}</span>
          </div>
          <div className="px-4 py-2 font-black text-center flex items-center justify-center gap-2">
            {(rows.vb?.loading) && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background: rows.vb?.color || "#10b981"}} />{rows.vb?.name || "B"}</span>
          </div>
        </div>
        {rows.rows.map(r=> {
          const av = r.get(rows.va as any);
          const bv = r.get(rows.vb as any);
          // naive better detection for numbers
          let best: 0|1|null = null;
          if (r.better && rows.va && rows.vb) {
            const na = r.label==="Holdings" ? rows.va.holdings : r.label==="Total Equity" ? rows.va.totalEquity : rows.va.returnPct;
            const nb = r.label==="Holdings" ? rows.vb.holdings : r.label==="Total Equity" ? rows.vb.totalEquity : rows.vb.returnPct;
            if (na!=null && nb!=null && isFinite(na as number) && isFinite(nb as number)) {
              if ((na as number) !== (nb as number)) best = r.better==="max" ? ((na as number) > (nb as number) ? 0 : 1) : ((na as number) < (nb as number) ? 0 : 1);
            }
          }
          return (
            <div key={r.label} className="grid grid-cols-3 gap-0 border-t border-border/40 text-xs">
              <div className="px-4 py-2.5 text-muted-foreground">{r.label}</div>
              <div className={cn("px-4 py-2.5 text-center font-bold tabular-nums", best===0 && "bg-success/10 text-success rounded")}>{av}{best===0 && <span className="ml-1 text-[9px]">★</span>}</div>
              <div className={cn("px-4 py-2.5 text-center font-bold tabular-nums", best===1 && "bg-success/10 text-success rounded")}>{bv}{best===1 && <span className="ml-1 text-[9px]">★</span>}</div>
            </div>
          );
        })}
        <p className="px-4 py-2 text-[9px] text-muted-foreground/60 border-t border-border">★ = lebih baik. Error handling: jika snapshot kosong, tampil —. Menggunakan fetch per portfolioId (non-destruktif).</p>
      </div>
    </div>
  );
}
