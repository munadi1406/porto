"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { Plus, Trash2, X, Layers } from "lucide-react";
import { useState } from "react";
import { cn, formatPercentage } from "@/lib/utils";
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
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
    ];

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({ name: newName.trim(), color: selectedColor });
            setNewName("");
            setIsAdding(false);
        } catch (error) {}
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (confirm(`Hapus portofolio "${name}"? Semua data akan hilang permanen.`)) {
            try { await deletePortfolio(id); } catch (error) {}
        }
    };

    const handleSelectPortfolio = (id: string) => {
        setSelectedPortfolioId(id);
        if (pathname !== "/dashboard") router.push("/dashboard");
    };

    if (listLoading) {
        return (
            <div className="space-y-2 px-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-9 bg-[var(--border)] animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-[var(--muted)]">Portofolio</span>
                <button onClick={() => setIsAdding(true)} className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <button
                onClick={() => router.push("/")}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
                    pathname === "/"
                        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                        : "text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                )}
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Konsolidasi</span>
                </div>
                {aggregateData && (
                    <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        aggregateData.totals.dayChangePercent >= 0 ? "text-[var(--success)] bg-[var(--success-bg)]" : "text-[var(--danger)] bg-[var(--danger-bg)]"
                    )}>
                        {aggregateData.totals.dayChangePercent >= 0 ? "+" : ""}{aggregateData.totals.dayChangePercent.toFixed(1)}%
                    </span>
                )}
            </button>

            {portfolios.map((p) => {
                const isSelected = currentPortfolio?.id === p.id && pathname !== "/aggregate";
                const perf = aggregateData?.portfolios.find((ap: any) => ap.id === p.id);
                return (
                    <div
                        key={p.id}
                        onClick={() => handleSelectPortfolio(p.id)}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors group",
                            isSelected
                                ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                                : "text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                        )}
                    >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#3b82f6' }} />
                            <span className="truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {perf && (
                                <span className={cn(
                                    "text-[11px] font-medium px-1 rounded hidden group-hover:block",
                                    perf.dayChangePercent >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                                )}>
                                    {perf.dayChangePercent >= 0 ? "+" : ""}{perf.dayChangePercent.toFixed(1)}%
                                </span>
                            )}
                            {portfolios.length > 1 && (
                                <button onClick={(e) => handleDelete(e, p.id, p.name)} className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--danger)] transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {isAdding && (
                <div className="mt-2 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[var(--muted)]">Portofolio Baru</span>
                        <button onClick={() => setIsAdding(false)} className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nama portofolio"
                        className="w-full px-2 py-1.5 text-sm bg-[var(--bg)] border border-[var(--border)] rounded outline-none focus:ring-1 focus:ring-[var(--accent)] mb-2"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <div className="flex flex-wrap gap-1 mb-2">
                        {portfolioColors.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={cn("w-4 h-4 rounded-full border transition-transform", selectedColor === color ? "border-[var(--fg)] scale-110" : "border-transparent")}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    <button onClick={handleCreate} disabled={!newName.trim()} className="w-full py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
                        Buat
                    </button>
                </div>
            )}
        </div>
    );
}
