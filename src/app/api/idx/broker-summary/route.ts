import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Broker summary — IDX diblokir Cloudflare sehingga sering gagal.
// Strategi: fetch di BACKGROUND (bisa 15-60 dtk karena warmup sesi + proxy),
// hasil disimpan cache in-memory + disk. Client dapat respons instan dan polling ulang.

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 menit
const STALE_RETRY = 5 * 60 * 1000; // coba refresh lagi jika cache > 5 menit
// Simpan di OS temp — BUKAN folder project, agar file-watcher Next dev
// tidak menganggapnya perubahan source (memicu reload halaman).
const DISK_FILE = path.join(os.tmpdir(), 'porto-broksum-cache-v2.json');
let inFlightPromise: Promise<void> | null = null;

function normalize(d: any): any | null {
    if (!d?.data?.summary || !(d.data.summary.brokerCount > 0)) return null;
    // Bentuk lama (topBuyBrokers/topSellBrokers) → konversi ke bentuk baru bila perlu
    if (!Array.isArray(d.data.topBrokers)) {
        const rows = [...(d.data.topBuyBrokers || []), ...(d.data.topSellBrokers || [])];
        d.data.topBrokers = rows.map((r: any) => ({ code: r.code, name: r.name, value: r.netValue ?? 0, volume: 0, freq: 0 }));
    }
    return d;
}

function loadDisk(): { data: any; ts: number } | null {
    try {
        if (fs.existsSync(DISK_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(DISK_FILE, 'utf8'));
            if (normalize(parsed)) return parsed;
        }
    } catch {}
    return null;
}

function saveDisk() {
    try {
        if (cache) fs.writeFileSync(DISK_FILE, JSON.stringify(cache));
    } catch {}
}

// Akses modul-var lewat fungsi agar TypeScript tidak menarik kesimpulan
// narrowing yang salah (background fetch mengubah cache secara asinkron).
function currentCache(): { data: any; ts: number } | null {
    return cache;
}

async function fetchBrokerSummary() {
    const { getBrokerSummaryResilient, dateStr } = await import('@/lib/idxApiClient');
    const { getBrokerName } = await import('@/lib/brokerCodes');
    const { lastTradingDayWIB } = await import('@/lib/market-hours');

    // 1) Tanpa date → IDX pakai tanggal terbaru yang punya data (ringkasan broker berlag).
    // 2) Fallback: tanggal bursa lokal (kalkulasi murni, tanpa network lambat).
    let brokers: any[] = [];
    try {
        const r = await getBrokerSummaryResilient(undefined, 500);
        brokers = r.data || [];
    } catch {}
    if (!brokers.length) {
        const d = lastTradingDayWIB();
        try {
            const r = await getBrokerSummaryResilient(d, 500);
            brokers = r.data || [];
        } catch {}
    }
    if (!brokers.length) return null;

    // Tanggal aktual dari baris hasil ("2026-08-24T00:00:00" → "20260824")
    const rawDate = String(brokers[0]?.Date || brokers[0]?.date || '');
    const lastDate = rawDate.slice(0, 10).replace(/-/g, '') || lastTradingDayWIB();

    const foreignKeywords = /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley|macquarie|dbs|hsbc|bnp|abn|ing|standard chartered|bofa|barclays|societe|generale|jpmorgan/i;

    // Field asli IDX: IDFirm, FirmName, Volume, Value, Frequency
    let totalValue = 0, totalVolume = 0, totalFreq = 0, foreignValue = 0;
    const enriched = brokers.map((b: any) => {
        const code = b.IDFirm || b.BRK_CODE || b.brkCode || b.code || '';
        const name = b.FirmName || b.BRK_NAME || b.brkName || b.name || '';
        const value = Number(b.Value ?? b.value ?? 0) || 0;
        const volume = Number(b.Volume ?? b.volume ?? 0) || 0;
        const freq = Number(b.Frequency ?? b.frequency ?? 0) || 0;
        totalValue += value; totalVolume += volume; totalFreq += freq;
        if (foreignKeywords.test(name)) foreignValue += value;
        return { code, name: name || getBrokerName(code), value, volume, freq };
    });

    const topBrokers = [...enriched].sort((a, b) => b.value - a.value).slice(0, 10);
    const domesticValue = totalValue - foreignValue;

    return {
        success: true,
        data: {
            topBrokers,
            foreignFlow: [
                { investor: 'Foreign', buyValue: foreignValue, sellValue: 0, netValue: foreignValue },
                { investor: 'Domestic', buyValue: domesticValue, sellValue: 0, netValue: domesticValue },
            ],
            summary: {
                totalBuyValue: totalValue,
                totalSellValue: totalVolume,
                totalNetValue: totalFreq,
                brokerCount: brokers.length,
                foreignBuy: foreignValue,
                foreignSell: 0,
                domesticBuy: domesticValue,
                domesticSell: 0,
                totalVolume,
                totalFreq,
                foreignValue,
                domesticValue,
            },
        },
        source: 'idx_browser',
        date: lastDate,
        isToday: lastDate === dateStr(new Date()),
    };
}

