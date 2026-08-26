import { NextRequest } from 'next/server';
import { fetchGoogleFinance } from '@/lib/googleFinance';

export async function GET(req: NextRequest) {
    const ticker = req.nextUrl.searchParams.get('ticker') || 'BBCA';

    try {
        const data = await fetchGoogleFinance(ticker);
        if (data) {
            return Response.json({ success: true, data });
        }
        return Response.json({ success: false, error: 'No data found' }, { status: 404 });
    } catch (error: any) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
