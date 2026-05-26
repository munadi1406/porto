"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { Plus, Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PortfolioSelector() {
    const { portfolios, currentPortfolio, setSelectedPortfolioId, createPortfolio, deletePortfolio, isLoading } = usePortfolios();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#3b82f6");

    const portfolioColors = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
    ];

    if (isLoading) return <div className="h-8 w-full animate-pulse bg-[var(--border)] rounded-lg" />;

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({ name: newName.trim(), color: selectedColor });
            setNewName("");
            setIsAdding(false);
        } catch (error) {}
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Hapus portofolio "${name}"?`)) {
            try { await deletePortfolio(id); } catch (error) {}
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm transition-colors hover:bg-[var(--surface-hover)]"
            >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }} />
                    <span className="truncate text-[var(--fg)]">{currentPortfolio?.name || "Pilih"}</span>
                </div>
            </button>

            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] overflow-hidden">
                        <div className="p-1 space-y-0.5">
                            {portfolios.map((p) => (
                                <div key={p.id} className="group flex items-center gap-1">
                                    <button
                                        onClick={() => { setSelectedPortfolioId(p.id); setIsMenuOpen(false); }}
                                        className={cn(
                                            "flex-1 flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                                            currentPortfolio?.id === p.id
                                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                                : "text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                                        )}
                                    >
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#3b82f6' }} />
                                        <span className="truncate">{p.name}</span>
                                        {currentPortfolio?.id === p.id && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                                    </button>
                                    {portfolios.length > 1 && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--muted)] hover:text-[var(--danger)] transition-all">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-[var(--border)]">
                            {isAdding ? (
                                <div className="space-y-2">
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Nama portofolio..."
                                        className="w-full px-2 py-1.5 text-sm bg-[var(--bg)] border border-[var(--border)] rounded outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {portfolioColors.map(color => (
                                            <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-4 h-4 rounded-full border transition-transform", selectedColor === color ? "border-[var(--fg)] scale-110" : "border-transparent")} style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCreate} className="flex-1 py-1 bg-[var(--accent)] text-white rounded-md text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors">
                                            Buat
                                        </button>
                                        <button onClick={() => setIsAdding(false)} className="p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] rounded-md transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAdding(true)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)] transition-colors">
                                    <Plus className="w-4 h-4" />
                                    <span>Portofolio Baru</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
