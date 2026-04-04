// LocalStorage management untuk Stock Bot
import { StockBot, StockTrade, StockPosition } from './stockBotTypes';

const STORAGE_KEYS = {
    BOTS: 'stock_bots',
    TRADES: 'stock_trades',
    POSITIONS: 'stock_positions',
};

// ============ BOTS ============
export const getStockBots = (): StockBot[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.BOTS);
    return data ? JSON.parse(data) : [];
};

export const saveStockBot = (bot: StockBot): void => {
    if (typeof window === 'undefined') return;
    const bots = getStockBots();
    const existingIndex = bots.findIndex(b => b.id === bot.id);

    if (existingIndex >= 0) {
        bots[existingIndex] = bot;
    } else {
        bots.push(bot);
    }

    localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(bots));
};

export const updateStockBot = (botId: string, updates: Partial<StockBot>): void => {
    if (typeof window === 'undefined') return;
    const bots = getStockBots();
    const index = bots.findIndex(b => b.id === botId);

    if (index >= 0) {
        bots[index] = { ...bots[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(bots));
    }
};

export const deleteStockBot = (botId: string): void => {
    if (typeof window === 'undefined') return;
    const bots = getStockBots().filter(b => b.id !== botId);
    localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(bots));

    // Also delete related trades and positions
    deleteStockBotTrades(botId);
    deleteStockBotPositions(botId);
};

// ============ TRADES ============
export const getStockTrades = (botId?: string): StockTrade[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.TRADES);
    const allTrades: StockTrade[] = data ? JSON.parse(data) : [];

    if (botId) {
        return allTrades.filter(t => t.botId === botId);
    }

    return allTrades;
};

export const saveStockTrade = (trade: StockTrade): void => {
    if (typeof window === 'undefined') return;
    const trades = getStockTrades();
    trades.push(trade);
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
};

export const deleteStockBotTrades = (botId: string): void => {
    if (typeof window === 'undefined') return;
    const trades = getStockTrades().filter(t => t.botId !== botId);
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
};

// ============ POSITIONS ============
export const getStockPositions = (botId?: string): StockPosition[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.POSITIONS);
    const allPositions: StockPosition[] = data ? JSON.parse(data) : [];

    if (botId) {
        return allPositions.filter(p => p.botId === botId);
    }

    return allPositions;
};

export const getOpenStockPositions = (botId: string): StockPosition[] => {
    return getStockPositions(botId).filter(p => p.status === 'open');
};

export const saveStockPosition = (position: StockPosition): void => {
    if (typeof window === 'undefined') return;
    const positions = getStockPositions();
    const existingIndex = positions.findIndex(p => p.id === position.id);

    if (existingIndex >= 0) {
        positions[existingIndex] = position;
    } else {
        positions.push(position);
    }

    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
};

export const updateStockPosition = (positionId: string, updates: Partial<StockPosition>): void => {
    if (typeof window === 'undefined') return;
    const positions = getStockPositions();
    const index = positions.findIndex(p => p.id === positionId);

    if (index >= 0) {
        positions[index] = { ...positions[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
    }
};

export const closeStockPosition = (positionId: string): void => {
    updateStockPosition(positionId, { status: 'closed' });
};

export const deleteStockBotPositions = (botId: string): void => {
    if (typeof window === 'undefined') return;
    const positions = getStockPositions().filter(p => p.botId !== botId);
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
};

// ============ UTILITIES ============
export const clearAllStockBotData = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.BOTS);
    localStorage.removeItem(STORAGE_KEYS.TRADES);
    localStorage.removeItem(STORAGE_KEYS.POSITIONS);
};
