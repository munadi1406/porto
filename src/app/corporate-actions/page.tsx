"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR, formatCompactIDR, cn } from "@/lib/utils";
import {
    Rocket, Split, FileText, XCircle, AlertTriangle, Search, Loader2,
    ExternalLink, TrendingUp, TrendingDown
} from "lucide-react";
import { useNewListings, useStockSplits, useRightOfferings, useDelistings, useSuspendData } from "@/hooks/useIdxExtended";

type TabKey = 'ipo' | 'split' | 'hmetd' | 'delisting' | 'suspend';

export default function CorporateActionsPage() {
    const [tab, setTab] = useState<TabKey>('ipo');
    const [search, setSearch] = useState("");

    const { data: ipoData, isLoading: ipoLoading } = useNewListings();
    const { data: splitData, isLoading: splitLoading } = useStockSplits();
    const { data: hmetdData, isLoading: hmetdLoading } = useRightOfferings();
    const { data: delistData, isLoading: delistLoading } = useDelistings();
    const { data: suspendData, isLoading: suspendLoading } = useSuspendData(200);

    const filterSearch = (items: any[], fields: string[]) => {
        if (!search.trim()) return items || [];
        const q = search.toLowerCase();
        return (items || []).filter((i: any) =>
            fields.some(f => String(i[f] || '').toLowerCase().includes(q))
        );
    };

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
        { key: 'ipo', label: 'IPO Baru', icon: <Rocket className="w-4 h-4" />, count: ipoData?.length || 0 },
        { key: 'split', label: 'Stock Split', icon: <Split className="w-4 h-4" />, count: splitData?.length || 0 },
        { key: 'hmetd', label: 'HMETD', icon: <FileText className="w-4 h-4" />, count: hmetdData?.length || 0 },
        { key: 'delisting', label: 'Delisting', icon: <XCircle className="w-4 h-4" />, count: delistData?.length || 0 },
        { key: 'suspend', label: 'Suspend', icon: <AlertTriangle className="w-4 h-4" />, count: suspendData?.length || 0 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Corporate Actions</h1>
                <p className="text-sm text-muted-foreground mt-0.5">IPO, Stock Split, HMETD, Delisting & Suspend</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto scrollbar-hide">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {t.icon}
                            {t.label}
                            <span className="text-[10px] opacity-70">({t.count})</span>
                        </button>
                    ))}
                </div>
                <div className="relative sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kode/nama..."
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            </div>

            {/* IPO */}
            {tab === 'ipo' && (
                <DataTable
                    loading={ipoLoading}
                    empty={ipoData?.length === 0}
                    searchEmpty={filterSearch(ipoData, ['code', 'name']).length === 0}
                    columns={['Kode', 'Nama', 'Harga IPO', 'Saham Ditawarkan', 'Dana Terkumpul', 'Listing Date']}
                    rows={filterSearch(ipoData, ['code', 'name']).map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <TickerCell code={s.code} name={s.name} />
                            <Cell right>{formatIDR(s.offeringPrice)}</Cell>
                            <Cell right>{s.offeringShares?.toLocaleString('id-ID')}</Cell>
                            <Cell right>{formatCompactIDR(s.fundRaised)}</Cell>
                            <Cell>{s.listingDate}</Cell>
                        </tr>
                    ))}
                />
            )}

            {/* Stock Split */}
            {tab === 'split' && (
                <DataTable
                    loading={splitLoading}
                    empty={splitData?.length === 0}
                    searchEmpty={filterSearch(splitData, ['code', 'name']).length === 0}
                    columns={['Kode', 'Nama', 'Tipe', 'Rasio', 'Nominal Lama', 'Nominal Baru', 'Listing Date']}
                    rows={filterSearch(splitData, ['code', 'name']).map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <TickerCell code={s.code} name={s.name} />
                            <Cell>
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                                    String(s.type || '').toLowerCase().includes('split') && !String(s.type || '').toLowerCase().includes('reverse')
                                        ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                                )}>{s.type}</span>
                            </Cell>
                            <Cell>{s.ratio}</Cell>
                            <Cell right>{formatIDR(s.oldNominal)}</Cell>
                            <Cell right>{formatIDR(s.newNominal)}</Cell>
                            <Cell>{s.listingDate}</Cell>
                        </tr>
                    ))}
                />
            )}

            {/* HMETD */}
            {tab === 'hmetd' && (
                <DataTable
                    loading={hmetdLoading}
                    empty={hmetdData?.length === 0}
                    searchEmpty={filterSearch(hmetdData, ['code', 'name']).length === 0}
                    columns={['Kode', 'Nama', 'Rasio', 'Harga Exercise', 'Dana Target', 'Ex Date', 'Recording']}
                    rows={filterSearch(hmetdData, ['code', 'name']).map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <TickerCell code={s.code} name={s.name} />
                            <Cell>{s.ratio}</Cell>
                            <Cell right>{formatIDR(s.exercisePrice)}</Cell>
                            <Cell right>{formatCompactIDR(s.fundRaised)}</Cell>
                            <Cell>{s.exerciseDate}</Cell>
                            <Cell>{s.recordingDate}</Cell>
                        </tr>
                    ))}
                />
            )}

            {/* Delisting */}
            {tab === 'delisting' && (
                <DataTable
                    loading={delistLoading}
                    empty={delistData?.length === 0}
                    searchEmpty={filterSearch(delistData, ['code', 'name']).length === 0}
                    columns={['Kode', 'Nama', 'Market Cap', 'Harga Terakhir', 'Listing', 'Delist']}
                    rows={filterSearch(delistData, ['code', 'name']).map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-destructive">{s.code}</td>
                            <td className="px-4 py-3 text-foreground">{s.name}</td>
                            <Cell right>{formatCompactIDR(s.marketCap)}</Cell>
                            <Cell right>{formatIDR(s.regularPrice)}</Cell>
                            <Cell>{s.listingDate}</Cell>
                            <Cell>{s.delistingDate}</Cell>
                        </tr>
                    ))}
                />
            )}

            {/* Suspend */}
            {tab === 'suspend' && (
                <DataTable
                    loading={suspendLoading}
                    empty={suspendData?.length === 0}
                    searchEmpty={filterSearch(suspendData, ['code', 'title']).length === 0}
                    columns={['Kode', 'Judul', 'Tanggal', 'Tipe', 'Dokumen']}
                    rows={filterSearch(suspendData, ['code', 'title']).map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3">
                                <Link href={`/analysis/${s.code}.JK`} className="font-mono font-bold text-primary hover:underline">{s.code}</Link>
                            </td>
                            <td className="px-4 py-3 text-foreground max-w-[300px] truncate">{s.title}</td>
                            <Cell>{s.date}</Cell>
                            <Cell>
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                                    s.type === 'Suspend' ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                                )}>{s.type}</span>
                            </Cell>
                            <td className="px-4 py-3 text-right">
                                {s.downloadUrl && (
                                    <a href={s.downloadUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> PDF
                                    </a>
                                )}
                            </td>
                        </tr>
                    ))}
                />
            )}
        </div>
    );
}

