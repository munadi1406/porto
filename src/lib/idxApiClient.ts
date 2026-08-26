// Centralized IDX API Client
// All endpoints from idx_api_endpoints.txt — unofficial/internal IDX endpoints
// MUST include Referer & User-Agent headers to avoid 403

const IDX_BASE = 'https://www.idx.co.id';

const HEADERS = {
    'Referer': 'https://www.idx.co.id/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://www.idx.co.id',
    'Upgrade-Insecure-Requests': '1',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
};

// ─── Cache ────────────────────────────────────────────────────────
interface CacheEntry { data: any; ts: number; }
const cache: Record<string, CacheEntry> = {};
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

function getCached(key: string, ttl = CACHE_TTL): any | null {
    const e = cache[key];
    if (e && Date.now() - e.ts < ttl) return e.data;
    return null;
}
function setCache(key: string, data: any) {
    cache[key] = { data, ts: Date.now() };
}

// ─── In-flight promise cache (deduplication) ──────────────────────
// Mencegah duplicate concurrent requests ke endpoint yang sama.
const inflight: Record<string, Promise<any>> = {};

async function dedupedFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight[key];
    if (existing) return existing;
    const promise = fn().finally(() => { delete inflight[key]; });
    inflight[key] = promise;
    return promise;
}

export { getCached, setCache };

// ─── Session cookie (Cloudflare bypass, pola IDX-API/NeaByteLab) ─
// Panaskan sesi: fetch halaman utama IDX untuk ambil cookie, lalu
// validasi dengan GetIndexList. Cookie dipakai di semua request.
const SESSION_TTL = 20 * 60 * 1000;
let sessionCookie = '';
let sessionExpiry = 0;
let sessionPromise: Promise<string> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractSetCookies(res: Response): string[] {
    const headers: any = res.headers;
    if (typeof headers.getSetCookie === 'function') {
        const sc = headers.getSetCookie();
        if (Array.isArray(sc) && sc.length) return sc;
    }
    const out: string[] = [];
    headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') out.push(value);
    });
    return out;
}

/**
 * Pastikan sesi IDX aktif (cookie valid). Mencegah blokir Cloudflare.
 * Dioptimasi: sleep dikurangi, warm-up dilakukan paralel.
 */
export function ensureSession(): Promise<string> {
    if (sessionCookie && Date.now() < sessionExpiry) {
        return Promise.resolve(sessionCookie);
    }
    if (!sessionPromise) {
        sessionPromise = (async () => {
            try {
                const res = await fetch('https://www.idx.co.id/id', {
                    headers: HEADERS,
                    signal: AbortSignal.timeout(10000),
                });
                const cookies = extractSetCookies(res);
                if (cookies.length) sessionCookie = cookies.join('; ');
                await res.body?.cancel?.();
                // Kurangi sleep dari 1000ms ke 200ms — cukup untuk Cloudflare
                await sleep(200);
                await fetch('https://www.idx.co.id/primary/home/GetIndexList', {
                    headers: { ...HEADERS, ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
                    signal: AbortSignal.timeout(10000),
                }).then((r) => r.body?.cancel?.()).catch(() => {});
                sessionExpiry = Date.now() + SESSION_TTL;
            } catch {
                // simpan cookie yang sudah ada, jika gagal tetap lanjut
            } finally {
                sessionPromise = null;
            }
            return sessionCookie;
        })();
    }
    return sessionPromise;
}

/**
 * Warm-up session di background. Dipanggil saat server start
 * agar request pertama tidak menunggu session init.
 */
let warmupDone = false;
export function warmupSession() {
    if (warmupDone) return;
    warmupDone = true;
    ensureSession().catch(() => {});
}

/** Reset sesi (dipanggil saat kena 403/block agar re-warm-up). */
export function resetSession() {
    sessionCookie = '';
    sessionExpiry = 0;
}

// ─── Core fetch: Direct → allorigins proxy ────────────────────────
function isCloudflareBlock(text: string): boolean {
    return text.includes('Cloudflare') || text.includes('blocked') || text.includes('cf-error');
}

export async function idxFetch<T>(path: string, timeout = 15000): Promise<T> {
    const fullUrl = path.startsWith('http') ? path : `${IDX_BASE}${path}`;
    const cookie = await ensureSession();
    const headers = { ...HEADERS, ...(cookie ? { Cookie: cookie } : {}) };

    // Strategy 1: Direct fetch (dengan retry, pola IDX-API)
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await fetch(fullUrl, { headers, signal: AbortSignal.timeout(timeout) });
            if (res.ok) {
                const text = await res.text();
                if (!isCloudflareBlock(text)) {
                    try { return JSON.parse(text) as T; } catch {}
                }
            } else if (res.status === 403 || res.status === 502) {
                resetSession();
            }
            lastErr = new Error(`HTTP ${res.status}`);
        } catch (e) {
            lastErr = e;
        }
        if (attempt < 2) await sleep(500);
    }

    // Direct gagal → lanjut ke fallback di bawah

    // Strategy 2: Via allorigins proxy
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
        const proxyRes = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(15_000),
        });
        if (proxyRes.ok) {
            const txt = await proxyRes.text();
            if (!isCloudflareBlock(txt)) {
                try { return JSON.parse(txt) as T; } catch {}
            }
        }
    } catch {}

    throw new Error(`Cloudflare blocked: ${path} (${lastErr instanceof Error ? lastErr.message : ''})`);
}

