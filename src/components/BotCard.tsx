"use client";

import { useState, useEffect } from "react";
import { CryptoBot, BotPerformance } from "@/lib/cryptoTypes";
import { saveCryptoBot, saveCryptoTrade, saveCryptoPosition, getOpenPositions, logBotActivity, calculateBotPerformance } from "@/lib/cryptoStorage";
import { getCryptoPrice, subscribeToPriceUpdates, findBestCryptoToTrade } from "@/lib/cryptoApi";
import { formatIDR, formatPercentage, cn } from "@/lib/utils";
import { Play, Pause, Trash2, TrendingUp, TrendingDown, Activity, Target, Zap, Brain } from "lucide-react";
import { generateSmartSignal, calculateOptimalPositionSize, SmartBotConfig } from "@/lib/smartTradingEngine";

interface BotCardProps {
    bot: CryptoBot;
    performance: BotPerformance;
    onToggle: () => void;
    onDelete: () => void;
    onSelect: () => void;
}

export function BotCard({ bot, performance, onToggle, onDelete, onSelect }: BotCardProps) {
    const [currentPrice, setCurrentPrice] = useState(0);
    const [priceChange, setPriceChange] = useState(0);
    const [botStatus, setBotStatus] = useState<'idle' | 'analyzing' | 'buying' | 'selling' | 'waiting'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [smartSignal, setSmartSignal] = useState<ReturnType<typeof generateSmartSignal> | null>(null);
    const [showAIInsights, setShowAIInsights] = useState(false);
    const [localPerformance, setLocalPerformance] = useState<BotPerformance>(performance);

    // Synchronize local performance when prop changes
    useEffect(() => {
        setLocalPerformance(performance);
    }, [performance]);

    const refreshPerformance = () => {
        const newPerformance = calculateBotPerformance(bot.id);
        setLocalPerformance(newPerformance);
    };

    useEffect(() => {
        // Subscribe to price updates
        const unsubscribe = subscribeToPriceUpdates(bot.settings.targetCrypto, (price) => {
            setCurrentPrice(price.price);
            setPriceChange(price.changePercent24h);
        }, 3000);

        return unsubscribe;
    }, [bot.settings.targetCrypto]);

    useEffect(() => {
        if (!bot.isActive) return;

        // Auto trading logic
        const interval = setInterval(() => {
            executeTradingLogic();
        }, bot.settings.scalpingInterval * 1000);

        return () => clearInterval(interval);
    }, [bot.isActive, currentPrice]);

    function executeTradingLogic() {
        if (!bot.isActive || currentPrice === 0) {
            setBotStatus('idle');
            setStatusMessage('Bot inactive');
            return;
        }

        // Set analyzing status
        setBotStatus('analyzing');
        setStatusMessage(`Analyzing ${bot.settings.targetCrypto} market...`);

        // Log monitoring activity
        logBotActivity(
            bot.id,
            'info',
            '📊 Monitoring Market',
            `Checking ${bot.settings.targetCrypto} price: $${currentPrice.toFixed(2)} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%)`
        );

        const openPositions = getOpenPositions(bot.id);
        const availableCapital = bot.currentCapital;

        // Auto-select mode: find best crypto to buy
        let targetCrypto = bot.settings.targetCrypto;
        let targetPrice = currentPrice;
        let targetPriceChange = priceChange;

        if (bot.settings.autoSelectMode && openPositions.length === 0) {
            const allowedCryptos = bot.settings.allowedCryptos || ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
            const bestCrypto = findBestCryptoToTrade(allowedCryptos, 'buy');

            if (bestCrypto && Math.abs(bestCrypto.score) >= bot.settings.buyThreshold) {
                targetCrypto = bestCrypto.crypto;
                targetPrice = bestCrypto.price.price;
                targetPriceChange = bestCrypto.price.changePercent24h;

                logBotActivity(
                    bot.id,
                    'info',
                    '🔍 Auto-Select Analysis',
                    `Found best opportunity: ${bestCrypto.crypto} - ${bestCrypto.reason}`
                );
            }
        }

        // Generate Smart Signal
        const priceObj = getCryptoPrice(targetCrypto);
        const config: SmartBotConfig = {
            riskTolerance: 'medium',
            minConfidence: 40,
            useMultipleIndicators: true,
            adaptivePositionSizing: true,
            trendFollowing: true
        };
        const signal = generateSmartSignal(targetCrypto, priceObj, config);
        setSmartSignal(signal);

        // Check if we should buy
        if (openPositions.length === 0 && signal.action === 'buy') {
            setBotStatus('buying');
            setStatusMessage(`Executing AI-BUY order for ${targetCrypto}...`);

            const positionSize = calculateOptimalPositionSize(
                availableCapital,
                signal.indicators.volatility,
                'medium',
                performance?.winRate ? performance.winRate / 100 : 0.5
            );

            // Skip if not enough capital
            if (positionSize < 100000) { // Min 100k IDR
                logBotActivity(
                    bot.id,
                    'warning',
                    '⚠️ Insufficient Capital',
                    `AI suggested Rp ${formatIDR(positionSize)}, but available is only ${formatIDR(availableCapital)}. Min required: Rp 100,000`
                );
                return;
            }

            // IMPORTANT: Convert IDR to USD before calculating amount
            const USD_TO_IDR = 15000;
            const positionSizeUSD = positionSize / USD_TO_IDR;
            const amount = positionSizeUSD / targetPrice;

            // Create buy trade
            const trade = {
                id: Date.now().toString(),
                botId: bot.id,
                type: 'buy' as const,
                crypto: targetCrypto,
                amount,
                price: targetPrice,
                total: positionSize,
                timestamp: Date.now(),
                reason: `AI Signal: ${signal.reasons[0]} (Score: ${signal.score})`
            };

            // Create position
            const position = {
                id: Date.now().toString(),
                botId: bot.id,
                crypto: targetCrypto,
                amount,
                buyPrice: targetPrice,
                currentPrice: targetPrice,
                timestamp: Date.now(),
                status: 'open' as const
            };

            saveCryptoTrade(trade);
            saveCryptoPosition(position);

            // Update bot capital
            bot.currentCapital -= positionSize;
            saveCryptoBot(bot);

            // Refresh performance metrics
            refreshPerformance();

            // Log buy activity
            const displayAmount = amount > 1000 ? amount.toExponential(2) : amount.toFixed(6);
            logBotActivity(
                bot.id,
                'trade',
                '🛒 BUY Executed',
                `Bought ${displayAmount} ${targetCrypto} at $${targetPrice.toFixed(8)} | Total: ${formatIDR(positionSize)}`,
                { price: targetPrice, amount, total: positionSize, reason: trade.reason }
            );
        } else if (openPositions.length === 0) {
            // No open position but signal is not buy
            setBotStatus('waiting');
            setStatusMessage(`AI Scanning: Confidence ${signal.confidence}% (${signal.action})`);
            logBotActivity(
                bot.id,
                'info',
                '⏳ AI Market Scanning',
                `Indicators: RSI ${signal.indicators.rsi.toFixed(1)}, Trend: ${signal.indicators.trend}. Action: ${signal.action}`
            );
        }

        // Check if we should sell
        if (openPositions.length > 0) {
            openPositions.forEach(position => {
                const profitPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;

                // Sell conditions: take profit, stop loss, or sell threshold
                if (
                    profitPercent >= bot.settings.takeProfit ||
                    profitPercent <= -bot.settings.stopLoss ||
                    (profitPercent >= bot.settings.minProfitPercent && priceChange > bot.settings.sellThreshold)
                ) {
                    setBotStatus('selling');
                    setStatusMessage(`Executing SELL order for ${position.crypto}...`);
                    // IMPORTANT: Convert USD to IDR (approx 15,000 IDR per USD)
                    const USD_TO_IDR = 15000;
                    const sellValueUSD = position.amount * currentPrice;
                    const sellValue = sellValueUSD * USD_TO_IDR;
                    const buyValueIDR = (position.amount * position.buyPrice) * USD_TO_IDR;
                    const profit = sellValue - buyValueIDR;

                    // Create sell trade
                    const trade = {
                        id: Date.now().toString(),
                        botId: bot.id,
                        type: 'sell' as const,
                        crypto: position.crypto,
                        amount: position.amount,
                        price: currentPrice,
                        total: sellValue,
                        profit,
                        profitPercent,
                        timestamp: Date.now(),
                        reason: profitPercent >= bot.settings.takeProfit
                            ? 'Take profit triggered'
                            : profitPercent <= -bot.settings.stopLoss
                                ? 'Stop loss triggered'
                                : `AI Signal: ${signal.reasons[0]}`
                    };

                    saveCryptoTrade(trade);

                    // Close position
                    position.status = 'closed';
                    saveCryptoPosition(position);

                    // Update bot capital
                    bot.currentCapital += sellValue;
                    saveCryptoBot(bot);

                    // Refresh performance metrics
                    refreshPerformance();

                    // Log sell activity
                    const activityType = profit >= 0 ? 'success' : 'warning';
                    const emoji = profit >= 0 ? '💰' : '⚠️';
                    const displayAmount = position.amount > 1000 ? position.amount.toExponential(2) : position.amount.toFixed(6);
                    logBotActivity(
                        bot.id,
                        activityType,
                        `${emoji} SELL Executed`,
                        `Sold ${displayAmount} ${position.crypto} at $${currentPrice.toFixed(8)} | Profit: ${formatIDR(profit)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`,
                        { price: currentPrice, amount: position.amount, total: sellValue, profit, profitPercent, reason: trade.reason }
                    );
                }
            });
        }
    }

    const profitLoss = bot.currentCapital - bot.initialCapital;
    const profitPercent = (profitLoss / bot.initialCapital) * 100;

    return (
        <div
            onClick={onSelect}
            className="bg-white dark:bg-[#12151c] rounded-xl border border-gray-200 dark:border-[#1e232d] p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{bot.name}</h3>
                        {bot.isActive && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-medium rounded animate-pulse">
                                AKTIF
                            </span>
                        )}
                    </div>

                    {/* Live Status Indicator */}
                    {bot.isActive && (
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium",
                                botStatus === 'analyzing' && "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
                                botStatus === 'buying' && "bg-green-50 dark:bg-green-900/20 text-green-600 animate-pulse",
                                botStatus === 'selling' && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 animate-pulse",
                                botStatus === 'waiting' && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600",
                                botStatus === 'idle' && "bg-gray-50 dark:bg-gray-800 text-gray-500"
                            )}>
                                {botStatus === 'analyzing' && <Activity className="w-3 h-3 animate-spin" />}
                                {botStatus === 'buying' && <TrendingDown className="w-3 h-3" />}
                                {botStatus === 'selling' && <TrendingUp className="w-3 h-3" />}
                                {botStatus === 'waiting' && <Target className="w-3 h-3" />}
                                <span>{statusMessage || 'Idle'}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="uppercase font-medium">{bot.settings.targetCrypto}</span>
                        <span>•</span>
                        <span className="capitalize">{bot.strategy}</span>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAIInsights(!showAIInsights);
                        }}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            showAIInsights
                                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
                        )}
                        title="AI Analysis Insights"
                    >
                        <Brain className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            bot.isActive
                                ? "bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        {bot.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Live Price Ticker */}
            {bot.isActive && currentPrice > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600 animate-pulse" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Live Price</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                ${currentPrice.toFixed(2)}
                            </span>
                            <span className={cn(
                                "text-xs font-semibold px-1.5 py-0.5 rounded",
                                priceChange >= 0
                                    ? "bg-green-100 dark:bg-green-900/20 text-green-600"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-600"
                            )}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Insights Panel */}
            {showAIInsights && smartSignal && (
                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-100 dark:border-purple-800 space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs text-purple-700 dark:text-purple-300">
                        <span className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            AI ENGINE 2.0
                        </span>
                        <span>Confidence: {smartSignal.confidence}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded text-[10px]">
                            <div className="text-gray-500 mb-0.5">RSI</div>
                            <div className={cn(
                                "font-bold",
                                smartSignal.indicators.rsi < 30 ? "text-green-600" : smartSignal.indicators.rsi > 70 ? "text-red-600" : "text-gray-700 dark:text-gray-300"
                            )}>{smartSignal.indicators.rsi.toFixed(1)}</div>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded text-[10px]">
                            <div className="text-gray-500 mb-0.5">Trend</div>
                            <div className={cn(
                                "font-bold uppercase",
                                smartSignal.indicators.trend === 'bullish' ? "text-green-600" : "text-red-600"
                            )}>{smartSignal.indicators.trend}</div>
                        </div>
                    </div>

                    <div className="text-[10px] space-y-1">
                        {smartSignal.reasons.slice(0, 2).map((reason, i) => (
                            <div key={i} className="flex gap-1 items-start text-gray-600 dark:text-gray-400 italic">
                                <span>•</span>
                                <span>{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Modal Saat Ini</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatIDR(bot.currentCapital)}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Profit/Loss</span>
                    <div className="text-right">
                        <div className={cn(
                            "text-sm font-semibold",
                            profitLoss >= 0 ? "text-[#19d57a]" : "text-[#ff5d5d]"
                        )}>
                            {profitLoss >= 0 ? "+" : ""}{formatIDR(profitLoss)}
                        </div>
                        <div className={cn(
                            "text-xs",
                            profitLoss >= 0 ? "text-[#19d57a]/70" : "text-[#ff5d5d]/70"
                        )}>
                            {profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-center">
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">Total Trades</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {localPerformance?.totalTrades || 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">Win Rate</div>
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                {localPerformance?.winRate?.toFixed(1) || 0}%
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">Loss Rate</div>
                            <div className="text-sm font-bold text-red-600 dark:text-red-400">
                                {localPerformance?.lossRate?.toFixed(1) || 0}%
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">Avg Profit/Loss</div>
                            <div className={cn(
                                "text-sm font-bold",
                                (localPerformance?.averageProfit || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {formatIDR(localPerformance?.averageProfit || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
