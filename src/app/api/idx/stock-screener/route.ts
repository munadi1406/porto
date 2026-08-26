import { NextRequest } from 'next/server';
import { getStockScreener } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const sector = req.nextUrl.searchParams.get('sector') || '';
        const subSector = req.nextUrl.searchParams.get('subSector') || '';
        const data = await getStockScreener(sector, subSector);
        return Response.json({ success: true, data: data?.results || [] });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
