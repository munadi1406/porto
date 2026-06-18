"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

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
    const [nameLoading, setNameLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!ticker || ticker.length < 3 || isEdit) return;

        const finalTicker = ticker.includes('.') ? ticker : ticker + '.JK';
        debounceRef.current = setTimeout(async () => {
            setNameLoading(true);
            try {
                const res = await fetch(`/api/name?ticker=${encodeURIComponent(finalTicker)}`);
                const data = await res.json();
                if (data.name && data.name !== finalTicker) setName(data.name);
            } catch { /* ignore */ }
            setNameLoading(false);
        }, 500);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [ticker, isEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticker || !lots || !price) return;
        let finalTicker = ticker.toUpperCase();
        if (!finalTicker.endsWith(".JK") && /^[A-Z]{4}$/.test(finalTicker)) finalTicker += ".JK";
        onSubmit({ ticker: finalTicker, name: name || finalTicker, lots: Number(lots), averagePrice: Number(price) });
        if (!isEdit) { setTicker(""); setName(""); setLots(""); setPrice(""); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="ticker">Kode Saham</Label>
                    <Input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="BBCA.JK" required />
                    <p className="text-xs text-muted-foreground">Gunakan akhiran .JK (opsional)</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Perusahaan</Label>
                    <div className="relative">
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank Central Asia" />
                        {nameLoading && (
                            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lots">Jumlah Lot</Label>
                    <Input id="lots" type="number" value={lots} onChange={(e) => setLots(e.target.value)} placeholder="10" min="1" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price">Harga Rata-Rata</Label>
                    <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8500" min="1" required />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>}
                <Button type="submit">{isEdit ? "Simpan" : "Tambah Saham"}</Button>
            </div>
        </form>
    );
}
