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
        let finalTicker = ticker.toUpperCase();
        if (!finalTicker.endsWith(".JK") && /^[A-Z]{4}$/.test(finalTicker)) {
            finalTicker += ".JK";
        }
        onSubmit({ ticker: finalTicker, name: name || finalTicker, lots: Number(lots), averagePrice: Number(price) });
        if (!isEdit) { setTicker(""); setName(""); setLots(""); setPrice(""); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--muted-fg)] mb-1">Kode Saham</label>
                    <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="BBCA.JK" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" required />
                    <p className="text-xs text-[var(--muted)] mt-1">Gunakan akhiran .JK (opsional)</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--muted-fg)] mb-1">Nama Perusahaan</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank Central Asia" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--muted-fg)] mb-1">Jumlah Lot</label>
                    <input type="number" value={lots} onChange={(e) => setLots(e.target.value)} placeholder="10" min="1" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--muted-fg)] mb-1">Harga Rata-Rata</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8500" min="1" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" required />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] transition-colors">
                        Batal
                    </button>
                )}
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
                    {isEdit ? "Simpan" : "Tambah Saham"}
                </button>
            </div>
        </form>
    );
}
