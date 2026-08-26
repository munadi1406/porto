"use client";

import { useState, useMemo, useEffect } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { Target, Save, TrendingUp, Wallet, Flag, Rocket, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePortfolios } from "@/hooks/usePortfolios";

interface TargetPortfolioProps {
    portfolio: PortfolioItem[];
    prices: Record<string, StockPrice>;
    cash: number;
}

export function TargetPortfolio({ portfolio, prices, cash }: TargetPortfolioProps) {
    const { currentPortfolio, updatePortfolio } = usePortfolios();
    const [targetValue, setTargetValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentPortfolio?.targetValue) {
            setTargetValue(currentPortfolio.targetValue.toString());
        }
    }, [currentPortfolio]);

    const currentTotalEquity = useMemo(() => {
        let stockValue = 0;
        portfolio.forEach(item => {
            const price = prices[item.ticker]?.price || item.averagePrice;
            stockValue += item.lots * 100 * price;
        });
        return stockValue + cash;
    }, [portfolio, prices, cash]);

    const numericTargetValue = parseFloat(targetValue) || 0;
    const progressPercent = numericTargetValue > 0 ? (currentTotalEquity / numericTargetValue) * 100 : 0;
    const sisaTarget = Math.max(0, numericTargetValue - currentTotalEquity);

    const handleSaveTarget = async () => {
        if (!currentPortfolio) return;
        setIsSaving(true);
        try {
            await updatePortfolio({
                id: currentPortfolio.id,
                targetValue: numericTargetValue
            });
            toast.success("Target nilai portofolio berhasil disimpan");
        } catch (error) {
            toast.error("Gagal menyimpan target");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Target Goal Header Card */}
            <div className="relative overflow-hidden bg-card p-8 rounded-xl border border-border shadow-xl">
                {/* Decorative bg */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Financial Goal Tracker</span>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tight leading-tight">
                                Capai Kebebasan Finansial Anda
                            </h2>
                            <p className="text-muted-foreground font-medium">
                                Masukkan target nilai total aset yang ingin Anda capai untuk portofolio <span className="text-primary font-bold">{currentPortfolio?.name}</span>.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Rp</div>
                                <input
                                    type="number"
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(e.target.value)}
                                    placeholder="Contoh: 100000000"
                                    className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg"
                                />
                            </div>
                            <button
                                onClick={handleSaveTarget}
                                disabled={isSaving}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-card bg-foreground text-background rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-border/50"
                            >
                                {isSaving ? <span className="animate-spin">◌</span> : <Save className="w-4 h-4" />}
                                Simpan Target
                            </button>
                        </div>
                    </div>

                    <div className="flex-shrink-0 bg-muted/50 p-8 rounded-[2rem] border border-border min-w-[280px]">
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Progress Saat Ini</p>
                            <div className="text-5xl font-black text-primary tracking-tighter">
                                {progressPercent.toFixed(1)}%
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                                <Flag className="w-3 h-3" />
                                <span>Menuju Goal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-8 rounded-xl border border-border shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-success/10 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-success" />
                            </div>
                            <h3 className="text-xl font-black text-foreground">Estimasi Sisa</h3>
                        </div>
                        <div className="px-3 py-1 bg-success/10 text-success text-[10px] font-bold rounded-lg uppercase">
                            Keep Going!
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Kekurangan Dana</p>
                                <p className="text-2xl font-black text-foreground">{formatIDR(sisaTarget)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Sudah Terkumpul</p>
                                <p className="text-sm font-bold text-muted-foreground">{formatIDR(currentTotalEquity)}</p>
                            </div>
                        </div>

                        {/* Professional Progress Bar */}
                        <div className="relative h-6 bg-muted rounded-full overflow-hidden p-1 shadow-inner">
                            <div
                                className="h-full bg-primary rounded-full shadow-lg shadow-primary/20 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                            </div>
                        </div>

                        <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase px-1">
                            <span>Mulai (Rp 0)</span>
                            <span>Target ({formatIDR(numericTargetValue)})</span>
                        </div>
                    </div>
                </div>

                <div className="bg-primary p-8 rounded-xl text-primary-foreground shadow-xl relative overflow-hidden group">
                    <Rocket className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-500" />

                    <div className="relative space-y-6">
                        <h3 className="text-xl font-black leading-tight">Analisis Pencapaian</h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-muted/10 rounded-xl backdrop-blur-sm border border-border/10">
                                <div className="p-2 bg-background/20 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Status</p>
                                    <p className="font-bold">
                                        {progressPercent >= 100
                                            ? "Selamat! Target telah tercapai."
                                            : progressPercent >= 50
                                                ? "Sudah lebih dari setengah jalan!"
                                                : "Ayo lebih semangat menabung!"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-muted/10 rounded-xl backdrop-blur-sm border border-border/10">
                                <div className="p-2 bg-background/20 rounded-xl">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Fokus Strategi</p>
                                    <p className="font-bold">
                                        {progressPercent < 30
                                            ? "Fokus pada Akumulasi Aset"
                                            : progressPercent < 70
                                                ? "Pertumbuhan & Diversifikasi"
                                                : "Amankan Keuntungan & Diversifikasi"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