function kickBackgroundFetch(): Promise<void> {
    if (inFlightPromise) return inFlightPromise;
    const p = (async () => {
        try {
            const result = await fetchBrokerSummary();
            const norm = result ? normalize(result) : null;
            if (norm) {
                cache = { data: norm, ts: Date.now() };
                saveDisk();
            }
        } catch {} finally {
            inFlightPromise = null;
        }
    })();
    inFlightPromise = p;
    return p;
}

// Cron ringan: pastikan data broksum selalu siap — kick saat boot + tiap 30 menit
const g2 = globalThis as Record<string, unknown>;
if (!g2.__broksumCron) {
    g2.__broksumCron = true;
    setTimeout(() => kickBackgroundFetch(), 15_000);
    setInterval(() => kickBackgroundFetch(), 30 * 60 * 1000);
}

export async function GET() {
    if (!cache) cache = loadDisk(); // pulihkan dari restart sebelumnya
    const age = cache ? Date.now() - cache.ts : Infinity;

    // Cache fresh → langsung (normalisasi bentuk lama bila perlu)
    if (age < CACHE_TTL) {
        const norm = normalize(cache!.data);
        if (!norm) { cache = null; } else {
            return NextResponse.json({ ...norm, cachedAt: new Date(cache!.ts).toISOString() });
        }
    }

    // Stale/kosong → picu refresh background, jawab instan dengan yang dimiliki
    if (age > STALE_RETRY) kickBackgroundFetch();

    if (cache) {
        const norm = normalize(cache.data);
        return NextResponse.json({ ...(norm || cache.data), cachedAt: new Date(cache.ts).toISOString(), refreshing: true });
    }

    // Belum pernah sukses — jalankan background dan TUNGGU sampai 40 detik
    // agar request pertama dari browser langsung mendapat data bila memungkinkan.
    const bg = kickBackgroundFetch();
    await Promise.race([bg, new Promise(r => setTimeout(r, 40_000))]);
    // Snapshot ulang — background fetch bisa saja sudah mengisi cache
    const c = currentCache();
    if (c) {
        const norm = normalize(c.data);
        if (norm) return NextResponse.json({ ...norm, cachedAt: new Date(c.ts).toISOString() });
    }
    return NextResponse.json({
        success: true,
        data: {
            topBuyBrokers: [],
            topSellBrokers: [],
            foreignFlow: [],
            summary: { totalBuyValue: 0, totalSellValue: 0, totalNetValue: 0, brokerCount: 0, foreignBuy: 0, foreignSell: 0, domesticBuy: 0, domesticSell: 0 },
        },
        source: 'unavailable',
        date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        isToday: false,
        note: 'Data broker IDX sedang tidak dapat diakses (Cloudflare). Panel akan terisi otomatis saat IDX bisa dihubungi.',
    });
}
