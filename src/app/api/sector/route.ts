import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

interface SectorCacheItem {
    sector: string;
    industry: string;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (sector doesn't change often)
const cache: Record<string, SectorCacheItem> = {};

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
            sector: cache[ticker].sector,
            industry: cache[ticker].industry,
            source: 'cache'
        });
    }

    try {
        // Fetch quote summary with asset profile
        const result: any = await yahooFinance.quoteSummary(ticker, {
            modules: ['assetProfile', 'summaryProfile']
        });

        const sector = result?.assetProfile?.sector ||
            result?.summaryProfile?.sector ||
            'Others';
        const industry = result?.assetProfile?.industry ||
            result?.summaryProfile?.industry ||
            'Unknown';

        // Update cache
        cache[ticker] = {
            sector,
            industry,
            timestamp: now
        };

        return NextResponse.json({
            ticker,
            sector,
            industry,
            source: 'api'
        });

    } catch (error: any) {
        console.error(`Error fetching sector for ${ticker}:`, error.message);

        // Return default on error
        return NextResponse.json({
            ticker,
            sector: 'Others',
            industry: 'Unknown',
            source: 'error'
        });
    }
}