// ─── Date helpers ─────────────────────────────────────────────────
export function dateStr(d: Date): string {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function todayStr(): string { return dateStr(new Date()); }

export function previousTradingDays(count: number): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d);
    }
    return dates;
}

// ─── Last trading day helper ──────────────────────────────────────
// Mengembalikan tanggal bursa buka terakhir.
// Dioptimasi: cek tanggal paling mungkin dulu (kemarin/lusa),
// lalu walk back jika perlu. Cache lebih lama.
let lastTradingDateCache: { date: string; ts: number } | null = null;
const LAST_TRADING_TTL = 60 * 60 * 1000; // 60 menit (naik dari 30)

/**
 * Generate daftar tanggal yang paling mungkin sebagai last trading date.
 * Urutkan dari yang paling mungkin: kemarin, lusa, 3 hari lalu, dst.
 * Skip weekend.
 */
function getLikelyDates(maxDays = 10): string[] {
    const dates: string[] = [];
    for (let i = 1; i <= maxDays; i++) { // mulai dari 1 (kemarin), bukan 0 (hari ini)
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            dates.push(dateStr(d));
        }
    }
    return dates;
}

export async function getLastTradingDate(): Promise<string> {
    if (lastTradingDateCache && Date.now() - lastTradingDateCache.ts < LAST_TRADING_TTL) {
        return lastTradingDateCache.date;
    }

    // Dedup: jika ada request in-flight, gunakan itu
    return dedupedFetch('last-trading-date', async () => {
        const likelyDates = getLikelyDates(10);

        // Cek 3 tanggal paling mungkin secara paralel untuk percepat
        const checkDates = likelyDates.slice(0, 3);
        const results = await Promise.allSettled(
            checkDates.map(async (ds) => {
                try {
                    const data = await idxFetch<any>(`/primary/TradingSummary/GetStockSummary?date=${ds}`);
                    if (data?.data?.length > 0) return ds;
                } catch {}
                return null;
            })
        );

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                lastTradingDateCache = { date: r.value, ts: Date.now() };
                return r.value;
            }
        }

        // Jika 3 pertama gagal, cek sisanya sequential
        for (const ds of likelyDates.slice(3)) {
            try {
                const data = await idxFetch<any>(`/primary/TradingSummary/GetStockSummary?date=${ds}`);
                if (data?.data?.length > 0) {
                    lastTradingDateCache = { date: ds, ts: Date.now() };
                    return ds;
                }
            } catch {}
        }

        // Fallback: hari kerja terakhir (tanpa verifikasi data)
        for (const ds of likelyDates) {
            lastTradingDateCache = { date: ds, ts: Date.now() };
            return ds;
        }
        return todayStr();
    });
}

