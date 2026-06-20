import { NextResponse } from 'next/server';
import { getTopGainer, getTopLoser } from '@/lib/idxApi';

export async function GET() {
    try {
        const [gainers, losers] = await Promise.all([
            getTopGainer().catch(() => []),
            getTopLoser().catch(() => []),
        ]);
        return NextResponse.json({ success: true, gainers, losers });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
