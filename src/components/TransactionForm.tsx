"use client";

import { useState } from "react";
import { PortfolioItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TransactionFormProps {
    item: PortfolioItem;
    currentPrice: number;
    onConfirm: (id: string, type: 'buy' | 'sell', lots: number, price: number, note?: string) => void;
    onCancel: () => void;
}

export function TransactionForm({ item, currentPrice, onConfirm, onCancel }: TransactionFormProps) {
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [lots, setLots] = useState("");
    const [price, setPrice] = useState(currentPrice > 0 ? currentPrice.toString() : item.averagePrice.toString());
    const [note, setNote] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lotsNum = Number(lots);
        const priceNum = Number(price);
        if (!lotsNum || lotsNum <= 0 || !priceNum || priceNum < 0) return;
        if (type === 'sell' && lotsNum > item.lots) { alert("Jual melebihi kepemilikan!"); return; }
        onConfirm(item.id, type, lotsNum, priceNum, note.trim() || undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
                <Button type="button" variant={type === 'buy' ? "default" : "outline"} className="flex-1" onClick={() => setType('buy')}>Beli</Button>
                <Button type="button" variant={type === 'sell' ? "destructive" : "outline"} className="flex-1" onClick={() => setType('sell')}>Jual</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label>Saham</Label><p className="font-medium">{item.ticker}</p></div>
                <div><Label>Lot Dimiliki</Label><p className="font-medium">{item.lots} Lot</p></div>
            </div>
            <div className="space-y-2">
                <Label>Jumlah Lot</Label>
                <Input type="number" value={lots} onChange={(e) => setLots(e.target.value)} placeholder="5" min="1" max={type === 'sell' ? item.lots : undefined} required />
                {type === 'sell' && item.lots > 0 && (
                    <p className="text-xs text-right text-primary cursor-pointer" onClick={() => setLots(item.lots.toString())}>Jual Semua</p>
                )}
            </div>
            <div className="space-y-2">
                <Label>Harga per Lembar</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="note">Catatan Trading (opsional)</Label>
                <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Alasan transaksi, jurnal trading..."
                    rows={2}
                    maxLength={200}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-[10px] text-muted-foreground text-right">{note.length}/200</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant={type === 'buy' ? "default" : "destructive"}>Konfirmasi {type === 'buy' ? 'Beli' : 'Jual'}</Button>
            </div>
        </form>
    );
}
