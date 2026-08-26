import { NextResponse } from 'next/server';
import { getShariaStockList } from '@/lib/shariaStocks';

export async function GET() {
    try {
        const list = getShariaStockList();
        const shariaCount = list.filter(s => s.sharia).length;

        return NextResponse.json({
            success: true,
            data: {
                totalStocks: list.length,
                shariaStocks: shariaCount,
                nonSharia: list.length - shariaCount,
                lastUpdated: 'OJK DES I - 2024',
                list,
            },
            source: 'ojk',
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
