import { NextResponse } from 'next/server';
import { getBrokerSummary, getForeignFlow } from '@/lib/idxApi';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker')?.toUpperCase().replace('.JK', '') || '';
        const date = searchParams.get('date') || undefined;

        const [brokers, flow] = await Promise.all([
            getBrokerSummary(date),
            getForeignFlow(date),
        ]);

        // Top 10 net buy brokers
        const topBuy = [...brokers]
            .sort((a, b) => b.NET_BUY_VALUE - a.NET_BUY_VALUE)
            .slice(0, 10)
            .map(b => ({ name: b.BRK_NAME, code: b.BRK_CODE, netValue: b.NET_BUY_VALUE }));

        // Top 10 net sell brokers
        const topSell = [...brokers]
            .sort((a, b) => a.NET_BUY_VALUE - b.NET_BUY_VALUE)
            .slice(0, 10)
            .map(b => ({ name: b.BRK_NAME, code: b.BRK_CODE, netValue: b.NET_BUY_VALUE }));

        // Aggregate totals
        const totalBuyValue = brokers.reduce((s, b) => s + b.BUY_VALUE, 0);
        const totalSellValue = brokers.reduce((s, b) => s + b.SELL_VALUE, 0);

        return NextResponse.json({
            success: true,
            data: {
                foreignFlow: flow,
                topBuyBrokers: topBuy,
                topSellBrokers: topSell,
                summary: {
                    totalBuyValue,
                    totalSellValue,
                    totalNetValue: totalBuyValue - totalSellValue,
                    brokerCount: brokers.length,
                },
            },
            source: 'idx',
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