// Variant yang langsung cek ulang (untuk setelah jam tutup / data baru)
export function resetLastTradingDateCache() {
    lastTradingDateCache = null;
}

// ═══════════════════════════════════════════════════════════════════
// 1. TRADING
// ═══════════════════════════════════════════════════════════════════

/** Ringkasan saham harian (OHLC, volume, value) */
export async function getStockSummary(date?: string) {
    const d = date || todayStr();
    const key = `stock-summary:${d}`;
    if (getCached(key)) return getCached(key);

    // Dedup: jika ada request in-flight untuk tanggal yang sama, gunakan itu
    return dedupedFetch(key, async () => {
        const data = await idxFetch<any>(`/primary/TradingSummary/GetStockSummary?date=${d}`);
        setCache(key, data);

        // Jika hari ini kosong (bursa tutup/libur), fallback ke tanggal bursa buka terakhir
        if ((!data?.data || data.data.length === 0) && !date) {
            const lastDate = await getLastTradingDate();
            if (lastDate !== d) {
                const lastKey = `stock-summary:${lastDate}`;
                const cached = getCached(lastKey);
                if (cached) return cached;
                const lastData = await idxFetch<any>(`/primary/TradingSummary/GetStockSummary?date=${lastDate}`);
                setCache(lastKey, lastData);
                return lastData;
            }
        }
        return data;
    });
}

/** Ringkasan transaksi broker (net buy/sell) */
export async function getBrokerSummary(date?: string, length = 50, start = 0) {
    const d = date || todayStr();
    const key = `broker-summary:${d}:${length}:${start}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/TradingSummary/GetBrokerSummary?length=${length}&start=${start}&date=${d}`);
    setCache(key, data);

    // Fallback ke tanggal bursa buka terakhir jika hari ini kosong
    if ((!data?.data || data.data.length === 0) && !date) {
        const lastDate = await getLastTradingDate();
        if (lastDate !== d) {
            const lastKey = `broker-summary:${lastDate}:${length}:${start}`;
            const cached = getCached(lastKey);
            if (cached) return cached;
            const lastData = await idxFetch<any>(`/primary/TradingSummary/GetBrokerSummary?length=${length}&start=${start}&date=${lastDate}`);
            setCache(lastKey, lastData);
            return lastData;
        }
    }
    return data;
}

/** Ringkasan index harian */
export async function getIndexSummary(date?: string, length = 20) {
    const d = date || todayStr();
    const key = `index-summary:${d}:${length}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/TradingSummary/GetIndexSummary?lang=id&date=${d}&start=0&length=${length}`);
    setCache(key, data);

    // Fallback ke tanggal bursa buka terakhir jika hari ini kosong
    if ((!data?.data || data.data.length === 0) && !date) {
        const lastDate = await getLastTradingDate();
        if (lastDate !== d) {
            const lastKey = `index-summary:${lastDate}:${length}`;
            const cached = getCached(lastKey);
            if (cached) return cached;
            const lastData = await idxFetch<any>(`/primary/TradingSummary/GetIndexSummary?lang=id&date=${lastDate}&start=0&length=${length}`);
            setCache(lastKey, lastData);
            return lastData;
        }
    }
    return data;
}

/** Ringkasan perdagangan keseluruhan market (homepage) */
export async function getTradeSummary() {
    const key = 'trade-summary';
    if (getCached(key, 60_000)) return getCached(key, 60_000);
    const data = await idxFetch<any>(`/primary/Home/GetTradeSummary?lang=id`);
    setCache(key, data);
    return data;
}

/** Info trading harian per kode saham */
export async function getTradingInfoDaily(code: string) {
    const key = `trading-info-daily:${code}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetTradingInfoDaily?code=${code}`);
    setCache(key, data);
    return data;
}

