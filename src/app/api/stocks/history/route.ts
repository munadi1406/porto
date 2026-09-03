import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const period = searchParams.get('period') || '3mo';
    const interval = searchParams.get('interval') || '1d';
    const from = searchParams.get('from');

    if (!ticker) {
        return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const queryOptions: any = {
            period1: from && Number.isFinite(Number(from)) ? new Date(Number(from)) : getPeriodStartDate(period),
            interval: interval as any,
            events: 'div|split',
        };

        const result: any = await yahooFinance.chart(ticker, queryOptions);

        if (!result || !result.quotes || result.quotes.length === 0) {
            return NextResponse.json({ success: false, error: 'No data found' }, { status: 404 });
        }

        // 1. Filter, Sort, and DEDUPLICATE (Critical for lightweight-charts)
        const seenTimes = new Set<number>();
        const chartData = (result.quotes as any[])
            .filter(q => q.date && q.open !== null && q.high !== null && q.low !== null && q.close !== null)
            .map(q => ({
                ...q,
                // Use Unix timestamp (seconds)
                unixTime: Math.floor(new Date(q.date).getTime() / 1000)
            }))
            .sort((a, b) => a.unixTime - b.unixTime)
            .filter(q => {
                if (seenTimes.has(q.unixTime)) return false;
                seenTimes.add(q.unixTime);
                return true;
            })
            .map(q => ({
                time: q.unixTime,
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
                volume: q.volume
            }));

        return NextResponse.json({
            success: true,
            data: chartData,
            dividends: Array.isArray(result.events?.dividends)
                ? result.events.dividends.map((item: any) => ({
                    time: Math.floor(new Date(item.date).getTime() / 1000),
                    amount: Number(item.amount) || 0,
                }))
                : [],
            meta: result.meta
        });
    } catch (error: any) {
        const msg = error?.message || 'Unknown error';
        // Yahoo throws "No data found, symbol may be delisted" untuk ticker delisted / tidak ada data periode itu
        const isNoData = /no data|delisted|not found|404/i.test(msg);
        if (isNoData) {
            console.warn(`[history] No data for ${ticker} (${period}/${interval}): ${msg}`);
            return NextResponse.json(
                { success: false, error: 'No data found - symbol may be delisted or no trading data for period', data: [] },
                { status: 404 }
            );
        }
        console.error('Yahoo Finance Chart Error:', error);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

function getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
        case '1d': return new Date(now.setDate(now.getDate() - 1));
        case '5d': return new Date(now.setDate(now.getDate() - 5));
        case '1mo': return new Date(now.setMonth(now.getMonth() - 1));
        case '3mo': return new Date(now.setMonth(now.getMonth() - 3));
        case '6mo': return new Date(now.setMonth(now.getMonth() - 6));
        case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
        case '2y': return new Date(now.setFullYear(now.getFullYear() - 2));
        case '5y': return new Date(now.setFullYear(now.getFullYear() - 5));
        case 'ytd': return new Date(now.getFullYear(), 0, 1);
        case 'max': return new Date(now.setFullYear(now.getFullYear() - 20));
        default: return new Date(now.setMonth(now.getMonth() - 3));
    }
}
