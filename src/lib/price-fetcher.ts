// Yahoo Finance Price Fetcher — shared between WS server and API routes

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface PriceData {
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
    high52w?: number;
}

// In-memory price cache with TTL
const priceCache: Record<string, { data: PriceData; ts: number }> = {};
const CACHE_TTL = 3000; // 3 seconds

export function getCachedPrice(ticker: string): PriceData | null {
    const cached = priceCache[ticker];
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
    return null;
}

export function setCachedPrice(ticker: string, data: PriceData) {
    priceCache[ticker] = { data, ts: Date.now() };
}

export async function fetchPrices(tickers: string[]): Promise<Record<string, PriceData>> {
    const results: Record<string, PriceData> = {};
    const toFetch: string[] = [];

    // Check cache first
    for (const ticker of tickers) {
        const cached = getCachedPrice(ticker);
        if (cached) {
            results[ticker] = cached;
        } else {
            toFetch.push(ticker);
        }
    }

    if (toFetch.length === 0) return results;

    // Fetch uncached tickers in parallel
    const quotes = await Promise.allSettled(
        toFetch.map(async (ticker) => {
            try {
                const q: any = await yf.quote(ticker);
                return {
                    ticker,
                    price: q.regularMarketPrice || 0,
                    change: q.regularMarketChange || 0,
                    changePercent: q.regularMarketChangePercent || 0,
                    name: q.shortName || q.longName || ticker,
                    high52w: q.fiftyTwoWeekHigh || 0,
                };
            } catch {
                return null;
            }
        })
    );

    for (const r of quotes) {
        if (r.status === "fulfilled" && r.value && r.value.price > 0) {
            results[r.value.ticker] = r.value;
            setCachedPrice(r.value.ticker, r.value);
        }
    }

    return results;
}
