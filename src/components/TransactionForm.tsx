"use client";

import { useState } from "react";
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
        if (type === 'sell' && lotsNum > item.lots) { alert("Jual melebihi kepemilikan!"); return; }
        onConfirm(item.id, type, lotsNum, priceNum);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 p-1 bg-[var(--surface-hover)] rounded-lg">
                <button type="button" onClick={() => setType('buy')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'buy' ? 'bg-[var(--surface)] text-[var(--success)] shadow-sm border border-[var(--border)]' : 'text-[var(--muted)]'}`}>
                    Beli
                </button>
                <button type="button" onClick={() => setType('sell')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'sell' ? 'bg-[var(--surface)] text-[var(--danger)] shadow-sm border border-[var(--border)]' : 'text-[var(--muted)]'}`}>
                    Jual
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><label className="block text-xs text-[var(--muted)] mb-1">Saham</label><span className="font-medium text-[var(--fg)]">{item.ticker}</span></div>
                <div><label className="block text-xs text-[var(--muted)] mb-1">Lot Dimiliki</label><span className="font-medium text-[var(--fg)]">{item.lots} Lot</span></div>
            </div>

            <div>
                <label className="block text-sm text-[var(--muted-fg)] mb-1">Jumlah Lot</label>
                <input type="number" value={lots} onChange={(e) => setLots(e.target.value)} placeholder="5" min="1" max={type === 'sell' ? item.lots : undefined} className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" required />
                {type === 'sell' && item.lots > 0 && (
                    <p className="text-xs text-right mt-1 text-[var(--accent)] cursor-pointer" onClick={() => setLots(item.lots.toString())}>Jual Semua</p>
                )}
            </div>

            <div>
                <label className="block text-sm text-[var(--muted-fg)] mb-1">Harga per Lembar</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" required />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] transition-colors">Batal</button>
                <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${type === 'buy' ? 'bg-[var(--success)] hover:opacity-90' : 'bg-[var(--danger)] hover:opacity-90'}`}>
                    Konfirmasi {type === 'buy' ? 'Beli' : 'Jual'}
                </button>
            </div>
        </form>
    );
}