/** Data historis trading per kode saham */
export async function getTradingInfoSS(code: string, length = 20, start = 0) {
    const key = `trading-info-ss:${code}:${length}:${start}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetTradingInfoSS?code=${code}&start=${start}&length=${length}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// 2. COMPANY / CORPORATE
// ═══════════════════════════════════════════════════════════════════

/** Master list saham + profil ringkas */
export async function getSecuritiesStock(length = 50, start = 0, filters?: { code?: string; sector?: string; board?: string }) {
    const params = new URLSearchParams({ start: String(start), length: String(length) });
    if (filters?.code) params.set('code', filters.code);
    if (filters?.sector) params.set('sector', filters.sector);
    if (filters?.board) params.set('board', filters.board);
    const key = `securities:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/StockData/GetSecuritiesStock?${params}`);
    setCache(key, data);
    return data;
}

/** List profil seluruh perusahaan tercatat */
export async function getCompanyProfiles(length = 50, start = 0) {
    const key = `company-profiles:${length}:${start}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetCompanyProfiles?start=${start}&length=${length}`);
    setCache(key, data);
    return data;
}

/** Detail profil 1 perusahaan */
export async function getCompanyProfileDetail(kodeEmiten: string) {
    const key = `company-detail:${kodeEmiten}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${kodeEmiten}&language=id`);
    setCache(key, data);
    return data;
}

/** Pengumuman/berita korporasi per kode saham */
export async function getAnnouncement(kodeEmiten: string, opts?: { dateFrom?: string; dateTo?: string; pageSize?: number; indexFrom?: number }) {
    const today = todayStr();
    const params = new URLSearchParams({
        kodeEmiten,
        indexFrom: String(opts?.indexFrom ?? 0),
        pageSize: String(opts?.pageSize ?? 10),
        dateFrom: opts?.dateFrom ?? '20250101',
        dateTo: opts?.dateTo ?? today,
        lang: 'id',
    });
    const key = `announcement:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetAnnouncement?${params}`);
    setCache(key, data);
    return data;
}

/** Pengumuman profil perusahaan */
export async function getProfileAnnouncement(kodeEmiten: string, opts?: { pageSize?: number; indexFrom?: number }) {
    const today = todayStr();
    const params = new URLSearchParams({
        KodeEmiten: kodeEmiten,
        indexFrom: String(opts?.indexFrom ?? 0),
        pageSize: String(opts?.pageSize ?? 10),
        dateFrom: '20250101',
        dateTo: today,
        lang: 'id',
    });
    const key = `profile-announcement:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetProfileAnnouncement?${params}`);
    setCache(key, data);
    return data;
}

/** Laporan keuangan (financial report) dari IDX */
export async function getFinancialReport(kodeEmiten: string, opts?: { periode?: string; year?: number; reportType?: string; pageSize?: number }) {
    const params = new URLSearchParams({
        periode: opts?.periode ?? 'tw',
        year: String(opts?.year ?? new Date().getFullYear()),
        indexFrom: '0',
        pageSize: String(opts?.pageSize ?? 10),
        reportType: opts?.reportType ?? 'rdf',
        kodeEmiten,
    });
    const key = `fin-report:${params.toString()}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ListedCompany/GetFinancialReport?${params}`);
    setCache(key, data);
    return data;
}

/** Riwayat saham beredar (issued shares history) */
export async function getIssuedHistory(kodeEmiten: string, length = 20, start = 0) {
    const key = `issued-history:${kodeEmiten}:${length}:${start}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ListingActivity/GetIssuedHistory?kodeEmiten=${kodeEmiten}&start=${start}&length=${length}`);
    setCache(key, data);
    return data;
}

/** Data relisting */
export async function getRelistingData(pageSize = 20, indexFrom = 0) {
    const key = `relisting:${pageSize}:${indexFrom}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/Home/GetRelistingData?pageSize=${pageSize}&indexFrom=${indexFrom}`);
    setCache(key, data);
    return data;
}

/** Data saham yang sedang suspend */
export async function getSuspendData(resultCount = 20) {
    const key = `suspend:${resultCount}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/Home/GetSuspendData?resultCount=${resultCount}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// 3. MARKET / INDEX
// ═══════════════════════════════════════════════════════════════════

/** List index & harga terkini (IHSG, LQ45, dll) */
export async function getIndexList() {
    const key = 'index-list';
    if (getCached(key, 60_000)) return getCached(key, 60_000);
    const data = await idxFetch<any>(`/primary/home/GetIndexList`);
    setCache(key, data);
    return data;
}

/** Kalender bursa (hari libur, jadwal) */
export async function getCalendar(date?: string, range = 'm') {
    const d = date || todayStr();
    const key = `calendar:${d}:${range}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/Home/GetCalendar?range=${range}&date=${d}`);
    setCache(key, data);
    return data;
}

