import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
    dateStr,
    todayStr,
    previousTradingDays,
    ensureSession,
    resetSession,
    idxFetch,
    getLastTradingDate,
    resetLastTradingDateCache,
} from '@/lib/idxApiClient';

function fakeRes(status: number, text: string, setCookie: string[] = []) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            getSetCookie: () => setCookie,
            forEach: () => {},
        },
        text: async () => text,
        body: { cancel: async () => {} },
    };
}

function makeFetchMock(routes: Record<string, (u: string) => any>) {
    return vi.fn(async (u: string) => {
        for (const [prefix, handler] of Object.entries(routes)) {
            if (u.startsWith(prefix)) return handler(u);
        }
        throw new Error(`No mock for ${u}`);
    });
}

const WARM = {
    'https://www.idx.co.id/id': () =>
        fakeRes(200, '<html>ok</html>', ['cf=abc; Path=/', 'sess=xyz; Path=/']),
    'https://www.idx.co.id/primary/home/GetIndexList': () => fakeRes(200, '[]'),
};

describe('idxApiClient', () => {
    let fetchMock: ReturnType<typeof makeFetchMock>;

    beforeAll(async () => {
        vi.stubGlobal('fetch', makeFetchMock({ ...WARM }));
        await ensureSession();
    });

    beforeEach(() => {
        fetchMock = makeFetchMock({ ...WARM });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('dateStr memformat tanggal jadi YYYYMMDD', () => {
        expect(dateStr(new Date('2026-08-18T00:00:00Z'))).toBe('20260818');
        expect(dateStr(new Date('2026-01-05T00:00:00Z'))).toBe('20260105');
    });

    it('todayStr mengembalikan 8 digit tanggal', () => {
        expect(todayStr()).toMatch(/^\d{8}$/);
    });

    it('previousTradingDays hanya menghasilkan hari kerja (bukan Sabtu/Minggu)', () => {
        const days = previousTradingDays(3);
        expect(days.length).toBeGreaterThan(0);
        expect(days.length).toBeLessThanOrEqual(3);
        for (const d of days) {
            expect([0, 6]).not.toContain(d.getDay());
        }
    });

    it('ensureSession mengumpulkan cookie dari halaman utama', async () => {
        resetSession();
        fetchMock = makeFetchMock({ ...WARM });
        vi.stubGlobal('fetch', fetchMock);
        const cookie = await ensureSession();
        expect(cookie).toContain('cf=abc');
        expect(cookie).toContain('sess=xyz');
    });

    it('idxFetch me-parse JSON saat request berhasil', async () => {
        fetchMock = makeFetchMock({
            ...WARM,
            'https://www.idx.co.id/primary/TradingSummary/GetStockSummary': () =>
                fakeRes(200, JSON.stringify({ data: [{ StockCode: 'BBCA', Close: 9800 }] })),
        });
        vi.stubGlobal('fetch', fetchMock);
        const res = await idxFetch<any>('/primary/TradingSummary/GetStockSummary?date=20260818');
        expect(res.data[0].StockCode).toBe('BBCA');
        expect(res.data[0].Close).toBe(9800);
    });

    it('idxFetch retry lalu berhasil setelah 502', async () => {
        let targetCalls = 0;
        fetchMock = makeFetchMock({
            ...WARM,
            'https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary': () => {
                targetCalls++;
                if (targetCalls === 1) return fakeRes(502, 'blocked');
                return fakeRes(200, JSON.stringify({ data: [{ IDFirm: 'X' }] }));
            },
        });
        vi.stubGlobal('fetch', fetchMock);
        const res = await idxFetch<any>('/primary/TradingSummary/GetBrokerSummary?date=20260818');
        expect(targetCalls).toBeGreaterThanOrEqual(2);
        expect(res.data[0].IDFirm).toBe('X');
    });

    it('idxFetch fallback ke proxy allorigins saat direct diblokir', async () => {
        fetchMock = makeFetchMock({
            ...WARM,
            'https://www.idx.co.id/primary/Home/GetTradeSummary': () => fakeRes(403, 'Cloudflare block'),
            'https://api.allorigins.win': () => fakeRes(200, JSON.stringify({ ok: true, fromProxy: true })),
        });
        vi.stubGlobal('fetch', fetchMock);
        const res = await idxFetch<any>('/primary/Home/GetTradeSummary?lang=id');
        expect(res.fromProxy).toBe(true);
    });

    it('idxFetch melempar saat semua strategi gagal', async () => {
        fetchMock = makeFetchMock({
            ...WARM,
            'https://www.idx.co.id/primary/Home/GetTradeSummary': () => fakeRes(403, 'Cloudflare block'),
            'https://api.allorigins.win': () => fakeRes(403, 'proxy no'),
        });
        vi.stubGlobal('fetch', fetchMock);
        await expect(idxFetch<any>('/primary/Home/GetTradeSummary?lang=id')).rejects.toThrow(/Cloudflare blocked/);
    });

    it('getLastTradingDate kembali tanggal 8 digit saat data tersedia', async () => {
        resetLastTradingDateCache();
        fetchMock = makeFetchMock({
            ...WARM,
            'https://www.idx.co.id/primary/TradingSummary/GetStockSummary': () =>
                fakeRes(200, JSON.stringify({ data: [{ a: 1 }] })),
        });
        vi.stubGlobal('fetch', fetchMock);
        const d = await getLastTradingDate();
        expect(d).toMatch(/^\d{8}$/);
    });
});