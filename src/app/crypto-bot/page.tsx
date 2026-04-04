"use client";

import { useState, useEffect } from "react";
import { Bot, TrendingUp, TrendingDown, Activity, DollarSign, Zap, Settings, Play, Pause, Plus, Trash2, BarChart3 } from "lucide-react";
import { CryptoBot, CryptoTrade, CryptoPosition, BotPerformance } from "@/lib/cryptoTypes";
import { getCryptoBots, saveCryptoBot, deleteCryptoBot, getCryptoTrades, calculateBotPerformance, logBotActivity, clearCorruptData } from "@/lib/cryptoStorage";
import { getCryptoPrice, subscribeToPriceUpdates } from "@/lib/cryptoApi";
import { formatIDR, cn } from "@/lib/utils";
import { CreateBotModal } from "@/components/CreateBotModal";
import { BotCard } from "@/components/BotCard";
import { BotTradeHistory } from "@/components/BotTradeHistory";
import { BotActivityLog } from "@/components/BotActivityLog";
import { toast } from "sonner";

export default function CryptoBotPage() {
    const [bots, setBots] = useState<CryptoBot[]>([]);
    const [selectedBot, setSelectedBot] = useState<CryptoBot | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [botPerformances, setBotPerformances] = useState<Record<string, BotPerformance>>({});

    useEffect(() => {
        loadBots();
        const interval = setInterval(() => {
            loadBots();
        }, 5000); // Sync every 5 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Update performances
        const performances: Record<string, BotPerformance> = {};
        bots.forEach(bot => {
            performances[bot.id] = calculateBotPerformance(bot.id);
        });
        setBotPerformances(performances);
    }, [bots]);

    function loadBots() {
        // Clear corrupt data first
        clearCorruptData();

        const loadedBots = getCryptoBots();

        // Auto-fix corrupt bots
        const fixedBots = loadedBots.map(bot => {
            // If capital is unreasonably large (> 1 trillion), reset to initial
            if (bot.currentCapital > 1000000000000 || bot.currentCapital < 0) {
                console.warn(`Auto-fixing corrupt bot: ${bot.name}`);
                return {
                    ...bot,
                    currentCapital: bot.initialCapital,
                    isActive: false // Pause corrupt bots
                };
            }
            return bot;
        });

        // Save fixed bots
        if (fixedBots.some((bot, i) => bot.currentCapital !== loadedBots[i].currentCapital)) {
            fixedBots.forEach(bot => saveCryptoBot(bot));
            toast.info("Beberapa bot dengan data corrupt telah diperbaiki otomatis");
        }

        setBots(fixedBots);
    }

    function handleCreateBot(bot: CryptoBot) {
        saveCryptoBot(bot);
        loadBots();
        setShowCreateModal(false);
        toast.success(`Bot "${bot.name}" berhasil dibuat!`);
    }

    function handleToggleBot(botId: string) {
        const bot = bots.find(b => b.id === botId);
        if (bot) {
            bot.isActive = !bot.isActive;
            saveCryptoBot(bot);
            loadBots();

            // Log bot status change
            logBotActivity(
                bot.id,
                bot.isActive ? 'success' : 'info',
                bot.isActive ? '▶️ Bot Started' : '⏸️ Bot Paused',
                bot.isActive
                    ? `Bot is now active and monitoring ${bot.settings.targetCrypto} market`
                    : 'Bot has been paused and will not execute new trades'
            );

            toast.success(bot.isActive ? "Bot diaktifkan" : "Bot dinonaktifkan");
        }
    }

    function handleDeleteBot(botId: string) {
        if (confirm("Apakah Anda yakin ingin menghapus bot ini?")) {
            deleteCryptoBot(botId);
            loadBots();
            if (selectedBot?.id === botId) {
                setSelectedBot(null);
            }
            toast.success("Bot berhasil dihapus");
        }
    }

    function handleResetAllData() {
        if (confirm("⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data bot, trades, dan positions.\nTindakan ini tidak bisa dibatalkan!\n\nLanjutkan?")) {
            // Clear all crypto bot data
            localStorage.removeItem('crypto_bots');
            localStorage.removeItem('crypto_trades');
            localStorage.removeItem('crypto_positions');
            localStorage.removeItem('bot_activities');

            // Reload
            setBots([]);
            setSelectedBot(null);
            setBotPerformances({});

            toast.success("Semua data berhasil direset!");
        }
    }

    const totalCapital = bots.reduce((sum, bot) => sum + bot.currentCapital, 0);
    const totalProfit = bots.reduce((sum, bot) => sum + (bot.currentCapital - bot.initialCapital), 0);
    const activeBots = bots.filter(b => b.isActive).length;
    const hasCorruptData = bots.some(b => b.currentCapital > 1000000000000 || b.currentCapital < 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-2 border border-purple-100 dark:border-purple-800">
                        <Bot className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-600">Auto Trading</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                        Wahana Otomatis
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Simulator trading bot crypto otomatis - <span className="text-gray-900 dark:text-white font-medium">{bots.length} bot</span> aktif
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetAllData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        title="Reset semua data bot (gunakan jika ada error)"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset All
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Buat Bot Baru
                    </button>
                </div>
            </header>

            {/* Corrupt Data Warning */}
            {hasCorruptData && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-1">
                                ⚠️ DATA CORRUPT TERDETEKSI!
                            </h3>
                            <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                                Bot Anda memiliki data yang tidak valid (modal lebih dari 1 triliun). Ini disebabkan oleh bug di versi sebelumnya.
                            </p>
                            <button
                                onClick={handleResetAllData}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                KLIK DI SINI UNTUK RESET SEMUA DATA
                            </button>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                                Setelah reset, Anda bisa membuat bot baru dengan data yang benar.
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-[#12151c] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#1e232d]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Modal</h3>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                            <DollarSign className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{formatIDR(totalCapital)}</p>
                </div>

                <div className="bg-white dark:bg-[#12151c] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#1e232d]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Profit</h3>
                        <div className={cn(
                            "p-1.5 rounded-lg",
                            totalProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600"
                        )}>
                            {totalProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                    </div>
                    <p className={cn(
                        "text-lg sm:text-xl font-semibold",
                        totalProfit >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
                    )}>
                        {totalProfit >= 0 ? "+" : ""}{formatIDR(totalProfit)}
                    </p>
                </div>

                <div className="bg-white dark:bg-[#12151c] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#1e232d]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bot Aktif</h3>
                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                            <Activity className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{activeBots} / {bots.length}</p>
                </div>

                <div className="bg-white dark:bg-[#12151c] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#1e232d]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Trades</h3>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                            <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                        {Object.values(botPerformances).reduce((sum, p) => sum + p.totalTrades, 0)}
                    </p>
                </div>
            </div>

            {/* Bots Grid */}
            {bots.length === 0 ? (
                <div className="bg-white dark:bg-[#23272f] rounded-2xl border border-gray-100 dark:border-[#2d3139] p-16 text-center">
                    <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Belum Ada Bot</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Buat bot trading otomatis pertama Anda untuk mulai trading crypto
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Buat Bot Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {bots.map(bot => (
                        <BotCard
                            key={bot.id}
                            bot={bot}
                            performance={botPerformances[bot.id]}
                            onToggle={() => handleToggleBot(bot.id)}
                            onDelete={() => handleDeleteBot(bot.id)}
                            onSelect={() => setSelectedBot(bot)}
                        />
                    ))}
                </div>
            )}

            {/* Activity Log - Show when there are active bots */}
            {bots.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-600" />
                            Live Activity Log
                        </h2>
                        <BotActivityLog maxHeight="500px" />
                    </div>

                    {selectedBot && (
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-600" />
                                {selectedBot.name} Activity
                            </h2>
                            <BotActivityLog botId={selectedBot.id} maxHeight="500px" />
                        </div>
                    )}
                </div>
            )}

            {/* Selected Bot Details */}
            {selectedBot && (
                <div className="bg-white dark:bg-[#23272f] rounded-2xl border border-gray-100 dark:border-[#2d3139] overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2d3139] flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1d23]/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">{selectedBot.name}</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Trade History</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedBot(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            ✕
                        </button>
                    </div>
                    <BotTradeHistory botId={selectedBot.id} />
                </div>
            )}

            {/* Create Bot Modal */}
            {showCreateModal && (
                <CreateBotModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateBot}
                />
            )}
        </div>
    );
}
