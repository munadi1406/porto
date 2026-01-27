"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { Plus, Briefcase, Trash2, Check, Settings2, X, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { cn, formatPercentage } from "@/lib/utils";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

export function SidebarPortfolios() {
    const { portfolios, currentPortfolio, setSelectedPortfolioId, createPortfolio, deletePortfolio, isLoading: listLoading } = usePortfolios();
    const { data: aggregateData, loading: aggregateLoading } = useAggregatePortfolio();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [selectedColor, setSelectedColor] = useState("#3b82f6");
    const pathname = usePathname();
    const router = useRouter();

    const portfolioColors = [
        "#3b82f6", // Blue
        "#10b981", // Emerald
        "#f59e0b", // Amber
        "#ef4444", // Red
        "#8b5cf6", // Violet
        "#ec4899", // Pink
        "#06b6d4", // Cyan
        "#f97316", // Orange
    ];

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({
                name: newName.trim(),
                color: selectedColor
            });
            setNewName("");
            setIsAdding(false);
            toast.success("Portofolio created successfully");
        } catch (error) {
            // Error handled by hook toast
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (confirm(`Hapus portofolio "${name}"? Seluruh data saham dan riwayat di dalamnya akan hilang permanen.`)) {
            try {
                await deletePortfolio(id);
            } catch (error) {
                // Error handled by hook toast
            }
        }
    };

    const handleSelectPortfolio = (id: string) => {
        setSelectedPortfolioId(id);
        if (pathname !== "/dashboard") {
            router.push("/dashboard");
        }
    };

    if (listLoading) {
        return (
            <div className="space-y-3 px-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 px-2">
            <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">My Portfolios</span>
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Consolidated View Link */}
            <button
                onClick={() => router.push("/")}
                className={cn(
                    "group flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all border border-transparent text-left",
                    pathname === "/"
                        ? "bg-blue-600 shadow-lg shadow-blue-500/20 text-white font-bold"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        pathname === "/" ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
                    )}>
                        <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate">Consolidated</span>
                </div>
                {aggregateData && (
                    <div className={cn(
                        "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                        pathname === "/"
                            ? "bg-white/20 text-white"
                            : (aggregateData.totals.dayChangePercent >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")
                    )}>
                        {aggregateData.totals.dayChangePercent >= 0 ? "+" : ""}{aggregateData.totals.dayChangePercent.toFixed(2)}%
                    </div>
                )}
            </button>

            {/* Portfolio List */}
            {portfolios.map((p) => {
                const isSelected = currentPortfolio?.id === p.id && pathname !== "/aggregate";
                const perf = aggregateData?.portfolios.find((ap: any) => ap.id === p.id);

                return (
                    <div
                        key={p.id}
                        onClick={() => handleSelectPortfolio(p.id)}
                        className={cn(
                            "group flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all border-2 text-left cursor-pointer",
                            isSelected
                                ? "bg-white dark:bg-gray-800 border-blue-500 shadow-md translate-x-1"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                        )}
                    >
                        <div className="flex items-center gap-3 overflow-hidden ml-1">
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                                style={{ backgroundColor: p.color || '#3b82f6' }}
                            />
                            <div className="flex flex-col overflow-hidden">
                                <span className={cn(
                                    "text-xs font-bold truncate transition-all",
                                    isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                                )}>
                                    {p.name}
                                </span>
                                {perf && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {perf.tickerCount} Aset
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {perf && (
                                <div className={cn(
                                    "text-[10px] font-black flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                                    perf.dayChangePercent >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                )}>
                                    {perf.dayChangePercent >= 0 ? "+" : ""}{perf.dayChangePercent.toFixed(1)}%
                                    {perf.dayChangePercent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                </div>
                            )}

                            {portfolios.length > 1 && (
                                <button
                                    onClick={(e) => handleDelete(e, p.id, p.name)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all hover:scale-110"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add New Portfolio Form */}
            {isAdding && (
                <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">New Portfolio</span>
                        <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Portfolio Name"
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <div className="flex flex-wrap gap-1 mb-3">
                        {portfolioColors.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={cn(
                                    "w-4 h-4 rounded-full border transition-transform",
                                    selectedColor === color ? "border-gray-900 dark:border-white scale-110 shadow-sm" : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!newName.trim()}
                        className="w-full py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        Create Portfolio
                    </button>
                </div>
            )}
        </div>
    );
}
