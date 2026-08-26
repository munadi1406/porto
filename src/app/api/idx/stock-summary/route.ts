import { NextResponse } from 'next/server';
import { getStockSummary, getLastTradingDate } from '@/lib/idxApiClient';

interface MoverItem {
    KODE_SAHAM?: string;
    NAMA_SAHAM?: string;
    HARGA_PENUTUPAN?: number;
    PERSEN_PERUBAHAN?: number;
}

function normalizeMover(item: MoverItem) {
    return {
        KODE_SAHAM: item.KODE_SAHAM || "",
        NAMA_SAHAM: item.NAMA_SAHAM || "",
        HARGA_PENUTUPAN: item.HARGA_PENUTUPAN ?? 0,
        PERSEN_PERUBAHAN: item.PERSEN_PERUBAHAN ?? 0,
    };
}

export async function GET() {
    try {
        const lastDateStr = await getLastTradingDate();

        const stocks = await getStockSummary();
        const stockArr = Array.isArray(stocks) ? stocks : (stocks?.data || []);

        const parsed = stockArr
            .map((s: any) => ({
                KODE_SAHAM: s.Kode || s.kode || s.Code || s.code || "",
                NAMA_SAHAM: s.Nama || s.nama || s.Name || s.name || "",
                HARGA_PENUTUPAN: Number(s.Harga || s.harga || s.Close || s.close || 0),
                PERSEN_PERUBAHAN: Number(s.Persen || s.persen || s.ChangePercent || s.changePercent || 0),
            }))
            .filter((s: any) => s.KODE_SAHAM && s.HARGA_PENUTUPAN > 0);

        const gainers = parsed
            .filter((s: any) => s.PERSEN_PERUBAHAN > 0)
            .sort((a: any, b: any) => b.PERSEN_PERUBAHAN - a.PERSEN_PERUBAHAN)
            .slice(0, 20)
            .map(normalizeMover);

        const losers = parsed
            .filter((s: any) => s.PERSEN_PERUBAHAN < 0)
            .sort((a: any, b: any) => a.PERSEN_PERUBAHAN - b.PERSEN_PERUBAHAN)
            .slice(0, 20)
            .map(normalizeMover);

        return NextResponse.json({
            success: true,
            data: stockArr,
            gainers,
            losers,
            total: stockArr.length,
            tradeDate: lastDateStr,
        });
    } catch (error: any) {
        return NextResponse.json({ success: true, data: [], gainers: [], losers: [], total: 0 });
    }
}
