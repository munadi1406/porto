"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Newspaper, ExternalLink, Clock, ChevronLeft, ChevronRight, Pause, Play, TrendingUp, Building2, Globe, Bookmark } from "lucide-react";
import type { NewsItem } from "@/lib/news";

type NewsCarouselProps = {
    symbols?: string[];
    title?: string;
    autoPlayMs?: number;
};

const DEFAULT_SYMBOLS = ["IHSG", "BBCA", "BBRI", "TLKM"];

function timeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

function stripHTML(s: string): string {
    return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function NewsCarousel({ symbols = DEFAULT_SYMBOLS, title = "Berita Pasar & IHSG", autoPlayMs = 4500 }: NewsCarouselProps) {
    const [allNews, setAllNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.all(
                symbols.map(s => fetch(`/api/news?symbol=${encodeURIComponent(s)}`).then(r => r.json()).catch(() => ({ success: false })))
            );
            const merged: NewsItem[] = [];
            const seen = new Set<string>();
            for (const res of results) {
                if (res.success && Array.isArray(res.news)) {
                    for (const n of res.news as NewsItem[]) {
                        if (!seen.has(n.link)) {
                            seen.add(n.link);
                            merged.push(n);
                        }
                    }
                }
            }
            merged.sort((a, b) => b.publishTime - a.publishTime);
            setAllNews(merged.slice(0, 12));
            setIdx(0);
        } catch {
            setAllNews([]);
        }
        setLoading(false);
    }, [symbols.join(",")]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const go = useCallback((dir: 1 | -1) => {
        setIdx(i => {
            const n = allNews.length || 1;
            return (i + dir + n) % n;
        });
    }, [allNews.length]);

    useEffect(() => {
        if (paused || allNews.length <= 1) return;
        timerRef.current = setInterval(() => go(1), autoPlayMs);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [paused, go, autoPlayMs, allNews.length]);

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10"><Newspaper className="w-4 h-4 text-primary" /></div>
                    <span className="text-sm font-bold">{title}</span>
                    <span className="ml-auto h-2 w-16 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-28 bg-muted animate-pulse rounded-lg" />
            </div>
        );
    }

    if (!allNews.length) {
        return (
            <div className="rounded-xl border border-dashed bg-card p-6 text-center">
                <Newspaper className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">Belum ada berita IHSG / emiten terkait</p>
                <p className="text-xs text-muted-foreground mt-1">Coba segarkan atau cek koneksi sumber berita</p>
                <button onClick={fetchAll} className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Muat ulang</button>
            </div>
        );
    }

    const cur = allNews[idx];
    const total = allNews.length;

    return (
        <div
            className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary text-primary-foreground"><Newspaper className="w-3.5 h-3.5" /></div>
                    <div>
                        <h3 className="text-sm font-black leading-none">{title}</h3>
                        <p className="text-[10px] text-muted-foreground">{cur.source || 'Berita'} · {cur.publishTime ? timeAgo(cur.publishTime) : 'baru saja'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused(v => !v)} className="size-7 grid place-items-center rounded-md border bg-background hover:bg-muted">
                        {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                    <button aria-label="Prev" onClick={() => go(-1)} className="size-7 grid place-items-center rounded-md border bg-background hover:bg-muted">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button aria-label="Next" onClick={() => go(1)} className="size-7 grid place-items-center rounded-md border bg-background hover:bg-muted">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* slide */}
            <div className="relative">
                <div className="p-4 pr-4">
                    <div className="flex items-start gap-3">
                        <div className="hidden sm:flex p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            {symbols[0] === 'IHSG' ? <Globe className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <a href={cur.link} target="_blank" rel="noreferrer" className="group">
                                <h4 className="text-[15px] font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{cur.title}</h4>
                            </a>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide">
                                    <span className="px-1.5 py-0.5 rounded bg-muted font-black">{(cur.source || 'NEWS').slice(0, 14)}</span>
                                    {cur.publishTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(cur.publishTime)}</span>}
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1"><TrendingUp className="w-3 h-3 text-success" /> Terkait IHSG & emiten LQ45</span>
                            </div>
                            {cur.summary && (
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">{stripHTML(cur.summary)}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                                <a href={cur.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                                    Baca selengkapnya <ExternalLink className="w-3 h-3" />
                                </a>
                                <span className="text-[10px] text-muted-foreground hidden sm:inline">· Sumber eksternal, buka tab baru</span>
                                <button
                                    onClick={() => {
                                        if (navigator.clipboard) navigator.clipboard.writeText(cur.link);
                                    }}
                                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                                >
                                    <Bookmark className="w-3 h-3" /> Salin link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* progress dots + bar */}
                <div className="px-4 pb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        {allNews.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIdx(i)}
                                aria-label={`Go to slide ${i + 1}`}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    i === idx ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/30"
                                )}
                            />
                        ))}
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{idx + 1} / {total}</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            key={idx}
                            className="h-full bg-primary"
                            style={{
                                width: '100%',
                                animation: paused ? undefined : `shrink ${autoPlayMs}ms linear`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* tiny strip: upcoming titles */}
            <div className="border-t bg-muted/20 px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none">
                {allNews.slice(0, 6).map((n, i) => (
                    <button
                        key={n.link}
                        onClick={() => setIdx(i)}
                        className={cn(
                            "shrink-0 max-w-[220px] text-left px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug",
                            i === idx ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
                        )}
                        title={n.title}
                    >
                        <span className="line-clamp-1 font-bold">{n.title}</span>
                        <span className={cn("text-[10px]", i === idx ? "text-primary-foreground/80" : "text-muted-foreground")}>{n.source || 'Berita'}</span>
                    </button>
                ))}
                <button onClick={fetchAll} className="shrink-0 px-2.5 py-1.5 rounded-lg border border-dashed text-[11px] font-bold text-muted-foreground hover:text-foreground">
                    Segarkan
                </button>
            </div>

            <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        </div>
    );
}

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }
