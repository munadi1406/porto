import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface CacheItem {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
}

const CACHE_TTL = 5 * 1000;
const cache: Record<string, CacheItem> = {};

export async function POST(request: Request) {
    try {
        const { tickers } = await request.json();

        if (!Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({ error: 'tickers array is required' }, { status: 400 });
        }

        // Limit ke 50 tickers per request
        const limitedTickers = tickers.slice(0, 50);
        const now = Date.now();
        const results: Record<string, any> = {};

        // Check cache dulu
        const uncachedTickers: string[] = [];
        for (const ticker of limitedTickers) {
            if (cache[ticker] && (now - cache[ticker].timestamp < CACHE_TTL)) {
                results[ticker] = {
                    ticker,
                    price: cache[ticker].price,
                    change: cache[ticker].change,
                    changePercent: cache[ticker].changePercent,
                };
            } else {
                uncachedTickers.push(ticker);
            }
        }

        // Fetch uncached tickers secara paralel
        if (uncachedTickers.length > 0) {
            const quotes = await Promise.allSettled(
                uncachedTickers.map(t => yahooFinance.quote(t))
            );

            quotes.forEach((result, i) => {
                const ticker = uncachedTickers[i];
                if (result.status === 'fulfilled') {
                    const q = result.value as any;
                    const price = q.regularMarketPrice || 0;
                    const change = q.regularMarketChange || 0;
                    const changePercent = q.regularMarketChangePercent || 0;

                    cache[ticker] = { price, change, changePercent, timestamp: now };
                    results[ticker] = {
                        ticker,
                        price,
                        change,
                        changePercent,
                        name: q.shortName || q.longName || ticker,
                        high52w: q.fiftyTwoWeekHigh || 0,
                    };
                } else {
                    results[ticker] = { ticker, price: 0, change: 0, changePercent: 0 };
                }
            });
        }

        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
