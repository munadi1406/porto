import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { dailyReturns, betaAndCorrelation, annualizedVolatility } from '@/lib/quant';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface ChartPoint { date: string; close: number }

async function fetchCloses(ticker: string, period1: Date): Promise<ChartPoint[]> {
    const result: any = await yahooFinance.chart(ticker, {
        period1,
        interval: '1d' as any,
    });
    if (!result?.quotes) return [];
    return (result.quotes as any[])
        .filter((q: any) => q.date && typeof q.close === 'number')
        .map((q: any) => ({ date: new Date(q.date).toISOString().slice(0, 10), close: q.close }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: NextRequest) {
    const ticker = req.nextUrl.searchParams.get('ticker')?.replace('.JK', '');
    const period = req.nextUrl.searchParams.get('period') || '1y';
    if (!ticker) return Response.json({ success: false, error: 'ticker required' }, { status: 400 });

    const years = period === '2y' ? 2 : period === '3y' ? 3 : 1;
    const period1 = new Date(Date.now() - years * 365 * 86_400_000);

    try {
        const [stock, market] = await Promise.all([
            fetchCloses(`${ticker}.JK`, period1),
            fetchCloses('^JKSE', period1),
        ]);
        if (stock.length < 20 || market.length < 20) {
            return Response.json({ success: false, error: 'Data tidak cukup' }, { status: 404 });
        }

        // Align per tanggal (intersection)
        const mMap = new Map(market.map(p => [p.date, p.close]));
        const dates: string[] = [];
        const sCloses: number[] = [];
        const mCloses: number[] = [];
        for (const p of stock) {
            const mc = mMap.get(p.date);
            if (mc != null) {
                dates.push(p.date);
                sCloses.push(p.close);
                mCloses.push(mc);
            }
        }
        if (sCloses.length < 20) {
            return Response.json({ success: false, error: 'Tanggal tidak cukup tumpang tindih' }, { status: 404 });
        }

        const sRet = dailyReturns(sCloses);
        const mRet = dailyReturns(mCloses);
        const { beta, correlation } = betaAndCorrelation(sRet, mRet);

        // Max drawdown + tanggalnya
        let peakPrice = sCloses[0], peakIdx = 0, worstPct = 0, wPeak = 0, wTrough = 0, wPeakI = 0, wTroughI = 0;
        for (let i = 0; i < sCloses.length; i++) {
            if (sCloses[i] > peakPrice) { peakPrice = sCloses[i]; peakIdx = i; }
            const d = peakPrice > 0 ? sCloses[i] / peakPrice - 1 : 0;
            if (d < worstPct) {
                worstPct = d; wPeak = peakPrice; wTrough = sCloses[i]; wPeakI = peakIdx; wTroughI = i;
            }
        }

        const first = sCloses[0], last = sCloses[sCloses.length - 1];

        return Response.json({
            success: true,
            data: {
                ticker,
                period,
                sampleDays: sCloses.length,
                beta,
                correlation,
                annualVolatilityPct: annualizedVolatility(sRet),
                maxDrawdownPct: worstPct * 100,
                drawdownPeak: { date: dates[wPeakI], price: wPeak },
                drawdownTrough: { date: dates[wTroughI], price: wTrough },
                returnPct: (last / first - 1) * 100,
            },
        });
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
