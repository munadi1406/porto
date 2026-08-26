import { NextRequest } from 'next/server';
import { getIssuedHistory } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const code = req.nextUrl.searchParams.get('code') || '';
        if (!code) return Response.json({ success: false, error: 'code required' }, { status: 400 });
        const data = await getIssuedHistory(code);
        return Response.json({ success: true, data: data || [] });
    } catch (error: any) {
        return Response.json({ success: true, data: [] });
    }
}
