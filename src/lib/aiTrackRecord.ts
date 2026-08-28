"use client";
// Lightweight localStorage log of AI recommendations (non-destructive, no API break).
export type AiRec = {
  id: string;
  ticker: string;
  strategy: string;
  signal: string; // BUY/SELL/NEUTRAL
  score?: number;
  price?: number | null;
  createdAt: number;
  // tracking outcome (placeholder — filled by cron later)
  outcomePct?: number | null;
  outcomeNote?: string;
  source: "screener" | "backtest" | "analysis" | "manual";
};

const KEY = "porto_ai_recommendations";
const MAX = 200;

function load(): AiRec[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function persist(arr: AiRec[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))); } catch {}
}

export function logAiRecommendation(rec: Omit<AiRec, "id" | "createdAt"> & Partial<Pick<AiRec, "createdAt">>) {
  const all = load();
  const entry: AiRec = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    createdAt: Date.now(),
    outcomePct: null,
    ...rec,
  } as AiRec;
  const next = [...all, entry].slice(-MAX);
  persist(next);
  return entry;
}

export function getAiRecommendations(): AiRec[] {
  return load().slice().sort((a,b)=> b.createdAt - a.createdAt);
}

export function clearAiRecommendations() {
  persist([]);
}

export function getAiStats(recs: AiRec[]) {
  if (!recs.length) return { total:0, buy:0, sell:0, neutral:0, winRate: null as number | null };
  const buy = recs.filter(r=> r.signal?.toUpperCase().includes("BUY")).length;
  const sell = recs.filter(r=> r.signal?.toUpperCase().includes("SELL")).length;
  const neutral = recs.length - buy - sell;
  const withOutcome = recs.filter(r=> typeof r.outcomePct === "number" && isFinite(r.outcomePct!));
  const winRate = withOutcome.length ? Math.round(withOutcome.filter(r=> (r.outcomePct as number) >0).length / withOutcome.length *100) : null;
  return { total: recs.length, buy, sell, neutral, winRate };
}
