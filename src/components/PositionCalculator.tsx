"use client";

import { useState, useMemo } from "react";
import { Calculator, Plus, Trash2, AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp, Settings2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    calculatePosition,
    formatRupiah,
    defaultPortions,
    type PortionInput,
    type PositionResult,
} from "@/lib/positionCalc";
import { AiEntryPanel } from "@/components/AiEntryPanel";

type Scheme = "manual" | "avg_down" | "avg_up";

interface PositionCalculatorProps {
    ticker: string;
    lastClose?: number;
    technicalData?: any;
    strategyLabel?: string;
    showCalculator?: boolean;
    ranking?: any;
}

export function PositionCalculator({ ticker, lastClose, technicalData, strategyLabel, showCalculator = true, ranking }: PositionCalculatorProps) {
    const [modal, setModal] = useState(10_000_000);
    const [entryPrice, setEntryPrice] = useState(0);
    const [stopLossPct, setStopLossPct] = useState(5);
    const [riskPerTradePct, setRiskPerTradePct] = useState(2);
    const [portionCount, setPortionCount] = useState(3);
    const [portions, setPortions] = useState<PortionInput[]>(() => defaultPortions(3));
    const [scheme, setScheme] = useState<Scheme>("manual");
    const [stepPct, setStepPct] = useState(3);

    const result: PositionResult = useMemo(() => {
        return calculatePosition({
            modal,
            stopLossPct,
            riskPerTradePct,
            portions: portions.map(p => ({
                ...p,
                entryPrice: p.entryPrice > 0 ? p.entryPrice : entryPrice,
            })),
        });
    }, [modal, stopLossPct, riskPerTradePct, portions, entryPrice]);

    const handlePortionCountChange = (n: number) => {
        const clamped = Math.max(1, Math.min(6, n));
        setPortionCount(clamped);
        setPortions(prev => {
            if (clamped === prev.length) return prev;
            if (clamped > prev.length) {
                const added = defaultPortions(clamped - prev.length);
                return [...prev, ...added];
            }
            return prev.slice(0, clamped);
        });
    };

    const applyScheme = (newScheme: Scheme) => {
        setScheme(newScheme);
        if (newScheme === "manual") return;

        const base = entryPrice > 0 ? entryPrice : (lastClose ?? 0);
        if (base <= 0) return;

        setPortions(prev => prev.map((p, i) => {
            const multiplier = newScheme === "avg_down"
                ? Math.pow(1 - stepPct / 100, i)
                : Math.pow(1 + stepPct / 100, i);
            return { ...p, entryPrice: Math.round(base * multiplier) };
        }));
    };

    const applyStepChange = (newStep: number) => {
        setStepPct(newStep);
        if (scheme === "manual") return;

        const base = entryPrice > 0 ? entryPrice : (lastClose ?? 0);
        if (base <= 0) return;

        setPortions(prev => prev.map((p, i) => {
            const multiplier = scheme === "avg_down"
                ? Math.pow(1 - newStep / 100, i)
                : Math.pow(1 + newStep / 100, i);
            return { ...p, entryPrice: Math.round(base * multiplier) };
        }));
    };

    const updatePortionAllocation = (idx: number, val: number) => {
        setPortions(prev => prev.map((p, i) => i === idx ? { ...p, allocationPct: val } : p));
    };

    const updatePortionPrice = (idx: number, val: number) => {
        setPortions(prev => prev.map((p, i) => i === idx ? { ...p, entryPrice: val } : p));
        if (scheme !== "manual") setScheme("manual");
    };

    const removePortion = (idx: number) => {
        if (portions.length <= 1) return;
        setPortions(prev => prev.filter((_, i) => i !== idx));
        setPortionCount(c => Math.max(1, c - 1));
    };

    const addPortion = () => {
        if (portions.length >= 6) return;
        setPortions(prev => [...prev, { allocationPct: 0, entryPrice: 0 }]);
        setPortionCount(c => Math.min(6, c + 1));
    };

    const useLastClose = () => {
        if (lastClose && lastClose > 0) {
            setEntryPrice(lastClose);
            if (scheme !== "manual") {
                applyStepChange(stepPct);
            }
        }
    };

    const totalAlloc = portions.reduce((s, p) => s + p.allocationPct, 0);
    const allocValid = Math.abs(totalAlloc - 100) <= 0.01;

    return (
        <div className="card border-primary/30">
            <div className="flex items-center gap-2 mb-4">
                {showCalculator ? <Calculator className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-primary" />}
                <h3 className="text-sm font-bold">{showCalculator ? "Kalkulator Posisi & Porsi" : "Entry & Alokasi AI"}</h3>
                <span className="ml-auto text-[9px] text-muted-foreground">{ticker}</span>
            </div>

            <AiEntryPanel
                ticker={ticker}
                technicalData={technicalData}
                strategyLabel={strategyLabel || ""}
                ranking={ranking}
                onApplyEntry={(price) => {
                    setEntryPrice(price);
                    if (scheme !== "manual") {
                        applyStepChange(stepPct);
                    }
                }}
                onApplyAllocation={(portions, schemeType) => {
                    const newPortions = portions.map((p, i) => ({
                        allocationPct: p.allocationPct,
                        entryPrice: p.entryPrice,
                    }));
                    setPortions(newPortions);
                    setPortionCount(newPortions.length);
                    if (schemeType === "avg_down") {
                        setScheme("avg_down");
                    } else if (schemeType === "avg_up") {
                        setScheme("avg_up");
                    } else {
                        setScheme("manual");
                    }
                }}
            />

            {showCalculator && (<>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Total Modal</label>
                    <input
                        type="number"
                        value={modal}
                        onChange={e => setModal(Math.max(0, Number(e.target.value)))}
                        className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Harga Entry Dasar</label>
                    <div className="relative mt-1">
                        <input
                            type="number"
                            value={entryPrice || ""}
                            onChange={e => {
                                setEntryPrice(Math.max(0, Number(e.target.value)));
                                if (scheme !== "manual") applyStepChange(stepPct);
                            }}
                            placeholder="Isi manual"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        {lastClose && lastClose > 0 && (
                            <button
                                onClick={useLastClose}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-primary hover:underline"
                            >
                                Pakai {lastClose.toLocaleString("id-ID")}
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Stop Loss %</label>
                    <input
                        type="number"
                        step="0.5"
                        value={stopLossPct}
                        onChange={e => setStopLossPct(Math.max(0.1, Math.min(50, Number(e.target.value))))}
                        className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Risk/Trade %</label>
                    <input
                        type="number"
                        step="0.5"
                        value={riskPerTradePct}
                        onChange={e => setRiskPerTradePct(Math.max(0.1, Math.min(20, Number(e.target.value))))}
                        className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            </div>

            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Skema Entry</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => applyScheme("manual")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                            scheme === "manual"
                                ? "bg-primary/10 border-primary/50 text-primary"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Manual
                    </button>
                    <button
                        onClick={() => applyScheme("avg_down")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                            scheme === "avg_down"
                                ? "bg-success/10 border-success/50 text-success"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Average Down
                    </button>
                    <button
                        onClick={() => applyScheme("avg_up")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                            scheme === "avg_up"
                                ? "bg-warning/10 border-warning/50 text-warning"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Average Up
                    </button>

                    {scheme !== "manual" && (
                        <div className="flex items-center gap-2 ml-2">
                            <span className="text-[10px] text-muted-foreground">Step:</span>
                            <input
                                type="number"
                                step="0.5"
                                value={stepPct}
                                onChange={e => applyStepChange(Math.max(0.5, Math.min(20, Number(e.target.value))))}
                                className="w-16 bg-background border border-border rounded px-2 py-1 text-xs font-bold text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                            <span className="text-[10px] text-muted-foreground">% per porsi</span>
                        </div>
                    )}
                </div>
                {scheme === "avg_down" && (
                    <p className="mt-2 text-[10px] text-success/80">
                        📉 Harga entry turun {stepPct}% per porsi — beli lebih banyak saat harga lebih murah. Cocok untuk cut-loss scaling.
                    </p>
                )}
                {scheme === "avg_up" && (
                    <p className="mt-2 text-[10px] text-warning/80">
                        📈 Harga entry naik {stepPct}% per porsi — tambah posisi saat harga breakout. Cocok untuk pyramiding trend.
                    </p>
                )}
                {scheme === "manual" && (
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                        ✏️ Harga entry diatur manual per porsi. Ubah skema untuk auto-generate harga.
                    </p>
                )}
            </div>

            <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Jumlah Porsi</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handlePortionCountChange(portionCount - 1)}
                        disabled={portionCount <= 1}
                        className="w-6 h-6 rounded border border-border text-xs font-bold hover:bg-muted disabled:opacity-30"
                    >−</button>
                    <span className="w-6 text-center text-sm font-bold">{portionCount}</span>
                    <button
                        onClick={() => handlePortionCountChange(portionCount + 1)}
                        disabled={portionCount >= 6}
                        className="w-6 h-6 rounded border border-border text-xs font-bold hover:bg-muted disabled:opacity-30"
                    >+</button>
                </div>
                <button
                    onClick={addPortion}
                    disabled={portions.length >= 6}
                    className="ml-2 text-[10px] text-primary hover:underline disabled:opacity-30"
                >
                    + Tambah
                </button>
                <span className={cn(
                    "ml-auto text-[10px] font-bold",
                    allocValid ? "text-success" : "text-warning"
                )}>
                    Total Alokasi: {totalAlloc.toFixed(1)}% {allocValid ? "✓" : "≠ 100%"}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-2 w-8">#</th>
                            <th className="py-2 pr-3">% Alokasi</th>
                            <th className="py-2 pr-3">Harga Entry</th>
                            <th className="py-2 pr-3 text-right">Stop Loss</th>
                            <th className="py-2 pr-3 text-right">Lot</th>
                            <th className="py-2 pr-3 text-right">Saham</th>
                            <th className="py-2 pr-3 text-right">Investasi</th>
                            <th className="py-2 pr-3 text-right">Risiko</th>
                            <th className="py-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {portions.map((p, i) => {
                            const effectivePrice = p.entryPrice > 0 ? p.entryPrice : entryPrice;
                            const slPrice = effectivePrice * (1 - stopLossPct / 100);
                            const r = result.portions[i];
                            return (
                                <tr key={i} className="border-b border-border/40 last:border-b-0">
                                    <td className="py-2 pr-2 font-bold text-muted-foreground">{i + 1}</td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="number"
                                            value={p.allocationPct}
                                            onChange={e => updatePortionAllocation(i, Math.max(0, Math.min(100, Number(e.target.value))))}
                                            className="w-16 bg-background border border-border rounded px-2 py-1 text-right font-bold focus:outline-none focus:ring-1 focus:ring-primary/40"
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={p.entryPrice || ""}
                                                onChange={e => updatePortionPrice(i, Math.max(0, Number(e.target.value)))}
                                                placeholder={entryPrice > 0 ? entryPrice.toLocaleString("id-ID") : "Dasar"}
                                                disabled={scheme !== "manual"}
                                                className={cn(
                                                    "w-24 bg-background border border-border rounded px-2 py-1 text-right font-bold focus:outline-none focus:ring-1 focus:ring-primary/40",
                                                    scheme !== "manual" && "opacity-70 cursor-not-allowed bg-muted/50"
                                                )}
                                            />
                                            {scheme !== "manual" && p.entryPrice > 0 && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">
                                                    {i === 0 ? "base" : scheme === "avg_down" ? `−${(stepPct * i).toFixed(1)}%` : `+${(stepPct * i).toFixed(1)}%`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3 text-right text-destructive">
                                        {effectivePrice > 0 ? Math.round(slPrice).toLocaleString("id-ID") : "-"}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-bold">
                                        {r?.lots ?? 0}
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        {r?.shares ? r.shares.toLocaleString("id-ID") : "-"}
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        {r?.investment ? r.investment.toLocaleString("id-ID") : "-"}
                                    </td>
                                    <td className="py-2 pr-3 text-right text-destructive">
                                        {r?.riskAmount ? r.riskAmount.toLocaleString("id-ID") : "-"}
                                    </td>
                                    <td className="py-2">
                                        <button
                                            onClick={() => removePortion(i)}
                                            disabled={portions.length <= 1}
                                            className="text-muted-foreground hover:text-destructive disabled:opacity-20"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Lot</p>
                    <p className="text-sm font-black tabular-nums">{result.totalLots}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Investasi</p>
                    <p className="text-sm font-black tabular-nums">{result.totalInvestment > 0 ? result.totalInvestment.toLocaleString("id-ID") : "-"}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Risiko Max</p>
                    <p className={cn("text-sm font-black tabular-nums", result.totalRiskPct > 5 ? "text-destructive" : "text-warning")}>
                        {result.totalRiskAmount > 0 ? `${result.totalRiskPct.toFixed(1)}%` : "-"}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Avg Entry</p>
                    <p className="text-sm font-black tabular-nums">{result.avgEntryPrice > 0 ? Math.round(result.avgEntryPrice).toLocaleString("id-ID") : "-"}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Sisa Cash</p>
                    <p className="text-sm font-black tabular-nums text-success">
                        {modal > 0 ? Math.max(0, modal - result.totalInvestment).toLocaleString("id-ID") : "-"}
                    </p>
                </div>
            </div>

            {result.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
                    {result.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-warning">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-3 text-[9px] text-muted-foreground/70 leading-relaxed">
                <Info className="w-3 h-3 inline mr-0.5" />
                1 lot = 100 saham (regular market IDX). Lot dibulatkan ke bawah. Stop Loss sama untuk semua porsi.
                Average Down: harga turun per porsi. Average Up: harga naik per porsi (pyramiding).
                Risiko = selisih entry × total saham. Data simulasi, bukan rekomendasi investasi.
            </p>
            </>)}
        </div>
    );
}
