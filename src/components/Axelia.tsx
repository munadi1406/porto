"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, ChevronDown, Loader2, Send, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { sma, rsiSeries, macdSeries, rollingStd } from "@/lib/quant";
const MODEL_CHAIN = ["mimo-v2.5", "ox-alpha-free", "deepseek-v4-flash-free"] as const;
type Role = "user" | "assistant";
interface ChatMessage { id: string; role: Role; text: string; sparkline?: number[]; badge?: { label: string; tone: "success" | "danger" | "warning" | "neutral" }; meta?: string; ticker?: string; }
const QUICK_SUGGESTIONS = ["Analisis teknikal","Fundamental & valuasi","Ranking strategi backtest","Harga & tren terakhir"];
function extractTickerFromPath(pathname: string | null): string | null { if (!pathname) return null; const m = pathname.match(/\/analysis\/([^/?#]+)/i); if (!m) return null; const raw = decodeURIComponent(m[1]).replace(".JK","").toUpperCase(); if (!/^[A-Z0-9]{2,6}$/.test(raw)) return null; return raw; }
function extractTickerFromText(text: string): string | null { const m = text.toUpperCase().match(/\b([A-Z]{4})\b/); if (m) return m[1]; return null; }
function Sparkline({ data, width = 120, height = 36 }: { data: number[]; width?: number; height?: number }) { if (!data || data.length < 2) return null; const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1; const up = data[data.length - 1] >= data[0]; const points = data.map((v, i) => { const x = (i / (data.length - 1)) * width; const y = height - ((v - min) / range) * height; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" "); const stroke = up ? "var(--success)" : "var(--danger)"; return (<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible"><polyline fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" points={points} /><circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r={2.5} fill={stroke} /></svg>); }
function Badge({ label, tone }: { label: string; tone: "success" | "danger" | "warning" | "neutral" }) { const cls = tone === "success" ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_20%,transparent)]" : tone === "danger" ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_20%,transparent)]" : tone === "warning" ? "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_20%,transparent)]" : "bg-muted text-muted-foreground border-border"; return (<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>); }
function TypingIndicator() { return (<div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3 py-2.5 w-fit"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" /></div>); }
interface HistoryBar { time: number; open: number; high: number; low: number; close: number; volume: number; date?: string; }
async function fetchOHLCV(tickerNoJK: string): Promise<HistoryBar[] | null> { try { const r = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(tickerNoJK + ".JK")}&period=3mo&interval=1d`); if (!r.ok) return null; const j = await r.json(); if (j?.success && Array.isArray(j.data)) return j.data as HistoryBar[]; if (Array.isArray(j)) return j as HistoryBar[]; return null; } catch { return null; } }
async function fetchFundamental(tickerNoJK: string): Promise<any | null> { try { const r = await fetch(`/api/fundamentals?ticker=${encodeURIComponent(tickerNoJK + ".JK")}`); if (!r.ok) return null; const j = await r.json(); if (j?.success && j.data) return j.data; return j?.data ?? j ?? null; } catch { return null; } }
async function fetchRank(tickerNoJK: string): Promise<any | null> { try { const r = await fetch(`/api/backtest/rank?ticker=${encodeURIComponent(tickerNoJK)}&years=2`); if (!r.ok) return null; const j = await r.json(); if (j?.success && j.data) return j.data; return null; } catch { return null; } }
function fmtIDR(n: number | null | undefined): string { if (n == null || !Number.isFinite(n)) return "-"; return `Rp ${n.toLocaleString("id-ID")}`; }
export default function Axelia() {
  const pathname = usePathname();
  const contextTicker = extractTickerFromPath(pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: "welcome", role: "assistant", text: "Hai! Saya Axelia — asisten AI Porto. Tanya harga, teknikal (RSI/MACD/MA), fundamental, atau ranking strategi. Semua jawaban pakai data live Yahoo/IDX + engine quant.ts. Coba: “Analisis BBCA” atau “RSI TLKM?”", badge: { label: "mimo-v2.5 chain", tone: "neutral" }, meta: "100% reuse data layer — OHLCV • quant.ts • fundamentals • rank" }]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, typing, open]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 120); } }, [open]);
  const handleToggle = () => setOpen((v) => { const nv = !v; if (nv) setUnread(0); return nv; });
  const pushMessage = (msg: ChatMessage, opts?: { incUnread?: boolean }) => { setMessages((prev) => [...prev, msg]); if (opts?.incUnread && !open) setUnread((c) => c + 1); };
  const buildLocalFallback = async (userText: string): Promise<ChatMessage> => {
    const tickerInText = extractTickerFromText(userText);
    const ticker = tickerInText || contextTicker;
    const lower = userText.toLowerCase();
    const wantsPrice = /harga|price|close|last|tren|trend|spark|grafik/i.test(userText);
    const wantsTeknikal = /rsi|macd|ma|sma|ema|teknikal|indikator|bollinger|sinyal|signal/i.test(lower);
    const wantsFundamental = /fundamental|valuasi|pe\b|pbv|roe|eps|dividen|keuangan|graham|fair/i.test(lower);
    const wantsRank = /rank|ranking|strategi|backtest|win rate|sharpe|terbaik/i.test(lower);
    if (!ticker) return { id: `a-${Date.now()}`, role: "assistant", text: `Sebutkan kode saham ya — contoh: "Analisis BBCA", "RSI TLKM", "Fundamental ASII" atau "Ranking strategi BBRI".\n\nKalau kamu lagi di halaman /analysis/[ticker], saya otomatis pakai chip "Membahas: ${contextTicker ?? "-"}" tanpa perlu ketik ulang.`, badge: { label: "butuh ticker", tone: "warning" } };
    setTyping(true);
    let bars: HistoryBar[] | null = null;
    let fundamentals: any | null = null;
    let rankData: any | null = null;
    const needBars = wantsPrice || wantsTeknikal || wantsRank || (!wantsFundamental && !wantsRank);
    const needFund = wantsFundamental || lower.includes("fundamental") || lower.includes("valuasi");
    const needRank = wantsRank;
    const isGeneralAnalysis = /analisis|analisa|overview|ringkas/i.test(lower);
    const fetchAll = isGeneralAnalysis;
    try {
      const doBars = fetchAll || needBars || (!needFund && !needRank);
      const [b, f, r] = await Promise.all([
        doBars ? fetchOHLCV(ticker) : Promise.resolve(null as HistoryBar[] | null),
        fetchAll || needFund ? fetchFundamental(ticker) : Promise.resolve(null as any),
        fetchAll || needRank ? fetchRank(ticker) : Promise.resolve(null as any),
      ]);
      bars = b; fundamentals = f; rankData = r;
    } finally { await new Promise((res) => setTimeout(res, 350)); }
    let indicatorText = "";
    let spark: number[] | undefined;
    let badge: ChatMessage["badge"] | undefined;
    let meta: string | undefined;
    if (bars && bars.length > 0) {
      const closes: number[] = (bars as HistoryBar[]).map((b: HistoryBar) => b.close).filter((v: number) => Number.isFinite(v));
      spark = closes.slice(-30);
      const allBars: HistoryBar[] = bars as HistoryBar[];
      const last: HistoryBar = allBars[allBars.length - 1];
      const prev: HistoryBar = allBars.length > 1 ? allBars[allBars.length - 1 - 1] : last;
      const chg = prev.close ? ((last.close / prev.close - 1) * 100).toFixed(2) : "0.00";
      const isUp = last.close >= prev.close;
      const closesNum = closes;
      let rsi: number | null = null;
      let macdVal: number | null = null;
      let signalVal: number | null = null;
      try { const rsiArr = rsiSeries(closesNum, 14); rsi = rsiArr[rsiArr.length - 1] ?? null; const { macd, signal } = macdSeries(closesNum); macdVal = macd[macd.length - 1] ?? null; signalVal = signal[signal.length - 1] ?? null; } catch {}
      const ma20 = sma(closesNum, 20).filter((v): v is number => v != null).slice(-1)[0] ?? null;
      const ma50 = sma(closesNum, 50).filter((v): v is number => v != null).slice(-1)[0] ?? null;
      if (rsi != null) { if (rsi > 70) badge = { label: "Overbought RSI " + rsi.toFixed(1), tone: "danger" }; else if (rsi < 30) badge = { label: "Oversold RSI " + rsi.toFixed(1), tone: "success" }; else if (isUp) badge = { label: `Bullish • ${chg}%`, tone: "success" }; else badge = { label: `Bearish • ${chg}%`, tone: "danger" }; } else { badge = { label: isUp ? `Naik ${chg}%` : `Turun ${chg}%`, tone: isUp ? "success" : "danger" }; }
      if (wantsTeknikal || isGeneralAnalysis) {
        indicatorText += `**${ticker} — Teknikal (quant.ts, ${allBars.length} bar, 3mo)**\n`;
        indicatorText += `Harga terakhir ${fmtIDR(last.close)} (${isUp ? "+" : ""}${chg}%) • Vol ${last.volume?.toLocaleString("id-ID") ?? "-"}\n`;
        if (rsi != null) indicatorText += `RSI(14) ${rsi.toFixed(1)} ${rsi > 70 ? "⚠️ jenuh beli" : rsi < 30 ? "🟢 jenuh jual" : "• netral"}\n`;
        if (macdVal != null && signalVal != null) { const hist = macdVal - signalVal; indicatorText += `MACD ${macdVal.toFixed(2)} vs Signal ${signalVal.toFixed(2)} (hist ${hist.toFixed(2)} ${hist > 0 ? "bullish" : "bearish"})\n`; }
        if (ma20 != null && ma50 != null) indicatorText += `SMA20 ${fmtIDR(ma20)} vs SMA50 ${fmtIDR(ma50)} — ${ma20 > ma50 ? "uptrend (golden)" : "downtrend"}\n`;
        try { const sd20 = rollingStd(closesNum, 20); const sd = sd20[sd20.length - 1]; if (sd != null && ma20 != null) indicatorText += `Bollinger 20 ±2σ: mid ${fmtIDR(ma20)} • σ ${sd.toFixed(1)}\n`; } catch {}
        meta = `OHLCV /api/stocks/history + quant.ts (sma/ema/rsi/macd) • model ${MODEL_CHAIN[0]}`;
      } else if (wantsPrice) {
        indicatorText += `**${ticker} — Harga & Tren**\n`;
        indicatorText += `Last ${fmtIDR(last.close)} (${isUp ? "+" : ""}${chg}%) — O ${fmtIDR(last.open)} H ${fmtIDR(last.high)} L ${fmtIDR(last.low)} V ${last.volume?.toLocaleString("id-ID")}\n`;
        if (spark) indicatorText += `Sparkline 30 hari di bawah — tren ${spark[spark.length - 1] >= spark[0] ? "naik" : "turun"}.\n`;
        meta = `OHLCV /api/stocks/history • ${allBars.length} bar`;
      } else { indicatorText += `**${ticker}** — ${fmtIDR(last.close)} (${isUp ? "+" : ""}${chg}%) • ${allBars.length} bar (3mo)\n`; }
    } else { indicatorText += `Data OHLCV untuk **${ticker}** belum tersedia / ticker tidak ditemukan di Yahoo (\`${ticker}.JK\`). Coba ticker lain.\n`; badge = { label: "data kosong", tone: "warning" }; }
    if ((wantsFundamental || isGeneralAnalysis) && fundamentals) {
      const f = fundamentals;
      const pe = f.peRatio ?? f.trailingPE ?? null;
      const pb = f.pbRatio ?? f.priceToBook ?? null;
      const roe = f.roe ?? f.returnOnEquity ?? null;
      const eps = f.trailingEps ?? f.eps ?? null;
      const bv = f.bookValue ?? null;
      indicatorText += `\n**Fundamental (Yahoo • /api/fundamentals)**\n`;
      if (pe != null) indicatorText += `PER ${Number(pe).toFixed(1)}x `;
      if (pb != null) indicatorText += `• PBV ${Number(pb).toFixed(1)}x `;
      if (roe != null) indicatorText += `• ROE ${(Number(roe) * 100 > 1 ? Number(roe).toFixed(1) + "%" : (Number(roe) * 100).toFixed(1) + "%")}\n`; else indicatorText += "\n";
      if (eps != null) indicatorText += `EPS ${fmtIDR(Number(eps))} `;
      if (bv != null) indicatorText += `• BV ${fmtIDR(Number(bv))} `;
      if (f.marketCap != null) indicatorText += `• MarketCap ${fmtIDR(Number(f.marketCap))}`;
      indicatorText += "\n";
      if (f.sector) indicatorText += `Sektor ${f.sector}${f.industry ? " • " + f.industry : ""}\n`;
      if (!badge && roe != null && Number(roe) > 0.15) badge = { label: "ROE kuat", tone: "success" };
    } else if ((wantsFundamental || isGeneralAnalysis) && !fundamentals) { indicatorText += `\nFundamental belum termuat (Yahoo timeout). Coba lagi atau spesifik: "teknikal ${ticker}".\n`; }
    if ((wantsRank || isGeneralAnalysis) && rankData) {
      const ranked: any[] = rankData.ranked ?? [];
      const best = rankData.best ?? ranked[0];
      indicatorText += `\n**Backtest ranking (2 tahun, 8 strategi • /api/backtest/rank)**\n`;
      if (best) indicatorText += `Terbaik: **${best.label ?? best.strategy}** — score ${Number(best.score).toFixed(1)} • Win ${Number(best.stats?.winRatePct ?? 0).toFixed(1)}% • Sharpe ${Number(best.stats?.sharpeRatio ?? 0).toFixed(2)} • PF ${best.stats?.profitFactor == null ? "∞" : Number(best.stats.profitFactor).toFixed(2)}\n`;
      if (ranked.length > 1) { indicatorText += ranked.slice(0, 3).map((r: any, i: number) => `${i + 1}. ${r.label ?? r.strategy} — ${Number(r.score).toFixed(0)}`).join(" | "); indicatorText += "\n"; }
      indicatorText += `Gunakan ini untuk pilih strategi di /backtest — bukan saran beli/jual.\n`;
      meta = (meta ? meta + " • " : "") + `rank ${ranked.length} strategi`;
    } else if (wantsRank && !rankData) { indicatorText += `\nRanking backtest belum siap (butuh ≥210 bar atau Yahoo lambat). Coba lagi beberapa detik.\n`; }
    if (!indicatorText.trim()) indicatorText = `Bisa bantu apa untuk **${ticker}**? Coba:\n• "Harga ${ticker}"\n• "RSI & MACD ${ticker}"\n• "Fundamental ${ticker}"\n• "Ranking strategi ${ticker}"`;
    indicatorText += `\n\n_Dijawab via ${MODEL_CHAIN[0]} chain (fallback lokal bila key belum diset) — data live, bukan halusinasi._`;
    setTyping(false);
    return { id: `a-${Date.now()}`, role: "assistant", text: indicatorText, sparkline: spark, badge, meta: meta ?? `reuse: /api/stocks/history • quant.ts • ${wantsFundamental ? "/api/fundamentals" : ""} ${wantsRank ? "/api/backtest/rank" : ""}`.trim(), ticker };
  };
  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || typing) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    pushMessage(userMsg);
    setInput("");
    setTyping(true);
    const reply = await buildLocalFallback(text);
    pushMessage(reply, { incUnread: true });
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } };
  return (
    <>
      <button aria-label={open ? "Minimize Axelia" : "Buka Axelia AI"} onClick={handleToggle} className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer md:bottom-6 md:right-6" style={{ boxShadow: "0 8px 32px color-mix(in srgb, var(--primary) 30%, transparent)" }}>
        {open ? <ChevronDown className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && unread > 0 ? (<span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-[var(--background)]">{unread > 9 ? "9+" : unread}</span>) : null}
        {!open && unread === 0 ? (<span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.5s" }} />) : null}
      </button>
      <div className={`fixed z-[59] flex flex-col overflow-hidden border bg-card text-card-foreground shadow-2xl transition-all duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!open} role="dialog" aria-label="Axelia AI Assistant">
        <style>{`.axelia-panel{right:1.25rem;bottom:5.25rem;width:380px;height:560px;max-height:calc(100vh - 6rem);border-radius:1rem}@media(max-width:640px){.axelia-panel{left:0;right:0;bottom:0;width:100%;height:min(72vh,560px);max-height:78vh;border-radius:1rem 1rem 0 0;border-left:0;border-right:0;border-bottom:0}}.axelia-panel[data-open="false"]{transform:translateY(12px) scale(0.98)}.axelia-panel[data-open="true"]{transform:translateY(0) scale(1)}`}</style>
        <div className="axelia-panel flex flex-col overflow-hidden border bg-card shadow-2xl" data-open={open ? "true" : "false"} style={{ position: "fixed" } as React.CSSProperties}>
          <div className="flex items-center gap-3 border-b bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-sm font-bold leading-none">Axelia</p><span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">AI • {MODEL_CHAIN[0]}</span></div><p className="text-[11px] text-muted-foreground">Asisten saham — reuse OHLCV • quant.ts • fundamentals • rank</p></div>
            <div className="flex items-center gap-1"><button aria-label="Minimize" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"><ChevronDown className="h-4 w-4" /></button><button aria-label="Close minimize" onClick={() => setOpen(false)} className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" title="Minimize (tidak menutup sesi)"><X className="h-4 w-4" /></button></div>
          </div>
          {contextTicker ? (<div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2"><span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-success animate-pulse" />Membahas: {contextTicker}</span><span className="text-[11px] text-muted-foreground">chip konteks otomatis dari /analysis/[ticker]</span></div>) : null}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-card" style={{ scrollBehavior: "smooth" }}>
            {messages.map((m) => (<div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md border"}`}>{m.role === "assistant" && m.ticker ? (<div className="mb-1.5 flex items-center gap-1.5"><span className="rounded-full bg-card border px-2 py-0.5 text-[10px] font-bold">{m.ticker}</span>{m.badge ? <Badge label={m.badge.label} tone={m.badge.tone} /> : null}</div>) : m.badge ? (<div className="mb-1.5"><Badge label={m.badge.label} tone={m.badge.tone} /></div>) : null}<span>{m.text}</span>{m.sparkline && m.sparkline.length > 1 ? (<div className="mt-2 rounded-lg border bg-card p-2"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sparkline 30D • Close</span><span className={`inline-flex items-center gap-1 text-[11px] font-bold ${m.sparkline[m.sparkline.length - 1] >= m.sparkline[0] ? "text-success" : "text-destructive"}`}>{m.sparkline[m.sparkline.length - 1] >= m.sparkline[0] ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{m.sparkline[m.sparkline.length - 1].toLocaleString("id-ID")}</span></div><Sparkline data={m.sparkline} /></div>) : null}{m.meta ? <p className="mt-1.5 text-[10px] leading-none text-muted-foreground">{m.meta}</p> : null}</div></div>))}
            {typing ? (<div className="flex justify-start"><TypingIndicator /></div>) : null}
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-t bg-muted/30 px-3 py-2 scrollbar-none">
            {(contextTicker ? QUICK_SUGGESTIONS.map((s) => `${s} ${contextTicker}`) : QUICK_SUGGESTIONS).map((q) => (<button key={q} onClick={() => void handleSend(q)} className="whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer">{q}</button>))}
          </div>
          <div className="border-t bg-card px-3 py-3 safe-area-bottom">
            <div className="flex items-center gap-2"><input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={contextTicker ? `Tanya tentang ${contextTicker}…` : "Tanya saham (contoh: Analisis BBCA)"} className="flex-1 rounded-full border bg-muted/40 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card" aria-label="Pesan untuk Axelia" /><button onClick={() => void handleSend()} disabled={!input.trim() || typing} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" aria-label="Kirim">{typing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Axelia pakai data live &amp; quant.ts — bukan saran keuangan. • <span className="font-bold">{MODEL_CHAIN[0]} chain</span></p>
          </div>
        </div>
      </div>
    </>
  );
}
