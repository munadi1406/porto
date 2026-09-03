import { NextResponse } from 'next/server';
import { GET as getMarketScan } from '../market-scan/route';

export async function GET() {
    const response = await getMarketScan();
    const payload = await response.json();
    if (!payload.success) return NextResponse.json(payload, { status: response.status });
    return NextResponse.json({ success: true, data: { mostActive: payload.data.mostActive, gainers: payload.data.gainers, losers: payload.data.losers, timestamp: payload.data.timestamp }, source: payload.source });
}
