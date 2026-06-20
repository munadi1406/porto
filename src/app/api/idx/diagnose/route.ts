import { NextResponse } from 'next/server';

export async function GET() {
    const tests: any[] = [];

    // Test 1: Direct fetch to IDX with headers
    try {
        const res = await fetch('https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=3&start=0&date=20260619', {
            headers: {
                'Referer': 'https://www.idx.co.id/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });
        tests.push({ name: 'Direct IDX fetch', status: res.status, ok: res.ok });
    } catch (e: any) {
        tests.push({ name: 'Direct IDX fetch', error: e.message });
    }

    // Test 2: Proxy rewrite
    try {
        const proxyUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000/api/idx-proxy/primary/TradingSummary/GetBrokerSummary?length=3&start=0&date=20260619'
            : 'https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=3&start=0&date=20260619';
        const res = await fetch(proxyUrl, {
            headers: {
                'Referer': 'https://www.idx.co.id/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        tests.push({ name: 'IDX via rewrite', status: res.status, ok: res.ok });
    } catch (e: any) {
        tests.push({ name: 'IDX via rewrite', error: e.message });
    }

    // Test 3: Yahoo Finance (known working)
    try {
        const { default: YahooFinance } = await import('yahoo-finance2');
        const yf = new YahooFinance();
        const q = await yf.quote('BBCA.JK');
        tests.push({ name: 'Yahoo Finance', price: q.regularMarketPrice, ok: true });
    } catch (e: any) {
        tests.push({ name: 'Yahoo Finance', error: e.message });
    }

    return NextResponse.json({ success: true, tests, env: process.env.NODE_ENV });
}
