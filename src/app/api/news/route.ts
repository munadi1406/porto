import { NextResponse } from 'next/server';
import { getStockNews } from '@/lib/news';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    if (!symbol) {
        return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    try {
        const news = await getStockNews(symbol);
        return NextResponse.json({ success: true, symbol, news });
    } catch (e: any) {
        return NextResponse.json({ success: false, symbol, error: e.message }, { status: 502 });
    }
}