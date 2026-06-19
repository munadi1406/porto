"use client";

import { usePortfolios } from "@/hooks/usePortfolios";
import { Plus, Check, Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const portfolioColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export function PortfolioSelector() {
    const { portfolios, currentPortfolio, setSelectedPortfolioId, createPortfolio, deletePortfolio, isLoading } = usePortfolios();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [selectedColor, setSelectedColor] = useState("#3b82f6");

    if (isLoading) return <div className="h-9 w-full animate-pulse bg-muted rounded-md" />;

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createPortfolio({ name: newName.trim(), color: selectedColor });
            setNewName("");
            setIsAdding(false);
        } catch (error) {}
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentPortfolio?.color || '#3b82f6' }} />
                    <span className="truncate text-xs font-normal">{currentPortfolio?.name || "Pilih"}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="bottom" sideOffset={6} className="w-56 z-[200]">
                {portfolios.map((p) => (
                    <DropdownMenuItem key={p.id} className="flex items-center gap-2" onSelect={() => setSelectedPortfolioId(p.id)}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#3b82f6' }} />
                        <span className="flex-1 truncate">{p.name}</span>
                        {currentPortfolio?.id === p.id && <Check className="w-3.5 h-3.5" />}
                        {portfolios.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => { e.stopPropagation(); deletePortfolio(p.id); }}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {isAdding ? (
                    <div className="p-2 space-y-2">
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama portofolio" className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
                        <div className="flex flex-wrap gap-1">
                            {portfolioColors.map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-4 h-4 rounded-full border", selectedColor === color ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreate}>Buat</Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setIsAdding(false)}>Batal</Button>
                        </div>
                    </div>
                ) : (
                    <DropdownMenuItem onSelect={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Portofolio Baru
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
