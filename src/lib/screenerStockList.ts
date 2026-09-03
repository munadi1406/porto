import stockData from '../../stocks-idx.json';

const NON_TICKER_ROWS = new Set(['NO.JK', 'KODE.JK']);

export function filterStockTickers(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return values.filter((ticker): ticker is string =>
        typeof ticker === 'string' && /^[A-Z]{2,4}\.JK$/.test(ticker) && !NON_TICKER_ROWS.has(ticker)
    );
}

export function getAllStocks(): string[] {
    return filterStockTickers(stockData.stocks);
}
