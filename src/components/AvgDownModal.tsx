"use client";

import { useState, useMemo } from "react";
import { PortfolioItem } from "@/lib/types";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { X, Plus, Minus, Info, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface BuyLevel {
    id: string;
    price: number;
    lots: number;
}

interface AvgDownModalProps {
    item: PortfolioItem;
    currentPrice: number;
    onClose: () => void;
}

export function AvgDownModal({ item, currentPrice, onClose }: AvgDownModalProps) {
    const [levels, setLevels] = useState<BuyLevel[]>([
        { id: '1', price: currentPrice || item.averagePrice, lots: Math.ceil(item.lots / 2) }
    ]);

    const addLevel = () => {
        const lastLevel = levels[levels.length - 1];
        const newPrice = lastLevel ? Math.round(lastLevel.price * 0.95) : currentPrice; // Suggest 5% lower
        const newLots = lastLevel ? lastLevel.lots : Math.ceil(item.lots / 2);

        setLevels([...levels, {
            id: Math.random().toString(36).substr(2, 9),
            price: newPrice,
            lots: newLots
        }]);
    };

    const removeLevel = (id: string) => {
        if (levels.length > 1) {
            setLevels(levels.filter(l => l.id !== id));
        }
    };

    const updateLevel = (id: string, updates: Partial<BuyLevel>) => {
        setLevels(levels.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const analysis = useMemo(() => {
        const currentShares = item.lots * 100;
        const currentCost = currentShares * item.averagePrice;

        let additionalShares = 0;
        let additionalCost = 0;

        levels.forEach(level => {
            const shares = level.lots * 100;
            additionalShares += shares;
            additionalCost += shares * level.price;
        });

        const totalShares = currentShares + additionalShares;
        const totalCost = currentCost + additionalCost;
        const totalLots = item.lots + (additionalShares / 100);

        const newAverage = totalCost / totalShares;
        const priceReduction = item.averagePrice - newAverage;
        const reductionPercent = (priceReduction / item.averagePrice) * 100;

        const currentGainLossPercent = ((currentPrice - item.averagePrice) / item.averagePrice) * 100;
        const newGainLossPercent = ((currentPrice - newAverage) / newAverage) * 100;

        return {
            newAverage,
            totalShares,
            totalLots,
            totalCost,
            additionalCost,
            reductionPercent,
            currentGainLossPercent,
            newGainLossPercent,
        };
    }, [item, levels, currentPrice]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-3xl w-full max-w-4xl shadow-2xl border border-white/20 dark:border-gray-700 relative overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />

                <div className="flex justify-between items-start mb-4 sm:mb-6 flex-shrink-0">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Multi-Level Average Down</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{item.ticker} — {item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 sm:gap-8 overflow-hidden">
                    {/* Left side: Scrollable Levels */}
                    <div className="lg:col-span-3 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
                        <div className="flex justify-between items-center mb-4 pr-1">
                            <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Rencana Pembelian Bertahap</label>
                            <button
                                onClick={addLevel}
                                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[9px] sm:text-[10px] font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                            >
                                <Plus className="w-3 h-3" />
                                TAMBAH LEVEL
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar flex-1 pb-4">
                            {levels.map((level, index) => (
                                <div key={level.id} className="group relative p-4 sm:p-5 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-orange-500/30 transition-all">
                                    <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 text-white text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center shadow-lg z-10">
                                        {index + 1}
                                    </div>

                                    <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                                        <div className="w-full sm:col-span-5">
                                            <div className="text-[9px] text-gray-400 font-bold uppercase mb-1.5 ml-1">Harga Beli</div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={level.price}
                                                    onChange={(e) => updateLevel(level.id, { price: Number(e.target.value) })}
                                                    className="w-full bg-white dark:bg-gray-800 border-none rounded-xl p-3 font-black text-sm outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                                                    <button onClick={() => updateLevel(level.id, { price: level.price + 1 })} className="p-0.5 hover:text-orange-500"><ChevronUp className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => updateLevel(level.id, { price: Math.max(0, level.price - 1) })} className="p-0.5 hover:text-orange-500"><ChevronDown className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full sm:col-span-5">
                                            <div className="text-[9px] text-gray-400 font-bold uppercase mb-1.5 ml-1">Jumlah Lot</div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateLevel(level.id, { lots: Math.max(1, level.lots - 1) })}
                                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={level.lots}
                                                    onChange={(e) => updateLevel(level.id, { lots: Math.max(1, Number(e.target.value)) })}
                                                    className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl p-3 font-black text-sm text-center outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                                />
                                                <button
                                                    onClick={() => updateLevel(level.id, { lots: level.lots + 1 })}
                                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full sm:col-span-2 flex justify-end">
                                            {levels.length > 1 && (
                                                <button
                                                    onClick={() => removeLevel(level.id)}
                                                    className="w-full sm:w-auto p-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all flex items-center justify-center gap-2 sm:block"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="sm:hidden text-[10px] font-bold uppercase">Hapus Level</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-3 sm:mt-2 sm:pl-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                            EST. MODAL: <span className="text-orange-500 ml-1">{formatIDR(level.lots * 100 * level.price)}</span>
                                        </div>
                                        {index > 0 && levels[index - 1].price > level.price && (
                                            <div className="text-[9px] text-emerald-500 font-black uppercase tracking-tight">
                                                -{(((levels[index - 1].price - level.price) / levels[index - 1].price) * 100).toFixed(1)}% DARI LEVEL SEBELUMNYA
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side: Results Summary */}
                    <div className="lg:col-span-2 flex flex-col space-y-4 overflow-y-auto lg:overflow-visible pr-1 sm:pr-0">
                        <div className="p-5 sm:p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-center mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Rata-rata Lama</div>
                                    <div className="text-base sm:text-lg font-black dark:text-white">{formatIDR(item.averagePrice)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">P/L Saat Ini</div>
                                    <div className="text-base sm:text-lg font-black text-rose-500">{formatPercentage(analysis.currentGainLossPercent)}</div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <div className="text-[9px] sm:text-[10px] text-orange-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                        TARGET RATA-RATA BARU <Info className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white flex items-baseline gap-2 leading-none">
                                        {formatIDR(analysis.newAverage)}
                                    </div>
                                    <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] sm:text-xs font-black rounded-xl">
                                        TURUN {analysis.reductionPercent.toFixed(1)}% DARI SEBELUMNYA
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Aset</div>
                                        <div className="text-base font-black dark:text-white">{analysis.totalLots} Lot</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Target P/L</div>
                                        <div className={cn(
                                            "text-base font-black",
                                            analysis.newGainLossPercent >= 0 ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {analysis.newGainLossPercent > 0 ? "+" : ""}{formatPercentage(analysis.newGainLossPercent)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl sm:rounded-3xl shadow-sm">
                            <div className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase tracking-widest mb-3">Ringkasan Modal</div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-500">Dana Yang Dibutuhkan</span>
                                    <span className="font-black text-gray-900 dark:text-white">{formatIDR(analysis.additionalCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-500">Total Nilai Investasi</span>
                                    <span className="font-black text-gray-900 dark:text-white">{formatIDR(analysis.totalCost)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 hidden lg:block"></div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2 lg:pt-4">
                            <button
                                onClick={onClose}
                                className="order-2 sm:order-1 flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                TUTUP
                            </button>
                            <button
                                onClick={onClose}
                                className="order-1 sm:order-2 flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98]"
                            >
                                SIMPAN RENCANA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
