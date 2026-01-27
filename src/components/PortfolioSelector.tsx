"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { Plus, Briefcase, Trash2, Check, Settings2, X, Palette } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PortfolioSelector() {
    const { portfolios, currentPortfolio, setSelectedPortfolioId, createPortfolio, deletePortfolio, isLoading } = usePortfolios();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#3b82f6");

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

    if (isLoading) return <div className="h-10 w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />;

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({
                name: newName.trim(),
                color: selectedColor
            });
            setNewName("");
            setIsAdding(false);
        } catch (error) {
            // Error handled by hook toast
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Hapus portofolio "${name}"? Seluruh data saham dan riwayat di dalamnya akan hilang permanen.`)) {
            try {
                await deletePortfolio(id);
            } catch (error) {
                // Error handled by hook toast
            }
        }
    };

    return (
        <div className="relative">
            {/* Active Selection Button */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }}
                    />
                    <span className="font-bold text-[10px] text-gray-900 dark:text-gray-100 truncate uppercase tracking-tighter">
                        {currentPortfolio?.name || "Pilih"}
                    </span>
                </div>
                <Settings2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 space-y-1">
                            {portfolios.map((p) => (
                                <div key={p.id} className="group flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setSelectedPortfolioId(p.id);
                                            setIsMenuOpen(false);
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                            currentPortfolio?.id === p.id
                                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                        )}
                                    >
                                        <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: p.color || '#3b82f6' }}
                                        />
                                        <span className="text-sm font-semibold truncate">{p.name}</span>
                                        {currentPortfolio?.id === p.id && <Check className="w-4 h-4 ml-auto" />}
                                    </button>

                                    {portfolios.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(p.id, p.name);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add New Portfolio Action */}
                        <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
                            {isAdding ? (
                                <div className="space-y-3 p-1">
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Nama Portofolio..."
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    />

                                    <div className="flex flex-wrap gap-1.5 px-0.5">
                                        {portfolioColors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border-2 transition-transform",
                                                    selectedColor === color ? "border-gray-900 dark:border-white scale-110" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCreate} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors">
                                            Buat Portofolio
                                        </button>
                                        <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                >
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
