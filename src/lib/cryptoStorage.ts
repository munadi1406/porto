import { CryptoBot, CryptoTrade, CryptoPosition, BotPerformance } from './cryptoTypes';
import { BotActivity } from './activityTypes';

const CRYPTO_BOTS_KEY = 'crypto_bots';
const CRYPTO_TRADES_KEY = 'crypto_trades';
const CRYPTO_POSITIONS_KEY = 'crypto_positions';
const CRYPTO_ACTIVITIES_KEY = 'crypto_activities';

// Bot Management
export function saveCryptoBot(bot: CryptoBot): void {
    const bots = getCryptoBots();
    const index = bots.findIndex(b => b.id === bot.id);
    if (index >= 0) {
        bots[index] = bot;
    } else {
        bots.push(bot);
    }
    localStorage.setItem(CRYPTO_BOTS_KEY, JSON.stringify(bots));
}

export function getCryptoBots(): CryptoBot[] {
    const data = localStorage.getItem(CRYPTO_BOTS_KEY);
    return data ? JSON.parse(data) : [];
}

export function getCryptoBotById(id: string): CryptoBot | null {
    const bots = getCryptoBots();
    return bots.find(b => b.id === id) || null;
}

export function deleteCryptoBot(id: string): void {
    const bots = getCryptoBots().filter(b => b.id !== id);
    localStorage.setItem(CRYPTO_BOTS_KEY, JSON.stringify(bots));

    // Also delete related trades and positions
    const trades = getCryptoTrades().filter(t => t.botId !== id);
    localStorage.setItem(CRYPTO_TRADES_KEY, JSON.stringify(trades));

    const positions = getCryptoPositions().filter(p => p.botId !== id);
    localStorage.setItem(CRYPTO_POSITIONS_KEY, JSON.stringify(positions));
}

// Clear corrupt data (trades/positions with unreasonable values)
export function clearCorruptData(): void {
    // Clear trades with unreasonable total (> 1 trillion IDR)
    const trades = getCryptoTrades().filter(t =>
        !t.total || t.total < 1000000000000
    );
    localStorage.setItem(CRYPTO_TRADES_KEY, JSON.stringify(trades));

    // Clear positions with unreasonable amounts
    const positions = getCryptoPositions().filter(p =>
        p.amount < 1000000000 // Max 1 billion tokens
    );
    localStorage.setItem(CRYPTO_POSITIONS_KEY, JSON.stringify(positions));
}

// Trade Management
export function saveCryptoTrade(trade: CryptoTrade): void {
    const trades = getCryptoTrades();
    trades.push(trade);
    localStorage.setItem(CRYPTO_TRADES_KEY, JSON.stringify(trades));
}

export function getCryptoTrades(botId?: string): CryptoTrade[] {
    const data = localStorage.getItem(CRYPTO_TRADES_KEY);
    const trades: CryptoTrade[] = data ? JSON.parse(data) : [];
    return botId ? trades.filter(t => t.botId === botId) : trades;
}

// Position Management
export function saveCryptoPosition(position: CryptoPosition): void {
    const positions = getCryptoPositions();
    const index = positions.findIndex(p => p.id === position.id);
    if (index >= 0) {
        positions[index] = position;
    } else {
        positions.push(position);
    }
    localStorage.setItem(CRYPTO_POSITIONS_KEY, JSON.stringify(positions));
}

export function getCryptoPositions(botId?: string): CryptoPosition[] {
    const data = localStorage.getItem(CRYPTO_POSITIONS_KEY);
    const positions: CryptoPosition[] = data ? JSON.parse(data) : [];
    return botId ? positions.filter(p => p.botId === botId) : positions;
}

export function getOpenPositions(botId: string): CryptoPosition[] {
    return getCryptoPositions(botId).filter(p => p.status === 'open');
}

export function closePosition(positionId: string): void {
    const positions = getCryptoPositions();
    const position = positions.find(p => p.id === positionId);
    if (position) {
        position.status = 'closed';
        saveCryptoPosition(position);
    }
}

// Performance Calculation
export function calculateBotPerformance(botId: string): BotPerformance {
    const trades = getCryptoTrades(botId);
    const bot = getCryptoBotById(botId);

    if (!bot) {
        return {
            botId,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalProfit: 0,
            totalProfitPercent: 0,
            winRate: 0,
            lossRate: 0,
            averageProfit: 0,
            averageLoss: 0,
            maxDrawdown: 0
        };
    }

    const sellTrades = trades.filter(t => t.type === 'sell');
    const winningTrades = sellTrades.filter(t => (t.profit || 0) > 0);
    const losingTrades = sellTrades.filter(t => (t.profit || 0) < 0);

    const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalProfitPercent = ((bot.currentCapital - bot.initialCapital) / bot.initialCapital) * 100;
    const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;
    const averageProfit = sellTrades.length > 0 ? totalProfit / sellTrades.length : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = bot.initialCapital;
    let currentCapital = bot.initialCapital;

    trades.forEach(trade => {
        if (trade.type === 'sell') {
            currentCapital += (trade.profit || 0);
        }
        if (currentCapital > peak) {
            peak = currentCapital;
        }
        const drawdown = ((peak - currentCapital) / peak) * 100;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    });

    const lossRate = sellTrades.length > 0 ? (losingTrades.length / sellTrades.length) * 100 : 0;
    const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / losingTrades.length : 0;

    return {
        botId,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        totalProfit,
        totalProfitPercent,
        winRate,
        lossRate,
        averageProfit,
        averageLoss,
        maxDrawdown
    };
}

// Activity Log Management
export function saveBotActivity(activity: BotActivity): void {
    const activities = getBotActivities();
    activities.push(activity);

    // Keep only last 1000 activities to prevent localStorage overflow
    const trimmed = activities.slice(-1000);
    localStorage.setItem(CRYPTO_ACTIVITIES_KEY, JSON.stringify(trimmed));
}

export function getBotActivities(botId?: string, limit: number = 100): BotActivity[] {
    const data = localStorage.getItem(CRYPTO_ACTIVITIES_KEY);
    const activities: BotActivity[] = data ? JSON.parse(data) : [];

    let filtered = botId ? activities.filter(a => a.botId === botId) : activities;

    // Return latest activities first
    return filtered.slice(-limit).reverse();
}

export function clearBotActivities(botId?: string): void {
    if (botId) {
        const activities = getBotActivities();
        const filtered = activities.filter(a => a.botId !== botId);
        localStorage.setItem(CRYPTO_ACTIVITIES_KEY, JSON.stringify(filtered));
    } else {
        localStorage.removeItem(CRYPTO_ACTIVITIES_KEY);
    }
}

export function logBotActivity(
    botId: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'trade',
    action: string,
    message: string,
    details?: any
): void {
    const activity: BotActivity = {
        id: Date.now().toString() + Math.random(),
        botId,
        timestamp: Date.now(),
        type,
        action,
        message,
        details
    };
    saveBotActivity(activity);
}

