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
            "relative overflow-hidden p-6 rounded-3xl border transition-all duration-500",
            advice.color === "emerald" && "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20",
            advice.color === "blue" && "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20",
            advice.color === "orange" && "bg-orange-50/50 dark:bg-orange-500/5 border-orange-100 dark:border-orange-500/20",
            advice.color === "rose" && "bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20",
            advice.color === "indigo" && "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/20",
        )}>
            {/* Background Accent */}
            <div className={cn(
                "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20",
                `bg-${advice.color}-500`
            )} />

            <div className="relative flex flex-col md:flex-row gap-6 items-start">
                <div className={cn(
                    "p-4 rounded-2xl shadow-lg flex-shrink-0 animate-pulse",
                    advice.color === "emerald" && "bg-emerald-500 text-white shadow-emerald-500/20",
                    advice.color === "blue" && "bg-blue-500 text-white shadow-blue-500/20",
                    advice.color === "orange" && "bg-orange-500 text-white shadow-orange-500/20",
                    advice.color === "rose" && "bg-rose-500 text-white shadow-rose-500/20",
                    advice.color === "indigo" && "bg-indigo-500 text-white shadow-indigo-500/20",
                )}>
                    <Icon className="w-8 h-8" />
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                advice.color === "emerald" && "bg-emerald-500/10 text-emerald-600",
                                advice.color === "blue" && "bg-blue-500/10 text-blue-600",
                                advice.color === "orange" && "bg-orange-500/10 text-orange-600",
                                advice.color === "rose" && "bg-rose-500/10 text-rose-600",
                                advice.color === "indigo" && "bg-indigo-500/10 text-indigo-600",
                            )}>
                                Smart Advisor
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">• Berdasarkan Profil Portofolio</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                            {advice.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium leading-relaxed max-w-2xl">
                            {advice.description}
                        </p>
                    </div>

                    {advice.tips.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {advice.tips.map((tip: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <ArrowRight className="w-3 h-3 text-indigo-500" />
                                    {tip}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-auto flex-shrink-0 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-center">
                        <div className="text-[9px] font-black text-gray-400 uppercase mb-1">CASH RATIO</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{advice.cashRatio.toFixed(0)}%</div>
                        <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden mx-auto">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    advice.cashRatio > 20 ? "bg-emerald-500" : advice.cashRatio > 10 ? "bg-orange-500" : "bg-rose-500"
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
