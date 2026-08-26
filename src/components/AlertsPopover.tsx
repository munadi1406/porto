"use client";

import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { cn, formatIDR } from "@/lib/utils";

// Popover alert harga untuk satu ticker — pasang di header halaman analisis
export function AlertsPopover({ ticker, currentPrice }: { ticker: string; currentPrice: number }) {
    const { alerts, add, remove } = useAlerts();
    const [open, setOpen] = useState(false);
    const code = ticker.replace(".JK", "").toUpperCase();
    const mine = alerts.filter(a => a.ticker === code).slice(-6).reverse();

    const quickAdd = (dir: "above" | "below") => {
        if (currentPrice <= 0) return;
        add(code, dir, currentPrice);
        // Minta izin notifikasi saat alert pertama dibuat
        try {
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission();
            }
        } catch {}
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "relative p-1.5 rounded-lg border bg-card transition-colors cursor-pointer",
                    open ? "border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
                title="Alert harga"
            >
                <Bell className="w-3.5 h-3.5" />
                {mine.filter(a => !a.triggeredAt).length > 0 && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 animate-pulse" />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-xl shadow-lg p-3">
                        <p className="card-title mb-2">Alert Harga · {code}</p>

                        {currentPrice > 0 && (
                            <div className="flex gap-1.5 mb-3">
                                <button
                                    onClick={() => quickAdd("above")}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border border-success/40 text-success bg-success/5 hover:bg-success/10 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3 h-3" /> Di atas {formatIDR(currentPrice)}
                                </button>
                                <button
                                    onClick={() => quickAdd("below")}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3 h-3" /> Di bawah {formatIDR(currentPrice)}
                                </button>
                            </div>
                        )}

                        <div className="space-y-1 max-h-56 overflow-y-auto">
                            {mine.length === 0 && (
                                <p className="text-[11px] text-muted-foreground text-center py-3">Belum ada alert. Buat di harga sekarang.</p>
                            )}
                            {mine.map(a => (
                                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                        a.dir === "above" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                    )}>
                                        {a.dir === "above" ? "≥" : "≤"}
                                    </span>
                                    <span className="text-xs font-bold tabular-nums flex-1">{formatIDR(a.price)}</span>
                                    {a.triggeredAt ? (
                                        <span className="text-[9px] font-bold text-muted-foreground">terpicu ✓</span>
                                    ) : (
                                        <span className="text-[9px] text-muted-foreground">aktif</span>
                                    )}
                                    <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive cursor-pointer" title="Hapus">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <p className="text-[9px] text-muted-foreground/60 mt-2 leading-relaxed">
                            Notifikasi browser aktif saat dashboard terbuka dan harga menembus level.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
