"use client";

import { useRef, useState } from "react";
import { Share2, Download, Eye, EyeOff, X } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { PrivacyWrapper } from "./PrivacyWrapper";

interface SharePortfolioProps {
    consolidatedItems: any[];
    totals: {
        grandTotal: number;
        profitLoss: number;
        returnPercent: number;
        invested: number;
    };
}

export function SharePortfolio({ consolidatedItems, totals }: SharePortfolioProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

    const cleanTicker = (ticker: string) => ticker.replace('.JK', '');

    const handleShare = async () => {
        if (!exportRef.current) return;

        setIsExporting(true);
        const toastId = toast.loading("Memproses gambar resolusi tinggi...");

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: "#0a0e27",
                scale: 1, // 1080x1920 is native, 1 is enough
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: 1080,
                height: 1920,
            });

            canvas.toBlob((blob) => {
                if (!blob) throw new Error("Gagal membuat blob gambar");
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                const timestamp = new Date().getTime();
                link.download = `porto-hub-snapshot-${timestamp}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Gambar berhasil diunduh!", { id: toastId });
                setIsExporting(false);
            }, "image/png", 1.0);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Gagal mengekspor gambar", { id: toastId });
            setIsExporting(false);
        }
    };

    const sortedItems = [...consolidatedItems].sort((a, b) => b.returnPercent - a.returnPercent);
    const topHoldings = sortedItems.slice(0, 10);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm
          bg-gradient-to-r from-green-500 to-emerald-600 text-white
          border border-green-600 shadow-md hover:from-green-600 hover:to-emerald-700
          active:scale-95 transition-all duration-200"
            >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share Portfolio</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0f172a] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1e293b]">
                            <div>
                                <h2 className="text-xl font-bold text-white">Pratinjau Portofolio</h2>
                                <p className="text-sm text-gray-400">Siap untuk di-share ke Story!</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={togglePrivacyMode}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        isPrivacyMode ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    )}
                                    title={isPrivacyMode ? "Sembunyikan Nilai" : "Tampilkan Nilai"}
                                >
                                    {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-10 items-center justify-center bg-[#0a0f1e]">

                            {/* Visual Preview (Responsive UI) */}
                            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-[#0a0e27] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col p-6 pointer-events-none">
                                <div className="text-center mb-6">
                                    <div className="inline-block px-3 py-1 rounded-full border border-green-500/30 text-green-500 text-[8px] font-black uppercase tracking-widest mb-3">Live Performance</div>
                                    <h3 className="text-xl font-black text-white leading-none tracking-tighter uppercase mb-1">Portfolio<br />Snapshot</h3>
                                    <p className="text-gray-500 text-[10px] font-bold">{consolidatedItems.length} Securities Assets</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[7px] text-gray-500 uppercase font-black mb-1">Total Value</p>
                                        <p className="text-[11px] font-black text-white truncate"><PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(totals.grandTotal)}</PrivacyWrapper></p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[7px] text-gray-500 uppercase font-black mb-1">Total Return</p>
                                        <p className={cn("text-[13px] font-black", totals.profitLoss >= 0 ? "text-green-500" : "text-red-500")}>
                                            {formatPercentage(totals.returnPercent)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-2 content-start">
                                    {topHoldings.slice(0, 10).map((item, idx) => (
                                        <div key={item.ticker} className="bg-white/5 p-3 rounded-xl border border-white/5 relative overflow-hidden h-20 flex flex-col justify-between">
                                            <span className="absolute -right-1 -bottom-2 text-3xl font-black text-white/5 italic select-none">{idx + 1}</span>
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black text-white leading-none">{cleanTicker(item.ticker)}</p>
                                                <p className="text-[6px] text-gray-500 truncate mt-0.5">{item.name}</p>
                                            </div>
                                            <div className="relative z-10">
                                                <p className={cn("text-xs font-black", item.profitLoss >= 0 ? "text-green-500" : "text-red-500")}>
                                                    {formatPercentage(item.returnPercent)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/5 text-center text-[8px] text-gray-600 font-bold uppercase tracking-widest italic">Analysis Done Right • Porto Hub</div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 flex flex-col gap-6 text-white max-w-sm">
                                <div className="space-y-2">
                                    <h4 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic">PREMIUM STORY<br />TEMPLATE</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">Layout 2-kolom yang optimal memastikan sisi kanan tidak kosong dan memenuhi layar Story Anda dengan sempurna.</p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { icon: "🎨", text: "Netflix Inspired Ranking Style" },
                                        { icon: "📸", text: "Ultra High Resolution (1080p)" },
                                        { icon: "🔒", text: "Privacy Mode Protected" }
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 transition-hover hover:border-white/10">
                                            <span className="text-2xl">{feat.icon}</span>
                                            <span className="text-sm font-bold text-gray-200 tracking-wide">{feat.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleShare}
                                    disabled={isExporting}
                                    className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 p-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>MEMPROSES...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-7 h-7" />
                                            <span>UNDUH GAMBAR</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN EXPORT ENGINE (1080x1920) - Must be rendered but invisible */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
                <div
                    ref={exportRef}
                    style={{
                        width: '1080px',
                        height: '1920px',
                        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
                        padding: '80px 60px',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        color: 'white',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header - Compact */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '8px 24px',
                            borderRadius: '50px',
                            border: '2px solid #22c55e',
                            color: '#22c55e',
                            fontWeight: '800',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '4px',
                            marginBottom: '20px'
                        }}>Live Performance</div>
                        <h1 style={{ fontSize: '72px', fontWeight: '900', letterSpacing: '-4px', margin: 0, lineHeight: 0.9, textShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>PORTFOLIO<br />SNAPSHOT</h1>
                        <p style={{ fontSize: '20px', color: '#64748b', marginTop: '16px', fontWeight: '600' }}>{consolidatedItems.length} Securities • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '32px 28px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                            <p style={{ fontSize: '16px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '3px' }}>Total Value</p>
                            <p style={{ fontSize: '44px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{formatIDR(totals.grandTotal)}</PrivacyWrapper>
                            </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '32px 28px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                            <p style={{ fontSize: '16px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '3px' }}>Return</p>
                            <p style={{ fontSize: '48px', fontWeight: '900', margin: 0, color: totals.profitLoss >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-1px' }}>
                                {formatPercentage(totals.returnPercent)}
                            </p>
                            <p style={{ fontSize: '20px', fontWeight: '700', color: totals.profitLoss >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)', marginTop: '8px' }}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>
                                    {totals.profitLoss >= 0 ? '+' : ''}{formatIDR(totals.profitLoss)}
                                </PrivacyWrapper>
                            </p>
                        </div>
                    </div>

                    {/* Holdings Grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignContent: 'start' }}>
                        {topHoldings.slice(0, 10).map((item, idx) => (
                            <div key={item.ticker} style={{
                                background: 'rgba(255,255,255,0.04)',
                                padding: '28px',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '240px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    right: '10px',
                                    bottom: '10px',
                                    fontSize: '120px',
                                    fontWeight: '900',
                                    color: 'rgba(255,255,255,0.12)',
                                    fontStyle: 'italic',
                                    zIndex: 0,
                                    lineHeight: 1,
                                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}>{idx + 1}</span>

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <h4 style={{ fontSize: '36px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-1px' }}>{cleanTicker(item.ticker)}</h4>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0 0', fontWeight: '600', lineHeight: '1.4', wordWrap: 'break-word', whiteSpace: 'normal' }}>{item.name}</p>
                                </div>

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <p style={{ fontSize: '40px', fontWeight: '900', margin: 0, color: item.profitLoss >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-1px' }}>{formatPercentage(item.returnPercent)}</p>
                                    <p style={{ fontSize: '15px', color: '#475569', fontWeight: '700' }}>
                                        <PrivacyWrapper isPrivate={isPrivacyMode}>
                                            {formatIDR(item.marketValue)}
                                        </PrivacyWrapper>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer - Minimal */}
                    <div style={{ marginTop: '30px', padding: '24px 0', borderTop: '2px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#334155', fontWeight: '800', letterSpacing: '6px' }}>PORTO HUB • ANALYSIS DONE RIGHT</p>
                    </div>
                </div>
            </div>
        </>
    );
}
