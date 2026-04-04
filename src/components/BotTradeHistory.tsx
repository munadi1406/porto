"use client";

import { useState, useEffect } from "react";
import { CryptoTrade } from "@/lib/cryptoTypes";
import { getCryptoTrades } from "@/lib/cryptoStorage";
import { formatIDR, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface BotTradeHistoryProps {
    botId: string;
}

export function BotTradeHistory({ botId }: BotTradeHistoryProps) {
    const [trades, setTrades] = useState<CryptoTrade[]>([]);

    useEffect(() => {
        loadTrades();

        // Refresh trades every 5 seconds
        const interval = setInterval(loadTrades, 5000);
        return () => clearInterval(interval);
    }, [botId]);

    function loadTrades() {
        const allTrades = getCryptoTrades(botId);
        setTrades(allTrades.sort((a, b) => b.timestamp - a.timestamp));
    }

    function formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    if (trades.length === 0) {
        return (
            <div className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Aktifkan bot untuk mulai trading otomatis
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50/50 dark:bg-[#1a1d23]/50 border-b border-gray-100 dark:border-[#2d3139]">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Waktu</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Tipe</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Crypto</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Jumlah</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Harga</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Total</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Profit</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Alasan</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2d3139]">
                    {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                                <div className="text-xs font-medium text-gray-900 dark:text-white">
                                    {formatTime(trade.timestamp)}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {formatDate(trade.timestamp)}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                                    trade.type === 'buy'
                                        ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                                )}>
                                    {trade.type === 'buy' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                    {trade.type === 'buy' ? 'BUY' : 'SELL'}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {trade.crypto}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {trade.amount.toFixed(6)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    ${trade.price.toFixed(2)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatIDR(trade.total)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {trade.profit !== undefined ? (
                                    <div>
                                        <div className={cn(
                                            "text-sm font-semibold",
                                            trade.profit >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
                                        )}>
                                            {trade.profit >= 0 ? "+" : ""}{formatIDR(trade.profit)}
                                        </div>
                                        <div className={cn(
                                            "text-xs",
                                            trade.profit >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70"
                                        )}>
                                            {trade.profitPercent !== undefined && (
                                                <>{trade.profitPercent >= 0 ? "+" : ""}{trade.profitPercent.toFixed(2)}%</>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {trade.reason}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
