import { NextRequest } from 'next/server';
import { getSuspendData } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const count = parseInt(req.nextUrl.searchParams.get('count') || '100');
        const data = await getSuspendData(count);
        return Response.json({ success: true, data: data?.results || [] });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
