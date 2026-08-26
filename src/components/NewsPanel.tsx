"use client";

import { useEffect, useState } from "react";
import { Newspaper, Loader2, RefreshCcw, ExternalLink, AlertCircle, Clock } from "lucide-react";
import type { NewsItem } from "@/lib/news";

interface Props {
    symbol: string;
}

export default function NewsPanel({ symbol }: Props) {
    const [news, setNews] = useState<NewsItem[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        setNews(null);
        try {
            const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`);
            const json = await res.json();
            if (json.success) {
                setNews(json.news || []);
            } else {
                setError(json.error || 'Gagal memuat berita');
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (symbol) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Memuat berita terbaru...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 space-y-4">
                <AlertCircle className="w-8 h-8 text-warning mx-auto" />
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
                <button onClick={load} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl">
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (!news || news.length === 0) {
        return (
            <div className="text-center py-16">
                <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada berita terkait emiten ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{news.length} berita terbaru</p>
                <button onClick={load} className="text-xs font-bold text-primary hover:underline">Segarkan</button>
            </div>

            {news.map((item) => {
                const isOpen = expanded === item.link;
                return (
                    <div key={item.link} className="group bg-card border border-border rounded-xl hover:border-primary/30 transition-all">
                        <button onClick={() => setExpanded(isOpen ? null : item.link)} className="w-full text-left p-4 flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                                <Newspaper className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5">
                                    <span className="font-bold uppercase tracking-wide">{item.source || 'Berita'}</span>
                                    {item.publishTime > 0 && (
                                        <>
                                            <span className="w-0.5 h-0.5 rounded-full bg-current inline-block" />
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(item.publishTime)}
                                        </>
                                    )}
                                </div>
                            </div>
                        </button>
                        {isOpen && item.summary && (
                            <div className="px-4 pb-4 pl-[4.25rem]">
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{stripHTML(item.summary)}</p>
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                >
                                    Baca selengkapnya <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

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