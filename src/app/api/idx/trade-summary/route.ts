import { NextRequest } from 'next/server';
import { getTradeSummary } from '@/lib/idxApiClientExtended';

export async function GET() {
    try {
        const data = await getTradeSummary();
        return Response.json({ success: true, data: data || [] });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
