import { NextRequest } from 'next/server';
import { getIndexSummary } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const date = req.nextUrl.searchParams.get('date') || undefined;
        const data = await getIndexSummary(date);
        return Response.json({ success: true, data: data?.data || [], total: data?.recordsTotal || 0 });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
