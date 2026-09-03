import { NextResponse } from 'next/server';
import { getAllStocks } from '@/lib/screenerStockList';
import { getCachedJson, saveCachedJson } from '@/lib/brokerCacheDb';

const CACHE_KEY = 'market-breadth:v2';
const FRESH_TTL = 10 * 60 * 1000;
const STALE_TTL = 30 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 60;
const MIN_PARTIAL_QUOTES = 100;

type BreadthData = {
    total: number;
    breadth: { advancing: number; declining: number; unchanged: number };
    timestamp: number;
    coverage: { received: number; requested: number; percent: number };
};

let memoryCache: { data: BreadthData; ts: number } | null = null;
let breadthInFlight: Promise<BreadthData> | null = null;

async function fetchBreadth(): Promise<BreadthData> {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const tickers = getAllStocks();
    let advancing = 0;
    let declining = 0;
    let unchanged = 0;
    let received = 0;
    let emptyBatchStreak = 0;

    for (let offset = 0; offset < tickers.length; offset += CONCURRENCY) {
        const batch = tickers.slice(offset, offset + CONCURRENCY);
        const results = await Promise.allSettled(batch.map(ticker => Promise.race([
            yf.quote(ticker),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])));
        let batchReceived = 0;
        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            const quote = result.value as any;
            if (!Number.isFinite(Number(quote?.regularMarketPrice)) || Number(quote.regularMarketPrice) <= 0) continue;
            const change = Number(quote.regularMarketChangePercent);
            if (!Number.isFinite(change)) continue;
            received++;
            batchReceived++;
            if (change > 0) advancing++;
            else if (change < 0) declining++;
            else unchanged++;
        }
        emptyBatchStreak = batchReceived === 0 ? emptyBatchStreak + 1 : 0;
        if (emptyBatchStreak >= 2 && received === 0) throw new Error('Yahoo Finance tidak merespons dua batch awal');
        if (emptyBatchStreak >= 3 && received >= MIN_PARTIAL_QUOTES) break;
    }

    if (received < MIN_PARTIAL_QUOTES) throw new Error(`Yahoo Finance hanya mengembalikan ${received}/${tickers.length} quote`);
    return {
        total: received,
        breadth: { advancing, declining, unchanged },
        timestamp: Date.now(),
        coverage: { received, requested: tickers.length, percent: Math.round(received / Math.max(1, tickers.length) * 1000) / 10 },
    };
}

export async function GET() {
    const now = Date.now();
    if (memoryCache && now - memoryCache.ts < FRESH_TTL) {
        return NextResponse.json({ success: true, data: memoryCache.data, source: 'memory-cache' });
    }

    const [freshCache, staleCache] = await Promise.all([
        getCachedJson(CACHE_KEY, FRESH_TTL),
        getCachedJson(CACHE_KEY, STALE_TTL),
    ]);
    if (freshCache?.total > 0) {
        memoryCache = { data: freshCache, ts: freshCache.timestamp || now };
        return NextResponse.json({ success: true, data: freshCache, source: 'persistent-cache' });
    }

    try {
        if (!breadthInFlight) breadthInFlight = fetchBreadth();
        const data = await breadthInFlight;
        memoryCache = { data, ts: now };
        await saveCachedJson(CACHE_KEY, data);
        return NextResponse.json({
            success: true,
            data,
            source: data.coverage.percent < 90 ? 'partial' : 'fresh',
            ...(data.coverage.percent < 90 ? { warning: `Breadth sementara memakai ${data.coverage.received}/${data.coverage.requested} saham.` } : {}),
        });
    } catch (error: any) {
        if (staleCache?.total > 0) {
            return NextResponse.json({ success: true, data: staleCache, source: 'stale-cache', warning: `Yahoo Finance bermasalah; menampilkan cache terakhir. ${error.message}` });
        }
        return NextResponse.json({
            success: true,
            data: { total: 0, breadth: { advancing: 0, declining: 0, unchanged: 0 }, timestamp: now, coverage: { received: 0, requested: getAllStocks().length, percent: 0 } },
            source: 'unavailable',
            warning: error.message,
        });
    } finally {
        breadthInFlight = null;
    }
}
