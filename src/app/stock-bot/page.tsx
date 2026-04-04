'use client';

import { useState, useEffect } from 'react';
import { StockBot, StockTrade, StockBotPerformance } from '@/lib/stockBotTypes';
import {
    getStockBots,
    saveStockBot,
    deleteStockBot,
    getStockTrades
} from '@/lib/stockBotStorage';
import CreateStockBotModal from '@/components/CreateStockBotModal';
import StockBotCard from '@/components/StockBotCard';
import StockBotTradeHistory from '@/components/StockBotTradeHistory';

export default function StockBotPage() {
    const [bots, setBots] = useState<StockBot[]>([]);
    const [selectedBot, setSelectedBot] = useState<StockBot | null>(null);
    const [selectedBotTrades, setSelectedBotTrades] = useState<StockTrade[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadBots();
    }, []);

    useEffect(() => {
        if (selectedBot) {
            const trades = getStockTrades(selectedBot.id);
            setSelectedBotTrades(trades);
        }
    }, [selectedBot, bots]);

    const loadBots = () => {
        const loadedBots = getStockBots();
        setBots(loadedBots);
    };

    const handleCreateBot = (bot: StockBot) => {
        saveStockBot(bot);
        loadBots();
    };

    const handleUpdateBot = (updatedBot: StockBot) => {
        saveStockBot(updatedBot);
        loadBots();
        if (selectedBot?.id === updatedBot.id) {
            setSelectedBot(updatedBot);
        }
    };

    const handleDeleteBot = (botId: string) => {
        deleteStockBot(botId);
        loadBots();
        if (selectedBot?.id === botId) {
            setSelectedBot(null);
        }
    };

    const handleBotClick = (bot: StockBot) => {
        setSelectedBot(bot);
    };

    const calculatePerformance = (): StockBotPerformance | null => {
        if (!selectedBot) return null;

        const trades = selectedBotTrades.filter(t => t.type === 'sell');
        const winningTrades = trades.filter(t => (t.profit || 0) > 0);
        const losingTrades = trades.filter(t => (t.profit || 0) < 0);

        const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalProfitPercent = ((selectedBot.currentCapital - selectedBot.initialCapital) / selectedBot.initialCapital) * 100;

        return {
            botId: selectedBot.id,
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            totalProfit,
            totalProfitPercent,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
            lossRate: trades.length > 0 ? (losingTrades.length / trades.length) * 100 : 0,
            averageProfit: winningTrades.length > 0
                ? winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / winningTrades.length
                : 0,
            averageLoss: losingTrades.length > 0
                ? losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / losingTrades.length
                : 0,
            maxDrawdown: 0, // TODO: Calculate max drawdown
        };
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const totalCapital = bots.reduce((sum, bot) => sum + bot.currentCapital, 0);
    const totalProfit = bots.reduce((sum, bot) => sum + (bot.currentCapital - bot.initialCapital), 0);
    const activeBots = bots.filter(bot => bot.isActive).length;
    const totalTrades = bots.reduce((sum, bot) => {
        const trades = getStockTrades(bot.id);
        return sum + trades.length;
    }, 0);

    const performance = calculatePerformance();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                🤖 Wahana Saham Indonesia
                            </h1>
                            <p className="text-slate-400">
                                Auto Trading Bot untuk Saham IDX - Simulasi Trading Otomatis
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                        >
                            ➕ Buat Bot Baru
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-4 border border-blue-700">
                            <div className="text-sm text-blue-200 mb-1">Total Modal</div>
                            <div className="text-2xl font-bold text-white">
                                {formatCurrency(totalCapital)}
                            </div>
                        </div>
                        <div className={`bg-gradient-to-br rounded-xl p-4 border ${totalProfit >= 0
                                ? 'from-green-900/50 to-green-800/50 border-green-700'
                                : 'from-red-900/50 to-red-800/50 border-red-700'
                            }`}>
                            <div className={`text-sm mb-1 ${totalProfit >= 0 ? 'text-green-200' : 'text-red-200'
                                }`}>
                                Total Profit
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-4 border border-purple-700">
                            <div className="text-sm text-purple-200 mb-1">Bot Aktif</div>
                            <div className="text-2xl font-bold text-white">
                                {activeBots} / {bots.length}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 rounded-xl p-4 border border-orange-700">
                            <div className="text-sm text-orange-200 mb-1">Total Trades</div>
                            <div className="text-2xl font-bold text-white">
                                {totalTrades}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bots Grid */}
                {bots.length === 0 ? (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-12 text-center border border-slate-700">
                        <div className="text-6xl mb-4">🤖</div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Belum Ada Bot
                        </h3>
                        <p className="text-slate-400 mb-6">
                            Buat bot trading pertama Anda untuk mulai simulasi auto trading saham Indonesia
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                        >
                            🚀 Buat Bot Pertama
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {bots.map(bot => (
                            <StockBotCard
                                key={bot.id}
                                bot={bot}
                                onUpdateBot={handleUpdateBot}
                                onDeleteBot={handleDeleteBot}
                                onClick={() => handleBotClick(bot)}
                            />
                        ))}
                    </div>
                )}

                {/* Selected Bot Details */}
                {selectedBot && (
                    <div className="space-y-6">
                        {/* Performance Metrics */}
                        {performance && performance.totalTrades > 0 && (
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-xl font-bold text-white mb-4">
                                    📊 Performance Metrics - {selectedBot.name}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Win Rate</div>
                                        <div className="text-lg font-bold text-green-400">
                                            {performance.winRate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Loss Rate</div>
                                        <div className="text-lg font-bold text-red-400">
                                            {performance.lossRate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Avg Profit</div>
                                        <div className="text-lg font-bold text-green-400">
                                            {formatCurrency(performance.averageProfit)}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Avg Loss</div>
                                        <div className="text-lg font-bold text-red-400">
                                            {formatCurrency(performance.averageLoss)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trade History */}
                        <StockBotTradeHistory
                            trades={selectedBotTrades}
                            botName={selectedBot.name}
                        />
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-8 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">⚠️</div>
                        <div>
                            <h4 className="text-lg font-bold text-yellow-200 mb-2">
                                Ini Adalah Simulator
                            </h4>
                            <p className="text-yellow-100/80 text-sm">
                                Wahana Saham Indonesia adalah simulator untuk edukasi. Semua trading adalah simulasi dengan harga yang disimulasikan,
                                bukan trading real dengan uang sungguhan. Gunakan untuk belajar strategi trading saham tanpa risiko kehilangan uang.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Bot Modal */}
            <CreateStockBotModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreateBot={handleCreateBot}
            />
        </div>
    );
}
