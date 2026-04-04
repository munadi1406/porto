// Stock Price Simulator untuk IDX (Indonesia Stock Exchange)
// Menggunakan data simulasi yang realistis untuk saham Indonesia

import { StockPrice } from './stockBotTypes';

// Base prices untuk saham-saham populer (dalam Rupiah)
const BASE_PRICES: Record<string, { price: number; name: string }> = {
    'BBCA.JK': { price: 9500, name: 'Bank BCA' },
    'BBRI.JK': { price: 4800, name: 'Bank BRI' },
    'BMRI.JK': { price: 6200, name: 'Bank Mandiri' },
    'TLKM.JK': { price: 3500, name: 'Telkom Indonesia' },
    'ASII.JK': { price: 5200, name: 'Astra International' },
    'UNVR.JK': { price: 3800, name: 'Unilever Indonesia' },
    'BBNI.JK': { price: 5400, name: 'Bank BNI' },
    'GOTO.JK': { price: 120, name: 'GoTo Gojek Tokopedia' },
    'EMTK.JK': { price: 1200, name: 'Elang Mahkota Teknologi' },
    'ICBP.JK': { price: 10500, name: 'Indofood CBP' },
    'INDF.JK': { price: 6800, name: 'Indofood Sukses Makmur' },
    'KLBF.JK': { price: 1500, name: 'Kalbe Farma' },
    'ADRO.JK': { price: 2800, name: 'Adaro Energy' },
    'PTBA.JK': { price: 2600, name: 'Bukit Asam' },
    'ANTM.JK': { price: 1800, name: 'Aneka Tambang' },
};

// Simpan harga sebelumnya untuk simulasi perubahan
const previousPrices: Record<string, number> = {};

// Initialize previous prices
Object.keys(BASE_PRICES).forEach(symbol => {
    previousPrices[symbol] = BASE_PRICES[symbol].price;
});

/**
 * Generate realistic stock price with volatility
 * IDX stocks typically have lower volatility than crypto
 */
const generateStockPrice = (symbol: string): number => {
    // Get or create base price
    let basePrice = BASE_PRICES[symbol]?.price;

    if (!basePrice) {
        // If not in BASE_PRICES, it will be added by getStockPrice
        // For now, use a default
        basePrice = 1000;
    }

    const previousPrice = previousPrices[symbol] || basePrice;

    // IDX stocks have lower volatility (0.5% - 3% per update)
    const volatility = 0.02; // 2% max change
    const randomChange = (Math.random() - 0.5) * 2 * volatility;

    // Add some momentum (price tends to continue in same direction)
    const momentum = (previousPrice - basePrice) / basePrice * 0.3;

    const newPrice = previousPrice * (1 + randomChange + momentum);

    // Keep price within reasonable bounds (±20% from base)
    const minPrice = basePrice * 0.8;
    const maxPrice = basePrice * 1.2;
    const boundedPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

    // Round to nearest Rupiah (no decimals for IDX)
    const roundedPrice = Math.round(boundedPrice);

    previousPrices[symbol] = roundedPrice;
    return roundedPrice;
};

/**
 * Get real-time stock price from Yahoo Finance API
 */
export const getStockPrice = async (symbol: string): Promise<StockPrice> => {
    try {
        // Ensure symbol has .JK suffix for Indonesian stocks
        const ticker = symbol.includes('.JK') ? symbol : `${symbol}.JK`;

        // Fetch from Yahoo Finance API
        const response = await fetch(`/api/price?ticker=${ticker}`);

        if (!response.ok) {
            throw new Error('Failed to fetch stock price');
        }

        const data = await response.json();

        console.log('Yahoo Finance API Response for', ticker, ':', data);

        // Check if we got valid price data
        if (!data || data.price === undefined || data.price === 0) {
            console.warn('Invalid or zero price data, using fallback');
            throw new Error('Invalid price data');
        }

        // Extract stock name (remove .JK suffix)
        const stockCode = ticker.replace('.JK', '');
        const stockName = data.name || stockCode;

        // Use the correct field names from the API response
        const price = data.price;
        const change = data.change || 0;
        const changePercent = data.changePercent || 0;

        // For high/low, we'll use price +/- 2% as approximation since API doesn't return them
        const high = price * 1.02;
        const low = price * 0.98;

        // Volume is not returned by this API, use a default
        const volume = 100000; // Default volume in lots

        console.log('Processed price for', ticker, ':', {
            price,
            change,
            changePercent,
            high,
            low,
            volume
        });

        return {
            symbol: ticker,
            name: stockName,
            price,
            change,
            changePercent,
            high,
            low,
            volume,
            lastUpdated: Date.now(),
        };
    } catch (error) {
        console.error('Error fetching real stock price, using fallback:', error);

        // Fallback to simulated price if API fails
        return getSimulatedStockPrice(symbol);
    }
};

/**
 * Fallback: Get simulated stock price (used when API fails)
 */
const getSimulatedStockPrice = async (symbol: string): Promise<StockPrice> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Check if we have base data for this stock
    let baseData = BASE_PRICES[symbol];

    // If stock is not in our list, generate dynamic base data
    if (!baseData) {
        // Extract stock code (remove .JK suffix if present)
        const stockCode = symbol.replace('.JK', '');

        // Generate a reasonable base price based on stock code hash
        // This ensures the same stock always gets the same base price
        let hash = 0;
        for (let i = 0; i < stockCode.length; i++) {
            hash = ((hash << 5) - hash) + stockCode.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }

        // Generate price between 100 and 10000
        const basePrice = Math.abs(hash % 9900) + 100;

        baseData = {
            price: basePrice,
            name: stockCode
        };

        // Store it for consistency
        BASE_PRICES[symbol] = baseData;
        previousPrices[symbol] = basePrice;
    }

    const currentPrice = generateStockPrice(symbol);
    const previousClose = baseData.price;

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Generate realistic high/low based on current price
    const high = Math.round(currentPrice * (1 + Math.random() * 0.02));
    const low = Math.round(currentPrice * (1 - Math.random() * 0.02));

    // Generate realistic volume (in lots, 1 lot = 100 shares)
    const baseVolume = 100000; // 100k lots average
    const volume = Math.round(baseVolume * (0.5 + Math.random()));

    return {
        symbol,
        name: baseData.name,
        price: currentPrice,
        change,
        changePercent,
        high,
        low,
        volume,
        lastUpdated: Date.now(),
    };
};

/**
 * Get multiple stock prices at once
 */
export const getMultipleStockPrices = async (symbols: string[]): Promise<StockPrice[]> => {
    const promises = symbols.map(symbol => getStockPrice(symbol));
    return Promise.all(promises);
};

/**
 * Reset stock prices to base values
 */
export const resetStockPrices = (): void => {
    Object.keys(BASE_PRICES).forEach(symbol => {
        previousPrices[symbol] = BASE_PRICES[symbol].price;
    });
};

/**
 * Get all available stocks
 */
export const getAllStocks = (): string[] => {
    return Object.keys(BASE_PRICES);
};

/**
 * Check if stock symbol is valid
 */
export const isValidStock = (symbol: string): boolean => {
    return symbol in BASE_PRICES;
};

/**
 * Get stock name
 */
export const getStockName = (symbol: string): string => {
    return BASE_PRICES[symbol]?.name || symbol;
};
