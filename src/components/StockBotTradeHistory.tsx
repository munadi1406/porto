'use client';

import { StockTrade } from '@/lib/stockBotTypes';

interface StockBotTradeHistoryProps {
    trades: StockTrade[];
    botName: string;
}

export default function StockBotTradeHistory({ trades, botName }: StockBotTradeHistoryProps) {
    const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
                📊 History Trading - {botName}
            </h3>

            {sortedTrades.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-400">Belum ada transaksi</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Waktu</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Tipe</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Saham</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Lot</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Harga</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Total</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Profit</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Alasan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTrades.map((trade) => (
                                <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 px-4 text-sm text-slate-300">
                                        {formatDate(trade.timestamp)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trade.type === 'buy'
                                                ? 'bg-green-900/50 text-green-300 border border-green-700'
                                                : 'bg-red-900/50 text-red-300 border border-red-700'
                                            }`}>
                                            {trade.type === 'buy' ? '📈 BUY' : '📉 SELL'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-white">
                                        {trade.stock.replace('.JK', '')}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-300">
                                        {trade.lots} lot
                                        <div className="text-xs text-slate-500">
                                            ({trade.shares.toLocaleString('id-ID')} lembar)
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-300">
                                        {formatCurrency(trade.price)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right font-medium text-white">
                                        {formatCurrency(trade.total)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right">
                                        {trade.profit !== undefined ? (
                                            <div>
                                                <div className={`font-medium ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                                                </div>
                                                <div className={`text-xs ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                                                    }`}>
                                                    {trade.profitPercent !== undefined && (
                                                        <>
                                                            {trade.profitPercent >= 0 ? '+' : ''}
                                                            {trade.profitPercent.toFixed(2)}%
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-400">
                                        {trade.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sortedTrades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Total Transaksi</div>
                            <div className="text-lg font-bold text-white">{sortedTrades.length}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Buy Orders</div>
                            <div className="text-lg font-bold text-green-400">
                                {sortedTrades.filter(t => t.type === 'buy').length}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Sell Orders</div>
                            <div className="text-lg font-bold text-red-400">
                                {sortedTrades.filter(t => t.type === 'sell').length}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Total Volume</div>
                            <div className="text-lg font-bold text-blue-400">
                                {sortedTrades.reduce((sum, t) => sum + t.lots, 0)} lot
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
