import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const DIVIDEND_TICKERS = ['BBCA.JK','BBRI.JK','BMRI.JK','BBNI.JK','TLKM.JK','ASII.JK','UNVR.JK','ADRO.JK','GGRM.JK','HMSP.JK','KLBF.JK','INDF.JK','ICBP.JK','CPIN.JK','SMGR.JK'];

export async function GET() {
    try {
        const results = await Promise.all(
            DIVIDEND_TICKERS.map(async (ticker) => {
                try {
                    const s: any = await yf.quoteSummary(ticker, { modules: ['calendarEvents', 'defaultKeyStatistics', 'summaryDetail'] });
                    const ce = s?.calendarEvents || {};
                    const kd = ce.dividendDate || {};
                    const divDate = kd.raw ? new Date(kd.raw * 1000).toISOString().slice(0, 10) : null;
                    const divRate = s?.summaryDetail?.dividendRate?.raw || null;
                    const divYield = s?.summaryDetail?.dividendYield?.raw || null;
                    const exDivDate = s?.summaryDetail?.exDividendDate?.raw
                        ? new Date(s.summaryDetail.exDividendDate.raw * 1000).toISOString().slice(0, 10)
                        : null;

                    if (!divRate && !exDivDate) return null;

                    return {
                        ticker: ticker.replace('.JK', ''),
                        name: s?.price?.shortName || '',
                        dividendRate: divRate ? Math.round(divRate * 100) / 100 : null,
                        dividendYield: divYield ? Math.round(divYield * 10000) / 100 : null,
                        exDividendDate: exDivDate,
                        nextDividendDate: divDate,
                        frequency: s?.summaryDetail?.dividendRate?.fmt || 'annual',
                    };
                } catch {
                    return null;
                }
            })
        );

        const dividends = results.filter(Boolean).sort((a: any, b: any) => (b.dividendYield || 0) - (a.dividendYield || 0));

        return NextResponse.json({
            success: true,
            data: { dividends },
            source: 'yahoo',
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
