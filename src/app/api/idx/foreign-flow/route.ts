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
            const hasNetFlow = Number.isFinite(p?.data?.netValue) && (
                p.data.netValue !== 0 || p.data.buyValue > 0 || p.data.sellValue > 0
            );
            const hasParticipation = Number.isFinite(p?.data?.participationValue) && p.data.participationValue > 0;
            if (hasNetFlow || hasParticipation) return p;
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

function parseNumeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const raw = value.trim().replace(/\s/g, '');
    if (!raw || !/[0-9]/.test(raw)) return null;
    let normalized = raw.replace(/[^\d,.-]/g, '');
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
        // Separator paling kanan adalah desimal; yang lain pemisah ribuan.
        if (lastComma > lastDot) normalized = normalized.replace(/\./g, '').replace(',', '.');
        else normalized = normalized.replace(/,/g, '');
    } else if (lastDot >= 0) {
        const groups = normalized.split('.');
        // IDX memakai titik sebagai pemisah ribuan, mis. 48.316.978.038.240.
        if (groups.length > 2 || groups.at(-1)?.length === 3) normalized = groups.join('');
    } else if (lastComma >= 0) {
        const groups = normalized.split(',');
        if (groups.length > 2 || groups.at(-1)?.length === 3) normalized = groups.join('');
        else normalized = normalized.replace(',', '.');
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function findValue(rows: Record<string, unknown>[], investor: 'foreign' | 'domestic'): number {
    const investorTokens = investor === 'foreign' ? ['foreign', 'asing'] : ['domestic', 'domestik', 'lokal'];
    const valueTokens = ['value', 'nilai', 'amount', 'total'];
    const excludedTokens = ['volume', 'frequency', 'frekuensi', 'percent', 'persen', 'date', 'tanggal'];
    let best: { score: number; value: number } | null = null;

    for (const row of rows) {
        for (const [key, raw] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (excludedTokens.some(token => normalizedKey.includes(token))) continue;
            const value = parseNumeric(raw);
            if (value == null || value <= 0) continue;
            let score = 0;
            if (investorTokens.some(token => normalizedKey.includes(token))) score += 4;
            if (valueTokens.some(token => normalizedKey.includes(token))) score += 2;
            if (/buy|sell|beli|jual|net/.test(normalizedKey)) score -= 1;
            if (!best || score > best.score || (score === best.score && value > best.value)) best = { score, value };
        }
    }
    return best && best.score >= 2 ? best.value : 0;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms); }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function fetchIdxMonthly(y: number, m: number) {
    const { getDailyTradingByInvestorType } = await import('@/lib/idxApiClient');
    const [fore, dom] = await Promise.all([
        getDailyTradingByInvestorType(y, m, 'foreign'),
        getDailyTradingByInvestorType(y, m, 'domestic'),
    ]);
    const foreignRows = findRows(fore);
    const domesticRows = findRows(dom);
    if (foreignRows.length === 0) throw new Error('tabel asing kosong');
    const participationValue = findValue(foreignRows, 'foreign');
    const domesticValue = findValue(domesticRows, 'domestic');
    if (participationValue <= 0) {
        const keys = Object.keys(foreignRows[0] || {}).slice(0, 20).join(',');
        throw new Error(`nilai partisipasi asing tidak ditemukan (kolom: ${keys || 'none'})`);
    }
    const datedRow = [...foreignRows].reverse().find(row => {
        const date = String(row.date ?? row.Date ?? row.tanggal ?? row.Tanggal ?? '');
        return date && date.toLowerCase() !== 'total';
    });
    const date = String(datedRow?.date ?? datedRow?.Date ?? datedRow?.tanggal ?? datedRow?.Tanggal ?? `${y}-${String(m).padStart(2, '0')}`);
    return { participationValue, domesticValue, date };
}

async function fetchOfficial() {
    const nowWib = new Date(Date.now() + 7 * 3600_000);
    let lastError: unknown = new Error('data IDX bulanan kosong');
    // Publikasi statistik bulanan IDX dapat tertinggal lebih dari satu bulan.
    // Mundur maksimal empat bulan dan pilih periode terakhir yang berisi nilai.
    for (let offset = 0; offset < 4; offset++) {
        const period = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - offset, 1));
        try {
            const result = await fetchIdxMonthly(period.getUTCFullYear(), period.getUTCMonth() + 1);
            if (result.participationValue > 0) return result;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
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
            const idx = await withTimeout(fetchOfficial(), 20_000, 'IDX bulanan');
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
    const dbHit = await withTimeout(getCachedJson(`ff:${dISO}`, 365 * 24 * 3600 * 1000), 3000, 'cache database').catch(() => null);
    if (dbHit?.netValue != null || dbHit?.participationValue > 0) {
        return Response.json({ success: true, ...dbHit, cached: 'db' });
    }

    // 2) Kuota Index Alpha
    const usage = await withTimeout(getTodayUsage(), 3000, 'kuota database').catch(() => DAILY_QUOTA);
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
        const idx = await withTimeout(fetchOfficial(), 20_000, 'IDX bulanan');
        const payload = { source: 'idx-monthly', date: idx.date, participationValue: idx.participationValue, domesticValue: idx.domesticValue };
        await withTimeout(saveCachedJson(`ff:${dISO}`, payload), 3000, 'simpan cache').catch(() => undefined);
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
