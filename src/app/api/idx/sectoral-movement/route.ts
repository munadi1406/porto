import { NextRequest } from 'next/server';
import { getSectoralMovement } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const year = parseInt(req.nextUrl.searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(req.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1));
        const data = await getSectoralMovement(year, month);
        return Response.json({ success: true, data });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
