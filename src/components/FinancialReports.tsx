"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
    ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { cn, formatCompactIDR, formatIDR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Wallet, PieChart, Landmark, FileText, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Shield, Users, DollarSign } from "lucide-react";
import type { FundamentalData } from "@/hooks/useFundamentals";
import FinancialStatementTable from "./FinancialStatementTable";

type TabKey = 'income' | 'balance' | 'cashflow' | 'ratios' | 'idx';

const fmtShort = (v: number | null | undefined): string =>
    v == null ? '-' : v >= 0 ? formatCompactIDR(v) : `-${formatCompactIDR(Math.abs(v))}`;

const fmtNum = (v: number | null | undefined, dec = 2): string =>
    v == null ? '-' : v.toFixed(dec);

const fmtPct = (v: number | null | undefined): string =>
    v == null ? '-' : `${(v * 100).toFixed(1)}%`;

const pctChange = (curr: number, prev: number | null | undefined): { val: string; up: boolean | null } => {
    if (prev == null || prev === 0) return { val: '-', up: null };
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    return { val: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, up: pct >= 0 };
};

const CardShell = ({ title, icon, subtitle, children }: { title: string; icon: React.ReactNode; subtitle?: string; children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center gap-3 bg-muted/30">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>
            <div>
                <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
                {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const TooltipShell = ({ title, rows }: { title: string; rows: { label: string; value: string; up?: boolean | null }[] }) => (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2 min-w-[200px]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
        {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-xs font-bold font-mono">{r.value}</span>
            </div>
        ))}
    </div>
);

export default function FinancialReports({ data, idxData, code }: { data: FundamentalData | null; idxData?: any | null; code?: string }) {
    const [tab, setTab] = useState<TabKey>('idx');
    const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual');
    const [localIdx, setLocalIdx] = useState<any>(null);

    // Fetch data sesuai period (annual/quarterly) saat toggle
    useEffect(() => {
        if (!code) return;
        let cancelled = false;
        fetch(`/api/idx/financial-statement?code=${code}&period=${period}`)
            .then(r => r.json())
            .then(res => { if (!cancelled && res.success && res.data) setLocalIdx(res.data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [code, period]);

    // Data IDX: gunakan localIdx (sesuai period), fallback ke idxData
    const displayIdx = localIdx || idxData;

    // Fallback: jika data (useFundamentals) kosong, gunakan idxData (financial-statement)
    const stmt = (data as any) || displayIdx || {};

    const income = useMemo(() => {
        const src = stmt.incomeStatementHistory;
        if (!src || src.length === 0) return [];
        return [...src].reverse().map((r: any) => ({
            ...r,
            label: r.period || r.year,
            periode: r.period || r.year,
            grossMargin: r.grossMargin ?? (r.totalRevenue ? ((r.grossProfit ?? r.netInterestIncome ?? 0) / r.totalRevenue) * 100 : null),
            operatingMargin: r.operatingMargin ?? (r.totalRevenue ? ((r.operatingIncome ?? 0) / r.totalRevenue) * 100 : null),
            netMargin: r.netMargin ?? (r.totalRevenue ? ((r.netIncome ?? 0) / r.totalRevenue) * 100 : null),
            effectiveTaxRate: r.effectiveTaxRate ?? (r.preTaxIncome ? ((r.taxProvision ?? 0) / r.preTaxIncome) * 100 : null),
        }));
    }, [stmt]);

    const balance = useMemo(() => {
        const src = stmt.balanceSheetHistory;
        if (!src || src.length === 0) return [];
        return [...src].reverse().map((r: any) => ({
            ...r,
            label: r.year || r.period,
            periode: r.year || r.period,
            ekuitas: r.totalStockholderEquity ?? r.totalEquity,
            aset: r.totalAssets,
            liabilitas: r.totalLiab ?? r.totalLiabilities,
            debtRatio: r.debtRatio ?? ((r.totalAssets || r.aset) ? (r.totalLiab ?? r.totalLiabilities ?? 0) / (r.totalAssets || r.aset) : null),
            currentRatio: r.currentRatio ?? (r.totalCurrentLiabilities ? (r.totalCurrentAssets ?? 0) / r.totalCurrentLiabilities : null),
        }));
    }, [stmt]);

    const cashflow = useMemo(() => {
        const src = stmt.cashflowStatementHistory;
        if (!src || src.length === 0) return [];
        return [...src].reverse().map((r: any) => ({
            ...r,
            label: r.period || r.year,
            freeCashFlow: r.freeCashFlow ?? (r.operatingCashflow != null && r.capitalExpenditures != null
                ? r.operatingCashflow - Math.abs(r.capitalExpenditures) : null),
        }));
    }, [stmt]);

    const ratios = useMemo(() => {
        if (!data) return null;
        return {
            pe: data.peRatio,
            pb: data.pbRatio,
            roe: data.roe,
            roa: data.roa,
            npm: data.profitMargin,
            om: data.operatingMargin,
            gm: data.grossMargin,
            current: data.currentRatio,
            quick: data.quickRatio,
            der: data.debtToEquity,
            beta: data.beta,
            divYield: data.dividendYield,
            eps: data.trailingEps,
            bvps: data.bookValue,
            targetPrice: data.targetMeanPrice,
            targetHigh: data.targetHighPrice,
            targetLow: data.targetLowPrice,
            strongBuy: data.strongBuy,
            buy: data.buy,
            hold: data.hold,
            sell: data.sell,
            strongSell: data.strongSell,
        };
    }, [data]);

    const hasIncome = income.length > 0;
    const hasBalance = balance.length > 0;
    const hasCash = cashflow.length > 0;
    const hasRatios = !!ratios;
    const hasIdx = !!displayIdx && (displayIdx.totalAssets != null || displayIdx.sales != null);

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; available: boolean }[] = [
        { key: 'idx', label: 'Data IDX', icon: <Landmark className="w-4 h-4" />, available: hasIdx },
        { key: 'income', label: 'Laba Rugi', icon: <FileText className="w-4 h-4" />, available: hasIncome },
        { key: 'balance', label: 'Neraca', icon: <Landmark className="w-4 h-4" />, available: hasBalance },
        { key: 'cashflow', label: 'Arus Kas', icon: <Wallet className="w-4 h-4" />, available: hasCash },
        { key: 'ratios', label: 'Rasio & Analisis', icon: <BarChart3 className="w-4 h-4" />, available: hasRatios },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            disabled={!t.available}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-all font-bold',
                                !t.available ? 'opacity-40 cursor-not-allowed' : tab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                            )}
                        >
                            <span className="p-1.5 rounded-lg">{t.icon}</span>
                            {t.label}
                            {!t.available && <span className="text-[9px] uppercase"> (kosong)</span>}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
                    {(['annual', 'quarterly'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                'px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer',
                                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {p === 'annual' ? 'Tahunan' : 'Kuartal'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ==================== IDX DATA ==================== */}
            {tab === 'idx' && idxData && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <SummaryStat label="Total Aset" value={displayIdx.totalAssets != null ? formatIDR(displayIdx.totalAssets) : '-'} />
                        <SummaryStat label="Total Liabilitas" value={displayIdx.totalLiabilities != null ? formatIDR(displayIdx.totalLiabilities) : '-'} />
                        <SummaryStat label="Total Ekuitas" value={displayIdx.totalEquity != null ? formatIDR(displayIdx.totalEquity) : '-'} />
                        <SummaryStat label="Pendapatan" value={displayIdx.sales != null ? formatIDR(displayIdx.sales) : '-'} />
                        <SummaryStat label="Laba Bersih" value={displayIdx.profit != null ? formatIDR(displayIdx.profit) : '-'} />
                        <SummaryStat label="Growth Pendapatan" value={fmtPct(displayIdx.revenueGrowth)} />
                        <SummaryStat label="ROE / ROA" value={`${displayIdx.roe != null ? `${displayIdx.roe.toFixed(1)}%` : '-'} / ${displayIdx.roa != null ? `${displayIdx.roa.toFixed(1)}%` : '-'}`} />
                        <SummaryStat label="Free Cash Flow" value={displayIdx.freeCashFlow != null ? formatIDR(displayIdx.freeCashFlow) : '-'} />
                    </div>

                    {/* Balance Sheet (Neraca) */}
                    {displayIdx.totalAssets != null && (
                        <CardShell title="Neraca (IDX)" icon={<Landmark className="w-4 h-4" />} subtitle={displayIdx.fsDate ? `Periode: ${displayIdx.fsDate}` : 'Sumber: IDX'}>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={[{ name: 'Neraca', aset: displayIdx.totalAssets, liabilitas: displayIdx.totalLiabilities, ekuitas: displayIdx.totalEquity }]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55}
                                            tickFormatter={(v) => formatCompactIDR(v).replace('Rp', '')} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <TooltipShell title="Neraca" rows={[
                                                        { label: 'Aset', value: fmtShort(d.aset) },
                                                        { label: 'Liabilitas', value: fmtShort(d.liabilitas) },
                                                        { label: 'Ekuitas', value: fmtShort(d.ekuitas) },
                                                    ]} />
                                                );
                                            }}
                                        />
                                        <Bar dataKey="aset" name="Aset" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={30} />
                                        <Bar dataKey="liabilitas" name="Liabilitas" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={30} />
                                        <Bar dataKey="ekuitas" name="Ekuitas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={30} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-muted/30 rounded-xl">
                                    <p className="text-[10px] text-muted-foreground uppercase">Aset</p>
                                    <p className="text-sm font-black">{formatIDR(displayIdx.totalAssets)}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-xl">
                                    <p className="text-[10px] text-muted-foreground uppercase">Liabilitas</p>
                                    <p className="text-sm font-black">{formatIDR(displayIdx.totalLiabilities)}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-xl">
                                    <p className="text-[10px] text-muted-foreground uppercase">Ekuitas</p>
                                    <p className="text-sm font-black">{formatIDR(displayIdx.totalEquity)}</p>
                                </div>
                            </div>
                        </CardShell>
                    )}

                    {/* Income Statement (Laba Rugi) */}
                    {displayIdx.sales != null && (
                        <CardShell title="Laba Rugi (IDX)" icon={<FileText className="w-4 h-4" />}>
                            <div className="space-y-2">
                                <Row label="Pendapatan" value={fmtShort(displayIdx.sales)} />
                                <Row label="Growth Pendapatan YoY" value={fmtPct(displayIdx.revenueGrowth)} good={displayIdx.revenueGrowth != null ? displayIdx.revenueGrowth >= 0 : null} />
                                <Row label="Laba Kotor" value={fmtShort(displayIdx.grossProfit)} />
                                <Row label="Laba Operasi / EBITDA" value={`${fmtShort(displayIdx.operatingIncome)} / ${fmtShort(displayIdx.ebitda)}`} />
                                <Row label="Laba Sebelum Pajak (EBT)" value={fmtShort(displayIdx.ebt)} />
                                <Row label="Beban Pajak" value={fmtShort(displayIdx.taxProvision)} />
                                <Row label="Laba Bersih" value={fmtShort(displayIdx.profit)} good={displayIdx.profit >= 0} />
                                <Row label="Growth Laba YoY" value={fmtPct(displayIdx.profitGrowth)} good={displayIdx.profitGrowth != null ? displayIdx.profitGrowth >= 0 : null} />
                                <Row label="Margin Bersih (NPM)" value={fmtPct(displayIdx.netMargin)} good={displayIdx.netMargin != null ? displayIdx.netMargin >= 10 : null} />
                                <Row label="Laba atribusi pemilik" value={fmtShort(displayIdx.profitAttrOwner)} good={displayIdx.profitAttrOwner >= 0} />
                                <Row label="EPS" value={displayIdx.eps != null ? `Rp${displayIdx.eps.toLocaleString('id-ID')}` : '-'} good={displayIdx.eps > 0} />
                                <Row label="Book Value / Saham" value={displayIdx.bookValue != null ? `Rp${displayIdx.bookValue.toLocaleString('id-ID')}` : '-'} />
                            </div>
                        </CardShell>
                    )}

                    {/* Ratios */}
                    {(displayIdx.per != null || displayIdx.roe != null || displayIdx.pbv != null) && (
                        <CardShell title="Rasio Keuangan (IDX)" icon={<BarChart3 className="w-4 h-4" />}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <RatioCard label="P/E Ratio" value={displayIdx.per != null ? displayIdx.per.toFixed(2) : '-'} good={displayIdx.per != null && displayIdx.per < 15} bad={displayIdx.per != null && displayIdx.per > 25} />
                                <RatioCard label="P/BV" value={displayIdx.pbv != null ? displayIdx.pbv.toFixed(2) : '-'} good={displayIdx.pbv != null && displayIdx.pbv < 1} bad={displayIdx.pbv != null && displayIdx.pbv > 3} />
                                <RatioCard label="EV/EBITDA" value={displayIdx.evEbitda != null ? displayIdx.evEbitda.toFixed(2) : '-'} good={displayIdx.evEbitda != null && displayIdx.evEbitda < 10} bad={displayIdx.evEbitda != null && displayIdx.evEbitda > 20} />
                                <RatioCard label="Dividend Yield" value={displayIdx.dividendYield != null ? `${displayIdx.dividendYield.toFixed(2)}%` : '-'} good={displayIdx.dividendYield != null && displayIdx.dividendYield > 4} />
                                <RatioCard label="ROE" value={displayIdx.roe != null ? `${displayIdx.roe.toFixed(1)}%` : '-'} good={displayIdx.roe != null && displayIdx.roe > 15} bad={displayIdx.roe != null && displayIdx.roe < 5} />
                                <RatioCard label="ROA" value={displayIdx.roa != null ? `${displayIdx.roa.toFixed(1)}%` : '-'} good={displayIdx.roa != null && displayIdx.roa > 8} />
                                <RatioCard label="NPM" value={displayIdx.npm != null ? `${displayIdx.npm.toFixed(1)}%` : '-'} good={displayIdx.npm != null && displayIdx.npm > 10} />
                                <RatioCard label="D/E Ratio" value={displayIdx.der != null ? displayIdx.der.toFixed(2) : '-'} good={displayIdx.der != null && displayIdx.der < 1} bad={displayIdx.der != null && displayIdx.der > 2} />
                                <RatioCard label="Current Ratio" value={displayIdx.currentRatio != null ? displayIdx.currentRatio.toFixed(2) : '-'} good={displayIdx.currentRatio != null && displayIdx.currentRatio > 2} bad={displayIdx.currentRatio != null && displayIdx.currentRatio < 1} />
                                <RatioCard label="Growth Pendapatan" value={fmtPct(displayIdx.revenueGrowth)} good={displayIdx.revenueGrowth != null && displayIdx.revenueGrowth >= 0} bad={displayIdx.revenueGrowth != null && displayIdx.revenueGrowth < 0} />
                                <RatioCard label="Growth Laba" value={fmtPct(displayIdx.profitGrowth)} good={displayIdx.profitGrowth != null && displayIdx.profitGrowth >= 0} bad={displayIdx.profitGrowth != null && displayIdx.profitGrowth < 0} />
                                <RatioCard label="Debt Ratio" value={displayIdx.debtRatio != null ? `${(displayIdx.debtRatio * 100).toFixed(1)}%` : '-'} good={displayIdx.debtRatio != null && displayIdx.debtRatio < 0.5} bad={displayIdx.debtRatio != null && displayIdx.debtRatio > 0.8} />
                            </div>
                        </CardShell>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center">
                        Sumber: IDX Financial Data Ratio {displayIdx.fsDate ? `Â· Periode ${displayIdx.fsDate}` : ''}
                    </p>
                </div>
            )}

            {/* ==================== INCOME STATEMENT ==================== */}
            {tab === 'income' && (hasIncome ? (
                <div className="space-y-6">
                    {/* Revenue & Net Income chart */}
                    <CardShell title="Pendapatan & Laba Bersih" icon={<BarChart3 className="w-4 h-4" />} subtitle="Tren per periode">
                        <div className="h-80">
                            <ResponsiveContainer>
                                <ComposedChart data={income} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="amt" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55}
                                        tickFormatter={(v) => formatCompactIDR(v).replace('Rp', '')} />
                                    <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40}
                                        tickFormatter={(v) => `${v}%`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <TooltipShell title={d.periode} rows={[
                                                    { label: 'Pendapatan', value: fmtShort(d.totalRevenue) },
                                                    { label: 'Laba Bersih', value: fmtShort(d.netIncome), up: ((d.netIncome ?? 0) >= 0) },
                                                    { label: 'Growth Pendapatan', value: d.revenueGrowth != null ? fmtPct(d.revenueGrowth) : '-' },
                                                    { label: 'Growth Laba', value: d.profitGrowth != null ? fmtPct(d.profitGrowth) : '-', up: d.profitGrowth != null ? d.profitGrowth >= 0 : null },
                                                    { label: 'EPS', value: (d.basicEPS ?? d.dilutedEPS) != null ? `Rp${((d.basicEPS ?? d.dilutedEPS) as number).toLocaleString('id-ID')}` : '-' },
                                                ]} />
                                            );
                                        }} />
                                    <Bar yAxisId="amt" dataKey="totalRevenue" name="Pendapatan" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={26} />
                                    <Bar yAxisId="amt" dataKey="netIncome" name="Laba Bersih" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={26} />
                                    <Line yAxisId="pct" type="monotone" dataKey={(r: any) => r.revenueGrowth != null ? +(r.revenueGrowth * 100).toFixed(1) : null} name="Growth %" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardShell>

                    {/* Margin trends */}
                    <CardShell title="Tren Margin & Efisiensi Pajak" icon={<TrendingUp className="w-4 h-4" />} subtitle="Gross / Operating / Net Margin (%)">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={income} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40}
                                        tickFormatter={(v) => `${v}%`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <TooltipShell title={d.periode} rows={[
                                                    { label: 'Gross Margin', value: fmtPct(d.grossMargin != null ? d.grossMargin : null), up: d.grossMargin != null ? d.grossMargin >= 30 : null },
                                                    { label: 'Operating Margin', value: fmtPct(d.operatingMargin) },
                                                    { label: 'Net Margin', value: fmtPct(d.netMargin) },
                                                    { label: 'Tax Rate', value: fmtPct(d.effectiveTaxRate) },
                                                ]} />
                                            );
                                        }} />
                                    <Area type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.08} strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="operatingMargin" name="Operating Margin" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey={(r: any) => r.effectiveTaxRate ?? null} name="Tax Rate" stroke="hsl(var(--chart-4))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardShell>

                    {/* Detailed income table */}
                    <CardShell title="Rincian Laba Rugi" icon={<FileText className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground sticky left-0 bg-card">Pos</th>
                                        {income.map(r => (
                                            <th key={r.periode} className="text-right py-2 pl-4 text-xs font-bold text-muted-foreground whitespace-nowrap">{r.periode}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: 'Pendapatan', v: (r: any) => fmtShort(r.totalRevenue), strong: true },
                                        { label: 'Beban Pokok', v: (r: any) => fmtShort(r.costOfRevenue) },
                                        { label: 'Laba Kotor', v: (r: any) => fmtShort(r.grossProfit) },
                                        { label: 'SG&A', v: (r: any) => fmtShort(r.sgna) },
                                        { label: 'R&D', v: (r: any) => fmtShort(r.researchAndDevelopment) },
                                        { label: 'EBITDA', v: (r: any) => fmtShort(r.ebitda) },
                                        { label: 'D&A', v: (r: any) => fmtShort(r.depreciationAndAmortization) },
                                        { label: 'Laba Operasi', v: (r: any) => fmtShort(r.operatingIncome) },
                                        { label: 'Pend. Bunga Bersih', v: (r: any) => fmtShort(r.netInterestIncome) },
                                        { label: 'Pend. Non-Bunga', v: (r: any) => fmtShort(r.nonInterestIncome) },
                                        { label: 'Beban Bunga', v: (r: any) => fmtShort(r.interestExpense) },
                                        { label: 'EBT (Sebelum Pajak)', v: (r: any) => fmtShort(r.preTaxIncome) },
                                        { label: 'Beban Pajak', v: (r: any) => fmtShort(r.taxProvision) },
                                        { label: 'Pos Luar Biasa', v: (r: any) => fmtShort(r.specialIncomeCharges) },
                                        { label: 'Laba Bersih', v: (r: any) => fmtShort(r.netIncome), strong: true, goodNeg: true },
                                        { label: 'Stock Comp', v: (r: any) => fmtShort(r.shareBasedCompensation) },
                                        { label: 'EPS Dasar', v: (r: any) => r.basicEPS != null ? `Rp${r.basicEPS.toLocaleString('id-ID')}` : '-', highlight: true },
                                        { label: 'EPS Dilusi', v: (r: any) => r.dilutedEPS != null ? `Rp${r.dilutedEPS.toLocaleString('id-ID')}` : '-' },
                                        { label: 'Saham Dilusi (M)', v: (r: any) => r.dilutedAverageShares != null ? (r.dilutedAverageShares / 1e6).toFixed(1) : '-' },
                                        { label: 'Growth Pendapatan', v: (r: any) => r.revenueGrowth != null ? fmtPct(r.revenueGrowth) : '-', highlight: true },
                                        { label: 'Growth Laba', v: (r: any) => r.profitGrowth != null ? fmtPct(r.profitGrowth) : '-', highlight: true },
                                        { label: 'Net Margin', v: (r: any) => fmtPct(r.netMargin) },
                                        { label: 'Effective Tax Rate', v: (r: any) => fmtPct(r.effectiveTaxRate) },
                                    ].map((row, i) => (
                                        <tr key={row.label} className={cn("border-b border-border/30 last:border-b-0", i % 2 === 0 && "bg-muted/20")}>
                                            <td className={cn("py-2.5 pr-4 text-muted-foreground sticky left-0 bg-card", row.strong && "font-bold text-foreground", row.highlight && "text-primary font-semibold")}>{row.label}</td>
                                            {income.map(r => (
                                                <td key={r.periode} className={cn("py-2.5 pl-4 text-right font-mono", row.strong && "font-bold", row.highlight && "text-primary")}>{row.v(r)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardShell>

                    {/* Quarterly pivot table */}
                    <FinancialStatementTable incomeData={income} balanceData={balance} cashflowData={cashflow} />
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">Data laporan laba rugi tidak tersedia.</p>
            ))}

            {/* ==================== BALANCE SHEET ==================== */}
            {tab === 'balance' && (hasBalance ? (
                <div className="space-y-6">
                    {/* Asset Structure Chart */}
                    <CardShell title="Struktur Neraca" icon={<PieChart className="w-4 h-4" />} subtitle="Aset vs Liabilitas vs Ekuitas">
                        <div className="h-80">
                            <ResponsiveContainer>
                                <ComposedChart data={balance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55}
                                        tickFormatter={(v) => formatCompactIDR(v).replace('Rp', '')} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <TooltipShell title={d.periode} rows={[
                                                    { label: 'Total Aset', value: fmtShort(d.aset) },
                                                    { label: 'Liabilitas', value: fmtShort(d.liabilitas) },
                                                    { label: 'Ekuitas', value: fmtShort(d.ekuitas) },
                                                    { label: 'Debt Ratio', value: d.debtRatio != null ? `${(d.debtRatio * 100).toFixed(1)}%` : '-' },
                                                ]} />
                                            );
                                        }} />
                                    <Bar dataKey="aset" name="Aset" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={24} />
                                    <Bar dataKey="liabilitas" name="Liabilitas" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={24} />
                                    <Line type="monotone" dataKey="ekuitas" name="Ekuitas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardShell>

                    {/* Liquidity Chart */}
                    {balance.some(r => r.currentRatio != null) && (
                        <CardShell title="Rasio Likuiditas" icon={<Activity className="w-4 h-4" />} subtitle="Current Ratio & Debt Ratio">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={balance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <TooltipShell title={d.periode} rows={[
                                                        { label: 'Current Ratio', value: d.currentRatio != null ? d.currentRatio.toFixed(2) : '-' },
                                                        { label: 'Debt Ratio', value: d.debtRatio != null ? `${(d.debtRatio * 100).toFixed(1)}%` : '-' },
                                                    ]} />
                                                );
                                            }}
                                        />
                                        <Line type="monotone" dataKey="currentRatio" name="Current Ratio" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="debtRatio" name="Debt Ratio" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardShell>
                    )}

                    {/* Detailed Balance Table */}
                    <CardShell title="Rincian Neraca" icon={<Landmark className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground sticky left-0 bg-card">Pos</th>
                                        {balance.map(r => (
                                            <th key={r.periode} className="text-right py-2 pl-4 text-xs font-bold text-muted-foreground whitespace-nowrap">{r.periode}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: 'Total Aset', v: (r: any) => fmtShort(r.totalAssets), strong: true },
                                        { label: 'Aset Lancar', v: (r: any) => fmtShort(r.totalCurrentAssets) },
                                        { label: 'Kas & Setara', v: (r: any) => fmtShort(r.cash) },
                                        { label: 'Investasi Jangka Pendek', v: (r: any) => fmtShort(r.shortTermInvestments) },
                                        { label: 'Piutang', v: (r: any) => fmtShort(r.netReceivables) },
                                        { label: 'Persediaan', v: (r: any) => fmtShort(r.inventory) },
                                        { label: 'Aset Tak Lancar', v: (r: any) => fmtShort(r.totalNonCurrentAssets) },
                                        { label: 'PP&E', v: (r: any) => fmtShort(r.propertyPlantEquipment) },
                                        { label: 'Goodwill', v: (r: any) => fmtShort(r.goodwill) },
                                        { label: 'Intangible Lainnya', v: (r: any) => fmtShort(r.intangibleAssets) },
                                        { label: 'Liabilitas Total', v: (r: any) => fmtShort(r.totalLiab), highlight: true },
                                        { label: 'Liabilitas Lancar', v: (r: any) => fmtShort(r.totalCurrentLiabilities) },
                                        { label: 'Utang Jangka Pendek', v: (r: any) => fmtShort(r.currentDebt) },
                                        { label: 'Utang Usaha (AP)', v: (r: any) => fmtShort(r.accountsPayable) },
                                        { label: 'Liabilitas Tak Lancar', v: (r: any) => fmtShort(r.totalNonCurrentLiabilities) },
                                        { label: 'Utang Jangka Panjang', v: (r: any) => fmtShort(r.longTermDebt) },
                                        { label: 'Total Utang Berbunga', v: (r: any) => fmtShort(r.totalDebt), highlight: true },
                                        { label: 'Utang Bersih', v: (r: any) => fmtShort(r.netDebt) },
                                        { label: 'Modal Kerja (WC)', v: (r: any) => fmtShort(r.workingCapital), highlight: true },
                                        { label: 'Ekuitas', v: (r: any) => fmtShort(r.totalStockholderEquity), strong: true },
                                        { label: 'Ekuitas Minoritas', v: (r: any) => fmtShort(r.minorityInterest) },
                                        { label: 'Treasury Stock', v: (r: any) => fmtShort(r.treasuryStock) },
                                        { label: 'Laba Ditahan', v: (r: any) => fmtShort(r.retainedEarnings) },
                                        { label: 'Tangible Book Value', v: (r: any) => fmtShort(r.tangibleBookValue) },
                                        { label: 'Current Ratio', v: (r: any) => r.currentRatio != null ? r.currentRatio.toFixed(2) : '-', highlight: true },
                                        { label: 'Debt Ratio', v: (r: any) => r.debtRatio != null ? `${(r.debtRatio * 100).toFixed(1)}%` : '-', highlight: true },
                                        { label: 'DER', v: (r: any) => r.der != null ? r.der.toFixed(2) : '-', highlight: true },
                                    ].map((row, i) => (
                                        <tr key={row.label} className={cn("border-b border-border/30 last:border-b-0", i % 2 === 0 && "bg-muted/20")}>
                                            <td className={cn("py-2.5 pr-4 text-muted-foreground sticky left-0 bg-card", row.strong && "font-bold text-foreground", row.highlight && "text-primary font-semibold")}>{row.label}</td>
                                            {balance.map(r => (
                                                <td key={r.periode} className={cn("py-2.5 pl-4 text-right font-mono", row.strong && "font-bold", row.highlight && "text-primary")}>{row.v(r)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardShell>
                </div>
            ) : <EmptyState label="Data neraca tidak tersedia untuk saham ini." />)}

            {/* ==================== CASH FLOW ==================== */}
            {tab === 'cashflow' && (hasCash ? (
                <div className="space-y-6">
                    {/* Cash Flow Chart */}
                    <CardShell title="Arus Kas" icon={<Wallet className="w-4 h-4" />} subtitle="Operasi, Investasi, Pendanaan & FCF">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={cashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55}
                                        tickFormatter={(v) => formatCompactIDR(v).replace('Rp', '')} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <TooltipShell title={d.period} rows={[
                                                    { label: 'Operasi', value: fmtShort(d.operatingCashflow), up: ((d.operatingCashflow ?? 0) >= 0) },
                                                    { label: 'Investasi', value: fmtShort(d.investingCashflow) },
                                                    { label: 'Pendanaan', value: fmtShort(d.financingCashflow) },
                                                    { label: 'Free Cash Flow', value: fmtShort(d.freeCashFlow), up: ((d.freeCashFlow ?? 0) >= 0) },
                                                    { label: 'Dividen', value: fmtShort(d.dividendsPaid) },
                                                ]} />
                                            );
                                        }} />
                                    <Bar dataKey="operatingCashflow" name="Arus Kas Operasi" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={24} />
                                    <Bar dataKey="financingCashflow" name="Arus Kas Pendanaan" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={24} />
                                    <Line type="monotone" dataKey="freeCashFlow" name="Free Cash Flow" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardShell>

                    {/* FCF Trend */}
                    <CardShell title="Free Cash Flow Trend" icon={<TrendingUp className="w-4 h-4" />} subtitle="Tren arus kas bebas">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={cashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={55}
                                        tickFormatter={(v) => formatCompactIDR(v).replace('Rp', '')} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted) / 40%)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <TooltipShell title={d.period} rows={[
                                                    { label: 'FCF', value: fmtShort(d.freeCashFlow), up: ((d.freeCashFlow ?? 0) >= 0) },
                                                ]} />
                                            );
                                        }}
                                    />
                                    <Area type="monotone" dataKey="freeCashFlow" name="FCF" fill="url(#fcfGrad)" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                    <defs>
                                        <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardShell>

                    {/* Detailed Cash Flow Table */}
                    <CardShell title="Rincian Arus Kas" icon={<Wallet className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr>
                                    <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground sticky left-0 bg-card">Pos</th>
                                    {cashflow.map(r => <th key={r.period} className="text-right py-2 pl-4 text-xs font-bold text-muted-foreground whitespace-nowrap">{r.period}</th>)}
                                </tr></thead>
                                <tbody>
                                    {[
                                        { label: 'Laba Bersih (awal)', v: (r: any) => fmtShort(r.netIncome) },
                                        { label: 'D&A', v: (r: any) => fmtShort(r.depreciationAndAmortization) },
                                        { label: 'Stock Comp', v: (r: any) => fmtShort(r.stockBasedCompensation) },
                                        { label: 'Perubahan Modal Kerja', v: (r: any) => fmtShort(r.changeInWorkingCapital) },
                                        { label: 'Arus Kas Operasi', v: (r: any) => fmtShort(r.operatingCashflow), strong: true },
                                        { label: 'CAPEX', v: (r: any) => fmtShort(r.capitalExpenditures) },
                                        { label: 'Arus Kas Investasi', v: (r: any) => fmtShort(r.investingCashflow) },
                                        { label: 'Penerbitan Utang', v: (r: any) => fmtShort(r.issuanceOfDebt) },
                                        { label: 'Pembayaran Utang', v: (r: any) => fmtShort(r.repaymentOfDebt) },
                                        { label: 'Utang Bersih (Net)', v: (r: any) => fmtShort(r.netIssuanceOfDebt ?? (((r.issuanceOfDebt ?? 0) + Math.abs(r.repaymentOfDebt ?? 0)) || null)) },
                                        { label: 'Buyback Saham', v: (r: any) => fmtShort(r.repurchaseOfStock), highlight: true },
                                        { label: 'Penerbitan Saham', v: (r: any) => fmtShort(r.issuanceOfStock) },
                                        { label: 'Arus Kas Pendanaan', v: (r: any) => fmtShort(r.financingCashflow) },
                                        { label: 'Free Cash Flow', v: (r: any) => fmtShort(r.freeCashFlow), strong: true },
                                        { label: 'Dividen Dibayar', v: (r: any) => fmtShort(r.dividendsPaid), highlight: true },
                                        { label: 'Pajak Dibayar', v: (r: any) => fmtShort(r.taxesPaid) },
                                        { label: 'Kas Awal', v: (r: any) => fmtShort(r.beginningCashPosition) },
                                        { label: 'Kas Akhir', v: (r: any) => fmtShort(r.endCashPosition), strong: true },
                                    ].map((row, i) => (
                                        <tr key={row.label} className={cn("border-b border-border/30 last:border-b-0", i % 2 === 0 && "bg-muted/20")}>
                                            <td className={cn("py-2.5 pr-4 text-muted-foreground sticky left-0 bg-card", row.strong && "font-bold text-foreground", row.highlight && "text-primary font-semibold")}>{row.label}</td>
                                            {cashflow.map(r => (
                                                <td key={r.period} className={cn("py-2.5 pl-4 text-right font-mono", row.strong && "font-bold")}>{row.v(r)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardShell>
                </div>
            ) : <EmptyState label="Data arus kas tidak tersedia untuk saham ini." />)}

            {/* ==================== RATIOS & ANALYSIS ==================== */}
            {tab === 'ratios' && hasRatios && ratios && (
                <div className="space-y-6">
                    {/* Valuation Metrics */}
                    <CardShell title="Valuasi" icon={<BarChart3 className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <RatioCard label="P/E Ratio" value={fmtNum(ratios.pe)} sub="Price to Earnings" good={ratios.pe != null && ratios.pe < 15} bad={ratios.pe != null && ratios.pe > 25} />
                            <RatioCard label="P/B Ratio" value={fmtNum(ratios.pb)} sub="Price to Book" good={ratios.pb != null && ratios.pb < 1} bad={ratios.pb != null && ratios.pb > 3} />
                            <RatioCard label="EV/EBITDA" value={displayIdx?.evEbitda != null ? displayIdx.evEbitda.toFixed(2) : '-'} sub="Enterprise Value / EBITDA" good={displayIdx?.evEbitda != null && displayIdx.evEbitda < 10} bad={displayIdx?.evEbitda != null && displayIdx.evEbitda > 20} />
                            <RatioCard label="Dividend Yield" value={(() => { const dy = ratios.divYield != null ? ratios.divYield * (ratios.divYield < 1 ? 100 : 1) : (displayIdx?.dividendYield ?? null); return dy != null ? `${dy.toFixed(2)}%` : '-'; })()} sub="Yield tahunan" good={(ratios.divYield ?? displayIdx?.dividendYield) != null && ((ratios.divYield && ratios.divYield < 1 ? ratios.divYield * 100 : ratios.divYield) ?? displayIdx?.dividendYield) > 4} />
                        </div>
                    </CardShell>

                    {/* Profitability */}
                    <CardShell title="Profitabilitas" icon={<TrendingUp className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <RatioCard label="ROE" value={ratios.roe != null ? `${(ratios.roe * 100).toFixed(1)}%` : '-'} sub="Return on Equity" good={ratios.roe != null && ratios.roe > 0.15} bad={ratios.roe != null && ratios.roe < 0.05} />
                            <RatioCard label="ROA" value={ratios.roa != null ? `${(ratios.roa * 100).toFixed(1)}%` : '-'} sub="Return on Assets" good={ratios.roa != null && ratios.roa > 0.08} bad={ratios.roa != null && ratios.roa < 0.02} />
                            <RatioCard label="Net Margin" value={ratios.npm != null ? `${(ratios.npm * 100).toFixed(1)}%` : '-'} sub="Profit Margin" good={ratios.npm != null && ratios.npm > 0.15} bad={ratios.npm != null && ratios.npm < 0.05} />
                            <RatioCard label="Operating Margin" value={ratios.om != null ? `${(ratios.om * 100).toFixed(1)}%` : '-'} sub="Margin Operasi" good={ratios.om != null && ratios.om > 0.2} />
                        </div>
                    </CardShell>

                    {/* Financial Health */}
                    <CardShell title="Kesehatan Keuangan" icon={<Shield className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <RatioCard label="Current Ratio" value={fmtNum(ratios.current)} sub="Likuiditas Jangka Pendek" good={ratios.current != null && ratios.current > 2} bad={ratios.current != null && ratios.current < 1} />
                            <RatioCard label="Quick Ratio" value={fmtNum(ratios.quick)} sub="Likuiditas Ketat" good={ratios.quick != null && ratios.quick > 1.5} />
                            <RatioCard label="D/E Ratio" value={fmtNum(ratios.der)} sub="Debt to Equity" good={ratios.der != null && ratios.der < 1} bad={ratios.der != null && ratios.der > 2} />
                            <RatioCard label="Beta" value={fmtNum(ratios.beta)} sub="Volatilitas" />
                        </div>
                    </CardShell>

                    {/* Per Share Data */}
                    <CardShell title="Data Per Saham" icon={<DollarSign className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <RatioCard label="EPS" value={ratios.eps != null ? `Rp${ratios.eps.toLocaleString('id-ID')}` : '-'} sub="Earnings Per Share" good={ratios.eps != null && ratios.eps > 0} />
                            <RatioCard label="BVPS" value={ratios.bvps != null ? `Rp${ratios.bvps.toLocaleString('id-ID')}` : '-'} sub="Book Value Per Share" />
                            <RatioCard label="Target Price" value={ratios.targetPrice != null ? formatIDR(ratios.targetPrice) : '-'} sub="Rata-rata analis" good={ratios.targetPrice != null && ratios.targetPrice > (data?.currentPrice || 0)} />
                            <RatioCard label="Upside" value={ratios.targetPrice && data?.currentPrice ? `${(((ratios.targetPrice - data.currentPrice) / data.currentPrice) * 100).toFixed(1)}%` : '-'} sub="Potensi kenaikan" good={ratios.targetPrice != null && data?.currentPrice != null && ratios.targetPrice > data.currentPrice} />
                        </div>
                    </CardShell>

                    {/* Analyst Consensus */}
                    {(ratios.strongBuy || ratios.buy || ratios.hold || ratios.sell || ratios.strongSell) && (
                        <CardShell title="Rekomendasi Analis" icon={<Users className="w-4 h-4" />}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                                        {ratios.strongBuy ? <div className="bg-success" style={{ width: `${((ratios.strongBuy) / ((ratios.strongBuy || 0) + (ratios.buy || 0) + (ratios.hold || 0) + (ratios.sell || 0) + (ratios.strongSell || 0))) * 100}%` }} /> : null}
                                        {ratios.buy ? <div className="bg-success/60" style={{ width: `${((ratios.buy) / ((ratios.strongBuy || 0) + (ratios.buy || 0) + (ratios.hold || 0) + (ratios.sell || 0) + (ratios.strongSell || 0))) * 100}%` }} /> : null}
                                        {ratios.hold ? <div className="bg-muted-foreground/40" style={{ width: `${((ratios.hold) / ((ratios.strongBuy || 0) + (ratios.buy || 0) + (ratios.hold || 0) + (ratios.sell || 0) + (ratios.strongSell || 0))) * 100}%` }} /> : null}
                                        {ratios.sell ? <div className="bg-destructive/60" style={{ width: `${((ratios.sell) / ((ratios.strongBuy || 0) + (ratios.buy || 0) + (ratios.hold || 0) + (ratios.sell || 0) + (ratios.strongSell || 0))) * 100}%` }} /> : null}
                                        {ratios.strongSell ? <div className="bg-destructive" style={{ width: `${((ratios.strongSell) / ((ratios.strongBuy || 0) + (ratios.buy || 0) + (ratios.hold || 0) + (ratios.sell || 0) + (ratios.strongSell || 0))) * 100}%` }} /> : null}
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    <div><p className="text-lg font-bold text-success">{ratios.strongBuy || 0}</p><p className="text-[10px] text-muted-foreground">Strong Buy</p></div>
                                    <div><p className="text-lg font-bold text-success/60">{ratios.buy || 0}</p><p className="text-[10px] text-muted-foreground">Buy</p></div>
                                    <div><p className="text-lg font-bold text-muted-foreground">{ratios.hold || 0}</p><p className="text-[10px] text-muted-foreground">Hold</p></div>
                                    <div><p className="text-lg font-bold text-destructive/60">{ratios.sell || 0}</p><p className="text-[10px] text-muted-foreground">Sell</p></div>
                                    <div><p className="text-lg font-bold text-destructive">{ratios.strongSell || 0}</p><p className="text-[10px] text-muted-foreground">Strong Sell</p></div>
                                </div>
                            </div>
                        </CardShell>
                    )}
                </div>
            )}
        </div>
    );
}

function RatioCard({ label, value, sub, good, bad }: { label: string; value: string; sub?: string; good?: boolean; bad?: boolean }) {
    return (
        <div className={cn("p-4 rounded-xl border transition-all", good ? "bg-success/5 border-success/20" : bad ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border/50")}>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-xl font-black", good ? "text-success" : bad ? "text-destructive" : "text-foreground")}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-lg font-black text-foreground truncate">{value}</p>
        </div>
    );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean | null }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1.5 text-sm font-bold font-mono">
                {good === true && <TrendingUp className="w-3.5 h-3.5 text-success" />}
                {good === false && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                <span className={good === true ? "text-success" : good === false ? "text-destructive" : ""}>{value}</span>
            </span>
        </div>
    );
}
