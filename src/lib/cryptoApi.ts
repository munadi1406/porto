import { CryptoPrice } from './cryptoTypes';

// Simulasi harga crypto dengan volatilitas
const CRYPTO_SYMBOLS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'MATIC', 'DOT', 'AVAX',
    'LINK', 'UNI', 'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'
];

// Base prices (USD)
const BASE_PRICES: Record<string, number> = {
    'BTC': 45000, 'ETH': 2500, 'BNB': 320,
    'SOL': 100, 'ADA': 0.50, 'XRP': 0.60,
    'MATIC': 0.85, 'DOT': 7.50, 'AVAX': 35,
    'LINK': 15, 'UNI': 8,
    'DOGE': 0.08, 'SHIB': 0.00001, 'PEPE': 0.000001,
    'FLOKI': 0.00003, 'BONK': 0.000015
};

// Volatilitas per crypto (%) - Memecoin lebih volatile
const VOLATILITY: Record<string, number> = {
    'BTC': 2, 'ETH': 3, 'BNB': 4,
    'SOL': 5, 'ADA': 6, 'XRP': 5,
    'MATIC': 6, 'DOT': 5, 'AVAX': 6,
    'LINK': 5, 'UNI': 6,
    'DOGE': 8, 'SHIB': 12, 'PEPE': 15,
    'FLOKI': 14, 'BONK': 13
};

let priceCache: Record<string, CryptoPrice> = {};
let lastUpdate = 0;

// Generate random price movement
function generatePriceMovement(basePrice: number, volatility: number): number {
    const change = (Math.random() - 0.5) * 2 * volatility;
    const changeAmount = basePrice * (change / 100);
    return basePrice + changeAmount;
}

// Simulate real-time price updates
export function getCryptoPrice(symbol: string): CryptoPrice {
    const now = Date.now();

    // Update prices every 2 seconds
    if (now - lastUpdate > 2000 || !priceCache[symbol]) {
        const basePrice = BASE_PRICES[symbol] || 100;
        const volatility = VOLATILITY[symbol] || 3;

        const currentPrice = generatePriceMovement(basePrice, volatility);
        const change24h = (Math.random() - 0.5) * 2 * volatility * basePrice / 100;
        const changePercent24h = (change24h / basePrice) * 100;

        priceCache[symbol] = {
            symbol,
            price: currentPrice,
            change24h,
            changePercent24h,
            high24h: currentPrice * (1 + volatility / 100),
            low24h: currentPrice * (1 - volatility / 100),
            volume24h: Math.random() * 1000000000,
            lastUpdated: now
        };

        lastUpdate = now;
    }

    return priceCache[symbol];
}

export function getAllCryptoPrices(): CryptoPrice[] {
    return CRYPTO_SYMBOLS.map(symbol => getCryptoPrice(symbol));
}

// Simulate price stream for real-time updates
export function subscribeToPriceUpdates(
    symbol: string,
    callback: (price: CryptoPrice) => void,
    intervalMs: number = 2000
): () => void {
    const interval = setInterval(() => {
        const price = getCryptoPrice(symbol);
        callback(price);
    }, intervalMs);

    // Return unsubscribe function
    return () => clearInterval(interval);
}

// Get historical prices for charting (simulated)
export function getHistoricalPrices(symbol: string, hours: number = 24): Array<{ timestamp: number; price: number }> {
    const basePrice = BASE_PRICES[symbol] || 100;
    const volatility = VOLATILITY[symbol] || 3;
    const points: Array<{ timestamp: number; price: number }> = [];

    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 100; // 100 data points

    let currentPrice = basePrice;

    for (let i = 0; i < 100; i++) {
        const timestamp = now - (100 - i) * interval;
        currentPrice = generatePriceMovement(currentPrice, volatility / 10);
        points.push({ timestamp, price: currentPrice });
    }

    return points;
}

// Find best crypto to trade based on market analysis
export function findBestCryptoToTrade(allowedCryptos: string[], strategy: 'buy' | 'sell' = 'buy'): {
    crypto: string;
    price: CryptoPrice;
    score: number;
    reason: string;
} | null {
    const cryptoPrices = allowedCryptos.map(symbol => getCryptoPrice(symbol));

    if (strategy === 'buy') {
        // Find crypto with biggest drop (best buy opportunity)
        const sorted = cryptoPrices
            .filter(p => p.changePercent24h < 0) // Only dropping prices
            .sort((a, b) => a.changePercent24h - b.changePercent24h); // Most negative first

        if (sorted.length === 0) {
            // If no crypto is dropping, find the one with smallest gain
            const leastGain = cryptoPrices.sort((a, b) => a.changePercent24h - b.changePercent24h)[0];
            return {
                crypto: leastGain.symbol,
                price: leastGain,
                score: Math.abs(leastGain.changePercent24h),
                reason: `Smallest gain (${leastGain.changePercent24h >= 0 ? '+' : ''}${leastGain.changePercent24h.toFixed(2)}%) - potential reversal`
            };
        }

        const best = sorted[0];
        return {
            crypto: best.symbol,
            price: best,
            score: Math.abs(best.changePercent24h),
            reason: `Biggest drop (${best.changePercent24h.toFixed(2)}%) - buy opportunity`
        };
    } else {
        // Find crypto with biggest gain (best sell opportunity)
        const sorted = cryptoPrices
            .filter(p => p.changePercent24h > 0) // Only rising prices
            .sort((a, b) => b.changePercent24h - a.changePercent24h); // Most positive first

        if (sorted.length === 0) {
            // If no crypto is rising, find the one with smallest loss
            const leastLoss = cryptoPrices.sort((a, b) => b.changePercent24h - a.changePercent24h)[0];
            return {
                crypto: leastLoss.symbol,
                price: leastLoss,
                score: Math.abs(leastLoss.changePercent24h),
                reason: `Smallest loss (${leastLoss.changePercent24h.toFixed(2)}%) - potential reversal`
            };
        }

        const best = sorted[0];
        return {
            crypto: best.symbol,
            price: best,
            score: best.changePercent24h,
            reason: `Biggest gain (+${best.changePercent24h.toFixed(2)}%) - sell opportunity`
        };
    }
}

// Get market overview for all cryptos
export function getMarketOverview(symbols: string[]): {
    totalVolume: number;
    avgChange: number;
    bullish: number;
    bearish: number;
    neutral: number;
} {
    const prices = symbols.map(s => getCryptoPrice(s));

    const totalVolume = prices.reduce((sum, p) => sum + p.volume24h, 0);
    const avgChange = prices.reduce((sum, p) => sum + p.changePercent24h, 0) / prices.length;

    const bullish = prices.filter(p => p.changePercent24h > 2).length;
    const bearish = prices.filter(p => p.changePercent24h < -2).length;
    const neutral = prices.length - bullish - bearish;

    return {
        totalVolume,
        avgChange,
        bullish,
        bearish,
        neutral
    };
}

