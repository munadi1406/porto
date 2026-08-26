import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getCachedJson, saveCachedJson, getTodayUsage, incrementUsage, DAILY_QUOTA } from '@/lib/brokerCacheDb';
import { lastTradingDayWIB } from '@/lib/market-hours';

// Net Foreign — dua sumber berjenjang:
// 1) Index Alpha /foreign-flow (net buy−sell RESMI per hari, kuota 5/hari, cache MySQL permanen)
// 2) IDX Digital Statistic bulanan (partisipasi asing, tanpa split buy/sell) sebagai fallback

const ALPHA_BASE = 'https://api.indexalpha.id';
const ALPHA_KEY = process.env.INDEXALPHA_API_KEY;

interface CacheEntry { data: any; ts: number }
let mem: CacheEntry | null = null;
const MEM_TTL = 10 * 60 * 1000;
const DISK_FILE = path.join(os.tmpdir(), 'porto-foreign-flow-v2.json');
let inflight = false;

function loadDisk(): CacheEntry | null {
    try {
        if (fs.existsSync(DISK_FILE)) {
            const p = JSON.parse(fs.readFileSync(DISK_FILE, 'utf8'));
            if (p?.data?.netValue != null || p?.data?.participationValue != null) return p;
        }
    } catch {}
    return null;
}

function saveDisk(e: CacheEntry) {
    try { fs.writeFileSync(DISK_FILE, JSON.stringify(e)); } catch {}
}

