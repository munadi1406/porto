"use client";

import { useMemo } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { Lightbulb, TrendingUp, AlertTriangle, Wallet, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionAdvisorProps {
    portfolio: PortfolioItem[];
    cash: number;
    prices: Record<string, StockPrice>;
}

export function DecisionAdvisor({ portfolio, cash, prices }: DecisionAdvisorProps) {
    const advice = useMemo(() => {
        if (portfolio.length === 0 && cash === 0) return null;

        let totalStockValue = 0;
        let stocksInLoss = 0;
        let stocksInProfit = 0;
        let heavyConcentration = false;

        portfolio.forEach(item => {
            const price = prices[item.ticker]?.price || item.averagePrice;
            const value = item.lots * 100 * price;
            totalStockValue += value;

            if (price < item.averagePrice) stocksInLoss++;
            if (price > item.averagePrice) stocksInProfit++;
        });

        const totalAssets = totalStockValue + cash;
        const cashRatio = totalAssets > 0 ? (cash / totalAssets) * 100 : 100;

        // Check for concentration (> 30% in one stock)
        portfolio.forEach(item => {
            const price = prices[item.ticker]?.price || item.averagePrice;
            const value = item.lots * 100 * price;
            if (totalAssets > 0 && (value / totalAssets) > 0.3) heavyConcentration = true;
        });

        // Advice Logic
        let status: 'buy' | 'hold' | 'sell' | 'diversify' = 'hold';
        let title = "";
        let description = "";
        let color = "";
        let icon = Lightbulb;

        if (portfolio.length < 3 && totalAssets > 0) {
            status = 'diversify';
            title = "Waktunya Diversifikasi";
            description = "Portofolio Anda terlalu sedikit aset. Pertimbangkan menambah saham baru di sektor yang berbeda untuk mengurangi risiko.";
            color = "blue";
            icon = ShieldCheck;
        } else if (cashRatio > 25) {
            status = 'buy';
            title = "Siap Akumulasi";
            description = `Cash Anda cukup besar (${cashRatio.toFixed(0)}%). Ide bagus untuk mulai mencicil saham fundamental bagus yang sedang diskon.`;
            color = "emerald";
            icon = TrendingUp;
        } else if (heavyConcentration) {
            status = 'hold';
            title = "Hati-hati Konsentrasi";
            description = "Salah satu aset Anda mendominasi portofolio (>30%). Sebaiknya hold dulu atau kurangi porsi untuk menjaga keseimbangan.";
            color = "orange";
            icon = AlertTriangle;
        } else if (cashRatio < 5) {
            status = 'hold';
            title = "Amankan Likuiditas";
            description = "Cash Anda hampir habis. Sebaiknya jangan tambah posisi baru dulu. Tunggu momentum untuk merealisasikan profit.";
            color = "rose";
            icon = Wallet;
        } else {
            status = 'hold';
            title = "Posisi Aman (Wait & See)";
            description = "Portofolio Anda dalam kondisi seimbang. Pantau terus pergerakan pasar untuk mencari peluang averaging down atau take profit.";
            color = "indigo";
            icon = Lightbulb;
        }

        // Actionable Tips
        const tips = [];
        if (stocksInLoss / portfolio.length > 0.6) tips.push("Banyak saham merah: Gunakan simulator Avg Down.");
        if (cashRatio > 40) tips.push("Cash melimpah: Cari saham blue-chip di area support.");
        if (stocksInProfit / portfolio.length > 0.7) tips.push("Banyak saham hijau: Pertimbangkan amankan sebagian profit.");
        if (portfolio.length > 10) tips.push("Terlalu banyak saham: Fokuskan pada 5-8 saham terbaik saja.");

        return { status, title, description, color, icon, cashRatio, tips };
    }, [portfolio, cash, prices]);

    if (!advice) return null;

    const Icon = advice.icon;

    return (
        <div className={cn(
            "relative overflow-hidden p-6 rounded-xl border transition-all duration-500",
            advice.color === "emerald" && "bg-success/10 border-success/20",
            advice.color === "blue" && "bg-primary/10 border-primary/20",
            advice.color === "orange" && "bg-warning/10 border-warning/20",
            advice.color === "rose" && "bg-destructive/10 border-destructive/20",
            advice.color === "indigo" && "bg-primary/10 border-primary/20",
        )}>
            {/* Background Accent */}
            <div className={cn(
                "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20",
                `bg-${advice.color}-500`
            )} />

            <div className="relative flex flex-col md:flex-row gap-6 items-start">
                <div className={cn(
                    "p-4 rounded-xl shadow-lg flex-shrink-0 animate-pulse",
                    advice.color === "emerald" && "bg-success text-success-foreground shadow-success/20",
                    advice.color === "blue" && "bg-primary text-primary-foreground shadow-primary/20",
                    advice.color === "orange" && "bg-warning text-warning-foreground shadow-warning/20",
                    advice.color === "indigo" && "bg-primary text-primary-foreground shadow-primary/20",
                )}>
                    <Icon className="w-8 h-8" />
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                advice.color === "emerald" && "bg-success/10 text-success",
                                advice.color === "blue" && "bg-primary/10 text-primary",
                                advice.color === "orange" && "bg-warning/10 text-warning",
                                advice.color === "indigo" && "bg-primary/10 text-primary",
                            )}>
                                Smart Advisor
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">• Berdasarkan Profil Portofolio</span>
                        </div>
                        <h3 className="text-xl font-black text-foreground leading-tight">
                            {advice.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 font-medium leading-relaxed max-w-2xl">
                            {advice.description}
                        </p>
                    </div>

                    {advice.tips.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {advice.tips.map((tip: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted p-2.5 rounded-xl border border-border">
                                    <ArrowRight className="w-3 h-3 text-primary" />
                                    {tip}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-auto flex-shrink-0 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="text-center">
                        <div className="text-[9px] font-black text-muted-foreground uppercase mb-1">CASH RATIO</div>
                        <div className="text-2xl font-black text-foreground">{advice.cashRatio.toFixed(0)}%</div>
                        <div className="w-24 h-1.5 bg-muted rounded-full mt-2 overflow-hidden mx-auto">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    advice.cashRatio > 20 ? "bg-success" : advice.cashRatio > 10 ? "bg-warning" : "bg-destructive"
                                )}
                                style={{ width: `${advice.cashRatio}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
