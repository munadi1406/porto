"use client";

import { useState, useEffect } from "react";
import { PortfolioItem } from "@/lib/types";

interface TransactionFormProps {
    item: PortfolioItem;
    currentPrice: number;
    onConfirm: (id: string, type: 'buy' | 'sell', lots: number, price: number) => void;
    onCancel: () => void;
}

export function TransactionForm({ item, currentPrice, onConfirm, onCancel }: TransactionFormProps) {
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [lots, setLots] = useState("");
    const [price, setPrice] = useState(currentPrice > 0 ? currentPrice.toString() : item.averagePrice.toString());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lotsNum = Number(lots);
        const priceNum = Number(price);

        if (!lotsNum || lotsNum <= 0 || !priceNum || priceNum < 0) return;

        // Validation for Sell
        if (type === 'sell' && lotsNum > item.lots) {
            alert("Jumlah lot yang dijual melebihi yang dimiliki!");
            return;
        }

        onConfirm(item.id, type, lotsNum, priceNum);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                    type="button"
                    onClick={() => setType('buy')}
                    className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${type === 'buy'
                            ? 'bg-white text-green-700 shadow-sm dark:bg-gray-800 dark:text-green-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Beli Lagi
                </button>
                <button
                    type="button"
                    onClick={() => setType('sell')}
                    className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${type === 'sell'
                            ? 'bg-white text-red-700 shadow-sm dark:bg-gray-800 dark:text-red-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Jual Sebagian
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kode Saham</label>
                    <div className="font-bold text-gray-900 dark:text-white">{item.ticker}</div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lot Dimiliki</label>
                    <div className="font-medium text-gray-900 dark:text-white">{item.lots} Lot</div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {type === 'buy' ? 'Jumlah Lot Beli' : 'Jumlah Lot Jual'}
                </label>
                <input
                    type="number"
                    value={lots}
                    onChange={(e) => setLots(e.target.value)}
                    placeholder="5"
                    min="1"
                    max={type === 'sell' ? item.lots : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                />
                {type === 'sell' && item.lots > 0 && (
                    <p className="text-xs text-right mt-1 text-blue-500 cursor-pointer" onClick={() => setLots(item.lots.toString())}>
                        Jual Semua
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Harga Eksekusi per Lembar
                </label>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Market Price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                />
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-4 focus:ring-opacity-50 ${type === 'buy'
                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300'
                            : 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                        }`}
                >
                    Konfirmasi {type === 'buy' ? 'Beli' : 'Jual'}
                </button>
            </div>
        </form>
    );
}
