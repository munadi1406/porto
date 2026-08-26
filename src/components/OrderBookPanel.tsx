"use client";

import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { cn, formatCompactIDR } from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import { useTradingDaily } from "@/hooks/useIdxExtended";

type Flash = "up" | "down" | null;

const SESSION_LABEL: Record<string, string> = {
    trading: "Live",
    pre_open: "Pre-Opening",
    post_close: "Post Trading",
    closed: "Pasar Tutup",
};

function fmtPrice(v?: number | null): string {
    return v && v > 0 ? v.toLocaleString("id-ID") : "-";
}

function fmtLots(v?: number | null): string {
    return v && v > 0 ? `${v.toLocaleString("id-ID")} lot` : "-";
}

function Side({
    kind,
    price,
    lots,
    maxLots,
    flash,
}: {
    kind: "bid" | "offer";
    price?: number | null;
    lots?: number | null;
    maxLots: number;
    flash: Flash;
}) {
    const isBid = kind === "bid";
    const hasQueue = !!price && price > 0;
    const barPct = hasQueue && lots && maxLots > 0 ? Math.max(4, Math.round((lots / maxLots) * 100)) : 0;
    const estValue = hasQueue && lots ? price! * lots * 100 : 0;

    return (
        <div className={cn(
            "flex-1 p-3 rounded-xl border overflow-hidden relative",
            isBid ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
        )}>
            <p className={cn("text-[10px] font-bold uppercase mb-1.5", isBid ? "text-success" : "text-destructive")}>
                {isBid ? "Bid (Beli)" : "Offer (Jual)"}
            </p>
            <span
                key={`${kind}-${price}-${flash ?? ""}`}
                className={cn(
                    "block text-xl font-black tabular-nums leading-none",
                    isBid ? "text-success" : "text-destructive",
                    flash === "up" && "flash-up rounded px-1 -mx-1",
                    flash === "down" && "flash-down rounded px-1 -mx-1"
                )}
            >
                {hasQueue ? fmtPrice(price) : "Kosong"}
            </span>
            <div className="mt-2 h-1.5 bg-muted/70 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", isBid ? "bg-success/60" : "bg-destructive/60")}
                    style={{ width: `${barPct}%` }}
                />
            </div>
            <div className="flex justify-between items-baseline mt-1.5 gap-2">
                <span className="text-xs font-bold tabular-nums text-foreground">{hasQueue ? fmtLots(lots) : "-"}</span>
                {estValue > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">≈ {formatCompactIDR(estValue)}</span>
                )}
            </div>
        </div>
    );
}

export default function OrderBookPanel({ code }: { code: string }) {
    const { data, isLoading } = useTradingDaily(code);
    const [flash, setFlash] = useState<Flash>(null);
    const [mounted, setMounted] = useState(false);
    const prevBook = useRef<{ bid?: number | null; offer?: number | null }>({});

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const ob = data?.orderBook;
        if (!ob?.bid || !ob?.offer) return;
        const prev = prevBook.current;
        if (prev.bid != null || prev.offer != null) {
            if (ob.bid > (prev.bid ?? 0) || ob.offer > (prev.offer ?? 0)) setFlash("up");
            else if (ob.bid < (prev.bid ?? 0) || ob.offer < (prev.offer ?? 0)) setFlash("down");
        }
        prevBook.current = { bid: ob.bid, offer: ob.offer };
    }, [data]);

    useEffect(() => {
        if (!flash) return;
        const t = setTimeout(() => setFlash(null), 850);
        return () => clearTimeout(t);
    }, [flash]);

    const ob = data?.orderBook;
    const bid = ob?.bid ?? 0;
    const offer = ob?.offer ?? 0;
    const bidVol = ob?.bidVolume ?? 0;
    const offerVol = ob?.offerVolume ?? 0;
    const maxLots = Math.max(bidVol, offerVol);

    const hasBoth = bid > 0 && offer > 0;
    const mid = hasBoth ? (bid + offer) / 2 : 0;
    const spread = hasBoth ? offer - bid : 0;
    const spreadPct = hasBoth && mid > 0 ? (spread / mid) * 100 : 0;

    const totalVol = bidVol + offerVol;
    const buyPressure = totalVol > 0 ? (bidVol / totalVol) * 100 : 50;

    const status = getMarketStatus();
    const updated = data?.updatedAt ? new Date(data.updatedAt) : null;
    const updatedAt = updated && !isNaN(updated.getTime()) ? updated.toLocaleTimeString("id-ID") : (data?.updatedAt ?? null);

    // Session label & timestamp hanya dirender setelah mount — hindari
    // hydration mismatch karena jam server ≠ jam browser.
    const sessionLabel = mounted ? (SESSION_LABEL[status.session] ?? "—") : "…";
    const shownUpdatedAt = mounted ? updatedAt : null;

    return (
        <div className="card" data-testid="order-book-panel">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Order Book
                </h3>
                <span className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                    status.isOpen ? "text-success" : "text-muted-foreground"
                )}>
                    <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        mounted && status.isOpen ? "bg-success animate-pulse" : "bg-muted-foreground/50"
                    )} />
                    {sessionLabel}
                </span>
            </div>

            {isLoading ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Memuat order book…</div>
            ) : !data ? (
                <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">
                    Data order book tidak tersedia untuk {code}
                </div>
            ) : (
                <>
                    <div className="flex gap-3">
                        <Side kind="bid" price={bid} lots={bidVol} maxLots={maxLots} flash={flash} />
                        <Side kind="offer" price={offer} lots={offerVol} maxLots={maxLots} flash={flash} />
                    </div>

                    {/* Spread */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        <div className="py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Spread</p>
                            <p className="text-sm font-bold tabular-nums">{hasBoth ? spread.toLocaleString("id-ID") : "-"}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">{hasBoth ? `(${spreadPct.toFixed(2)}%)` : ""}</p>
                        </div>
                        <div className="py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Harga Tengah</p>
                            <p className="text-sm font-bold tabular-nums">{mid ? mid.toLocaleString("id-ID") : "-"}</p>
                            <p className="text-[10px] text-muted-foreground">mid price</p>
                        </div>
                    </div>

                    {/* Imbalance meter */}
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className="text-success">Tekanan Beli {totalVol > 0 ? `${buyPressure.toFixed(0)}%` : ""}</span>
                            <span className="text-destructive">{totalVol > 0 ? `${(100 - buyPressure).toFixed(0)}%` : ""} Tekanan Jual</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-success/70 transition-all duration-500"
                                style={{ width: `${buyPressure}%` }}
                            />
                            <div
                                className="absolute inset-y-0 right-0 bg-destructive/70 transition-all duration-500"
                                style={{ width: `${100 - buyPressure}%` }}
                            />
                        </div>
                    </div>

                    {/* Footer stats */}
                    {data.market && (
                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Individual Index</span>
                                <span className="font-bold tabular-nums">{data.market.individualIndex?.toFixed(2) ?? "-"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Foreign Shares</span>
                                <span className="font-bold tabular-nums">{data.market.foreignShares ? formatCompactIDR(data.market.foreignShares).replace("Rp", "") : "-"}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-2 flex justify-between text-[9px] text-muted-foreground/70">
                        <span>Sumber: IDX · top of book</span>
                        <span>{shownUpdatedAt ? `Update ${shownUpdatedAt}` : ""}</span>
                    </div>
                </>
            )}
        </div>
    );
}
