import { NextResponse } from 'next/server';
import '@/lib/idxWarmup';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const TOP_TICKERS = ['BBCA.JK','BBRI.JK','BMRI.JK','BBNI.JK','TLKM.JK','ASII.JK','ADRO.JK','UNVR.JK','ICBP.JK','CPIN.JK','GGRM.JK','HMSP.JK','KLBF.JK','INDF.JK','BYAN.JK','PTBA.JK','ANTM.JK','SMGR.JK','EXCL.JK','MNCN.JK','JSMR.JK','PGAS.JK','INKP.JK','ACES.JK','WIKA.JK','PTPP.JK','ADHI.JK','BUMI.JK','MEDC.JK','GOTO.JK'];

export async function GET() {
    // Langsung Yahoo Finance (lebih cepat dari IDX yang sering kena Cloudflare)
    try {
        const quotes = await Promise.all(TOP_TICKERS.map(t => yf.quote(t).catch(() => null)));
        const stocks = quotes
            .filter((q: any) => q?.regularMarketPrice)
            .map((q: any) => ({
                ticker: (q.symbol || '').replace('.JK', ''),
                name: q.shortName || q.longName || '',
                price: q.regularMarketPrice || 0,
                change: q.regularMarketChange || 0,
                changePercent: q.regularMarketChangePercent || 0,
                volume: q.regularMarketVolume || 0,
                value: (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0),
            }));
        const byVolume = [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 10);
        const byValue = [...stocks].sort((a, b) => b.value - a.value).slice(0, 10);
        return NextResponse.json({ success: true, data: { byVolume, byValue }, source: 'yahoo' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
