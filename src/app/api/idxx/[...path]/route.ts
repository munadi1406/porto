import { NextRequest, NextResponse } from 'next/server';
import { ensureSession } from '@/lib/idxApiClient';

const IDX_BASE = 'https://www.idx.co.id/primary';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathArr } = await params;
    const path = pathArr.join('/');
    const search = request.nextUrl.search;
    const url = `${IDX_BASE}/${path}${search}`;

    const cookie = await ensureSession();

    try {
        const res = await fetch(url, {
            headers: {
                'Referer': 'https://www.idx.co.id/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Origin': 'https://www.idx.co.id',
                'Upgrade-Insecure-Requests': '1',
                'X-Requested-With': 'XMLHttpRequest',
                ...(cookie ? { Cookie: cookie } : {}),
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
            return NextResponse.json({ error: `IDX proxy: ${res.status}` }, { status: res.status });
        }

        const text = await res.text();
        try {
            const json = JSON.parse(text);
            return NextResponse.json(json);
        } catch {
            return new NextResponse(text, {
                headers: { 'Content-Type': 'text/plain' },
            });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
