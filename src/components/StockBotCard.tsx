'use client';

import { useEffect, useState, useRef } from 'react';
import { StockBot, StockPosition, StockTrade, StockPrice } from '@/lib/stockBotTypes';
import { getStockPrice } from '@/lib/stockBotApi';
import { isMarketOpen, getMarketStatusMessage } from '@/lib/marketHours';
import {
    getOpenStockPositions,
    saveStockPosition,
    closeStockPosition,
    updateStockPosition
} from '@/lib/stockBotStorage';
import { saveStockTrade } from '@/lib/stockBotStorage';

interface StockBotCardProps {
    bot: StockBot;
    onUpdateBot: (bot: StockBot) => void;
    onDeleteBot: (botId: string) => void;
    onClick: () => void;
}

export default function StockBotCard({ bot, onUpdateBot, onDeleteBot, onClick }: StockBotCardProps) {
    const [currentPrice, setCurrentPrice] = useState<StockPrice | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [marketStatus, setMarketStatus] = useState(getMarketStatusMessage());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastTradeTimeRef = useRef<number>(0);

    // Fetch price and execute trading logic
    useEffect(() => {
        if (!bot.isActive) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const executeTradingLogic = async () => {
            try {
                // Check if market is open
                const marketCheck = isMarketOpen();
                setMarketStatus(getMarketStatusMessage());

                if (!marketCheck.isOpen) {
                    console.log('Market is closed, skipping trade execution:', marketCheck.reason);
                    // Still fetch price for display, but don't execute trades
                    setIsLoading(true);
                    const price = await getStockPrice(bot.settings.targetStock);
                    setCurrentPrice(price);
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                const price = await getStockPrice(bot.settings.targetStock);
                setCurrentPrice(price);

                // Execute trading logic only when market is open
                await checkAndExecuteTrades(price);
            } catch (error) {
                console.error('Error in trading logic:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Initial fetch
        executeTradingLogic();

        // Set up interval
        const interval = bot.settings.scalpingInterval * 1000;
        intervalRef.current = setInterval(executeTradingLogic, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [bot.isActive, bot.settings.scalpingInterval, bot.settings.targetStock]);

    const checkAndExecuteTrades = async (price: StockPrice) => {
        const openPositions = getOpenStockPositions(bot.id);
        const now = Date.now();

        // Prevent too frequent trades (min 3 seconds between trades)
        if (now - lastTradeTimeRef.current < 3000) {
            return;
        }

        // Check if we should sell existing positions
        for (const position of openPositions) {
            const profitPercent = ((price.price - position.buyPrice) / position.buyPrice) * 100;

            // Update position current price
            updateStockPosition(position.id, { currentPrice: price.price });

            // Sell conditions
            let shouldSell = false;
            let sellReason = '';

            // Take profit
            if (profitPercent >= bot.settings.takeProfit) {
                shouldSell = true;
                sellReason = `Take profit (${profitPercent.toFixed(2)}%)`;
            }
            // Stop loss
            else if (profitPercent <= -bot.settings.stopLoss) {
                shouldSell = true;
                sellReason = `Stop loss (${profitPercent.toFixed(2)}%)`;
            }
            // Scalping profit
            else if (
                bot.strategy === 'scalping' &&
                profitPercent >= bot.settings.minProfitPercent &&
                price.changePercent >= bot.settings.sellThreshold
            ) {
                shouldSell = true;
                sellReason = `Scalping profit (${profitPercent.toFixed(2)}%)`;
            }

            if (shouldSell) {
                executeSell(position, price, sellReason);
                lastTradeTimeRef.current = now;
                return; // Only one trade per cycle
            }
        }

        // Check if we should buy (only if we have less than 3 open positions)
        if (openPositions.length < 3) {
            const shouldBuy = checkBuySignal(price);
            if (shouldBuy.should) {
                executeBuy(price, shouldBuy.reason);
                lastTradeTimeRef.current = now;
            }
        }
    };

    const checkBuySignal = (price: StockPrice): { should: boolean; reason: string } => {
        // Check if price dropped enough
        if (price.changePercent <= -bot.settings.buyThreshold) {
            return {
                should: true,
                reason: `Price drop ${Math.abs(price.changePercent).toFixed(2)}%`,
            };
        }

        // Breakout strategy
        if (bot.strategy === 'breakout' && price.changePercent >= bot.settings.buyThreshold) {
            return {
                should: true,
                reason: `Breakout detected (+${price.changePercent.toFixed(2)}%)`,
            };
        }

        return { should: false, reason: '' };
    };

    const executeBuy = (price: StockPrice, reason: string) => {
        const maxInvestment = bot.currentCapital * (bot.settings.maxPositionSize / 100);

        // Calculate lots (1 lot = 100 shares)
        // Minimum 1 lot
        const lots = Math.max(1, Math.floor(maxInvestment / (price.price * 100)));
        const shares = lots * 100;
        const totalCost = shares * price.price;

        // Check if we have enough capital
        if (totalCost > bot.currentCapital) {
            console.log('Not enough capital for trade');
            return;
        }

        // Create position
        const position: StockPosition = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            botId: bot.id,
            stock: bot.settings.targetStock,
            lots,
            shares,
            buyPrice: price.price,
            currentPrice: price.price,
            timestamp: Date.now(),
            status: 'open',
        };

        // Create trade record
        const trade: StockTrade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            botId: bot.id,
            type: 'buy',
            stock: bot.settings.targetStock,
            lots,
            shares,
            price: price.price,
            total: totalCost,
            timestamp: Date.now(),
            reason,
        };

        // Update bot capital
        const updatedBot = {
            ...bot,
            currentCapital: bot.currentCapital - totalCost,
        };

        // Save everything
        saveStockPosition(position);
        saveStockTrade(trade);
        onUpdateBot(updatedBot);
    };

    const executeSell = (position: StockPosition, price: StockPrice, reason: string) => {
        const totalRevenue = position.shares * price.price;
        const profit = totalRevenue - (position.shares * position.buyPrice);
        const profitPercent = (profit / (position.shares * position.buyPrice)) * 100;

        // Create trade record
        const trade: StockTrade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            botId: bot.id,
            type: 'sell',
            stock: position.stock,
            lots: position.lots,
            shares: position.shares,
            price: price.price,
            total: totalRevenue,
            profit,
            profitPercent,
            timestamp: Date.now(),
            reason,
        };

        // Update bot capital
        const updatedBot = {
            ...bot,
            currentCapital: bot.currentCapital + totalRevenue,
        };

        // Save everything
        closeStockPosition(position.id);
        saveStockTrade(trade);
        onUpdateBot(updatedBot);
    };

    const toggleActive = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateBot({ ...bot, isActive: !bot.isActive });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Hapus bot "${bot.name}"? Semua data trading akan hilang.`)) {
            onDeleteBot(bot.id);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const profitLoss = bot.currentCapital - bot.initialCapital;
    const profitLossPercent = (profitLoss / bot.initialCapital) * 100;

    return (
        <div
            onClick={onClick}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-all cursor-pointer shadow-lg hover:shadow-xl"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">{bot.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bot.isActive
                            ? 'bg-green-900/50 text-green-300 border border-green-700'
                            : 'bg-slate-700 text-slate-300 border border-slate-600'
                            }`}>
                            {bot.isActive ? '🟢 AKTIF' : '⚫ NONAKTIF'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>{bot.settings.targetStock.replace('.JK', '')}</span>
                        <span>•</span>
                        <span className="capitalize">{bot.strategy}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleActive}
                        className={`p-2 rounded-lg transition-colors ${bot.isActive
                            ? 'bg-yellow-900/50 hover:bg-yellow-800 text-yellow-300'
                            : 'bg-green-900/50 hover:bg-green-800 text-green-300'
                            }`}
                        title={bot.isActive ? 'Pause bot' : 'Start bot'}
                    >
                        {bot.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-lg transition-colors"
                        title="Hapus bot"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Current Price */}
            {currentPrice && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-400 mb-1">Harga Sekarang</div>
                            <div className="text-xl font-bold text-white">
                                {formatCurrency(currentPrice.price)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-lg font-bold ${currentPrice.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {currentPrice.changePercent >= 0 ? '+' : ''}
                                {currentPrice.changePercent.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-400">
                                {isLoading && '🔄 Updating...'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Market Status */}
            <div className={`mb-4 p-3 rounded-lg border ${isMarketOpen().isOpen
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-orange-900/20 border-orange-700/50'
                }`}>
                <div className="text-xs font-medium">
                    <span className={isMarketOpen().isOpen ? 'text-green-400' : 'text-orange-400'}>
                        {marketStatus}
                    </span>
                </div>
            </div>

            {/* Capital & Profit */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Modal Sekarang</div>
                    <div className="text-sm font-bold text-white">
                        {formatCurrency(bot.currentCapital)}
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Profit/Loss</div>
                    <div className={`text-sm font-bold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
                        <span className="text-xs ml-1">
                            ({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-700 text-xs text-slate-400">
                <div className="flex justify-between">
                    <span>Klik untuk lihat detail</span>
                    <span>Interval: {bot.settings.scalpingInterval}s</span>
                </div>
            </div>
        </div>
    );
}
