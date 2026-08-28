"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { cn } from "@/lib/utils";

type Snap = { t: number; insiders: number | null; institutions: number | null };

function pct(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return null;
  return v * 100;
}

export function useOwnershipChange(ticker: string, insidersPercent?: number | null, institutionsPercent?: number | null) {
  const [prev, setPrev] = useState<Snap | null>(null);

  useEffect(() => {
    if (!ticker) return;
    const key = `porto_ownership_snapshot_${ticker.replace(".JK","").toUpperCase()}`;
    const nowIns = pct(insidersPercent);
    const nowInst = pct(institutionsPercent);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as Snap;
        setPrev(s);
      }
      // store current as latest if valid
      if (nowIns != null || nowInst != null) {
        const snap: Snap = { t: Date.now(), insiders: nowIns, institutions: nowInst };
        localStorage.setItem(key, JSON.stringify(snap));
      }
    } catch {}
  }, [ticker, insidersPercent, institutionsPercent]);

  const diff = useMemo(() => {
    if (!prev) return null;
    const curIns = pct(insidersPercent);
    const curInst = pct(institutionsPercent);
    const dIns = curIns != null && prev.insiders != null ? curIns - prev.insiders : null;
    const dInst = curInst != null && prev.institutions != null ? curInst - prev.institutions : null;
    return { dIns, dInst, prev };
  }, [prev, insidersPercent, institutionsPercent]);

  const hasSignificant = diff && ((diff.dIns != null && Math.abs(diff.dIns) > 1) || (diff.dInst != null && Math.abs(diff.dInst) > 1));
  return { diff, hasSignificant };
}

export function InsiderOwnershipTracker({
  ticker,
  insidersPercent,
  institutionsPercent,
}: {
  ticker: string;
  insidersPercent?: number | null;
  institutionsPercent?: number | null;
}) {
  const { diff } = useOwnershipChange(ticker, insidersPercent, institutionsPercent);

  // Mock quarterly timeline when no history endpoint — synthesize last 4 quarters with jitter
  const timeline = useMemo(() => {
    const curIns = pct(insidersPercent);
    const curInst = pct(institutionsPercent);
    if (curIns == null && curInst == null) return [];
    const quarters = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025"];
    // deterministic jitter from ticker hash
    let h = 0; for (const ch of ticker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const jitter = (i: number) => ((h + i * 997) % 200 - 100) / 100; // -1..+1
    const series: { label: string; insiders: number; institutions: number; dIns: number | null; dInst: number | null }[] = [];
    let ci = curIns ?? 10;
    let ii = curInst ?? 30;
    // build backwards then reverse
    const pts: { insiders: number; institutions: number }[] = [];
    for (let i = 0; i < 4; i++) pts.unshift({ insiders: ci, institutions: ii });
    // adjust earlier points
    for (let idx = pts.length - 2; idx >= 0; idx--) {
      const next = pts[idx + 1];
      pts[idx] = {
        insiders: Math.max(0, Math.min(60, next.insiders - jitter(idx) * 0.8)),
        institutions: Math.max(0, Math.min(80, next.institutions - jitter(idx + 10) * 1.1)),
      };
    }
    // override with diff if available for last step
    if (diff?.prev.insiders != null && curIns != null) {
      const prevIns = diff.prev.insiders;
      pts[pts.length - 2].insiders = prevIns;
    }
    if (diff?.prev.institutions != null && curInst != null) {
      pts[pts.length - 2].institutions = diff.prev.institutions;
    }
    for (let i = 0; i < 4; i++) {
      const prevIns = i > 0 ? pts[i - 1].insiders : null;
      const prevInst = i > 0 ? pts[i - 1].institutions : null;
      series.push({
        label: quarters[i],
        insiders: pts[i].insiders,
        institutions: pts[i].institutions,
        dIns: prevIns != null ? pts[i].insiders - prevIns : null,
        dInst: prevInst != null ? pts[i].institutions - prevInst : null,
      });
    }
    return series;
  }, [ticker, insidersPercent, institutionsPercent, diff]);

  if (timeline.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">Belum ada data kepemilikan untuk timeline kuartalan</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Snapshot lokal akan terbentuk setelah memuat halaman beberapa kali / setelah endpoint history tersedia.</p>
      </div>
    );
  }

  const Chip = ({ v }: { v: number | null }) => {
    if (v == null || Math.abs(v) < 0.05) return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="w-3 h-3" /> 0%</span>;
    const up = v > 0;
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold", up ? "text-success" : "text-destructive")}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? "+" : ""}{v.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Insider & Ownership Change — per Kuartal</h4>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">C10 · localStorage snapshot diff (mock jika belum ada endpoint)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-3 py-2 font-bold">Kuartal</th>
              <th className="text-right px-3 py-2 font-bold">Insider</th>
              <th className="text-right px-3 py-2 font-bold">Δ Insider</th>
              <th className="text-right px-3 py-2 font-bold">Institusi</th>
              <th className="text-right px-3 py-2 font-bold">Δ Institusi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {timeline.map((r) => (
              <tr key={r.label} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-bold text-foreground">{r.label}</td>
                <td className="px-3 py-2 text-right font-mono">{r.insiders.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right"><Chip v={r.dIns} /></td>
                <td className="px-3 py-2 text-right font-mono">{r.institutions.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right"><Chip v={r.dInst} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {diff && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Snapshot diff: Insider {diff.dIns != null ? `${diff.dIns > 0 ? "+" : ""}${diff.dIns.toFixed(2)}%` : "—"} · Institusi {diff.dInst != null ? `${diff.dInst > 0 ? "+" : ""}${diff.dInst.toFixed(2)}%` : "—"} {((diff.dIns != null && Math.abs(diff.dIns) > 1) || (diff.dInst != null && Math.abs(diff.dInst) > 1)) ? "· perubahan >1% → badge di tab Ownership" : ""}
        </p>
      )}
    </div>
  );
}
