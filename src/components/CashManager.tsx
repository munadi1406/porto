"use client";

import { useState } from "react";
import { Wallet, Edit3, Check, X } from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface CashManagerProps {
    cash: number;
    onUpdateCash: (amount: number) => void;
}

export function CashManager({ cash, onUpdateCash }: CashManagerProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(inputValue);
        if (!isNaN(amount) && amount >= 0) {
            setIsSubmitting(true);
            try {
                await onUpdateCash(amount);
                setIsEditing(false);
                setInputValue("");
            } catch (error) {
                console.error("Failed to update cash:", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setInputValue(cash.toString());
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[var(--muted-fg)]" />
                    <div>
                        <h3 className="font-medium text-sm text-[var(--fg)]">Cash Holdings</h3>
                        <p className="text-xs text-[var(--muted)]">Uang tunai tersedia</p>
                    </div>
                </div>
                {!isEditing && (
                    <button onClick={handleEdit} className="p-1.5 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] transition-colors">
                        <Edit3 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Jumlah cash"
                        min="0"
                        step="1000"
                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
                            <Check className="w-4 h-4 inline mr-1" />
                            {isSubmitting ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--muted-fg)] hover:bg-[var(--border)] transition-colors">
                            <X className="w-4 h-4 inline mr-1" />
                            Batal
                        </button>
                    </div>
                </form>
            ) : (
                <div>
                    <p className="text-2xl font-semibold text-[var(--fg)]">{formatIDR(cash)}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Klik edit untuk mengubah</p>
                </div>
            )}
        </div>
    );
}
