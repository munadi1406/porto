// Types untuk Wahana Otomatis Saham Indonesia (IDX Auto Trading Bot)
export interface StockBot {
    id: string;
    name: string;
    strategy: 'scalping' | 'swing' | 'dca' | 'breakout';
    initialCapital: number;
    currentCapital: number;
    isActive: boolean;
    createdAt: number;
    settings: StockBotSettings;
}

export interface StockBotSettings {
    // Trading parameters
    targetStock: string; // e.g., "BBCA.JK", "TLKM.JK" - used when autoSelectMode is false
    autoSelectMode: boolean; // if true, bot will automatically select best stock to trade
    allowedStocks?: string[]; // list of stocks bot can trade (when autoSelectMode is true)
    buyThreshold: number; // % drop to trigger buy
    sellThreshold: number; // % gain to trigger sell
    maxPositionSize: number; // max % of capital per trade
    stopLoss: number; // % loss to trigger stop loss
    takeProfit: number; // % profit to trigger take profit

    // Scalping specific
    scalpingInterval: number; // seconds between trades
    minProfitPercent: number; // minimum profit % for scalping

    // Breakout specific
    breakoutPeriod?: number; // days to check for breakout
    volumeMultiplier?: number; // volume must be X times average
}

export interface StockPosition {
    id: string;
    botId: string;
    stock: string;
    lots: number; // jumlah lot (1 lot = 100 saham)
    shares: number; // total saham (lots * 100)
    buyPrice: number; // harga beli per saham
    currentPrice: number;
    timestamp: number;
    status: 'open' | 'closed';
}

export interface StockTrade {
    id: string;
    botId: string;
    type: 'buy' | 'sell';
    stock: string;
    lots: number;
    shares: number;
    price: number; // price per share
    total: number; // total transaction value
    profit?: number;
    profitPercent?: number;
    timestamp: number;
    reason: string; // e.g., "Scalping opportunity", "Stop loss triggered"
}

export interface StockPrice {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
    lastUpdated: number;
}

export interface StockBotPerformance {
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

// Popular Indonesian stocks for bot trading
export const POPULAR_IDX_STOCKS = [
    { symbol: 'BBCA.JK', name: 'Bank BCA' },
    { symbol: 'BBRI.JK', name: 'Bank BRI' },
    { symbol: 'BMRI.JK', name: 'Bank Mandiri' },
    { symbol: 'TLKM.JK', name: 'Telkom Indonesia' },
    { symbol: 'ASII.JK', name: 'Astra International' },
    { symbol: 'UNVR.JK', name: 'Unilever Indonesia' },
    { symbol: 'BBNI.JK', name: 'Bank BNI' },
    { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia' },
    { symbol: 'EMTK.JK', name: 'Elang Mahkota Teknologi' },
    { symbol: 'ICBP.JK', name: 'Indofood CBP' },
    { symbol: 'INDF.JK', name: 'Indofood Sukses Makmur' },
    { symbol: 'KLBF.JK', name: 'Kalbe Farma' },
    { symbol: 'ADRO.JK', name: 'Adaro Energy' },
    { symbol: 'PTBA.JK', name: 'Bukit Asam' },
    { symbol: 'ANTM.JK', name: 'Aneka Tambang' },
];
