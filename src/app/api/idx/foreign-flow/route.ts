import { NextResponse } from 'next/server';
import { getForeignFlow } from '@/lib/idxApi';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || undefined;
        const data = await getForeignFlow(date);
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