function DataTable({ loading, empty, searchEmpty, columns, rows }: {
    loading: boolean; empty: boolean; searchEmpty: boolean;
    columns: string[]; rows: React.ReactNode[];
}) {
    if (loading) return (
        <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
    );
    if (empty) return <EmptyMsg msg="Belum ada data untuk kategori ini." />;
    if (searchEmpty) return <EmptyMsg msg="Tidak ada hasil untuk pencarian." />;

    return (
        <div className="card-flush">
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            {columns.map((c, i) => (
                                <th key={i} className={cn("px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider",
                                    i > 1 ? "text-right" : "text-left")}>{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">{rows}</tbody>
                </table>
            </div>
        </div>
    );
}

function EmptyMsg({ msg }: { msg: string }) {
    return (
        <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
    );
}

function Cell({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return <td className={cn("px-4 py-3", right ? "text-right font-mono" : "text-muted-foreground")}>{children}</td>;
}

function TickerCell({ code, name }: { code: string; name?: string }) {
    return (
        <td className="px-4 py-3">
            <Link href={`/analysis/${code}.JK`} className="font-mono font-bold text-primary hover:underline">{code}</Link>
            {name && <span className="block text-[10px] text-muted-foreground truncate max-w-[180px]">{name}</span>}
        </td>
    );
}
