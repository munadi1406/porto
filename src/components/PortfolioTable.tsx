"use client";

import { useMemo, useState, useRef } from "react";
import { PortfolioItem, StockPrice } from "@/lib/types";
import { formatIDR, formatNumber, formatPercentage, cn } from "@/lib/utils";
import { Trash2, Edit2, TrendingUp, TrendingDown, ArrowRightLeft, Download, FileText, Image as ImageIcon, Shield, Target, Calculator } from "lucide-react";
import { StockForm } from "./StockForm";
import { TransactionForm } from "./TransactionForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { exportToPDF, exportToImage } from "@/lib/exportPDF";
import { AvgDownModal } from "./AvgDownModal";
import { useCompanyNames } from "@/hooks/useCompanyNames";
import { useFlash } from "@/hooks/useFlash";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Teks dengan flash hijau/merah saat nilai berubah (hook-safe per baris)
function FlashText({ value, text, className }: { value: number; text: string; className?: string }) {
    const flash = useFlash(value);
    return (
        <span className={cn(
            "inline-block rounded px-1 -mx-1",
            flash === "up" && "flash-up",
            flash === "down" && "flash-down",
            className
        )}>
            {text}
        </span>
    );
}

interface PortfolioTableProps {
    portfolio: PortfolioItem[];    marketData: Record<string, StockPrice>;
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
    const [avgDownTarget, setAvgDownTarget] = useState<PortfolioItem | null>(null);
    const [isSummarySelected, setIsSummarySelected] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const tickerList = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
    const companyNames = useCompanyNames(tickerList);

    // Random harmonious color palette for export cards
    interface CardPalette {
        bg: string; cardBg: string; textPrimary: string; textSecondary: string;
        textTertiary: string; border: string; accent: string;
        gradientFrom: string; gradientTo: string;
    }
    const palettes: CardPalette[] = [
        { bg:'#ffffff', cardBg:'#fafafa', textPrimary:'#18181b', textSecondary:'#71717a', textTertiary:'#a1a1aa', border:'#f0f0f0', accent:'#18181b', gradientFrom:'#18181b', gradientTo:'#52525b' },
        { bg:'#fefcf5', cardBg:'#faf6ed', textPrimary:'#1c1917', textSecondary:'#78716c', textTertiary:'#a8a29e', border:'#e7e5e4', accent:'#1c1917', gradientFrom:'#d97706', gradientTo:'#fbbf24' },
        { bg:'#f8fafc', cardBg:'#f1f5f9', textPrimary:'#0f172a', textSecondary:'#64748b', textTertiary:'#94a3b8', border:'#e2e8f0', accent:'#0f172a', gradientFrom:'#3b82f6', gradientTo:'#93c5fd' },
        { bg:'#faf5ff', cardBg:'#f3e8ff', textPrimary:'#1a1a2e', textSecondary:'#7c3aed', textTertiary:'#a78bfa', border:'#e9d5ff', accent:'#1a1a2e', gradientFrom:'#7c3aed', gradientTo:'#c084fc' },
        { bg:'#f0fdf4', cardBg:'#dcfce7', textPrimary:'#052e16', textSecondary:'#166534', textTertiary:'#4ade80', border:'#bbf7d0', accent:'#052e16', gradientFrom:'#16a34a', gradientTo:'#86efac' },
        { bg:'#fef2f2', cardBg:'#fee2e2', textPrimary:'#1f1315', textSecondary:'#9f1239', textTertiary:'#fb7185', border:'#fecaca', accent:'#1f1315', gradientFrom:'#e11d48', gradientTo:'#fda4af' },
        { bg:'#f0f9ff', cardBg:'#e0f2fe', textPrimary:'#0c4a6e', textSecondary:'#0369a1', textTertiary:'#7dd3fc', border:'#bae6fd', accent:'#0c4a6e', gradientFrom:'#0284c7', gradientTo:'#60a5fa' },
        { bg:'#fff7ed', cardBg:'#ffedd5', textPrimary:'#1a1625', textSecondary:'#9a5531', textTertiary:'#fdba74', border:'#fed7aa', accent:'#1a1625', gradientFrom:'#ea580c', gradientTo:'#fb923c' },
    ];
    const paletteRef = useRef<CardPalette>(palettes[Math.floor(Math.random() * palettes.length)]);

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

