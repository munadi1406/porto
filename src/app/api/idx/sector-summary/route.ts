import { NextResponse } from 'next/server';
import '@/lib/idxWarmup';

const SECTOR_TICKERS: Record<string, string[]> = {
    Perbankan: ['BBCA','BBRI','BMRI','BBNI','BRIS','BDMN','BNGA','NISP'],
    Infrastruktur: ['TLKM','JSMR','PGAS','TOWR','TBIG','EXCL','ISAT','FREN'],
    Tambang: ['ADRO','PTBA','ANTM','BUMI','MEDC','ITMG','HRUM','INDY'],
    Konsumen: ['UNVR','ICBP','INDF','GGRM','HMSP','KLBF','CPIN','JPFA'],
    Properti: ['SMGR','WIKA','PTPP','ADHI','PWON','BSDE','CTRA','LPKR'],
    Energi: ['BYAN','PGAS','ADRO','MEDC','ITMG','RAJA','MBMA','BESS'],
    Teknologi: ['GOTO','BUKA','MTEL','DCII','EMTK','MLPT','KPAS','KBLV'],
    Otomotif: ['ASII','DRMA','INDS','PRAS','LPIN','GJTL','BRAM','ARNA'],
};

function computeSectorFromStockMap(stockMap: Map<string, any>, sector: string, tickers: string[]) {
    const valid = tickers
        .map(t => stockMap.get(t))
        .filter((s): s is any => s != null);

    const totalVolume = valid.reduce((s, item) => s + Number(item.Volume || item.volume || 0), 0);
    const totalValue = valid.reduce((s, item) => s + Number(item.Value || item.value || 0), 0);
    const avgChange = valid.length > 0
        ? valid.reduce((s, item) => s + Number(item.Persen || item.persen || item.ChangePercent || item.changePercent || 0), 0) / valid.length
        : 0;
    const gainers = valid.filter(item => Number(item.Persen || item.persen || item.ChangePercent || item.changePercent || 0) > 0).length;
    const losers = valid.filter(item => Number(item.Persen || item.persen || item.ChangePercent || item.changePercent || 0) < 0).length;

    return { sector, stocks: valid.length, totalVolume, totalValue, avgChangePercent: Math.round(avgChange * 100) / 100, gainers, losers };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sectorParam = searchParams.get('sector');

    // Mode: single sector — langsung Yahoo Finance
    if (sectorParam && SECTOR_TICKERS[sectorParam]) {
        try {
            const YahooFinance = (await import('yahoo-finance2')).default;
            const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
            const tickers = SECTOR_TICKERS[sectorParam];
            const quotes = await Promise.all(tickers.map(t => yf.quote(`${t}.JK`).catch(() => null)));
            const valid = quotes.filter((q: any) => q?.regularMarketPrice);
            const totalVolume = valid.reduce((s: number, q: any) => s + (q.regularMarketVolume || 0), 0);
            const totalValue = valid.reduce((s: number, q: any) => s + (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0), 0);
            const avgChange = valid.length > 0
                ? valid.reduce((s: number, q: any) => s + (q.regularMarketChangePercent || 0), 0) / valid.length
                : 0;
            const gainers = valid.filter((q: any) => (q.regularMarketChangePercent || 0) > 0).length;
            const losers = valid.filter((q: any) => (q.regularMarketChangePercent || 0) < 0).length;
            return NextResponse.json({
                success: true,
                data: { sector: sectorParam, stocks: valid.length, totalVolume, totalValue, avgChangePercent: Math.round(avgChange * 100) / 100, gainers, losers },
                source: 'yahoo',
            });
        } catch {
            return NextResponse.json({ success: true, data: { sector: sectorParam, stocks: 0, totalVolume: 0, totalValue: 0, avgChangePercent: 0, gainers: 0, losers: 0 }, source: 'empty' });
        }
    }

    // Mode: semua sektor — langsung Yahoo Finance (IDX timeout)
    try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
        const entries = await Promise.all(
            Object.entries(SECTOR_TICKERS).map(async ([sector, tickers]) => {
                const quotes = await Promise.all(tickers.map(t => yf.quote(`${t}.JK`).catch(() => null)));
                const valid = quotes.filter((q: any) => q?.regularMarketPrice);
                const totalVolume = valid.reduce((s: number, q: any) => s + (q.regularMarketVolume || 0), 0);
                const totalValue = valid.reduce((s: number, q: any) => s + (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0), 0);
                const avgChange = valid.length > 0
                    ? valid.reduce((s: number, q: any) => s + (q.regularMarketChangePercent || 0), 0) / valid.length
                    : 0;
                const gainers = valid.filter((q: any) => (q.regularMarketChangePercent || 0) > 0).length;
                const losers = valid.filter((q: any) => (q.regularMarketChangePercent || 0) < 0).length;
                return { sector, stocks: valid.length, totalVolume, totalValue, avgChangePercent: Math.round(avgChange * 100) / 100, gainers, losers };
            })
        );
        return NextResponse.json({ success: true, data: entries.sort((a, b) => b.totalValue - a.totalValue), source: 'yahoo' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
