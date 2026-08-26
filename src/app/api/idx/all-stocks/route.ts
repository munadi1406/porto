import { NextResponse } from 'next/server';
import { getStockSummary, getLastTradingDate, dateStr } from '@/lib/idxApiClient';
 // Warm-up session di background

// Yahoo Finance batch fallback
async function fetchYahooBatch(tickers: string[]): Promise<any[]> {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const results: any[] = [];
    const BATCH = 10;

    for (let i = 0; i < tickers.length; i += BATCH) {
        const batch = tickers.slice(i, i + BATCH);
        const quotes = await Promise.all(batch.map(t => yf.quote(t).catch(() => null)));
        for (const q of quotes) {
            if (!q?.regularMarketPrice) continue;
            results.push({
                code: (q.symbol || '').replace('.JK', ''),
                name: q.shortName || q.longName || q.symbol || '',
                close: q.regularMarketPrice,
                change: q.regularMarketChange || 0,
                changePercent: q.regularMarketChangePercent || 0,
                open: q.regularMarketOpen || 0,
                high: q.regularMarketDayHigh || 0,
                low: q.regularMarketDayLow || 0,
                volume: q.regularMarketVolume || 0,
                value: (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0),
                prevClose: q.regularMarketPreviousClose || 0,
                marketCap: q.marketCap || null,
                pe: q.trailingPE || null,
            });
        }
        if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 100));
    }
    return results;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 959);

    // Optimasi: gunakan getLastTradingDate() yang sudah di-cache
    try {
        const lastDate = await getLastTradingDate();
        const raw = await getStockSummary(lastDate);
        if (Array.isArray(raw) && raw.length > 10) {
            const stocks = raw.slice(0, limit).map((s: any) => ({
                code: s.Kode || s.kode || s.Code || s.code || '',
                name: s.Nama || s.nama || s.Name || s.name || '',
                close: Number(s.Harga || s.harga || s.Close || s.close || 0),
                change: Number(s.Change || s.change || 0),
                changePercent: Number(s.Persen || s.persen || s.ChangePercent || s.changePercent || 0),
                open: Number(s.Open || s.open || 0),
                high: Number(s.Tertinggi || s.tertinggi || s.High || s.high || 0),
                low: Number(s.Terendah || s.terendah || s.Low || s.low || 0),
                volume: Number(s.Volume || s.volume || 0),
                value: Number(s.Value || s.value || 0),
                prevClose: Number(s.Penutupan || s.penutupan || s.PrevClose || 0),
                marketCap: null,
                pe: null,
            }));
            return NextResponse.json({ success: true, data: stocks, source: 'idx', date: lastDate, total: raw.length });
        }
    } catch {}

    // Fallback: cek 2 hari terakhir paralel
    const fallbackDates = [1, 2].map((offset) => {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        return dateStr(d);
    });

    const results = await Promise.allSettled(
        fallbackDates.map(async (ds) => {
            const raw = await getStockSummary(ds);
            if (Array.isArray(raw) && raw.length > 10) {
                return { raw, date: ds };
            }
            return null;
        })
    );

    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
            const { raw, date: ds } = r.value;
            const stocks = raw.slice(0, limit).map((s: any) => ({
                code: s.Kode || s.kode || s.Code || s.code || '',
                name: s.Nama || s.nama || s.Name || s.name || '',
                close: Number(s.Harga || s.harga || s.Close || s.close || 0),
                change: Number(s.Change || s.change || 0),
                changePercent: Number(s.Persen || s.persen || s.ChangePercent || s.changePercent || 0),
                open: Number(s.Open || s.open || 0),
                high: Number(s.Tertinggi || s.tertinggi || s.High || s.high || 0),
                low: Number(s.Terendah || s.terendah || s.Low || s.low || 0),
                volume: Number(s.Volume || s.volume || 0),
                value: Number(s.Value || s.value || 0),
                prevClose: Number(s.Penutupan || s.penutupan || s.PrevClose || 0),
                marketCap: null,
                pe: null,
            }));
            return NextResponse.json({ success: true, data: stocks, source: 'idx', date: ds, total: raw.length });
        }
    }

    // Strategy 2: Yahoo Finance batch
    try {
        const { getAllStocks } = await import('@/lib/screenerStockList');
        const allTickers = getAllStocks().slice(0, limit);
        const stocks = await fetchYahooBatch(allTickers);
        return NextResponse.json({ success: true, data: stocks, source: 'yahoo', total: stocks.length });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 502 });
    }
}