        const pal2 = paletteRef.current;

        const exportEl = document.createElement('div');
        exportEl.style.width = format === 'pdf' ? '210mm' : '500px';
        exportEl.style.padding = '0';
        exportEl.style.fontFamily = "-apple-system, 'Helvetica Neue', system-ui, sans-serif";
        exportEl.style.background = pal2.bg;
        exportEl.style.boxSizing = 'border-box';
        exportEl.style.position = 'relative';
        exportEl.style.overflow = 'hidden';
        exportEl.style.borderRadius = '24px';

        const prc = isProfit ? '#059669' : '#dc2626';
        const prcl = isProfit ? '#ecfdf5' : '#fef2f2';

        exportEl.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <!-- Accent bar -->
                <div style="height: 4px; background: linear-gradient(90deg, ${pal2.gradientFrom}, ${pal2.gradientTo});"></div>

                <div style="padding: 32px 32px 0 32px;">

                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <div style="width: 7px; height: 7px; border-radius: 50%; background: ${prc};"></div>
                                <span style="font-size: 11px; font-weight: 500; color: ${pal2.textSecondary}; letter-spacing: 0.02em; text-transform: uppercase;">Asset Report</span>
                            </div>
                            <div style="font-size: 22px; font-weight: 700; color: ${pal2.textPrimary}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${item.ticker.replace('.JK', '')}</div>
                            <div style="font-size: 11px; font-weight: 400; color: ${pal2.textTertiary}; margin-top: 2px;">${quote?.name || item.name}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 22px; font-weight: 700; color: ${prc}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                                ${formatPercentage(gainLossPercent)}
                            </div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal2.textTertiary}; margin-top: 2px;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                    </div>

                    <!-- Return Hero -->
                    <div style="background: linear-gradient(135deg, ${prcl} 0%, #ffffff 80%); border-radius: 20px; padding: 24px 20px; margin-bottom: 24px; text-align: center;">
                        <span style="font-size: 10px; font-weight: 500; color: ${pal2.textSecondary}; letter-spacing: 0.02em; text-transform: uppercase;">Return</span>
                        <div style="font-size: 48px; font-weight: 700; color: ${prc}; letter-spacing: -0.03em; line-height: 1.1; margin-top: 6px; font-feature-settings: 'tnum' 1; text-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                            ${formatPercentage(gainLossPercent)}
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px;">
                        <div style="background: ${pal2.cardBg}; border-radius: 14px; padding: 16px 18px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal2.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px;">Market Value</div>
                            <div style="font-size: 17px; font-weight: 600; color: ${pal2.textPrimary}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${mask(formatIDR(marketValue))}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal2.textTertiary}; margin-top: 2px;">Current price × shares</div>
                        </div>
                        <div style="background: ${pal2.cardBg}; border-radius: 14px; padding: 16px 18px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal2.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px;">P/L</div>
                            <div style="font-size: 17px; font-weight: 600; color: ${prc}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${hideValues ? '••••••••' : (isProfit ? '+' : '') + formatIDR(gainLoss)}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal2.textTertiary}; margin-top: 2px;">Unrealized gain</div>
                        </div>
                    </div>
                </div>

                <!-- Details Section -->
                <div style="padding: 0 32px;">
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${pal2.border};">
                            <span style="font-size: 12px; font-weight: 400; color: ${pal2.textSecondary};">Holdings</span>
                            <span style="font-size: 13px; font-weight: 500; color: ${pal2.textPrimary}; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${formatNumber(item.lots)} lot <span style="font-weight: 400; color: ${pal2.textTertiary};">(${formatNumber(item.lots * 100)} shares)</span></span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${pal2.border};">
                            <span style="font-size: 12px; font-weight: 400; color: ${pal2.textSecondary};">Avg Price</span>
                            <span style="font-size: 13px; font-weight: 500; color: ${pal2.textPrimary}; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${formatIDR(item.averagePrice)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${pal2.border};">
                            <span style="font-size: 12px; font-weight: 400; color: ${pal2.textSecondary};">Current</span>
                            <span style="font-size: 13px; font-weight: 500; color: ${pal2.textPrimary}; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${formatIDR(currentPrice)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 14px 0;">
                            <span style="font-size: 12px; font-weight: 400; color: ${pal2.textSecondary};">Cost Basis</span>
                            <span style="font-size: 13px; font-weight: 500; color: ${pal2.textPrimary}; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${mask(formatIDR(initialValue))}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="padding: 20px 32px 32px 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid ${pal2.border};">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${pal2.textPrimary};"></div>
                            <span style="font-size: 13px; font-weight: 600; color: ${pal2.textPrimary}; letter-spacing: -0.02em;">Porto</span>
                        </div>
                        <span style="font-size: 9px; font-weight: 500; color: ${pal2.textTertiary}; letter-spacing: 0.05em; text-transform: uppercase;">Asset Detail</span>
                    </div>
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

        const pal = paletteRef.current;

        const exportEl = document.createElement('div');
        exportEl.style.width = '500px';
        exportEl.style.padding = '0';
        exportEl.style.fontFamily = "-apple-system, 'Helvetica Neue', system-ui, sans-serif";
        exportEl.style.background = pal.bg;
        exportEl.style.boxSizing = 'border-box';
        exportEl.style.position = 'relative';
        exportEl.style.overflow = 'hidden';
        exportEl.style.borderRadius = '24px';

        const rc = isProfit ? '#059669' : '#dc2626';
        const rclight = isProfit ? '#ecfdf5' : '#fef2f2';

        exportEl.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <!-- Accent bar -->
                <div style="height: 4px; background: linear-gradient(90deg, ${pal.gradientFrom}, ${pal.gradientTo});"></div>

                <div style="padding: 36px 36px 0 36px;">

                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${rc};"></div>
                            <span style="font-size: 13px; font-weight: 500; color: ${pal.textPrimary}; letter-spacing: -0.01em;">Portfolio</span>
                        </div>
                            <span style="font-size: 11px; font-weight: 400; color: ${pal.textTertiary};">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <!-- Return Hero -->
                    <div style="background: linear-gradient(135deg, ${rclight} 0%, #ffffff 80%); border-radius: 20px; padding: 28px 24px; margin-bottom: 24px; text-align: center;">
                        <span style="font-size: 11px; font-weight: 500; color: ${pal.textSecondary}; letter-spacing: 0.02em; text-transform: uppercase;">Total Return</span>
                        <div style="font-size: 56px; font-weight: 700; color: ${rc}; letter-spacing: -0.03em; line-height: 1.1; margin-top: 8px; font-feature-settings: 'tnum' 1; text-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                            ${formatPercentage(totalReturn)}
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px;">
                        <div style="background: ${pal.cardBg}; border-radius: 16px; padding: 18px 20px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">Total Value</div>
                            <div style="font-size: 18px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${mask(formatIDR(totalMarketValue))}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; margin-top: 2px;">Market value</div>
                        </div>
                        <div style="background: ${pal.cardBg}; border-radius: 16px; padding: 18px 20px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">P/L</div>
                            <div style="font-size: 18px; font-weight: 600; color: ${rc}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${mask((isProfit ? '+' : '') + formatIDR(totalGainLoss))}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; margin-top: 2px;">Unrealized</div>
                        </div>
                        <div style="background: ${pal.cardBg}; border-radius: 16px; padding: 18px 20px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">Invested</div>
                            <div style="font-size: 18px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${mask(formatIDR(totalInvested))}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; margin-top: 2px;">Total cost basis</div>
                        </div>
                        <div style="background: ${pal.cardBg}; border-radius: 16px; padding: 18px 20px;">
                            <div style="font-size: 10px; font-weight: 500; color: ${pal.textSecondary}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">Assets</div>
                            <div style="font-size: 18px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">${portfolioItems.length}</div>
                            <div style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; margin-top: 2px;">Total holdings</div>
                        </div>
                    </div>
                </div>

                <!-- Holdings Section -->
                <div style="padding: 0 36px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding-bottom: 12px; border-bottom: 1px solid ${pal.border};">
                        <span style="font-size: 11px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: 0.02em; text-transform: uppercase;">Holdings</span>
                        <span style="font-size: 10px; font-weight: 500; color: ${pal.textTertiary}; text-transform: uppercase; letter-spacing: 0.03em;">Return</span>
                    </div>

                    ${[...portfolioItems]
                .map(item => {
                    const livePrice = market[item.ticker]?.price || 0;
                    const itemPL = item.averagePrice > 0 ? (livePrice - item.averagePrice) / item.averagePrice * 100 : 0;
                    return { ...item, gain: itemPL, name: market[item.ticker]?.name || companyNames[item.ticker] || item.name };
                })
                .sort((a, b) => b.gain - a.gain)
                .slice(0, 5)
                .map((item, idx) => {
                    const isItemProfit = item.gain >= 0;
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; ${idx < Math.min(portfolioItems.length - 1, 4) ? 'border-bottom: 1px solid ' + pal.border : ''};">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                                <span style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; width: 16px; flex-shrink: 0;">${idx + 1}</span>
                                <div style="min-width: 0; flex: 1;">
                                    <div style="font-size: 13px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                                        ${item.ticker.replace('.JK', '')}
                                        <span style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; margin-left: 6px;">${mask(`${formatNumber(item.lots)} lot`)}</span>
                                    </div>
                                    <div style="font-size: 10px; font-weight: 400; color: ${pal.textTertiary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${item.name}</div>
                                </div>
                            </div>
                            <div style="font-size: 13px; font-weight: 600; color: ${isItemProfit ? '#059669' : '#dc2626'}; white-space: nowrap; margin-left: 12px; letter-spacing: -0.01em; text-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                                ${formatPercentage(item.gain)}
                            </div>
                        </div>
                    `;
                }).join('')}
                </div>

                <!-- Footer -->
                <div style="padding: 24px 36px 36px 36px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid ${pal.border};">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${pal.textPrimary};"></div>
                            <span style="font-size: 13px; font-weight: 600; color: ${pal.textPrimary}; letter-spacing: -0.02em;">Porto</span>
                        </div>
                        <span style="font-size: 9px; font-weight: 500; color: ${pal.textTertiary}; letter-spacing: 0.05em; text-transform: uppercase;">Portfolio Overview</span>
                    </div>
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
            <Card className="p-12 text-center">
                <div className="mx-auto w-10 h-10 text-muted-foreground mb-2 bg-muted rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <p className="font-medium mb-1">Belum ada investasi</p>
                <p className="text-sm text-muted-foreground">Tambahkan saham pertama Anda.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-lg font-bold">Daftar Aset</p>
                    <p className="text-xs text-muted-foreground">Monitoring performa per aset</p>
                </div>
                <Button disabled={isExporting} onClick={() => setIsSummarySelected(true)}>
                    <ImageIcon className="w-3.5 h-3.5 mr-1" />Share Return
                </Button>
            </div>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-left">Saham</TableHead>
                            <TableHead className="text-right">Lot</TableHead>
                            <TableHead className="text-right">Avg Price</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">Day Chg</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right">P/L</TableHead>
                            <TableHead className="text-right">Return</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedPortfolio.map((item) => {
                            const quote = marketData[item.ticker];
                            const currentPrice = quote?.price || 0;
                            const marketValue = item.lots * 100 * currentPrice;
                            const initialValue = item.lots * 100 * item.averagePrice;
                            const gainLoss = marketValue - initialValue;
                            const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
                            const isProfit = gainLoss > 0;
                            const isLoss = gainLoss < 0;

                            const dailyChangeValue = (quote?.change || 0) * (item.lots * 100);
                            const dailyChangePercent = quote?.changePercent || 0;
                            const isDayProfit = dailyChangeValue > 0;
                            const isDayLoss = dailyChangeValue < 0;

                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono font-bold text-primary mr-1 mb-0.5">{item.ticker}</Badge>
                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider truncate max-w-[150px]">{quote?.name || companyNames[item.ticker] || item.name}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{formatNumber(item.lots)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatIDR(item.averagePrice)}</TableCell>
                                    <TableCell className="text-right">
                                        <FlashText value={currentPrice} text={currentPrice > 0 ? formatIDR(currentPrice) : '...'} className="font-semibold" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("font-semibold", isDayProfit && "text-success", isDayLoss && "text-destructive")}>
                                            {dailyChangeValue > 0 ? "+" : ""}{formatIDR(dailyChangeValue)}
                                        </div>
                                        <div className={cn("text-[10px]", isDayProfit && "text-success", isDayLoss && "text-destructive")}>
                                            {formatPercentage(dailyChangePercent)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{formatIDR(marketValue)}</TableCell>
                                    <TableCell className="text-right">
                                        <FlashText value={gainLoss} text={`${gainLoss > 0 ? "+" : ""}${formatIDR(gainLoss)}`} className={cn("font-semibold", isProfit && "text-success", isLoss && "text-destructive")} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={isProfit ? "default" : isLoss ? "destructive" : "secondary"} className={cn("font-semibold text-xs", isProfit && "bg-success/15 text-success hover:bg-success/20 hover:text-success")}>
                                            {formatPercentage(gainLossPercent)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setProjectionTarget(item)} title="Proyeksi Harga"><Target className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvgDownTarget(item)} title="Average Down"><Calculator className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExportTarget(item)} title="Export"><Download className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTransactionId(item.id)} title="Beli/Jual"><ArrowRightLeft className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(item.id)} title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm({ id: item.id, ticker: item.ticker, name: item.name })} title="Hapus"><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        {(() => {
                            const totals = sortedPortfolio.reduce((acc, item) => {
                                const quote = marketData[item.ticker];
                                const currentPrice = quote?.price || 0;
                                const change = quote?.change || 0;
                                const marketValue = item.lots * 100 * currentPrice;
                                const initialValue = item.lots * 100 * item.averagePrice;
                                const gainLoss = marketValue - initialValue;

                                acc.marketValue += marketValue;
                                acc.dayChange += (item.lots * 100 * change);
                                acc.unrealizedPL += gainLoss;
                                return acc;
                            }, { marketValue: 0, dayChange: 0, unrealizedPL: 0 });

                            const dayChangePercent = (totals.marketValue - totals.dayChange) > 0
                                ? (totals.dayChange / (totals.marketValue - totals.dayChange)) * 100
                                : 0;

                            const isDayProfit = totals.dayChange > 0;
                            const isDayLoss = totals.dayChange < 0;

                            return (
                                <TableRow>
                                    <TableCell className="card-title">Total Portofolio</TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("font-semibold", isDayProfit && "text-success", isDayLoss && "text-destructive")}>
                                            {totals.dayChange > 0 ? "+" : ""}{formatIDR(totals.dayChange)}
                                        </div>
                                        <div className={cn("text-[10px]", isDayProfit && "text-success", isDayLoss && "text-destructive")}>
                                            {formatPercentage(dayChangePercent)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">{formatIDR(totals.marketValue)}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        <span className={cn(totals.unrealizedPL > 0 ? "text-success" : totals.unrealizedPL < 0 ? "text-destructive" : "")}>
                                            {totals.unrealizedPL > 0 ? "+" : ""}{formatIDR(totals.unrealizedPL)}
                                        </span>
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            );
                        })()}
                    </TableFooter>
                </Table>
            </Card>

            <Dialog open={editingId !== null} onOpenChange={() => setEditingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Saham</DialogTitle>
                    </DialogHeader>
                    {editingId && (
                        <StockForm
                            initialData={portfolio.find(p => p.id === editingId)}
                            isEdit={true}
                            onSubmit={(data) => {
                                onUpdate(editingId, data);
                                setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={transactionId !== null} onOpenChange={() => setTransactionId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Beli/Jual Saham</DialogTitle>
                    </DialogHeader>
                    {transactionId && (
                        <TransactionForm
                            item={portfolio.find(p => p.id === transactionId)!}
                            currentPrice={marketData[portfolio.find(p => p.id === transactionId)!.ticker]?.price || 0}
                            onConfirm={(id, type, lots, price) => {
                                onTransaction(id, type, lots, price);
                                setTransactionId(null);
                            }}
                            onCancel={() => setTransactionId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={exportTarget !== null} onOpenChange={() => setExportTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Export Laporan</DialogTitle>
                        <DialogDescription>{exportTarget?.ticker} — {exportTarget && (marketData[exportTarget.ticker]?.name || companyNames[exportTarget.ticker] || exportTarget.name)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Button disabled={isExporting} onClick={() => exportTarget && handleExportAction(exportTarget, 'pdf', false)} variant="outline">
                                <FileText className="w-4 h-4 mr-2" />PDF
                            </Button>
                            <Button disabled={isExporting} onClick={() => exportTarget && handleExportAction(exportTarget, 'image', false)} variant="outline">
                                <ImageIcon className="w-4 h-4 mr-2" />Image
                            </Button>
                        </div>
                        <Button disabled={isExporting} onClick={() => exportTarget && handleExportAction(exportTarget, 'image', true)} variant="outline" className="w-full">
                            <Shield className="w-4 h-4 mr-2" />Mode Privasi
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSummarySelected} onOpenChange={() => setIsSummarySelected(false)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Portfolio Summary</DialogTitle>
                        <DialogDescription>Bagikan ringkasan performa</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Button disabled={isExporting} onClick={async () => { await handleExportPortfolioAction(portfolio, marketData, 'image', false); setIsSummarySelected(false); }} variant="outline" className="w-full">
                            <ImageIcon className="w-4 h-4 mr-2" />Normal Card
                        </Button>
                        <Button disabled={isExporting} onClick={async () => { await handleExportPortfolioAction(portfolio, marketData, 'image', true); setIsSummarySelected(false); }} variant="outline" className="w-full">
                            <Shield className="w-4 h-4 mr-2" />Mode Privasi
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={projectionTarget !== null} onOpenChange={() => setProjectionTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Price Projection</DialogTitle>
                        <DialogDescription>{projectionTarget?.ticker} — {projectionTarget && (marketData[projectionTarget.ticker]?.name || companyNames[projectionTarget.ticker] || projectionTarget.name)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted border rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">Avg Price</div>
                                <div className="font-medium">{projectionTarget && formatIDR(projectionTarget.averagePrice)}</div>
                            </div>
                            <div className="p-3 bg-muted border rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                                <div className="font-medium">{projectionTarget && formatIDR(marketData[projectionTarget.ticker]?.price || 0)}</div>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target Projections</p>
                            <div className="grid gap-3">
                                {(() => {
                                    if (!projectionTarget) return null;
                                    const current = marketData[projectionTarget.ticker]?.price || 0;
                                    const high52 = marketData[projectionTarget.ticker]?.high52w || 0;

                                    const targetPoints = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 10000];
                                    const targets = new Set<number>();

                                    if (high52 > current) targets.add(high52);

                                    [0.1, 0.25, 0.5, 1, 2].forEach(p => {
                                        const pt = Math.round(current * (1 + p));
                                        targets.add(pt);
                                    });

                                    targetPoints.forEach(tp => {
                                        if (tp > current && tp < current * 5) targets.add(tp);
                                    });

                                    return Array.from(targets).sort((a, b) => a - b).slice(0, 8).map(target => {
                                        const gain = (target - projectionTarget.averagePrice) / projectionTarget.averagePrice * 100;
                                        const profitValue = (target - projectionTarget.averagePrice) * (projectionTarget.lots * 100);
                                        const isHigh52 = Math.abs(target - high52) < 0.01;

                                        return (
                                            <div key={target} className={cn("flex items-center justify-between p-4 rounded-xl border", isHigh52 ? "bg-warning/5 border-warning/20" : "")}>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-1.5 h-10 rounded-full", gain >= 0 ? "bg-success" : "bg-destructive")} />
                                                    <div>
                                                        <div className="font-bold flex items-center gap-2">
                                                            {formatIDR(target)}
                                                            {isHigh52 && <Badge variant="outline" className="text-[9px] text-warning border-warning/20 uppercase">52W High</Badge>}
                                                        </div>
                                                        <div className="card-title">Target Price</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={cn("font-bold", gain >= 0 ? "text-success" : "text-destructive")}>
                                                        {formatPercentage(gain)}
                                                    </div>
                                                    <div className={cn("text-xs font-semibold", gain >= 0 ? "text-success" : "text-destructive")}>
                                                        {gain >= 0 ? "+" : ""}{formatIDR(profitValue)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setProjectionTarget(null)}>Tutup Proyeksi</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {avgDownTarget && (
                <AvgDownModal
                    item={avgDownTarget}
                    currentPrice={marketData[avgDownTarget.ticker]?.price || 0}
                    onClose={() => setAvgDownTarget(null)}
                />
            )}

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
    );
}
