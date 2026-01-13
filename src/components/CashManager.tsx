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
    const [inputValue, setInputValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(inputValue);
        if (!isNaN(amount) && amount >= 0) {
            onUpdateCash(amount);
            setIsEditing(false);
            setInputValue("");
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setInputValue(cash.toString());
    };

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 p-6 rounded-2xl shadow-lg">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                                Cash Holdings
                            </h3>
                            <p className="text-xs text-white/70 mt-0.5">Uang tunai tersedia</p>
                        </div>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={handleEdit}
                            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 group"
                            title="Edit cash"
                        >
                            <Edit3 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="number"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Masukkan jumlah cash"
                            min="0"
                            step="1000"
                            className="w-full px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-white/50 rounded-xl focus:ring-2 focus:ring-white focus:border-white text-gray-900 dark:text-white placeholder:text-gray-400 font-semibold text-lg"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-white hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                            >
                                <Check className="w-4 h-4" />
                                Simpan
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Batal
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-1">
                            {formatIDR(cash)}
                        </div>
                        <p className="text-xs text-white/70">
                            Klik icon edit untuk mengubah
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
