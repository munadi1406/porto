"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import dynamic from "next/dynamic";
import { CashManager } from "@/components/CashManager";
import { MonthlyPerformanceHeatmap } from "@/components/MonthlyPerformanceHeatmap";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StockForm } from "@/components/StockForm";
import { TargetPortfolio } from "@/components/TargetPortfolio";
import { StressTestCard } from "@/components/StressTestCard";
import { RebalancingAdvisor } from "@/components/RebalancingAdvisor";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { DashboardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { PageTabs } from "@/components/PageTabs";
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { ScheduledReportButton } from "@/components/ScheduledReportButton";
import { PortfolioCompareTab } from "@/components/PortfolioCompare";
import { exportToPDF } from "@/lib/exportPDF";
import {
    Briefcase, DollarSign, TrendingUp, TrendingDown, Calendar,
    Wallet, Plus, Layers, Target, BarChart3, PieChart,
    Clock, ChevronRight, Columns2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PrivacyWrapper } from "@/components/PrivacyWrapper";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

type TabKey = "overview" | "holdings" | "analytics" | "target" | "compare";

const AllocationChart = dynamic(() => import("@/components/AllocationChart").then(m => m.AllocationChart), { ssr: false, loading: () => <ChartSkeleton /> });
const GainLossChart = dynamic(() => import("@/components/GainLossChart").then(m => m.GainLossChart), { ssr: false, loading: () => <ChartSkeleton /> });
const EquityGrowthChart = dynamic(() => import("@/components/EquityGrowthChart").then(m => m.EquityGrowthChart), { ssr: false, loading: () => <ChartSkeleton /> });

export default function PortfolioDashboardPage() {
    const router = useRouter();
    const { isPrivacyMode } = usePrivacyMode();
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded } = usePortfolio();
    const { currentPortfolio } = usePortfolios();
    const {
        cash, updateCash, getHistoryForPeriod, recordSnapshot, history, transactions,
        isLoaded: cashLoaded, recordTransaction
    } = useCashAndHistory();
    const { prices, loading: pricesLoading, lastUpdated, error: marketError } = useMarketData(
        useMemo(() => portfolio.map((p) => p.ticker), [portfolio])
    );
    const pricesReady = portfolio.length === 0 || portfolio.every(item => (prices[item.ticker]?.price || 0) > 0);

    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const [riskBeta, setRiskBeta] = useState(1);
    useEffect(() => {
        if (!portfolio.length) return;
        const t = portfolio[0].ticker;
        fetch(`/api/risk?ticker=${t}&period=1y`).then(r=>r.json()).then(j=>{
            if(j.success && j.data?.beta) setRiskBeta(Number(j.data.beta)||1);
        }).catch(()=>{});
    }, [portfolio]);

    const summary = useMemo(() => {
        let totalInvested = 0;
        let totalMarketValue = 0;
        let dayChange = 0;
        let bestPerformer = { ticker: "", change: -Infinity };
        let worstPerformer = { ticker: "", change: Infinity };

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const change = prices[item.ticker]?.change || 0;
            const marketPrice = livePrice > 0 ? livePrice : item.averagePrice;
            const shares = item.lots * 100;
            const invested = item.averagePrice * shares;
            const marketValue = marketPrice * shares;

            totalInvested += invested;
            totalMarketValue += marketValue;
            if (pricesReady) dayChange += shares * change;

            if (pricesReady && change > bestPerformer.change && livePrice > 0) {
                bestPerformer = { ticker: item.ticker, change };
            }
            if (pricesReady && change < worstPerformer.change && livePrice > 0) {
                worstPerformer = { ticker: item.ticker, change };
            }
        });

        const totalEquity = totalMarketValue + cash;
        const totalGainLoss = pricesReady ? totalMarketValue - totalInvested : 0;
        const totalReturn = pricesReady && totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        const dayChangePercent = pricesReady && totalMarketValue - dayChange > 0
            ? (dayChange / (totalMarketValue - dayChange)) * 100
            : 0;

        return {
            totalInvested, totalMarketValue, totalEquity, totalGainLoss,
            totalReturn, dayChange, dayChangePercent, cash,
            bestPerformer, worstPerformer, stockCount: portfolio.length, pricesReady,
        };
    }, [portfolio, prices, cash, pricesReady]);

    const lastRecordTimeRef = useRef<number>(0);

    useEffect(() => {
        const hasPortfolio = portfolio.length > 0;
        const hasPrices = lastUpdated !== null;
        const isValidValue = !hasPortfolio || summary.totalMarketValue > 0;
        const now = Date.now();
        const isThrottleExpired = now - lastRecordTimeRef.current > 5 * 60 * 1000;

        if (isLoaded && cashLoaded && !pricesLoading && pricesReady && hasPrices && isValidValue && isThrottleExpired) {
            recordSnapshot(summary.totalMarketValue, cash);
            lastRecordTimeRef.current = now;
        }
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading, pricesReady, lastUpdated, portfolio.length, recordSnapshot]);

    const gainLossData = useMemo(() => {
        return portfolio.map((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const marketPrice = livePrice > 0 ? livePrice : item.averagePrice;
            const shares = item.lots * 100;
            const invested = item.averagePrice * shares;
            const marketValue = marketPrice * shares;
            const gainLoss = marketValue - invested;
            const percentage = invested > 0 ? (gainLoss / invested) * 100 : 0;
            return { ticker: item.ticker, name: item.name, value: Math.abs(gainLoss), gainLoss, percentage };
        }).filter((d) => d.gainLoss !== 0 && pricesReady);
    }, [portfolio, prices, pricesReady]);

    const chartData = useMemo(() => {
        return portfolio.map((item) => ({
            name: item.ticker,
            value: item.lots * 100 * (prices[item.ticker]?.price || item.averagePrice),
        })).filter((d) => d.value > 0);
    }, [portfolio, prices]);

    const handleAddStock = (data: { ticker: string; name: string; lots: number; averagePrice: number }) => {
        addStock(data);
        setIsAddModalOpen(false);
        recordTransaction({
            portfolioId: currentPortfolio?.id || "",
            type: "buy",
            ticker: data.ticker,
            name: data.name,
            lots: data.lots,
            pricePerShare: data.averagePrice,
            totalAmount: data.lots * 100 * data.averagePrice,
            notes: "Initial purchase",
        });
    };

    const handleExecuteTransaction = (id: string, type: "buy" | "sell", lots: number, price: number, note?: string) => {
        const item = portfolio.find((p) => p.id === id);
        if (!item) return;
        executeTransaction(id, type, lots, price, note);
        // non-persistent local fallback if model lacks note: store in localStorage
        if (note) {
            try {
                const KEY = "porto_journal_notes";
                const raw = localStorage.getItem(KEY);
                const map = raw ? JSON.parse(raw) : {};
                // use temp key pending server id; will be merged in history via timestamp fallback
                map[`${item.ticker}_${Date.now()}`] = note;
                localStorage.setItem(KEY, JSON.stringify(map));
            } catch {}
        }
        recordTransaction({
            portfolioId: currentPortfolio?.id || "",
            type,
            ticker: item.ticker,
            name: item.name,
            lots,
            pricePerShare: price,
            totalAmount: lots * 100 * price,
            notes: note || (type === "buy" ? "Buy more" : "Partial sell"),
        });
    };

    const handleExportPDF = () => {
        if (dashboardRef.current) {
            exportToPDF(dashboardRef.current, { title: "Portfolio Dashboard" });
        }
    };

    if (!isLoaded) {
        return <DashboardSkeleton />;
    }

    const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { key: "overview", label: "Ringkasan", icon: BarChart3 },
        { key: "holdings", label: "Kepemilikan", icon: Layers },
        { key: "target", label: "Target", icon: Target },
        { key: "compare", label: "Bandingkan", icon: Columns2 },
    ];

    return (
        <div ref={dashboardRef} className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: currentPortfolio?.color || "#3b82f6" }} />
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Portofolio aktif</p>
                        </div>
                        <h1 className="mt-1 truncate text-2xl font-black tracking-tight">{currentPortfolio?.name || "Portofolio"}</h1>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{currentPortfolio?.description || "Kelola dan pantau investasi Anda"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {lastUpdated && <span className="mr-auto flex items-center gap-1 text-[10px] text-muted-foreground sm:mr-1"><Clock className="size-3" /> {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>}
                        <button onClick={() => setIsAddModalOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                            <Plus className="size-3.5" /> Tambah saham
                        </button>
                        <ExportPDFButton onClick={handleExportPDF} size="md" />
                        <ScheduledReportButton dashboardRef={dashboardRef as any} onExport={handleExportPDF} />
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1.35fr_2fr]">
                    <div className="border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total equity</p>
                        <PrivacyWrapper isPrivate={isPrivacyMode}><p className="mt-1 font-mono text-3xl font-black tracking-tight tabular-nums sm:text-4xl">{formatIDR(summary.totalEquity)}</p></PrivacyWrapper>
                        <div className={cn("mt-2 flex items-center gap-2 text-xs font-bold", summary.dayChange >= 0 ? "text-success" : "text-destructive")}>
                            {summary.dayChange >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                            <PrivacyWrapper isPrivate={isPrivacyMode}>{!pricesReady ? "Harga belum tersedia" : `${summary.dayChange >= 0 ? "+" : ""}${formatIDR(summary.dayChange)} (${formatPercentage(summary.dayChangePercent)}) hari ini`}</PrivacyWrapper>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        {[
                            { label: "Modal", value: formatIDR(summary.totalInvested), icon: Briefcase },
                            { label: "Unrealized P/L", value: pricesReady ? `${summary.totalGainLoss > 0 ? "+" : ""}${formatIDR(summary.totalGainLoss)}` : "—", note: pricesReady ? formatPercentage(summary.totalReturn) : "Menunggu harga", icon: DollarSign, tone: pricesReady ? (summary.totalGainLoss >= 0 ? "text-success" : "text-destructive") : "text-muted-foreground" },
                            { label: "Cash", value: formatIDR(summary.cash), note: `${summary.totalEquity > 0 ? ((summary.cash / summary.totalEquity) * 100).toFixed(1) : "0"}% dari equity`, icon: Wallet },
                        ].map(metric => (
                            <div key={metric.label} className="p-4 sm:p-5">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground"><metric.icon className="size-3.5" /> {metric.label}</div>
                                <PrivacyWrapper isPrivate={isPrivacyMode}><p className={cn("mt-2 truncate font-mono text-lg font-black tabular-nums", metric.tone)}>{metric.value}</p></PrivacyWrapper>
                                {metric.note && <p className={cn("mt-0.5 text-[10px]", metric.tone || "text-muted-foreground")}>{metric.note}</p>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 border-t border-border bg-muted/20 sm:grid-cols-4">
                    {[
                        { label: "Kepemilikan", value: `${summary.stockCount} saham` },
                        { label: "Terbaik hari ini", value: summary.bestPerformer.ticker || "—", note: summary.bestPerformer.ticker ? `+${formatPercentage(Math.abs(prices[summary.bestPerformer.ticker]?.changePercent || 0))}` : undefined, tone: "text-success" },
                        { label: "Terlemah hari ini", value: summary.worstPerformer.ticker || "—", note: summary.worstPerformer.ticker ? formatPercentage(prices[summary.worstPerformer.ticker]?.changePercent || 0) : undefined, tone: "text-destructive" },
                        { label: "Status harga", value: pricesLoading ? "Memuat" : "Terkini" },
                    ].map(item => (
                        <div key={item.label} className="min-w-0 border-r border-t border-border px-4 py-3 first:border-t-0 sm:border-t-0">
                            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</p>
                            <div className="mt-1 flex items-baseline gap-1.5"><span className="truncate text-sm font-black">{item.value}</span>{item.note && <span className={cn("text-[10px] font-bold", item.tone)}>{item.note}</span>}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tab Navigation — PageTabs */}
            <PageTabs tabs={tabs.map(t => ({ id: t.key, label: t.label, icon: t.icon }))} active={activeTab} onChange={(id) => setActiveTab(id as TabKey)} />

            {/* === OVERVIEW TAB === */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_0.82fr]">
                        <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={summary.totalEquity} portfolio={portfolio} currentCash={cash} transactions={transactions} />

                        <div className="content-start">
                            {chartData.length > 0 ? <AllocationChart data={chartData} /> : <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">Belum ada data alokasi</div>}
                        </div>
                    </div>

                    {/* Gain/Loss + Heatmap */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {gainLossData.length > 0 ? <GainLossChart data={gainLossData} /> : <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">Belum ada data gain/loss</div>}
                        <MonthlyPerformanceHeatmap history={history} />
                    </div>

                    {/* Holdings Preview */}
                    {portfolio.length > 0 && (
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    <span className="card-title">Holdings Preview</span>
                                </div>
                                <button
                                    onClick={() => setActiveTab("holdings")}
                                    className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                    Lihat Semua <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Saham</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Lots</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Avg Price</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Harga</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">P/L</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Chg%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {portfolio.slice(0, 5).map((item) => {
                                            const livePrice = prices[item.ticker]?.price || 0;
                                            const change = prices[item.ticker]?.change || 0;
                                            const changePercent = prices[item.ticker]?.changePercent || 0;
                                            const marketPrice = livePrice > 0 ? livePrice : item.averagePrice;
                                            const marketValue = marketPrice * item.lots * 100;
                                            const invested = item.averagePrice * item.lots * 100;
                                            const pl = marketValue - invested;
                                            const isUp = change >= 0;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => router.push(`/analysis/${item.ticker}`)}
                                                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-2.5">
                                                        <span className="font-mono font-bold text-foreground">{item.ticker}</span>
                                                        <span className="text-muted-foreground ml-2 hidden sm:inline">{item.name}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{item.lots}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                                        Rp{item.averagePrice.toLocaleString("id-ID")}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                                        {livePrice > 0 ? `Rp${livePrice.toLocaleString("id-ID")}` : <span className="text-muted-foreground">Menunggu</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={cn("font-bold font-mono", pl >= 0 ? "text-success" : "text-destructive")}>
                                                            {pricesReady ? <>{pl >= 0 ? "+" : ""}{formatIDR(pl)}</> : <span className="text-muted-foreground">—</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={cn("font-bold font-mono", isUp ? "text-success" : "text-destructive")}>
                                                            {pricesReady ? formatPercentage(changePercent) : "—"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {portfolio.length > 5 && (
                                <div className="px-4 py-2.5 text-center border-t border-border">
                                    <p className="text-[10px] text-muted-foreground">
                                        Menampilkan 5 dari {portfolio.length} holdings
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <StressTestCard beta={riskBeta} totalValue={summary.totalMarketValue} />

                    {/* Cash Manager */}
                    <CashManager cash={cash} onUpdateCash={updateCash} />
                </div>
            )}

            {/* === HOLDINGS TAB === */}
            {activeTab === "holdings" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Holdings</h2>
                            <p className="text-xs text-muted-foreground">{portfolio.length} saham dalam portfolio</p>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah
                        </button>
                    </div>

                    {portfolio.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-12 text-center">
                            <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm font-bold text-foreground mb-1">Belum ada saham</p>
                            <p className="text-xs text-muted-foreground mb-4">Mulai investasi dengan menambahkan saham pertama</p>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Saham
                            </button>
                        </div>
                    ) : (
                        <PortfolioTable
                            portfolio={portfolio}
                            marketData={prices}
                            transactions={transactions}
                            marketError={marketError}
                            marketLastUpdated={lastUpdated}
                            onRemove={removeStock}
                            onUpdate={updateStock}
                            onTransaction={handleExecuteTransaction}
                        />
                    )}
                </div>
            )}

            {/* === ANALYTICS TAB === */}
            {activeTab === "analytics" && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-foreground mb-1">Analytics</h2>
                        <p className="text-xs text-muted-foreground">Analisis mendalam mengenai portfolio Anda</p>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Return</p>
                            <p className={cn("text-2xl font-bold", summary.totalReturn >= 0 ? "text-success" : "text-destructive")}>
                                {summary.totalReturn >= 0 ? "+" : ""}{summary.totalReturn.toFixed(2)}%
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Day Change</p>
                            <p className={cn("text-2xl font-bold", summary.dayChange >= 0 ? "text-success" : "text-destructive")}>
                                {summary.dayChange >= 0 ? "+" : ""}{formatIDR(summary.dayChange)}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Gain/Loss</p>
                            <p className={cn("text-2xl font-bold", summary.totalGainLoss >= 0 ? "text-success" : "text-destructive")}>
                                {summary.totalGainLoss >= 0 ? "+" : ""}{formatIDR(summary.totalGainLoss)}
                            </p>
                        </div>
                    </div>

                    {/* 11.B6 Stress Test – slider IHSG -5/-10/-20, loss = beta * shock * totalValue */}
                    <StressTestCard beta={riskBeta} totalValue={summary.totalMarketValue} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    <span className="card-title">Equity Growth</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={summary.totalEquity} portfolio={portfolio} currentCash={cash} transactions={transactions} />
                            </div>
                        </div>
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-primary" />
                                    <span className="card-title">Alokasi Portfolio</span>
                                </div>
                            </div>
                            <div className="p-4">
                                {chartData.length > 0 ? (
                                    <AllocationChart data={chartData} />
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada data</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    <span className="card-title">Gain / Loss per Saham</span>
                                </div>
                            </div>
                            <div className="p-4">
                                {gainLossData.length > 0 ? (
                                    <GainLossChart data={gainLossData} />
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada data</p>
                                )}
                            </div>
                        </div>
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="card-title">Performa Bulanan</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <MonthlyPerformanceHeatmap history={history} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === TARGET TAB === */}
            {activeTab === "target" && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-foreground mb-1">Target Portfolio</h2>
                        <p className="text-xs text-muted-foreground">Atur alokasi target untuk setiap saham</p>
                    </div>
                    <TargetPortfolio portfolio={portfolio} prices={prices} cash={cash} />
                    {/* 11.B4 Rebalancing Advisor – diff target vs actual */}
                    <RebalancingAdvisor portfolio={portfolio} prices={prices} />
                </div>
            )}

            {/* === COMPARE TAB — E16 Bandingkan Antar Portofolio */}
            {activeTab === "compare" && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-foreground mb-1">Bandingkan Antar Portofolio</h2>
                        <p className="text-xs text-muted-foreground">Bandingkan 2 portofolio (usePortfolios + useCashAndHistory per portfolioId) — non-destruktif, toggle di /compare juga.</p>
                    </div>
                    <PortfolioCompareTab />
                </div>
            )}

            {/* Add Stock Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-card p-6 rounded-lg w-full max-w-lg border border-border">
                        <div className="mb-4">
                            <h3 className="font-medium text-foreground">Tambah Saham</h3>
                            <p className="text-sm text-muted-foreground">Beli aset baru ke portfolio</p>
                        </div>
                        <StockForm
                            onSubmit={handleAddStock}
                            onCancel={() => setIsAddModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
