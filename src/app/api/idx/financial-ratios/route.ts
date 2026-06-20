import { NextResponse } from 'next/server';
import { getFinancialRatios } from '@/lib/idxApi';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
        const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;
        const ticker = searchParams.get('ticker')?.toUpperCase() || '';

        let data = await getFinancialRatios(year, month);

        if (ticker) {
            data = data.filter(r => r.KODE_EMITEN === ticker || r.KODE_EMITEN === ticker.replace('.JK', ''));
        }

        return NextResponse.json({ success: true, data, total: data.length });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
