import { NextResponse } from 'next/server';
import { getSmartMoneyData } from '@/lib/idxApi';

export async function GET() {
    try {
        const data = await getSmartMoneyData();
        return NextResponse.json({ success: true, data: data.foreignFlow });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
}
