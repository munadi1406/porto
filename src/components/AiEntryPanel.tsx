"use client";

import { useState } from "react";
import { Bot, Loader2, AlertTriangle, RefreshCw, Sparkles, TrendingDown, Target, Zap, Shield, Check, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiEntryRecommendation {
    ringkasan: string;
    entries: {
        label: string;
        price: number;
        alasan: string;
        tipe: "konservatif" | "moderat" | "agresif";
    }[];
    alokasi: {
        porsi: number;
        persentase: number;
        harga: number;
        label: string;
    }[];
    skema: "avg_down" | "avg_up" | "pyramid";
    stop_loss_saran: number;
    catatan: string;
}

interface BestStrategy {
    label: string;
    score: number;
    returnPct: number;
    winRatePct: number;
    sharpe: number;
}

interface AiEntryPanelProps {
    ticker: string;
    technicalData: any;
    strategyLabel: string;
    ranking?: any;
    onApplyEntry: (price: number) => void;
    onApplyAllocation: (portions: { allocationPct: number; entryPrice: number }[], scheme: string) => void;
}

export function AiEntryPanel({ ticker, technicalData, strategyLabel, ranking, onApplyEntry, onApplyAllocation }: AiEntryPanelProps) {
    const [recommendation, setRecommendation] = useState<AiEntryRecommendation | null>(null);
    const [bestStrategy, setBestStrategy] = useState<BestStrategy | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);
    const [appliedPrice, setAppliedPrice] = useState<number | null>(null);
    const [appliedAllocation, setAppliedAllocation] = useState(false);

    const fetchRecommendation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/backtest/ai-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    technicalData,
                    strategyLabel,
                    ranking,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Gagal mendapatkan rekomendasi');
            setRecommendation(json.recommendation);
            setBestStrategy(json.bestStrategy);
            setAppliedAllocation(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApplySingle = (price: number) => {
        setAppliedPrice(price);
        setAppliedAllocation(false);
        onApplyEntry(price);
    };

    const handleApplyAllocation = () => {
        if (!recommendation?.alokasi || recommendation.alokasi.length === 0) return;
        setAppliedAllocation(true);
        setAppliedPrice(null);
        const portions = recommendation.alokasi.map(a => ({
            allocationPct: a.persentase,
            entryPrice: a.harga,
        }));
        onApplyAllocation(portions, recommendation.skema);
    };

    const tipoIcon = (tipe: string) => {
        switch (tipe) {
            case "konservatif": return <Shield className="w-3.5 h-3.5" />;
            case "agresif": return <Zap className="w-3.5 h-3.5" />;
            default: return <Target className="w-3.5 h-3.5" />;
        }
    };

    const tipoColor = (tipe: string) => {
        switch (tipe) {
            case "konservatif": return "bg-success/10 text-success border-success/30";
            case "agresif": return "bg-destructive/10 text-destructive border-destructive/30";
            default: return "bg-primary/10 text-primary border-primary/30";
        }
    };

    const skemaLabel = (s: string) => {
        switch (s) {
            case "avg_down": return "📉 Average Down";
            case "avg_up": return "📈 Average Up";
            case "pyramid": return "🔺 Pyramid";
            default: return "Manual";
        }
    };

    return (
        <div className="mb-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 w-full text-left"
            >
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold">Rekomendasi Entry & Alokasi AI</span>
                <Sparkles className="w-3 h-3 text-primary/60" />
                <span className="ml-auto text-[9px] text-muted-foreground">{expanded ? '▼' : '▶'}</span>
            </button>

            {expanded && (
                <div className="mt-2 space-y-2">
                    {!recommendation && !loading && !error && (
                        <button
                            onClick={fetchRecommendation}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Dapatkan Rekomendasi Entry & Alokasi
                        </button>
                    )}

                    {loading && (
                        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span>Menganalisis data teknikal & menghitung alokasi optimal...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="space-y-1">
                            <div className="flex items-start gap-2 text-[10px] text-destructive">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={fetchRecommendation}
                                className="inline-flex items-center gap-1 text-[9px] text-primary hover:underline"
                            >
                                <RefreshCw className="w-2.5 h-2.5" /> Coba lagi
                            </button>
                        </div>
                    )}

                    {recommendation && !loading && (
                        <div className="space-y-3">
                            {bestStrategy && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/30">
                                    <Sparkles className="w-3.5 h-3.5 text-success" />
                                    <span className="text-[10px] font-bold text-success">Berdasarkan strategi terbaik:</span>
                                    <span className="text-[10px] font-bold">{bestStrategy.label}</span>
                                    <span className="ml-auto text-[9px] text-muted-foreground">
                                        skor {bestStrategy.score?.toFixed(0)} · return {bestStrategy.returnPct?.toFixed(1)}% · WR {bestStrategy.winRatePct?.toFixed(0)}%
                                    </span>
                                </div>
                            )}

                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {recommendation.ringkasan}
                            </p>

                            {recommendation.alokasi.length > 0 && (
                                <div className="bg-primary/5 border border-primary/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <PieChart className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[10px] font-bold text-primary uppercase">Rekomendasi Alokasi AI</span>
                                        <span className="ml-auto text-[9px] text-muted-foreground">{skemaLabel(recommendation.skema)}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {recommendation.alokasi.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="w-5 font-bold text-muted-foreground">{a.porsi}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ width: `${a.persentase}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold w-10 text-right">{a.persentase}%</span>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                                        Rp {a.harga.toLocaleString("id-ID")} · {a.label}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleApplyAllocation}
                                        className={cn(
                                            "mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                                            appliedAllocation
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background border-primary/50 text-primary hover:bg-primary/10"
                                        )}
                                    >
                                        {appliedAllocation ? <Check className="w-3 h-3" /> : <PieChart className="w-3 h-3" />}
                                        {appliedAllocation ? 'Alokasi Diterapkan ✓' : 'Terapkan Alokasi Ini'}
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <p className="text-[9px] font-bold uppercase text-muted-foreground">Detail Entry</p>
                                {recommendation.entries.map((entry, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                                            appliedPrice === entry.price
                                                ? "border-primary/50 bg-primary/5"
                                                : "border-border bg-card"
                                        )}
                                    >
                                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border", tipoColor(entry.tipe))}>
                                            {tipoIcon(entry.tipe)}
                                            {entry.tipe}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold">Rp {entry.price.toLocaleString("id-ID")}</p>
                                            <p className="text-[9px] text-muted-foreground truncate">{entry.alasan}</p>
                                        </div>
                                        <button
                                            onClick={() => handleApplySingle(entry.price)}
                                            className={cn(
                                                "shrink-0 px-2 py-1 rounded text-[9px] font-bold border transition-colors",
                                                appliedPrice === entry.price
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background border-border text-primary hover:bg-primary/10"
                                            )}
                                        >
                                            {appliedPrice === entry.price ? <Check className="w-3 h-3" /> : 'Pakai'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {recommendation.stop_loss_saran > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5">
                                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                                    <span className="text-[10px] font-bold text-destructive">SL Saran: Rp {recommendation.stop_loss_saran.toLocaleString("id-ID")}</span>
                                </div>
                            )}

                            {recommendation.catatan && (
                                <p className="text-[9px] text-muted-foreground/70 italic">
                                    💡 {recommendation.catatan}
                                </p>
                            )}

                            <button
                                onClick={fetchRecommendation}
                                disabled={loading}
                                className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary disabled:opacity-50"
                            >
                                <RefreshCw className="w-2.5 h-2.5" /> Analisis ulang
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
