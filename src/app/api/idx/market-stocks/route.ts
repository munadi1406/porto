import { NextResponse } from 'next/server';
import { GET as getMarketScan } from '../market-scan/route';

export async function GET() {
    const response = await getMarketScan();
    const payload = await response.json();
    if (!payload.success) return NextResponse.json(payload, { status: response.status });
    return NextResponse.json({ success: true, data: { total: payload.data.total, stocks: payload.data.all, timestamp: payload.data.timestamp }, source: payload.source });
}
