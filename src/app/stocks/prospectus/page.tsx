"use client";

import { useState } from "react";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { Upload, FileText, TrendingUp, TrendingDown, BarChart3, Plus, Trash2, Loader2, AlertCircle, Target, Scale, Brain, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ProspectusAnalysis } from "@/lib/prospectusAnalyzer";

const initialText = `Tempel teks prospektus di sini, atau upload PDF via URL di atas.

Contoh format yang bisa diproses:
- Nama emiten, kode saham, harga IPO
- Data keuangan (EPS, PER, PBV, ROE, DER)
- Jumlah saham ditawarkan, jadwal listing

Atau berikan URL PDF prospektus dari IDX.`;

export default function ProspectusPage() {
    const [analyses, setAnalyses] = useState<ProspectusAnalysis[]>([]);
    const [url, setUrl] = useState('');
    const [text, setText] = useState('');
    const [name, setName] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!text && !url) { setError('Masukkan URL PDF atau teks prospektus'); return; }
        setAnalyzing(true);
        setError('');
        try {
            const res = await fetch('/api/analyze/prospectus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url || undefined, text: text || undefined, fileName: name || `Prospektus ${analyses.length + 1}` }),
            });
            const json = await res.json();
            if (json.success) {
                setAnalyses(prev => [...prev, json.data]);
                setUrl('');
                setText('');
                setName('');
            } else {
                throw new Error(json.error);
            }
        } catch (e: any) {
            setError(e.message || 'Gagal menganalisis prospektus');
        }
        setAnalyzing(false);
    };

    const removeAnalysis = (id: string) => setAnalyses(prev => prev.filter(a => a.id !== id));

    const ara = (a: ProspectusAnalysis) => {
        const prices = [a.araProjection.day1, a.araProjection.day2, a.araProjection.day3, a.araProjection.day4, a.araProjection.day5];
        const max = Math.max(...prices.filter(p => p > 0));
        return { prices, max };
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Analisis Prospektus</h1>
                <p className="text-sm text-muted-foreground">Analisis IPO & rekomendasi berbasis AI — komparasi multiple emiten</p>
            </div>

            {/* Input */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nama / Label</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BBCA IPO 2026" className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL PDF Prospektus</label>
                        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.idx.co.id/...pdf" className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atau tempel teks prospektus</label>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                        className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        placeholder={initialText} />
                </div>
                {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl text-xs text-destructive font-medium"><AlertCircle className="w-4 h-4" />{error}</div>}
                <button onClick={handleAnalyze} disabled={analyzing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/80 disabled:opacity-50 transition-all">
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> : <><Brain className="w-4 h-4" /> Analisis Prospektus</>}
                </button>
            </div>

            {/* Results */}
            {analyses.length > 0 && (
                <div className="space-y-6">
                    {analyses.map((a) => {
                        const isBuy = a.recommendation === 'BUY';
                        const aPrices = ara(a);
                        return (
                            <div key={a.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                                {/* Header */}
                                <div className={cn("px-5 py-4 flex items-center justify-between border-b", isBuy ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-xl", isBuy ? "bg-success/20" : "bg-destructive/20")}>
                                            {isBuy ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">{a.emitent.name || a.fileName}</h3>
                                            <p className="text-xs text-muted-foreground">{a.emitent.ticker} &middot; {a.emitent.sector} &middot; {a.emitent.board}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={cn("text-lg font-black", isBuy ? "text-success" : "text-destructive")}>{a.recommendation}</p>
                                            <p className="text-xs text-muted-foreground">Score: {a.score}/100</p>
                                        </div>
                                        <button onClick={() => removeAnalysis(a.id)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* Ringkasan */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-muted/30 rounded-xl">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">IPO Price</p>
                                            <p className="text-sm font-black text-foreground">{formatIDR(a.emitent.ipoPrice)}</p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-xl">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Fair Value</p>
                                            <p className={cn("text-sm font-black", a.upside >= 0 ? "text-success" : "text-destructive")}>{formatIDR(a.fairValue)}</p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-xl">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Upside</p>
                                            <p className={cn("text-sm font-black", a.upside >= 0 ? "text-success" : "text-destructive")}>{formatPercentage(a.upside)}</p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-xl">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Saham Ditawarkan</p>
                                            <p className="text-sm font-black text-foreground">{a.emitent.sharesOffered.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* ARA Projection */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-4 h-4 text-warning" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Proyeksi ARA (Auto Rejection Atas)</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {aPrices.prices.map((p, i) => (
                                                <div key={i} className={cn("p-2.5 rounded-xl text-center border", p >= aPrices.max ? "bg-warning/10 border-warning/30" : "bg-muted/30 border-border/50")}>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">ARA #{i + 1}</p>
                                                    <p className={cn("text-xs font-black", p >= aPrices.max ? "text-warning" : "text-foreground")}>{formatIDR(p)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-2">{a.araProjection.description}</p>
                                    </div>

                                    {/* Financials */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <BarChart3 className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Data Keuangan</span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {[
                                                { label: 'EPS', value: formatIDR(a.financials.eps) },
                                                { label: 'PER', value: `${a.financials.per.toFixed(1)}x` },
                                                { label: 'PBV', value: `${a.financials.pbv.toFixed(2)}x` },
                                                { label: 'ROE', value: `${a.financials.roe.toFixed(1)}%` },
                                                { label: 'DER', value: `${a.financials.der.toFixed(2)}x` },
                                                { label: 'Rev Growth', value: `${a.financials.revenueGrowth.toFixed(1)}%` },
                                            ].map(m => (
                                                <div key={m.label} className="p-2 bg-muted/20 rounded-lg text-center">
                                                    <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</p>
                                                    <p className="text-[11px] font-black text-foreground">{m.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price Target */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Harga</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: '1 Bulan', value: a.priceTarget.month1 },
                                                { label: '3 Bulan', value: a.priceTarget.month3 },
                                                { label: '1 Tahun', value: a.priceTarget.year1 },
                                            ].map(t => {
                                                const vsIpo = t.value > 0 ? ((t.value - a.emitent.ipoPrice) / a.emitent.ipoPrice) * 100 : 0;
                                                return (
                                                    <div key={t.label} className="p-3 bg-muted/30 rounded-xl text-center">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{t.label}</p>
                                                        <p className="text-sm font-black text-foreground">{formatIDR(t.value)}</p>
                                                        <p className={cn("text-[10px] font-bold", vsIpo >= 0 ? "text-success" : "text-destructive")}>
                                                            {vsIpo >= 0 ? '+' : ''}{formatPercentage(vsIpo)} vs IPO
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Reasoning */}
                                    <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
                                        <p className="text-[10px] font-bold text-muted-foreground mb-2">Analisis & Rekomendasi</p>
                                        <p className="text-xs text-foreground leading-relaxed">{a.reasoning}</p>
                                    </div>

                                    {/* Strengths & Risks */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {a.strength.length > 0 && (
                                            <div className="p-3 bg-success/5 rounded-xl border border-success/20">
                                                <p className="text-[9px] font-black text-success uppercase tracking-wider mb-2">Kekuatan</p>
                                                <ul className="space-y-1">
                                                    {a.strength.map((s, i) => <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5"><span className="text-success mt-0.5">+</span>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {a.risk.length > 0 && (
                                            <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/20">
                                                <p className="text-[9px] font-black text-destructive uppercase tracking-wider mb-2">Risiko</p>
                                                <ul className="space-y-1">
                                                    {a.risk.map((r, i) => <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5"><span className="text-destructive mt-0.5">−</span>{r}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Comparison Table */}
                    {analyses.length > 1 && (
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                <Scale className="w-4 h-4 text-primary" />
                                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Perbandingan Emiten</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                                            <th className="px-4 py-3 text-left">Indikator</th>
                                            {analyses.map(a => <th key={a.id} className="px-4 py-3 text-right">{a.emitent.ticker}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[
                                            { label: 'IPO Price', fn: (a: ProspectusAnalysis) => formatIDR(a.emitent.ipoPrice) },
                                            { label: 'Fair Value', fn: (a: ProspectusAnalysis) => formatIDR(a.fairValue) },
                                            { label: 'Upside', fn: (a: ProspectusAnalysis) => `${a.upside >= 0 ? '+' : ''}${a.upside.toFixed(1)}%` },
                                            { label: 'ARA Day 1', fn: (a: ProspectusAnalysis) => formatIDR(a.araProjection.day1) },
                                            { label: 'ARA Day 5', fn: (a: ProspectusAnalysis) => formatIDR(a.araProjection.day5) },
                                            { label: 'EPS', fn: (a: ProspectusAnalysis) => a.financials.eps > 0 ? formatIDR(a.financials.eps) : '-' },
                                            { label: 'PER', fn: (a: ProspectusAnalysis) => a.financials.per > 0 ? `${a.financials.per.toFixed(1)}x` : '-' },
                                            { label: 'PBV', fn: (a: ProspectusAnalysis) => a.financials.pbv > 0 ? `${a.financials.pbv.toFixed(2)}x` : '-' },
                                            { label: 'ROE', fn: (a: ProspectusAnalysis) => a.financials.roe > 0 ? `${a.financials.roe.toFixed(1)}%` : '-' },
                                            { label: 'DER', fn: (a: ProspectusAnalysis) => a.financials.der > 0 ? `${a.financials.der.toFixed(2)}x` : '-' },
                                            { label: '1 Bulan', fn: (a: ProspectusAnalysis) => formatIDR(a.priceTarget.month1) },
                                            { label: '1 Tahun', fn: (a: ProspectusAnalysis) => formatIDR(a.priceTarget.year1) },
                                            { label: 'Score', fn: (a: ProspectusAnalysis) => `${a.score}/100` },
                                            { label: 'Rekomendasi', fn: (a: ProspectusAnalysis) => a.recommendation },
                                        ].map(row => (
                                            <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{row.label}</td>
                                                {analyses.map(a => (
                                                    <td key={a.id} className={cn("px-4 py-2.5 text-right text-xs font-semibold",
                                                        row.label === 'Rekomendasi' ? (a.recommendation === 'BUY' ? 'text-success' : 'text-destructive') : 'text-foreground'
                                                    )}>
                                                        {row.fn(a)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {analyses.length === 0 && !analyzing && (
                <div className="p-16 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-foreground mb-2">Analisis Prospektus IPO</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed mb-6">
                        Upload PDF prospektus dari IDX atau tempel teks prospektus untuk mendapatkan analisis fundamental,
                        proyeksi ARA, fair value, dan rekomendasi berbasis AI. Bisa multiple emiten untuk perbandingan.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Brain className="w-4 h-4 text-primary" /> AI Analysis via DeepSeek</div>
                        <div className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-warning" /> ARA Projection</div>
                        <div className="flex items-center gap-1.5"><Scale className="w-4 h-4 text-primary" /> Multi-Comparison</div>
                    </div>
                </div>
            )}

            {analyzing && analyses.length === 0 && (
                <div className="p-16 text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground">Menganalisis prospektus dengan DeepSeek...</p>
                    <p className="text-xs text-muted-foreground mt-1">Estimasi 20-40 detik</p>
                </div>
            )}
        </div>
    );
}
