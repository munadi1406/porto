"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Building2, AlertTriangle, Loader2, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatIDR, cn } from "@/lib/utils";
import { PortfolioItem } from "@/lib/types";
import { useSectorData } from "@/hooks/useSectorData";

interface SectorAllocationProps {
    portfolio: PortfolioItem[];
    prices: Record<string, { price: number; change: number }>;
}

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

export function SectorAllocation({ portfolio, prices }: SectorAllocationProps) {
    const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

    // Fetch sector data for all tickers
    const tickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const { sectors, loading: sectorsLoading } = useSectorData(tickers);

    const analysis = useMemo(() => {
        if (portfolio.length === 0) return null;

        // Calculate total portfolio value and group by sector
        let totalValue = 0;
        const sectorValues: Record<string, {
            value: number;
            stocks: Array<{
                ticker: string;
                name: string;
                lots: number;
                avgPrice: number;
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

            // Get sector from API data
            const sector = sectors[item.ticker]?.sector || "Others";

            if (!sectorValues[sector]) {
                sectorValues[sector] = { value: 0, stocks: [] };
            }

            sectorValues[sector].value += value;
            sectorValues[sector].stocks.push({
                ticker: item.ticker,
                name: item.name,
                lots: item.lots,
                avgPrice: item.averagePrice,
                currentPrice: livePrice,
                value,
                gainLoss,
                gainLossPct,
            });
        });

        // Convert to array and calculate percentages
        const sectorData = Object.entries(sectorValues).map(([sector, data]) => ({
            sector,
            value: data.value,
            percentage: (data.value / totalValue) * 100,
            color: SECTOR_COLORS[sector] || SECTOR_COLORS["Others"],
            stocks: data.stocks.sort((a, b) => b.value - a.value), // Sort stocks by value
            stockCount: data.stocks.length,
        })).sort((a, b) => b.value - a.value);

        // Calculate concentration
        const topSector = sectorData[0]?.percentage || 0;
        const top3Sectors = sectorData.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0);

        // Risk assessment
        let riskLevel: "low" | "medium" | "high";
        let recommendation: string;

        if (topSector < 40 && sectorData.length >= 4) {
            riskLevel = "low";
            recommendation = "Well diversified across sectors";
        } else if (topSector < 60 && sectorData.length >= 3) {
            riskLevel = "medium";
            recommendation = "Consider diversifying to more sectors";
        } else {
            riskLevel = "high";
            recommendation = "High sector concentration - diversify!";
        }

        return {
            sectorData,
            topSector,
            top3Sectors,
            totalSectors: sectorData.length,
            riskLevel,
            recommendation,
        };
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

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{data.sector}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Value:</span>
                            <span className="font-semibold">{formatIDR(data.value)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Allocation:</span>
                            <span className="font-bold">{data.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Stocks:</span>
                            <span className="font-semibold">{data.stockCount}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!analysis) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sector Allocation</h3>
                <p className="text-sm text-gray-500">Tambahkan saham untuk analisis</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Sector Allocation</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sectorsLoading ? "Loading sectors..." : "Diversifikasi per sektor"}
                    </p>
                </div>
                {sectorsLoading && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                )}
            </div>

            {/* Risk Alert */}
            <div className={cn(
                "mb-4 p-3 rounded-lg flex items-start gap-2",
                analysis.riskLevel === "low" && "bg-green-50 dark:bg-green-900/10",
                analysis.riskLevel === "medium" && "bg-yellow-50 dark:bg-yellow-900/10",
                analysis.riskLevel === "high" && "bg-red-50 dark:bg-red-900/10"
            )}>
                <AlertTriangle className={cn(
                    "w-4 h-4 mt-0.5 flex-shrink-0",
                    analysis.riskLevel === "low" && "text-green-600",
                    analysis.riskLevel === "medium" && "text-yellow-600",
                    analysis.riskLevel === "high" && "text-red-600"
                )} />
                <div className="flex-1">
                    <p className={cn(
                        "text-sm font-medium",
                        analysis.riskLevel === "low" && "text-green-700 dark:text-green-400",
                        analysis.riskLevel === "medium" && "text-yellow-700 dark:text-yellow-400",
                        analysis.riskLevel === "high" && "text-red-700 dark:text-red-400"
                    )}>
                        {analysis.recommendation}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {analysis.totalSectors} sectors • Top sector: {analysis.topSector.toFixed(0)}%
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[280px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={analysis.sectorData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {analysis.sectorData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => {
                                const data = entry.payload;
                                return (
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {value} ({data.percentage.toFixed(0)}%)
                                    </span>
                                );
                            }}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Expandable Sectors List */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sectors & Holdings</h4>
                <div className="space-y-2">
                    {analysis.sectorData.map((sector, index) => {
                        const isExpanded = expandedSectors.has(sector.sector);
                        return (
                            <div key={`sector-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                {/* Sector Header - Clickable */}
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
                                                <span className="text-xs text-gray-500 dark:text-gray-400">({sector.stockCount} stocks)</span>
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

                                {/* Expanded Stock List */}
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
                                                        "flex items-center gap-1 text-xs font-semibold",
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
        </div>
    );
}
