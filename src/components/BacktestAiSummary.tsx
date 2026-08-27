"use client";

import { useState, useEffect } from "react";
import { Bot, Loader2, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiAnalysis {
    ringkasan: string;
    risiko_utama: string;
    risk_reward: string;
    saran_posisi: string;
    rekomendasi: "LAKUKAN" | "PERTIMBANGAN" | "HINDARI";
    confidence: number;
    catatan: string;
}

interface BacktestAiSummaryProps {
    backtestResult: any;
    positionCalc: any;
    ticker: string;
    strategyLabel: string;
}

export function BacktestAiSummary({ backtestResult, positionCalc, ticker, strategyLabel }: BacktestAiSummaryProps) {
    const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [model, setModel] = useState<string | null>(null);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/backtest/ai-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    backtestResult,
                    positionCalc,
                    ticker,
                    strategyLabel,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Gagal analisis AI');
            setAnalysis(json.analysis);
            setModel(json.model);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (backtestResult) {
            fetchAnalysis();
        }
    }, [backtestResult]);

    const recColor = (rec: string) => {
        switch (rec) {
            case "LAKUKAN": return "border-success/50 bg-success/5";
            case "HINDARI": return "border-destructive/50 bg-destructive/5";
            default: return "border-warning/50 bg-warning/5";
        }
    };

    const recIcon = (rec: string) => {
        switch (rec) {
            case "LAKUKAN": return <CheckCircle2 className="w-5 h-5 text-success" />;
            case "HINDARI": return <AlertTriangle className="w-5 h-5 text-destructive" />;
            default: return <HelpCircle className="w-5 h-5 text-warning" />;
        }
    };

    const recBadge = (rec: string) => {
        switch (rec) {
            case "LAKUKAN": return "bg-success/10 text-success border-success/30";
            case "HINDARI": return "bg-destructive/10 text-destructive border-destructive/30";
            default: return "bg-warning/10 text-warning border-warning/30";
        }
    };

    return (
        <div className="card border-primary/30">
            <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold">Analisis AI</h3>
                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                {model && <span className="ml-auto text-[9px] text-muted-foreground">{model}</span>}
            </div>

            {loading && (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Menganalisis hasil backtest & posisi...</span>
                </div>
            )}

            {error && !loading && (
                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-[11px] text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchAnalysis}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                        <RefreshCw className="w-3 h-3" /> Coba lagi
                    </button>
                </div>
            )}

            {analysis && !loading && (
                <div className="space-y-3">
                    <div className={cn("rounded-lg border p-3", recColor(analysis.rekomendasi))}>
                        <div className="flex items-center gap-2 mb-1">
                            {recIcon(analysis.rekomendasi)}
                            <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", recBadge(analysis.rekomendasi))}>
                                {analysis.rekomendasi}
                            </span>
                            <span className="ml-auto text-[9px] text-muted-foreground">
                                Keyakinan {analysis.confidence}%
                            </span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed mt-1">{analysis.ringkasan}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-[10px] font-bold text-destructive uppercase mb-1">Risiko Utama</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{analysis.risiko_utama}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-[10px] font-bold text-warning uppercase mb-1">Risk/Reward</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{analysis.risk_reward}</p>
                        </div>
                    </div>

                    <div className="bg-card border border-primary/20 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-primary uppercase mb-1">Saran Posisi</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{analysis.saran_posisi}</p>
                    </div>

                    {analysis.catatan && (
                        <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic">
                            💡 {analysis.catatan}
                        </p>
                    )}

                    <button
                        onClick={fetchAnalysis}
                        disabled={loading}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary disabled:opacity-50"
                    >
                        <RefreshCw className="w-3 h-3" /> Analisis ulang
                    </button>
                </div>
            )}

            <p className="mt-3 text-[9px] text-muted-foreground/70 leading-relaxed">
                AI menganalisis statistik backtest + kalkulator posisi. Hasil bersifat informatif, bukan nasihat investasi.
                Selalu lakukan riset sendiri sebelum mengambil keputusan.
            </p>
        </div>
    );
}
