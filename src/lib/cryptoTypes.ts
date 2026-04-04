// Types untuk Wahana Otomatis (Auto Trading Bot) - Khusus Crypto
export interface CryptoBot {
    id: string;
    name: string;
    strategy: 'scalping' | 'swing' | 'dca' | 'grid';
    initialCapital: number;
    currentCapital: number;
    isActive: boolean;
    createdAt: number;
    settings: BotSettings;
}

export interface BotSettings {
    // Trading parameters
    targetCrypto: string; // e.g., "BTC", "ETH", "BNB" - used when autoSelectMode is false
    autoSelectMode: boolean; // if true, bot will automatically select best crypto to trade
    allowedCryptos?: string[]; // list of cryptos bot can trade (when autoSelectMode is true)
    buyThreshold: number; // % drop to trigger buy
    sellThreshold: number; // % gain to trigger sell
    maxPositionSize: number; // max % of capital per trade
    stopLoss: number; // % loss to trigger stop loss
    takeProfit: number; // % profit to trigger take profit

    // Scalping specific
    scalpingInterval: number; // seconds between trades
    minProfitPercent: number; // minimum profit % for scalping

    // Grid trading specific
    gridLevels?: number;
    gridSpacing?: number; // % between grid levels
}

export interface CryptoPosition {
    id: string;
    botId: string;
    crypto: string;
    amount: number; // amount of crypto
    buyPrice: number; // price when bought
    currentPrice: number;
    timestamp: number;
    status: 'open' | 'closed';
}

export interface CryptoTrade {
    id: string;
    botId: string;
    type: 'buy' | 'sell';
    crypto: string;
    amount: number;
    price: number;
    total: number;
    profit?: number;
    profitPercent?: number;
    timestamp: number;
    reason: string; // e.g., "Scalping opportunity", "Stop loss triggered"
}

export interface CryptoPrice {
    symbol: string;
    price: number;
    change24h: number;
    changePercent24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    lastUpdated: number;
}

export interface BotPerformance {
    botId: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalProfitPercent: number;
    winRate: number;
    lossRate: number;
    averageProfit: number;
    averageLoss: number;
    maxDrawdown: number;
    sharpeRatio?: number;
}
