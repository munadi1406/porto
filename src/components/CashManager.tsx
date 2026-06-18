"use client";

import { useState } from "react";
import { Wallet, Edit3, Check, X } from "lucide-react";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Cash Holdings</CardTitle>
                </div>
                {!isEditing && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsEditing(true); setInputValue(cash.toString()); }}>
                        <Edit3 className="w-4 h-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-2">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Jumlah cash" min="0" step="1000" autoFocus />
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSubmitting} className="flex-1">
                                <Check className="w-4 h-4 mr-1" />{isSubmitting ? "Menyimpan..." : "Simpan"}
                            </Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-1" />Batal
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                        <p className="text-2xl font-semibold">{formatIDR(cash)}</p>
                        <p className="text-sm text-muted-foreground mt-1">Klik edit untuk mengubah</p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
