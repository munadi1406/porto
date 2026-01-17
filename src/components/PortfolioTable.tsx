"use client";

import { useMemo, useState, useRef } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { formatIDR, formatNumber, formatPercentage, cn } from "@/lib/utils";
import { Trash2, Edit2, TrendingUp, TrendingDown, Minus, ArrowRightLeft, Download, FileText, Image as ImageIcon, Shield, ShieldOff, Target } from "lucide-react";
import { StockForm } from "./StockForm";
import { TransactionForm } from "./TransactionForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { exportToPDF, exportToImage } from "@/lib/exportPDF";

interface PortfolioTableProps {
    portfolio: PortfolioItem[];
    marketData: Record<string, StockPrice>;
    onRemove: (id: string) => void;
    onUpdate: (id: string, data: Partial<PortfolioItem>) => void;
    onTransaction: (id: string, type: 'buy' | 'sell', lots: number, price: number) => void;
}

export function PortfolioTable({ portfolio, marketData, onRemove, onUpdate, onTransaction }: PortfolioTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; ticker: string; name: string } | null>(null);
    const [exportTarget, setExportTarget] = useState<PortfolioItem | null>(null);
    const [projectionTarget, setProjectionTarget] = useState<PortfolioItem | null>(null);
    const [isSummarySelected, setIsSummarySelected] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const sortedPortfolio = useMemo(() => {
        return [...portfolio].sort((a, b) => a.ticker.localeCompare(b.ticker));
    }, [portfolio]);

    const handleExportAction = async (item: PortfolioItem, format: 'pdf' | 'image', hideValues: boolean) => {
        setIsExporting(true);

        const quote = marketData[item.ticker];
        const currentPrice = quote?.price || 0;
        const marketValue = item.lots * 100 * currentPrice;
        const initialValue = item.lots * 100 * item.averagePrice;
        const gainLoss = marketValue - initialValue;
        const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
        const isProfit = gainLoss > 0;

        const mask = (val: string) => hideValues ? '••••••••' : val;

        // Create the export element
        const exportEl = document.createElement('div');

        // Base styles for both formats
        exportEl.style.width = format === 'pdf' ? '210mm' : '600px';
        exportEl.style.padding = '48px';
        exportEl.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
        exportEl.style.background = '#0f172a';
        exportEl.style.color = '#f8fafc';
        exportEl.style.boxSizing = 'border-box';
        exportEl.style.position = 'relative';

        exportEl.innerHTML = `
            <div style="position: relative; z-index: 10;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Investment Report</div>
                        <div style="font-size: 32px; font-weight: 900; letter-spacing: -1.5px; line-height: 1; color: #ffffff; margin-bottom: 4px;">${item.ticker}</div>
                        <div style="font-size: 14px; color: #cbd5e1; font-weight: 500;">${quote?.name || item.name}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="display: inline-flex; align-items: center; gap: 8px; background: ${isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isProfit ? '#10b981' : '#f87171'}; padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 14px; border: 1px solid ${isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};">
                            ${isProfit ? '▲' : '▼'} ${formatPercentage(Math.abs(gainLossPercent))}
                        </div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 10px; font-weight: 600;">${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>

                <!-- Big Percentage (Hero) -->
                <div style="text-align: center; margin: 32px 0; padding: 40px 24px; background: rgba(30, 41, 59, 0.3); border-radius: 32px; border: 1px solid rgba(255, 255, 255, 0.05);">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 16px;">Growth Performance</div>
                    <div style="font-size: 84px; font-weight: 950; letter-spacing: -4px; line-height: 1.1; color: ${isProfit ? '#10b981' : '#f87171'};">
                        ${isProfit ? '+' : ''}${formatPercentage(gainLossPercent)}
                    </div>
                </div>

                <!-- Summary Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
                    <div style="padding: 20px; background: #1e293b; border: 1px solid #334155; border-radius: 20px;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Market Value</div>
                        <div style="font-size: 20px; font-weight: 800; color: #ffffff;">${mask(formatIDR(marketValue))}</div>
                    </div>
                    <div style="padding: 20px; background: #1e293b; border: 1px solid #334155; border-radius: 20px;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Unrealized P/L</div>
                        <div style="font-size: 20px; font-weight: 800; color: ${isProfit ? '#10b981' : '#f87171'};">${hideValues ? '••••••••' : (isProfit ? '+' : '') + formatIDR(gainLoss)}</div>
                    </div>
                </div>

                <!-- Details List -->
                <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 20px; padding: 4px 0; margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid #334155;">
                        <span style="color: #cbd5e1; font-size: 13px; font-weight: 500;">Holdings</span>
                        <span style="font-weight: 700; color: #f1f5f9; font-size: 13px;">${formatNumber(item.lots)} Lot <span style="font-size: 11px; color: #94a3b8; font-weight: 500; margin-left: 4px;">(${formatNumber(item.lots * 100)} Lbr)</span></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid #334155;">
                        <span style="color: #cbd5e1; font-size: 13px; font-weight: 500;">Average Buy</span>
                        <span style="font-weight: 700; color: #f1f5f9; font-size: 13px;">${formatIDR(item.averagePrice)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid #334155;">
                        <span style="color: #cbd5e1; font-size: 13px; font-weight: 500;">Market Price</span>
                        <span style="font-weight: 700; color: #f1f5f9; font-size: 13px;">${formatIDR(currentPrice)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 14px 24px;">
                        <span style="color: #cbd5e1; font-size: 13px; font-weight: 500;">Total Investment</span>
                        <span style="font-weight: 700; color: #f1f5f9; font-size: 13px;">${mask(formatIDR(initialValue))}</span>
                    </div>
                </div>

                <!-- Footer -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 24px;">
                    <div style="font-size: 16px; font-weight: 900; color: #60a5fa; letter-spacing: -0.5px;">ANTIGRAVITY<span style="color: #ffffff; margin-left: 4px;">PORTO</span></div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 1px;">PROFESSIONAL DASHBOARD</div>
                </div>
            </div>
        `;

        document.body.appendChild(exportEl);

        try {
            if (format === 'pdf') {
                exportToPDF(exportEl, { title: `${item.ticker}_Report` });
            } else {
                await exportToImage(exportEl, { fileName: `${item.ticker}_Profit_Card` });
            }
        } finally {
            document.body.removeChild(exportEl);
            setIsExporting(false);
            setExportTarget(null);
        }
    };

    const handleExportPortfolioAction = async (portfolioItems: PortfolioItem[], market: Record<string, StockPrice>, format: 'pdf' | 'image', hideValues: boolean = false) => {
        setIsExporting(true);

        let totalInvested = 0;
        let totalMarketValue = 0;

        portfolioItems.forEach((item) => {
            const livePrice = market[item.ticker]?.price || 0;
            const shares = item.lots * 100;
            totalInvested += item.averagePrice * shares;
            totalMarketValue += livePrice * shares;
        });

        const totalGainLoss = totalMarketValue - totalInvested;
        const totalReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        const isProfit = totalGainLoss >= 0;
        const mask = (val: string) => hideValues ? '••••••••' : val;

        const exportEl = document.createElement('div');
        exportEl.style.width = '500px';
        exportEl.style.padding = '48px';
        exportEl.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
        exportEl.style.background = '#0f172a';
        exportEl.style.color = '#ffffff';
        exportEl.style.boxSizing = 'border-box';
        exportEl.style.position = 'relative';

        exportEl.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 12px; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 40px;">Portfolio Summary</div>
                
                <div style="margin-bottom: 56px; padding: 20px 10px; display: flex; flex-direction: column; align-items: center; gap: 24px;">
                    <div style="font-size: 72px; font-weight: 950; letter-spacing: -3px; line-height: 1.1; color: ${isProfit ? '#10b981' : '#f87171'};">
                        ${isProfit ? '+' : ''}${formatPercentage(totalReturn)}
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;">Overall Portfolio Return</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; text-align: left;">
                    <div style="padding: 24px; background: #1e293b; border: 1px solid #334155; border-radius: 24px;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Total Assets</div>
                        <div style="font-size: 20px; font-weight: 800;">${mask(formatIDR(totalMarketValue))}</div>
                    </div>
                    <div style="padding: 24px; background: #1e293b; border: 1px solid #334155; border-radius: 24px;">
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Total P/L</div>
                        <div style="font-size: 20px; font-weight: 800; color: ${isProfit ? '#10b981' : '#f87171'};">${mask((isProfit ? '+' : '') + formatIDR(totalGainLoss))}</div>
                    </div>
                </div>

                <!-- Asset List -->
                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid #334155; border-radius: 24px; padding: 20px; text-align: left;">
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px;">Top Performing Assets</div>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${[...portfolioItems]
                .map(item => {
                    const livePrice = market[item.ticker]?.price || 0;
                    const itemPL = item.averagePrice > 0 ? (livePrice - item.averagePrice) / item.averagePrice * 100 : 0;
                    return { ...item, gain: itemPL, name: market[item.ticker]?.name || item.name };
                })
                .sort((a, b) => b.gain - a.gain)
                .slice(0, 6)
                .map(item => {
                    const isItemProfit = item.gain >= 0;
                    return `
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="width: 4px; height: 32px; background: ${isItemProfit ? '#10b981' : '#ef4444'}; border-radius: 2px;"></div>
                                            <div>
                                                <div style="font-weight: 900; font-size: 15px; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2;">
                                                    ${item.ticker}
                                                    <span style="font-size: 10px; color: #94a3b8; font-weight: 700; margin-left: 8px;">
                                                        ${mask(`${formatNumber(item.lots)} Lot`)}
                                                        <span style="color: #cbd5e1; margin-left: 4px; opacity: 0.6;">(${mask(`${formatNumber(item.lots * 100)} Lbr`)})</span>
                                                    </span>
                                                </div>
                                                <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">${item.name}</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 800; font-size: 14px; color: ${isItemProfit ? '#10b981' : '#f87171'};">
                                                ${isItemProfit ? '▲' : '▼'} ${formatPercentage(Math.abs(item.gain))}
                                            </div>
                                        </div>
                                    </div>
                                `;
                }).join('')}
                    </div>
                </div>

                <div style="margin-top: 40px; border-top: 1px solid #334155; padding-top: 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 18px; font-weight: 950; color: #60a5fa; letter-spacing: -0.5px;">ANTIGRAVITY<span style="color: #ffffff; margin-left: 4px;">PORTO</span></div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 700;">${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
            </div>
        `;

        document.body.appendChild(exportEl);
        try {
            await exportToImage(exportEl, { fileName: `Portfolio_Summary_Card` });
        } finally {
            document.body.removeChild(exportEl);
            setIsExporting(false);
        }
    };


    if (portfolio.length === 0) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="mx-auto w-12 h-12 text-gray-400 mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Belum ada investasi</h3>
                <p className="text-gray-500 dark:text-gray-400">Tambahkan saham pertama Anda untuk mulai memantau.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Aset</h2>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Monitoring performa per aset</p>
                </div>
                <button
                    disabled={isExporting}
                    onClick={() => setIsSummarySelected(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Share Return</span>
                </button>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                {/* Modal Edit */}
                {editingId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Edit Saham</h3>
                            <StockForm
                                initialData={portfolio.find(p => p.id === editingId)}
                                isEdit={true}
                                onSubmit={(data) => {
                                    onUpdate(editingId, data);
                                    setEditingId(null);
                                }}
                                onCancel={() => setEditingId(null)}
                            />
                        </div>
                    </div>
                )}

                {/* Modal Transaksi */}
                {transactionId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Beli/Jual Saham</h3>
                            <TransactionForm
                                item={portfolio.find(p => p.id === transactionId)!}
                                currentPrice={marketData[portfolio.find(p => p.id === transactionId)!.ticker]?.price || 0}
                                onConfirm={(id, type, lots, price) => {
                                    onTransaction(id, type, lots, price);
                                    setTransactionId(null);
                                }}
                                onCancel={() => setTransactionId(null)}
                            />
                        </div>
                    </div>
                )}

                {/* Modal Opsi Export Modern (Individual) */}
                {exportTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden relative">
                            {/* Background Decoration */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                            <div className="relative">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
                                        <Download className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Export Laporan</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{exportTarget.ticker} — {marketData[exportTarget.ticker]?.name || exportTarget.name}</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Format Selection */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            disabled={isExporting}
                                            onClick={() => handleExportAction(exportTarget, 'pdf', false)}
                                            className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-600 rounded-2xl transition-all group"
                                        >
                                            <FileText className="w-6 h-6 text-red-500" />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">PDF Report</span>
                                        </button>
                                        <button
                                            disabled={isExporting}
                                            onClick={() => handleExportAction(exportTarget, 'image', false)}
                                            className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-100 dark:border-gray-600 rounded-2xl transition-all group"
                                        >
                                            <ImageIcon className="w-6 h-6 text-purple-500" />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Profit Card</span>
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />

                                    {/* Privacy Mode */}
                                    <button
                                        disabled={isExporting}
                                        onClick={() => handleExportAction(exportTarget, 'image', true)}
                                        className="w-full flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Mode Privasi</div>
                                            <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Sembunyikan Nilai Investasi</div>
                                        </div>
                                    </button>

                                    <button
                                        disabled={isExporting}
                                        onClick={() => setExportTarget(null)}
                                        className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {isExporting ? 'Memproses...' : 'Batal'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Opsi Export Modern (Summary) */}
                {isSummarySelected && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden relative">
                            {/* Background Decoration */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

                            <div className="relative text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl -rotate-3">
                                    <ImageIcon className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Portfolio Summary</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Bagikan ringkasan performa Anda</p>

                                <div className="mt-8 space-y-4">
                                    <button
                                        disabled={isExporting}
                                        onClick={async () => {
                                            await handleExportPortfolioAction(portfolio, marketData, 'image', false);
                                            setIsSummarySelected(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-600 rounded-2xl transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="text-left font-bold text-gray-900 dark:text-white">Normal Card</div>
                                    </button>

                                    <button
                                        disabled={isExporting}
                                        onClick={async () => {
                                            await handleExportPortfolioAction(portfolio, marketData, 'image', true);
                                            setIsSummarySelected(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Mode Privasi</div>
                                    </button>

                                    <button
                                        disabled={isExporting}
                                        onClick={() => setIsSummarySelected(false)}
                                        className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {isExporting ? 'Memproses...' : 'Batal'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th className="px-4 md:px-6 py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Saham</th>
                            <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Lot</th>
                            <th className="hidden lg:table-cell px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Avg Price</th>
                            <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Current</th>
                            <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Value</th>
                            <th className="hidden md:table-cell px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Unrealized P/L</th>
                            <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Return</th>
                            <th className="px-4 md:px-6 py-4 text-center text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sortedPortfolio.map((item) => {
                            const quote = marketData[item.ticker];
                            const currentPrice = quote?.price || 0;
                            const marketValue = item.lots * 100 * currentPrice;
                            const initialValue = item.lots * 100 * item.averagePrice;
                            const gainLoss = marketValue - initialValue;
                            const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
                            const isProfit = gainLoss > 0;
                            const isLoss = gainLoss < 0;

                            return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-white leading-none mb-1 text-sm md:text-base">{item.ticker}</div>
                                        <div className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tight line-clamp-1">{quote?.name || item.name}</div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right font-bold text-gray-700 dark:text-gray-300 text-sm">
                                        {formatNumber(item.lots)}
                                    </td>
                                    <td className="hidden lg:table-cell px-4 md:px-6 py-4 text-right text-gray-500 dark:text-gray-400 text-xs font-medium">
                                        {formatIDR(item.averagePrice)}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right font-bold text-gray-900 dark:text-white text-sm">
                                        {currentPrice > 0 ? formatIDR(currentPrice) : '...'}
                                    </td>
                                    <td className="hidden sm:table-cell px-4 md:px-6 py-4 text-right font-bold text-gray-900 dark:text-white text-sm">
                                        {formatIDR(marketValue)}
                                    </td>
                                    <td className="hidden md:table-cell px-4 md:px-6 py-4 text-right">
                                        <div className={cn(
                                            "font-bold text-sm",
                                            isProfit && "text-emerald-500",
                                            isLoss && "text-rose-500",
                                            !isProfit && !isLoss && "text-gray-500"
                                        )}>
                                            {gainLoss > 0 ? "+" : ""}{formatIDR(gainLoss)}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <div className={cn(
                                            "inline-flex items-center gap-1 font-black text-[10px] md:text-xs px-2 py-1 rounded-lg",
                                            isProfit && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                                            isLoss && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                                        )}>
                                            {formatPercentage(gainLossPercent)}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => setProjectionTarget(item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Proyeksi Harga"><Target className="w-4 h-4" /></button>
                                            <button onClick={() => setExportTarget(item)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" title="Export PDF/Image"><Download className="w-4 h-4" /></button>
                                            <button onClick={() => setTransactionId(item.id)} className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Beli/Jual"><ArrowRightLeft className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingId(item.id)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteConfirm({ id: item.id, ticker: item.ticker, name: item.name })} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Modal Proyeksi Harga */}
                {projectionTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/20 dark:border-gray-700 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Price Projection</h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">{projectionTarget.ticker} — {marketData[projectionTarget.ticker]?.name || projectionTarget.name}</p>
                                </div>
                                <button onClick={() => setProjectionTarget(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    <Minus className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Avg Price</div>
                                        <div className="text-lg font-black dark:text-white">{formatIDR(projectionTarget.averagePrice)}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Current Price</div>
                                        <div className="text-lg font-black dark:text-white">{formatIDR(marketData[projectionTarget.ticker]?.price || 0)}</div>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Target Projections</div>
                                    <div className="grid gap-3">
                                        {(() => {
                                            const current = marketData[projectionTarget.ticker]?.price || 0;
                                            const high52 = marketData[projectionTarget.ticker]?.high52w || 0;

                                            const targetPoints = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 10000];
                                            const targets = new Set<number>();

                                            if (high52 > current) targets.add(high52);

                                            // Add percentage based targets
                                            [0.1, 0.25, 0.5, 1, 2].forEach(p => {
                                                const pt = Math.round(current * (1 + p));
                                                targets.add(pt);
                                            });

                                            // Add nearest round numbers from targetPoints
                                            targetPoints.forEach(tp => {
                                                if (tp > current && tp < current * 5) targets.add(tp);
                                            });

                                            return Array.from(targets).sort((a, b) => a - b).slice(0, 8).map(target => {
                                                const gain = (target - projectionTarget.averagePrice) / projectionTarget.averagePrice * 100;
                                                const profitValue = (target - projectionTarget.averagePrice) * (projectionTarget.lots * 100);
                                                const isHigh52 = Math.abs(target - high52) < 0.01;

                                                return (
                                                    <div key={target} className={cn(
                                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                        isHigh52 ? "bg-amber-500/5 border-amber-500/20" : "bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800"
                                                    )}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-1.5 h-10 rounded-full", gain >= 0 ? "bg-emerald-500" : "bg-rose-500")} />
                                                            <div>
                                                                <div className="text-lg font-black dark:text-white flex items-center gap-2">
                                                                    {formatIDR(target)}
                                                                    {isHigh52 && <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold border border-amber-500/20">52W High</span>}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Target Price</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={cn("text-lg font-black leading-tight", gain >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                {gain >= 0 ? "+" : ""}{formatPercentage(gain)}
                                                            </div>
                                                            <div className={cn("text-[11px] font-bold mt-0.5", gain >= 0 ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-rose-600/80 dark:text-rose-400/80")}>
                                                                {gain >= 0 ? "+" : ""}{formatIDR(profitValue)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setProjectionTarget(null)}
                                className="w-full mt-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                Tutup Proyeksi
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Konfirmasi Hapus */}
                <ConfirmDialog
                    isOpen={deleteConfirm !== null}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => {
                        if (deleteConfirm) {
                            onRemove(deleteConfirm.id);
                            setDeleteConfirm(null);
                        }
                    }}
                    title="Hapus Saham?"
                    message={`Keluarkan ${deleteConfirm?.ticker} (${deleteConfirm?.name}) dari portfolio Anda?`}
                />
            </div>
        </div>
    );
}