// ── Sumber 1: Index Alpha ──
async function fetchIndexAlpha(dISO: string) {
    if (!ALPHA_KEY) return null;
    const url = `${ALPHA_BASE}/foreign-flow?from=${dISO}&to=${dISO}`;
    const r = await fetch(url, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ALPHA_KEY}` },
        signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: any = await r.json();
    // Bentuk respons bervariasi — cari objek dengan field buy/sell/net numerik
    const candidates: any[] = [];
    const walk = (o: any, d = 0) => {
        if (!o || typeof o !== 'object' || d > 4) return;
        if (Array.isArray(o)) { o.forEach(x => walk(x, d + 1)); return; }
        const keys = Object.keys(o).map(k => k.toLowerCase());
        if (keys.some(k => k.includes('net')) && keys.some(k => k.includes('buy') || k.includes('foreign'))) candidates.push(o);
        Object.values(o).forEach(v => walk(v, d + 1));
    };
    walk(j);
    const row = candidates[0];
    if (!row) return null;
    const num = (...names: string[]): number => {
        for (const k of Object.keys(row)) {
            const kl = k.toLowerCase();
            if (names.some(n => kl === n || kl.includes(n))) {
                const v = typeof row[k] === 'number' ? row[k] : parseFloat(String(row[k]).replace(/[^\d.-]/g, ''));
                if (!isNaN(v)) return v;
            }
        }
        return 0;
    };
    const buyValue = num('buyvalue', 'foreignbuy', 'buy');
    const sellValue = num('sellvalue', 'foreignsell', 'sell');
    let netValue = num('netvalue', 'netforeign', 'net');
    if (!netValue && (buyValue || sellValue)) netValue = buyValue - sellValue;
    if (!buyValue && !sellValue && !netValue) return null;
    return { buyValue, sellValue, netValue };
}

// ── Sumber 2: IDX monthly aggregate (partisipasi asing, fallback) ──
function findRows(obj: unknown, depth = 0): Record<string, unknown>[] {
    if (!obj || depth > 6) return [];
    if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) return obj as Record<string, unknown>[];
        return [];
    }
    if (typeof obj === 'object') {
        for (const v of Object.values(obj as Record<string, unknown>)) {
            const found = findRows(v, depth + 1);
            if (found.length > 0) return found;
        }
    }
    return [];
}

async function fetchIdxMonthly(y: number, m: number) {
    const { getDailyTradingByInvestorType } = await import('@/lib/idxApiClient');
    const fore = await getDailyTradingByInvestorType(y, m, 'foreign');
    const dom = await getDailyTradingByInvestorType(y, m, 'domestic');
    const fRow = findRows(fore)[findRows(fore).length - 1];
    const dRow = findRows(dom)[findRows(dom).length - 1];
    if (!fRow) throw new Error('tabel kosong');
    const pick = (row: Record<string, unknown> | undefined, frag: string): number => {
        if (!row) return 0;
        for (const k of Object.keys(row)) {
            const kl = k.toLowerCase().replace(/[^a-z]/g, '');
            if (kl.includes(frag)) {
                const v = typeof row[k] === 'number' ? row[k] : parseFloat(String(row[k]));
                if (!isNaN(v)) return v;
            }
        }
        return 0;
    };
    const participationValue = pick(fRow, 'foreignforeignvalue') || pick(fRow, 'foreignvalue');
    const domesticValue = pick(fRow, 'foreigndomesticvalue') || (dRow ? pick(dRow, 'value') : 0);
    const date = String(fRow['date'] ?? fRow['Date'] ?? `${y}-${String(m).padStart(2, '0')}`);
    return { participationValue, domesticValue, date };
}

async function fetchOfficial() {
    const nowWib = new Date(Date.now() + 7 * 3600_000);
    const y = nowWib.getUTCFullYear();
    const m = nowWib.getUTCMonth() + 1;
    try {
        const cur = await fetchIdxMonthly(y, m);
        if (cur.participationValue > 0) return cur;
        throw new Error('bulan berjalan kosong');
    } catch {
        // Fallback: bulan sebelumnya (data final)
        const pm = m === 1 ? 12 : m - 1;
        const py = m === 1 ? y - 1 : y;
        return await fetchIdxMonthly(py, pm);
    }
}

function kick() {
    if (inflight) return;
    inflight = true;
    (async () => {
        try {
            const dISO = lastTradingDayWIB();
            // Coba Index Alpha dulu
            try {
                const alpha = await fetchIndexAlpha(`${dISO.slice(0, 4)}-${dISO.slice(4, 6)}-${dISO.slice(6, 8)}`);
                if (alpha) {
                    const payload = { source: 'indexalpha', date: dISO, ...alpha };
                    mem = { data: payload, ts: Date.now() };
                    saveDisk(mem);
                    await saveCachedJson(`ff:${dISO}`, payload);
                    return;
                }
            } catch {}
            // Fallback IDX bulanan
            const idx = await fetchOfficial();
            const payload = { source: 'idx-monthly', date: idx.date, participationValue: idx.participationValue, domesticValue: idx.domesticValue };
            mem = { data: payload, ts: Date.now() };
            saveDisk(mem);
        } catch {} finally {
            inflight = false;
        }
    })();
}

export async function GET(_req: NextRequest) {
    const dISO = lastTradingDayWIB();

    // 1) MySQL cache per tanggal (permanen — data harian final)
    const dbHit = await getCachedJson(`ff:${dISO}`, 365 * 24 * 3600 * 1000);
    if (dbHit) return Response.json({ success: true, ...dbHit, cached: 'db' });

    // 2) Kuota Index Alpha
    const usage = await getTodayUsage();
    const canCallAlpha = !!ALPHA_KEY && usage < DAILY_QUOTA;

    if (canCallAlpha) {
        try {
            const alpha = await fetchIndexAlpha(`${dISO.slice(0, 4)}-${dISO.slice(4, 6)}-${dISO.slice(6, 8)}`);
            await incrementUsage();
            if (alpha) {
                const payload = { source: 'indexalpha', date: dISO, ...alpha };
                await saveCachedJson(`ff:${dISO}`, payload);
                const remaining = Math.max(0, DAILY_QUOTA - usage - 1);
                return Response.json({ success: true, ...payload, quotaRemaining: remaining });
            }
        } catch {}
    }

    // 3) Fallback IDX bulanan (partisipasi asing)
    try {
        const idx = await fetchOfficial();
        const payload = { source: 'idx-monthly', date: idx.date, participationValue: idx.participationValue, domesticValue: idx.domesticValue };
        if (idx.participationValue > 0) await saveCachedJson(`ff:${dISO}`, payload);
        return Response.json({ success: true, ...payload, note: 'Net buy/sell resmi belum tersedia — menampilkan partisipasi asing bulanan' });
    } catch (e: any) {
        // Terakhir: disk/mem cache lama apa pun
        if (!mem) mem = loadDisk();
        if (mem) return Response.json({ success: true, ...mem.data, stale: true });
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}

// Cron ringan 30 menit
const g = globalThis as Record<string, unknown>;
if (!g.__foreignFlowCron) {
    g.__foreignFlowCron = true;
    setTimeout(() => kick(), 20_000);
    setInterval(() => kick(), 30 * 60 * 1000);
}
