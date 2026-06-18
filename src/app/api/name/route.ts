import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache: Record<string, { name: string; timestamp: number }> = {};

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const now = Date.now();
    if (cache[ticker] && (now - cache[ticker].timestamp < CACHE_TTL)) {
        return NextResponse.json({ ticker, name: cache[ticker].name, source: 'cache' });
    }

    try {
        const quote: any = await yahooFinance.quote(ticker);
        const name = quote.shortName || quote.longName || ticker;

        cache[ticker] = { name, timestamp: now };

        return NextResponse.json({ ticker, name, source: 'live' });
    } catch (error) {
        return NextResponse.json({ ticker, name: ticker, source: 'error' });
    }
}