/** Chart historis index tertentu */
export async function getIndexChart(indexCode = 'COMPOSITE', period = '1y') {
    const key = `index-chart:${indexCode}:${period}`;
    if (getCached(key, 60_000)) return getCached(key, 60_000);
    const data = await idxFetch<any>(`/primary/helper/GetIndexChart?indexCode=${indexCode}&period=${period}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// 4. PARTICIPANTS (BROKER & DEALER)
// ═══════════════════════════════════════════════════════════════════

/** Pencarian/list broker anggota bursa */
export async function getBrokerSearch(length = 50, start = 0) {
    const key = `broker-search:${length}:${start}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ExchangeMember/GetBrokerSearch?start=${start}&length=${length}`);
    setCache(key, data);
    return data;
}

/** Pencarian partisipan bursa */
export async function getParticipantSearch(length = 50, start = 0, codeName = '', license = '') {
    const params = new URLSearchParams({ start: String(start), length: String(length), codeName, license });
    const key = `participant-search:${params.toString()}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ExchangeMember/GetParticipantSearch?${params}`);
    setCache(key, data);
    return data;
}

/** Pencarian primary dealer */
export async function getPrimaryDealerSearch(length = 50, start = 0, codeName = '', license = '') {
    const params = new URLSearchParams({ start: String(start), length: String(length), codeName, license });
    const key = `primary-dealer:${params.toString()}`;
    if (getCached(key, 60 * 60_000)) return getCached(key, 60 * 60_000);
    const data = await idxFetch<any>(`/primary/ExchangeMember/GetPrimaryDealerSearch?${params}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// 5. STOCK SCREENER
// ═══════════════════════════════════════════════════════════════════

export async function getStockScreener(sector = '', subSector = '') {
    const params = new URLSearchParams();
    if (sector) params.set('Sector', sector);
    if (subSector) params.set('SubSector', subSector);
    const key = `screener:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/support/stock-screener/api/v1/stock-screener/get?${params}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// 6. DIGITAL STATISTICS (paginated monthly data)
// ═══════════════════════════════════════════════════════════════════

type UrlName =
    | 'LINK_LISTING' | 'LINK_DELISTING' | 'LINK_DIVIDEND' | 'LINK_STOCK_SPLIT'
    | 'LINK_STOCK_NEW_LISTING' | 'LINK_FINANCIAL_DATA_RATIO' | 'LINK_RIGHT_OFFERING'
    | 'LINK_TOP_GAINER' | 'LINK_TOP_LOSER' | 'LINK_DAILY_IDX_INDICES'
    | 'LINK_DPS_JCI_SECTORAL_MOVEMENT'
    | 'LINK_LIST_TRADING_SUMMARY_INDUSTRY_CLASSIFICATION'
    | 'LINK_TABLE_DAILY_TRADING_INVESTOR_DOMESTIC'
    | 'LINK_TABLE_DAILY_TRADING_INVESTOR_FOREIGN'
    | 'LINK_MOST_ACTIVE_STOCK_FREQ' | 'LINK_MOST_ACTIVE_STOCK_VALUE'
    | 'LINK_MOST_ACTIVE_STOCK_VOLUME';

/** Digital Statistics — paginated (monthly period) */
export async function getDigitalStatPaginated(
    urlName: UrlName,
    periodYear: number,
    periodMonth: number,
    opts?: { pageSize?: number; pageNumber?: number; cumulative?: boolean }
) {
    const params = new URLSearchParams({
        urlName,
        periodYear: String(periodYear),
        periodMonth: String(periodMonth),
        periodType: 'monthly',
        isPrint: 'False',
        cumulative: opts?.cumulative ? 'true' : 'false',
        pageSize: String(opts?.pageSize ?? 10),
        pageNumber: String(opts?.pageNumber ?? 1),
    });
    const key = `dstat-paginated:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(`/primary/DigitalStatistic/GetApiDataPaginated?${params}`);
    setCache(key, data);
    return data;
}

/** Digital Statistics — non-paginated (needs base64 query).
 *  Pakai resilientFetch (direct → proxy → Chromium) supaya tetap jalan saat IDX kena Cloudflare. */
export async function getDigitalStat(urlName: UrlName, query: string) {
    const params = new URLSearchParams({ urlName, query, isPrint: 'False', cumulative: 'false' });
    const key = `dstat:${params.toString()}`;
    if (getCached(key)) return getCached(key);
    const data = await resilientFetch<any>(`/primary/DigitalStatistic/GetApiData?${params}`);
    setCache(key, data);
    return data;
}

// Convenience wrappers for common digital stats
export async function getListingData(year: number, month: number) {
    return getDigitalStatPaginated('LINK_LISTING', year, month);
}

export async function getDelistingData(year: number, month: number) {
    return getDigitalStatPaginated('LINK_DELISTING', year, month);
}

export async function getDividendData(year: number, month: number) {
    return getDigitalStatPaginated('LINK_DIVIDEND', year, month);
}

export async function getStockSplitData(year: number, month: number) {
    return getDigitalStatPaginated('LINK_STOCK_SPLIT', year, month);
}

export async function getFinancialDataRatio(year: number, month: number) {
    return getDigitalStatPaginated('LINK_FINANCIAL_DATA_RATIO', year, month);
}

export async function getTopGainer(year: number, month: number) {
    const query = Buffer.from(JSON.stringify({ year: String(year), month: String(month), quarter: 0, type: 'monthly' })).toString('base64');
    return getDigitalStat('LINK_TOP_GAINER', query);
}

export async function getTopLoser(year: number, month: number) {
    const query = Buffer.from(JSON.stringify({ year: String(year), month: String(month), quarter: 0, type: 'monthly' })).toString('base64');
    return getDigitalStat('LINK_TOP_LOSER', query);
}

export async function getDailyIdxIndices(year: number, month: number) {
    const query = Buffer.from(JSON.stringify({ year: String(year), month: String(month), quarter: 0, type: 'monthly' })).toString('base64');
    return getDigitalStat('LINK_DAILY_IDX_INDICES', query);
}

export async function getDailyTradingByInvestorType(year: number, month: number, type: 'domestic' | 'foreign') {
    const urlName = type === 'domestic' ? 'LINK_TABLE_DAILY_TRADING_INVESTOR_DOMESTIC' : 'LINK_TABLE_DAILY_TRADING_INVESTOR_FOREIGN';
    const query = Buffer.from(JSON.stringify({ year: String(year), month: String(month), quarter: 0, type: 'monthly' })).toString('base64');
    return getDigitalStat(urlName, query);
}

// ═══════════════════════════════════════════════════════════════════
// 7. PAGE-BASED STATISTICS (monthly reports)
// ═══════════════════════════════════════════════════════════════════

type PagePath =
    | 'highlights/composite-stock-price-index'
    | 'highlights/idx-indices-highlight'
    | 'highlights/statistical-highlight'
    | 'stock-price-index/daily-idx-indices'
    | 'stock-price-index/jakarta-composite-index-and-sectoral-indices-movement'
    | 'stock-price-index/idx-indices-12-month-chart'
    | 'equity-trading-by-investor/table-daily-trading-by-type-of-investor'
    | 'equity-trading-by-investor/daily-trading-chart-by-type-of-investor'
    | 'equity-trading-by-investor/total-trading-by-investor-s-type-and-net-purchase-by-foreigners'
    | 'equity-trading-by-market/daily-stock-trading-by-type-of-market'
    | 'equity-trading-by-market/trading-volume-and-value-by-market-type'
    | 'equity-trading-by-securities/daily-rights-certificate-warrant-etf-reit-dinfra-futures-trading'
    | 'equity-trading-by-industry/trading-summary-by-industry-classification'
    | 'equity-trading-by-industry/trading-value-by-industry'
    | 'equity-trading-by-industry/number-of-listed-shares-by-industry'
    | 'biggest-market-capitalization-most-active-stocks/biggest-market-capitalization'
    | 'biggest-market-capitalization-most-active-stocks/most-active-stocks-by-total-trading-volume'
    | 'biggest-market-capitalization-most-active-stocks/most-active-stocks-by-total-trading-value'
    | 'biggest-market-capitalization-most-active-stocks/most-active-stocks-by-total-trading-frequency'
    | 'biggest-market-capitalization-most-active-stocks/top-gainer-and-loser-stocks'
    | 'most-active-brokerage/most-active-brokerage-houses-by-total-value'
    | 'most-active-brokerage/most-active-brokerage-houses-by-total-frequency'
    | 'trading-summary/most-active-stocks-by-total-trading-value-ytd'
    | 'trading-summary/most-active-brokerage-houses-by-total-trading-value-ytd'
    | 'trading-summary/table-of-stock-price'
    | 'trading-summary/table-of-stock-trading'
    | 'trading-summary/table-of-trading-industry'
    | 'trading-summary/warrant-trading'
    | 'trading-summary/etf-trading';

export async function getMonthlyPageData(pagePath: PagePath, filter: { year: string; month: string; quarter?: number; type?: string }) {
    const f = Buffer.from(JSON.stringify({ year: filter.year, month: filter.month, quarter: filter.quarter ?? 0, type: filter.type ?? 'monthly' })).toString('base64');
    const url = `/primary/page/id/data-pasar/laporan-statistik/digital-statistic/monthly/${pagePath}?filter=${encodeURIComponent(f)}`;
    const key = `page:${pagePath}:${f}`;
    if (getCached(key)) return getCached(key);
    // resilientFetch: direct → proxy → Chromium (tahan Cloudflare)
    const data = await resilientFetch<any>(url);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS: Multi-strategy fetch (Direct → Proxy)
// ═══════════════════════════════════════════════════════════════════

/**
 * Try fetching an IDX endpoint with multiple strategies.
 * Returns parsed JSON or throws.
 */
export async function resilientFetch<T>(path: string, timeout = 15000): Promise<T> {
    const errors: string[] = [];

    // Strategy 1: Direct
    try {
        const data = await idxFetch<T>(path, timeout);
        return data;
    } catch (e: any) { errors.push(`direct: ${e.message}`); }

    // Strategy 2: Via allorigins proxy
    try {
        const fullUrl = path.startsWith('http') ? path : `${IDX_BASE}${path}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
        const proxyRes = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(15_000),
        });
        if (proxyRes.ok) {
            const txt = await proxyRes.text();
            try { return JSON.parse(txt) as T; } catch {}
        }
        errors.push(`proxy: ${proxyRes.status}`);
    } catch (e: any) { errors.push(`proxy: ${e.message}`); }

    // Strategy 3: Chromium headless via Playwright (menembus challenge Cloudflare).
    // Berat (~20-60 dtk) tapi andal — antrean terserialisasi di idxBrowserFetch.
    try {
        const fullUrl = path.startsWith('http') ? path : `${IDX_BASE}${path}`;
        const { idxBrowserFetchText } = await import('./idxBrowserFetch');
        const text = await idxBrowserFetchText(fullUrl);
        return JSON.parse(text) as T;
    } catch (e: any) { errors.push(`browser: ${e.message}`); }

    throw new Error(`All strategies failed for ${path}: ${errors.join(' | ')}`);
}

// ═══════════════════════════════════════════════════════════════════
// CONVENIENCE: Get broker summary with fallback
// ═══════════════════════════════════════════════════════════════════

export async function getBrokerSummaryResilient(date?: string, length = 50) {
    const d = date || todayStr();
    const data = await resilientFetch<any>(`/primary/TradingSummary/GetBrokerSummary?length=${length}&start=0&date=${d}`);
    return { data: data?.data || data?.Data || data || [], source: 'idx_direct' as const, date: d };
}
