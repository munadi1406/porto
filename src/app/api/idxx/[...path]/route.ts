import { NextRequest, NextResponse } from 'next/server';
import { idxFetch } from '@/lib/idxApiClient';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathArr } = await params;
    const path = pathArr.join('/');
    const search = request.nextUrl.search;

    try {
        const data = await idxFetch(`/primary/${path}${search}`);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
