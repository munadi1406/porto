"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useMarketData } from "@/hooks/useMarketData";
import { useCashAndHistory } from "@/hooks/useCashAndHistory";
import dynamic from "next/dynamic";
import { SummaryCard } from "@/components/SummaryCard";
import { CashManager } from "@/components/CashManager";
import { MonthlyPerformanceHeatmap } from "@/components/MonthlyPerformanceHeatmap";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StockForm } from "@/components/StockForm";
import { TargetPortfolio } from "@/components/TargetPortfolio";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { DashboardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { exportToPDF } from "@/lib/exportPDF";
import {
    Briefcase, DollarSign, TrendingUp, TrendingDown, Activity, Calendar,
    Wallet, Plus, Layers, Target, BarChart3, PieChart,
    Clock, ChevronRight, Shield
} from "lucide-react";
import { useRouter } from "next/navigation";

type TabKey = "overview" | "holdings" | "analytics" | "target";

const AllocationChart = dynamic(() => import("@/components/AllocationChart").then(m => m.AllocationChart), { ssr: false, loading: () => <ChartSkeleton /> });
const GainLossChart = dynamic(() => import("@/components/GainLossChart").then(m => m.GainLossChart), { ssr: false, loading: () => <ChartSkeleton /> });
const EquityGrowthChart = dynamic(() => import("@/components/EquityGrowthChart").then(m => m.EquityGrowthChart), { ssr: false, loading: () => <ChartSkeleton /> });

export default function PortfolioDashboardPage() {
    const router = useRouter();
    const { portfolio, addStock, removeStock, updateStock, executeTransaction, isLoaded } = usePortfolio();
    const { currentPortfolio } = usePortfolios();
    const {
        cash, updateCash, getHistoryForPeriod, recordSnapshot, history,
        isLoaded: cashLoaded, recordTransaction
    } = useCashAndHistory();
    const { prices, loading: pricesLoading, lastUpdated } = useMarketData(
        useMemo(() => portfolio.map((p) => p.ticker), [portfolio])
    );

    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    const summary = useMemo(() => {
        let totalInvested = 0;
        let totalMarketValue = 0;
        let dayChange = 0;
        let bestPerformer = { ticker: "", change: -Infinity };
        let worstPerformer = { ticker: "", change: Infinity };

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const change = prices[item.ticker]?.change || 0;
            const marketPrice = livePrice > 0 ? livePrice : 0;
            const shares = item.lots * 100;
            const invested = item.averagePrice * shares;
            const marketValue = marketPrice * shares;

            totalInvested += invested;
            totalMarketValue += marketValue;
            dayChange += shares * change;

            if (change > bestPerformer.change && livePrice > 0) {
                bestPerformer = { ticker: item.ticker, change };
            }
            if (change < worstPerformer.change && livePrice > 0) {
                worstPerformer = { ticker: item.ticker, change };
            }
        });

        const totalEquity = totalMarketValue + cash;
        const totalGainLoss = totalMarketValue - totalInvested;
        const totalReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        const dayChangePercent = totalMarketValue - dayChange > 0
            ? (dayChange / (totalMarketValue - dayChange)) * 100
            : 0;

        return {
            totalInvested, totalMarketValue, totalEquity, totalGainLoss,
            totalReturn, dayChange, dayChangePercent, cash,
            bestPerformer, worstPerformer, stockCount: portfolio.length,
        };
    }, [portfolio, prices, cash]);

    const lastRecordTimeRef = useRef<number>(0);

    useEffect(() => {
        const hasPortfolio = portfolio.length > 0;
        const hasPrices = lastUpdated !== null;
        const isValidValue = !hasPortfolio || summary.totalMarketValue > 0;
        const now = Date.now();
        const isThrottleExpired = now - lastRecordTimeRef.current > 5 * 60 * 1000;

        if (isLoaded && cashLoaded && !pricesLoading && hasPrices && isValidValue && isThrottleExpired) {
            recordSnapshot(summary.totalMarketValue, cash);
            lastRecordTimeRef.current = now;
        }
    }, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading, lastUpdated, portfolio.length, recordSnapshot]);

    const gainLossData = useMemo(() => {
        return portfolio.map((item) => {
            const livePrice = prices[item.ticker]?.price || 0;
            const marketPrice = livePrice > 0 ? livePrice : 0;
            const shares = item.lots * 100;
            const invested = item.averagePrice * shares;
            const marketValue = marketPrice * shares;
            const gainLoss = marketValue - invested;
            const percentage = invested > 0 ? (gainLoss / invested) * 100 : 0;
            return { ticker: item.ticker, name: item.name, value: Math.abs(gainLoss), gainLoss, percentage };
        }).filter((d) => d.gainLoss !== 0);
    }, [portfolio, prices]);

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

    const handleExecuteTransaction = (id: string, type: "buy" | "sell", lots: number, price: number) => {
        const item = portfolio.find((p) => p.id === id);
        if (!item) return;
        executeTransaction(id, type, lots, price);
        recordTransaction({
            portfolioId: currentPortfolio?.id || "",
            type,
            ticker: item.ticker,
            name: item.name,
            lots,
            pricePerShare: price,
            totalAmount: lots * 100 * price,
            notes: type === "buy" ? "Buy more" : "Partial sell",
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
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "holdings", label: "Holdings", icon: Layers },
        { key: "analytics", label: "Performance", icon: PieChart },
        { key: "target", label: "Target", icon: Target },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPortfolio?.color || "#3b82f6" }} />
                        {currentPortfolio?.name || "Portfolio"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {portfolio.length} holdings &middot; {currentPortfolio?.description || "Kelola investasi Anda"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lastUpdated.toLocaleTimeString("id-ID")}
                        </span>
                    )}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Saham
                    </button>
                    <ExportPDFButton onClick={handleExportPDF} size="md" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    title="Net Worth"
                    value={formatIDR(summary.totalEquity)}
                    subValue={pricesLoading ? "..." : formatPercentage(summary.dayChangePercent)}
                    icon={Activity}
                    trend={summary.dayChange >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    title="Unrealized P/L"
                    value={summary.totalGainLoss > 0 ? `+${formatIDR(summary.totalGainLoss)}` : formatIDR(summary.totalGainLoss)}
                    subValue={formatPercentage(summary.totalReturn)}
                    icon={DollarSign}
                    trend={summary.totalGainLoss >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    title="Total Modal"
                    value={formatIDR(summary.totalInvested)}
                    icon={Briefcase}
                />
                <SummaryCard
                    title="Cash Balance"
                    value={formatIDR(summary.cash)}
                    icon={Wallet}
                    trend="neutral"
                />
            </div>

            {/* Portfolio Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="card-title">Total Saham</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{summary.stockCount}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="card-title">Best Performer</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{summary.bestPerformer.ticker || "-"}</p>
                    {summary.bestPerformer.ticker && (
                        <p className="text-xs font-bold text-success">
                            +{formatPercentage(Math.abs(prices[summary.bestPerformer.ticker]?.changePercent || 0))}
                        </p>
                    )}
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <span className="card-title">Worst Performer</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{summary.worstPerformer.ticker || "-"}</p>
                    {summary.worstPerformer.ticker && (
                        <p className="text-xs font-bold text-destructive">
                            {formatPercentage(prices[summary.worstPerformer.ticker]?.changePercent || 0)}
                        </p>
                    )}
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="card-title">Cash Ratio</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {summary.totalEquity > 0 ? ((summary.cash / summary.totalEquity) * 100).toFixed(1) : "0"}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">dari total equity</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                            activeTab === tab.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* === OVERVIEW TAB === */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_0.82fr] gap-4">
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    <span className="card-title">Equity Growth</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={summary.totalEquity} />
                            </div>
                        </div>

                        <div className="grid gap-4 content-start">
                            {/* Allocation */}
                            <div className="card-flush">
                                <div className="px-4 py-3 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <PieChart className="w-4 h-4 text-primary" />
                                        <span className="card-title">Alokasi</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {chartData.length > 0 ? (
                                        <AllocationChart data={chartData} />
                                    ) : (
                                        <p className="text-xs text-muted-foreground text-center py-8">Belum ada data alokasi</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gain/Loss + Heatmap */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="card-flush">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    <span className="card-title">Gain / Loss</span>
                                </div>
                            </div>
                            <div className="p-4">
                                {gainLossData.length > 0 ? (
                                    <GainLossChart data={gainLossData} />
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada data gain/loss</p>
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
                                            const marketValue = livePrice * item.lots * 100;
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
                                                        {livePrice > 0 ? `Rp${livePrice.toLocaleString("id-ID")}` : "-"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={cn("font-bold font-mono", pl >= 0 ? "text-success" : "text-destructive")}>
                                                            {pl >= 0 ? "+" : ""}{formatIDR(pl)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={cn("font-bold font-mono", isUp ? "text-success" : "text-destructive")}>
                                                            {formatPercentage(changePercent)}
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
                                <EquityGrowthChart getHistoryForPeriod={getHistoryForPeriod} currentEquity={summary.totalEquity} />
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
