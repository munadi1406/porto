import { NextRequest } from 'next/server';
import { getCachedBrokerStock, saveBrokerStock, purgeEmptyBrokerStock, getTodayUsage, incrementUsage, DAILY_QUOTA } from '@/lib/brokerCacheDb';
import { lastTradingDayWIB } from '@/lib/market-hours';

// Broker summary PER SAHAM (Top Buy / Top Sell) — via Index Alpha API.
// Kuota hanya 5 req/hari → SEMUA hasil dipersisten ke MySQL dan dibaca dari
// database terlebih dahulu. Tanggal default = hari bursa terakhir (WIB).
// Hasil KOSONG tanpa tanggal eksplisit TIDAK dicache (data harian bisa belum lengkap).

export async function GET(req: NextRequest) {
    const stock = (req.nextUrl.searchParams.get('stock') || 'BBCA').toUpperCase().replace('.JK', '');
    const dateParam = req.nextUrl.searchParams.get('date') || ''; // YYYYMMDD opsional
    const key = process.env.INDEXALPHA_API_KEY;

    if (!key) {
        return Response.json({
            success: true,
            needsKey: true,
            note: 'Fitur Top Buy/Sell per saham butuh API key gratis Index Alpha. Daftar di indexalpha.id, lalu isi INDEXALPHA_API_KEY di file .env dan restart server.',
        });
    }

    const explicitDate = !!dateParam && dateParam.length === 8;
    const yyyymmdd = explicitDate ? dateParam : lastTradingDayWIB();
    const dISO = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

    // 1) Cache database dulu — tidak mengonsumsi kuota sama sekali
    const cached = await getCachedBrokerStock(stock, dISO);
    if (cached) {
        const u = await getTodayUsage();
        return Response.json({ ...cached, cached: 'db', quotaRemaining: Math.max(0, DAILY_QUOTA - u) });
    }

    // 2) Cek kuota harian sebelum outbound call
    const usage = await getTodayUsage();
    if (usage >= DAILY_QUOTA) {
        return Response.json({
            success: false,
            quotaExceeded: true,
            error: `Kuota API hari ini habis (${usage}/${DAILY_QUOTA}). Data untuk ${stock} pada ${dISO} belum tersimpan — coba lagi besok.`,
        }, { status: 429 });
    }

    // 3) Live fetch ke Index Alpha
    try {
        const url = `https://api.indexalpha.id/stocks/broker-summary?ticker=${stock}&from=${dISO}&to=${dISO}&investor=all`;
        const r = await fetch(url, {
            headers: { accept: 'application/json', Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(15000),
        });

        await incrementUsage(); // setiap outbound call dihitung

        if (r.status === 401 || r.status === 403) {
            return Response.json({ success: false, error: 'API key tidak valid / kuota provider habis', quotaRemaining: Math.max(0, DAILY_QUOTA - usage - 1) }, { status: 502 });
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: any = await r.json();
        const rows: any[] = j?.data || [];

        let payload: any;
        if (rows.length === 0) {
            payload = {
                success: true,
                stock,
                date: dISO,
                topBuy: [],
                topSell: [],
                note: explicitDate
                    ? 'Tidak ada transaksi pada tanggal ini.'
                    : 'Belum ada data untuk hari bursa terakhir — kemungkinan laporan harian belum terbit. Coba beberapa saat lagi.',
            };
        } else {
            const { getBrokerName } = await import('@/lib/brokerCodes');
            const enriched = rows.map((x: any) => {
                const code = String(x.code ?? x.brokerCode ?? '').toUpperCase();
                return {
                    code,
                    name: getBrokerName(code) || x.name || '',
                    buyValue: Number(x.buy_value ?? x.buyValue ?? 0),
                    sellValue: Number(x.sell_value ?? x.sellValue ?? 0),
                    buyVolume: Number(x.buy_volume ?? x.buyVolume ?? 0),
                    sellVolume: Number(x.sell_volume ?? x.sellVolume ?? 0),
                };
            });
            const totalBuy = enriched.reduce((a, b) => a + b.buyValue, 0);
            const totalSell = enriched.reduce((a, b) => a + b.sellValue, 0);
            payload = {
                success: true,
                stock,
                date: dISO,
                brokerCount: enriched.length,
                totalBuy,
                totalSell,
                net: totalBuy - totalSell,
                topBuy: [...enriched].sort((a, b) => b.buyValue - a.buyValue).slice(0, 10),
                topSell: [...enriched].sort((a, b) => b.sellValue - a.sellValue).slice(0, 10),
            };
        }

        // 4) Persisten permanen — request berikutnya gratis dari DB.
        //    Hasil kosong TANPA tanggal eksplisit tidak dicache (bisa provisional);
        //    baris kosong lama utk tanggal tsb dihapus agar tertimpa data final.
        if (rows.length > 0) {
            await saveBrokerStock(stock, dISO, payload);
            await purgeEmptyBrokerStock(stock, dISO); // buang sisa provisional
        } else if (explicitDate) {
            await saveBrokerStock(stock, dISO, payload);
        }
        const remaining = Math.max(0, DAILY_QUOTA - usage - 1);
        return Response.json({ ...payload, cached: 'fresh', quotaRemaining: remaining, provisional: rows.length === 0 && !explicitDate });
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
