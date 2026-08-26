// Market Scan — fetch SEMUA saham IDX dari Yahoo Finance
// Caching agresif agar tidak fetch ulang tiap halaman load.
// Menghitung: most active, gainers/losers, market breadth, sector performance
// dari seluruh 959 saham (bukan subset 30-64).

import { NextResponse } from 'next/server';
import { getAllStocks } from '@/lib/screenerStockList';
import { getSectorForCode } from '@/lib/sectorMapping';

interface StockSnapshot {
    code: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    value: number;
    sector: string | null;
    industry: string | null;
}

// In-memory cache
let scanCache: { data: any; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 menit
const CONCURRENCY = 20; // jumlah request paralel

async function fetchAllStockSnapshots(): Promise<StockSnapshot[]> {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const tickers = getAllStocks();
    const results: StockSnapshot[] = [];

    for (let i = 0; i < tickers.length; i += CONCURRENCY) {
        const batch = tickers.slice(i, i + CONCURRENCY);
        const quotes = await Promise.allSettled(
            batch.map(async (t) => {
                try {
                    const q: any = await Promise.race([
                        yf.quote(t),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
                    ]);
                    const price = q.regularMarketPrice || 0;
                    if (!price) return null;
                    const volume = q.regularMarketVolume || 0;
                    const code = (q.symbol || t).replace('.JK', '');
                    const mapped = getSectorForCode(code);
                    return {
                        code,
                        name: q.shortName || q.longName || code,
                        price,
                        change: q.regularMarketChange || 0,
                        changePercent: q.regularMarketChangePercent || 0,
                        volume,
                        value: price * volume,
                        // Mapping lokal dulu (label ID konsisten); Yahoo mentah hanya cadangan
                        sector: mapped !== 'Lainnya' ? mapped : (q.sector || null),
                        industry: q.industry || null,
                    } as StockSnapshot;
                } catch {
                    return null;
                }
            })
        );

        for (const r of quotes) {
            if (r.status === 'fulfilled' && r.value) results.push(r.value);
        }
    }

    return results;
}

export async function GET() {
    // Serve cache jika masih fresh
    if (scanCache && Date.now() - scanCache.ts < CACHE_TTL) {
        return NextResponse.json({ success: true, data: scanCache.data, source: 'cache' });
    }

    try {
        const stocks = await fetchAllStockSnapshots();

        const withValue = stocks.filter(s => s.value > 0);
        const withChange = stocks.filter(s => Number.isFinite(s.changePercent));

        // Market breadth
        const advancing = withChange.filter(s => s.changePercent > 0).length;
        const declining = withChange.filter(s => s.changePercent < 0).length;
        const unchanged = withChange.filter(s => s.changePercent === 0).length;

        // Most active
        const byVolume = [...withValue].sort((a, b) => b.volume - a.volume).slice(0, 20);
        const byValue = [...withValue].sort((a, b) => b.value - a.value).slice(0, 20);

        // Gainers / Losers
        const gainers = [...withChange]
            .filter(s => s.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 20);
        const losers = [...withChange]
            .filter(s => s.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 20);

        // Sector performance (group by Yahoo sector)
        const sectorMap = new Map<string, { stocks: number; totalVolume: number; totalValue: number; sumChange: number; gainers: number; losers: number }>();
        for (const s of withChange) {
            const sector = s.sector || 'Lainnya';
            if (!sectorMap.has(sector)) {
                sectorMap.set(sector, { stocks: 0, totalVolume: 0, totalValue: 0, sumChange: 0, gainers: 0, losers: 0 });
            }
            const entry = sectorMap.get(sector)!;
            entry.stocks++;
            entry.totalVolume += s.volume;
            entry.totalValue += s.value;
            entry.sumChange += s.changePercent;
            if (s.changePercent > 0) entry.gainers++;
            if (s.changePercent < 0) entry.losers++;
        }
        const sectors = Array.from(sectorMap.entries())
            .map(([sector, e]) => ({
                sector,
                stocks: e.stocks,
                totalVolume: e.totalVolume,
                totalValue: e.totalValue,
                avgChangePercent: Math.round((e.sumChange / e.stocks) * 100) / 100,
                gainers: e.gainers,
                losers: e.losers,
            }))
            .sort((a, b) => b.totalValue - a.totalValue);

        const data = {
            total: stocks.length,
            breadth: { advancing, declining, unchanged },
            mostActive: { byVolume, byValue },
            gainers,
            losers,
            sectors,
            all: [...withValue].sort((a, b) => b.value - a.value),
            timestamp: Date.now(),
        };

        scanCache = { data, ts: Date.now() };
        return NextResponse.json({ success: true, data, source: 'fresh' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}