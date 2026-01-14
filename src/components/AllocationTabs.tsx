"use client";

import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatIDR } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";
import { useSectorData } from "@/hooks/useSectorData";

interface AllocationTabsProps {
    portfolio: PortfolioItem[];
    prices: Record<string, { price: number; change: number }>;
    allocationData: Array<{
        name: string;
        value: number;
        percentage: number;
        gainLoss: number;
    }>;
}

const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

const SECTOR_COLORS: Record<string, string> = {
    "Financial Services": "#3b82f6",
    "Communication Services": "#10b981",
    "Consumer Defensive": "#f59e0b",
    "Consumer Cyclical": "#f97316",
    "Basic Materials": "#8b5cf6",
    "Energy": "#ef4444",
    "Real Estate": "#ec4899",
    "Industrials": "#06b6d4",
    "Technology": "#84cc16",
    "Healthcare": "#14b8a6",
    "Utilities": "#6366f1",
    "Others": "#94a3b8",
};

export function AllocationTabs({ portfolio, prices, allocationData }: AllocationTabsProps) {
    const [activeTab, setActiveTab] = useState<"stock" | "sector">("stock");
    const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { sectors, loading: sectorsLoading } = useSectorData(tickers);

    const sectorAnalysis = useMemo(() => {
        if (portfolio.length === 0) return null;

        let totalValue = 0;
        const sectorValues: Record<string, {
            value: number;
            stocks: Array<{
                ticker: string;
                name: string;
                lots: number;
                currentPrice: number;
                value: number;
                gainLoss: number;
                gainLossPct: number;
            }>;
        }> = {};

        portfolio.forEach((item) => {
            const livePrice = prices[item.ticker]?.price || item.averagePrice;
            const value = item.lots * 100 * livePrice;
            const gainLoss = value - (item.lots * 100 * item.averagePrice);
            const gainLossPct = ((livePrice - item.averagePrice) / item.averagePrice) * 100;

            totalValue += value;

            const sector = sectors[item.ticker]?.sector || "Others";

            if (!sectorValues[sector]) {
                sectorValues[sector] = { value: 0, stocks: [] };
            }

            sectorValues[sector].value += value;
            sectorValues[sector].stocks.push({
                ticker: item.ticker,
                name: item.name,
                lots: item.lots,
                currentPrice: livePrice,
                value,
                gainLoss,
                gainLossPct,
            });
        });

        const sectorData = Object.entries(sectorValues).map(([sector, data]) => ({
            name: sector, // For legend display
            sector,
            value: data.value,
            percentage: (data.value / totalValue) * 100,
            color: SECTOR_COLORS[sector] || SECTOR_COLORS["Others"],
            stocks: data.stocks.sort((a, b) => b.value - a.value),
            stockCount: data.stocks.length,
        })).sort((a, b) => b.value - a.value);

        return { sectorData, totalValue };
    }, [portfolio, prices, sectors]);

    const toggleSector = (sector: string) => {
        const newExpanded = new Set(expandedSectors);
        if (newExpanded.has(sector)) {
            newExpanded.delete(sector);
        } else {
            newExpanded.add(sector);
        }
        setExpandedSectors(newExpanded);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header with Tabs */}
            <div className="p-4 sm:p-6 pb-0">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Portfolio Allocation</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Distribusi aset portfolio</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab("stock")}
                        className={cn(
                            "px-4 py-2 text-sm font-semibold transition-all relative",
                            activeTab === "stock"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                    >
                        By Stock
                        {activeTab === "stock" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("sector")}
                        className={cn(
                            "px-4 py-2 text-sm font-semibold transition-all relative",
                            activeTab === "sector"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                    >
                        By Sector
                        {activeTab === "sector" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 pt-4">
                {activeTab === "stock" ? (
                    /* Stock Allocation Chart */
                    <div className="min-h-[400px]">
                        {allocationData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                <p className="text-sm">Belum ada data portfolio</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => [formatIDR(Number(value)), "Value"]}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend
                                        formatter={(value, entry: any) => {
                                            const data = entry.payload;
                                            return `${value} (${data.percentage.toFixed(1)}%)`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                ) : (
                    /* Sector Allocation */
                    <div>
                        {sectorsLoading && (
                            <div className="text-center text-sm text-gray-500 mb-4">Loading sectors...</div>
                        )}

                        {!sectorAnalysis || sectorAnalysis.sectorData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                <p className="text-sm">Belum ada data portfolio</p>
                            </div>
                        ) : (
                            <>
                                {/* Sector Chart */}
                                <div className="min-h-[300px] mb-6">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={sectorAnalysis.sectorData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {sectorAnalysis.sectorData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => [formatIDR(Number(value)), "Value"]}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                            <Legend
                                                formatter={(value, entry: any) => {
                                                    const data = entry.payload;
                                                    return `${value} (${data.percentage.toFixed(0)}%)`;
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Expandable Sectors */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sectors & Holdings</h4>
                                    <div className="space-y-2">
                                        {sectorAnalysis.sectorData.map((sector, index) => {
                                            const isExpanded = expandedSectors.has(sector.sector);
                                            return (
                                                <div key={`sector-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => toggleSector(sector.sector)}
                                                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                                    >
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: sector.color }}>
                                                            <span className="text-xs font-bold text-white">{index + 1}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sector.sector}</span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">({sector.stockCount})</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">{sector.percentage.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{ width: `${sector.percentage}%`, backgroundColor: sector.color }}
                                                                />
                                                            </div>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        )}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                                                            {sector.stocks.map((stock, stockIndex) => (
                                                                <div
                                                                    key={`stock-${stockIndex}`}
                                                                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{stock.ticker}</p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{stock.name}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                                                            <span>{stock.lots} lot</span>
                                                                            <span>•</span>
                                                                            <span>{formatIDR(stock.currentPrice)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right ml-3">
                                                                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                                                            {formatIDR(stock.value)}
                                                                        </p>
                                                                        <div className={cn(
                                                                            "flex items-center gap-1 text-xs font-semibold justify-end",
                                                                            stock.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                                                                        )}>
                                                                            {stock.gainLoss >= 0 ? (
                                                                                <TrendingUp className="w-3 h-3" />
                                                                            ) : (
                                                                                <TrendingDown className="w-3 h-3" />
                                                                            )}
                                                                            <span>
                                                                                {stock.gainLoss >= 0 ? "+" : ""}{stock.gainLossPct.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
