import { NextRequest } from 'next/server';
import { getRelistingData } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const data = await getRelistingData();
        return Response.json({ success: true, data: data?.data || [], total: data?.recordsTotal || 0 });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
