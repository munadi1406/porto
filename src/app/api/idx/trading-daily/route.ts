import { NextRequest } from 'next/server';
import { getTradingInfoDaily } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const code = req.nextUrl.searchParams.get('code') || '';
        if (!code) return Response.json({ success: false, error: 'code required' }, { status: 400 });
        const data = await getTradingInfoDaily(code);
        if (!data || !data.SecurityCode) {
            return Response.json({ success: true, data: null });
        }
        return Response.json({
            success: true,
            data: {
                code: data.SecurityCode,
                board: data.BoardCode,
                price: { previous: data.PreviousPrice, open: data.OpeningPrice, high: data.HighestPrice, low: data.LowestPrice, close: data.ClosingPrice, change: data.Change },
                trading: { volume: data.TradedVolume, value: data.TradedValue, frequency: data.TradedFrequency },
                orderBook: { bid: data.BestBidPrice, bidVolume: data.BestBidVolume, offer: data.BestOfferPrice, offerVolume: data.BestOfferVolume },
                market: { individualIndex: data.IndividualIndex, foreignShares: data.NumberForeigner },
                updatedAt: data.DTCreate,
            }
        });
    } catch (error: any) {
        return Response.json({ success: true, data: null });
    }
}
