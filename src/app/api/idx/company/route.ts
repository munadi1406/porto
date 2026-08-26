import { NextResponse } from 'next/server';
import { getCompanyProfiles, getCompanyProfileDetail } from '@/lib/idxApiClient';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const kode = searchParams.get('kode');

    try {
        if (kode) {
            const data = await getCompanyProfileDetail(kode);
            return NextResponse.json({ success: true, data });
        }
        const data = await getCompanyProfiles(
            Number(searchParams.get('length') ?? 50),
            Number(searchParams.get('start') ?? 0),
        );
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 502 });
    }
}