"use client";

import { useState } from "react";

interface StockFormProps {
    onSubmit: (data: { ticker: string; name: string; lots: number; averagePrice: number }) => void;
    onCancel?: () => void;
    initialData?: { ticker: string; name: string; lots: number; averagePrice: number };
    isEdit?: boolean;
}

export function StockForm({ onSubmit, onCancel, initialData, isEdit = false }: StockFormProps) {
    const [ticker, setTicker] = useState(initialData?.ticker || "");
    const [name, setName] = useState(initialData?.name || "");
    const [lots, setLots] = useState(initialData?.lots?.toString() || "");
    const [price, setPrice] = useState(initialData?.averagePrice?.toString() || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticker || !lots || !price) return;

        // Auto-append .JK if missing and it's 4 letters
        let finalTicker = ticker.toUpperCase();
        if (!finalTicker.endsWith(".JK") && /^[A-Z]{4}$/.test(finalTicker)) {
            finalTicker += ".JK";
        }

        onSubmit({
            ticker: finalTicker,
            name: name || finalTicker, // Fallback name if empty
            lots: Number(lots),
            averagePrice: Number(price),
        });

        if (!isEdit) {
            setTicker("");
            setName("");
            setLots("");
            setPrice("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Saham</label>
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="BBCA.JK"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                    <p className="text-xs text-gray-400 mt-1">Gunakan akhiran .JK (opsional)</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Perusahaan (Opsional)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Bank Central Asia"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Lot</label>
                    <input
                        type="number"
                        value={lots}
                        onChange={(e) => setLots(e.target.value)}
                        placeholder="10"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Rata-Rata</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="8500"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Batal
                    </button>
                )}
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                >
                    {isEdit ? "Simpan Perubahan" : "Tambah Saham"}
                </button>
            </div>
        </form>
    );
}
