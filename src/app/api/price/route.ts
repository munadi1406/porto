import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

interface CacheItem {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
}

const CACHE_TTL = 5 * 1000; // 5 seconds for near real-time
const cache: Record<string, CacheItem> = {};

// Initialize Yahoo Finance instance for v3.x
const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    // Check cache
    const now = Date.now();
    if (cache[ticker] && (now - cache[ticker].timestamp < CACHE_TTL)) {
        return NextResponse.json({
            ticker,
            price: cache[ticker].price,
            change: cache[ticker].change,
            changePercent: cache[ticker].changePercent,
            source: 'cache'
        });
    }

    try {
        // Use yahooFinance instance
        const quote: any = await yahooFinance.quote(ticker);

        // RegularMarketPrice is usually the field for live/delayed price
        const price = quote.regularMarketPrice || 0;
        const change = quote.regularMarketChange || 0;
        const changePercent = quote.regularMarketChangePercent || 0;
        const name = quote.shortName || quote.longName || ticker;

        // Update cache
        cache[ticker] = {
            price,
            change,
            changePercent,
            timestamp: now,
        };

        return NextResponse.json({
            ticker,
            price,
            change,
            changePercent,
            name,
            source: 'live'
        });

    } catch (error) {
        console.error(`Error fetching data for ${ticker}:`, error);

        // Return fallback 0 as graceful degradation
        return NextResponse.json({
            ticker,
            price: 0,
            change: 0,
            changePercent: 0,
            source: 'error_fallback'
        });
    }
}
