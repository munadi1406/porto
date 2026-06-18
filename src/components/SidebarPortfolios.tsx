"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { useAggregatePortfolio } from "@/hooks/useAggregatePortfolio";
import { Plus, Trash2, X, Layers } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const portfolioColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export function SidebarPortfolios() {
    const { portfolios, currentPortfolio, setSelectedPortfolioId, createPortfolio, deletePortfolio, isLoading: listLoading } = usePortfolios();
    const { data: aggregateData } = useAggregatePortfolio();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [selectedColor, setSelectedColor] = useState("#3b82f6");
    const pathname = usePathname();
    const router = useRouter();

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({ name: newName.trim(), color: selectedColor });
            setNewName("");
            setIsAdding(false);
        } catch (error) {}
    };

    if (listLoading) {
        return (
            <div className="space-y-2 px-1">
                {[1, 2, 3].map(i => <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />)}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-sm font-medium text-muted-foreground">Portofolio</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <button
                onClick={() => router.push("/")}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === "/"
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Konsolidasi</span>
                </div>
                {aggregateData && (
                    <span className={cn(
                        "text-xs font-medium",
                        aggregateData.totals.dayChangePercent >= 0 ? "text-success" : "text-destructive"
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
                        onClick={() => { setSelectedPortfolioId(p.id); if (pathname !== "/dashboard") router.push("/dashboard"); }}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors group",
                            isSelected
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#3b82f6' }} />
                            <span className="truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {perf && (
                                <span className={cn("text-xs", perf.dayChangePercent >= 0 ? "text-success" : "text-destructive")}>
                                    {perf.dayChangePercent >= 0 ? "+" : ""}{perf.dayChangePercent.toFixed(1)}%
                                </span>
                            )}
                            {portfolios.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); if (confirm(`Hapus "${p.name}"?`)) deletePortfolio(p.id); }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}

            {isAdding && (
                <div className="mt-2 p-3 border rounded-md bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Baru</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsAdding(false)}>
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama" className="h-8 text-sm mb-2" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
                    <div className="flex flex-wrap gap-1 mb-2">
                        {portfolioColors.map(color => (
                            <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-4 h-4 rounded-full border", selectedColor === color ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={handleCreate} disabled={!newName.trim()}>Buat</Button>
                </div>
            )}
        </div>
    );
}
