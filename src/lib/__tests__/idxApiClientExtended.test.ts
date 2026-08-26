import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../idxApiClient', () => ({
    idxFetch: vi.fn(),
    getCached: vi.fn(() => null),
    setCache: vi.fn(),
    todayStr: vi.fn(() => '20260818'),
    dateStr: vi.fn((d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')),
    CACHE_TTL: 300000,
    getLastTradingDate: vi.fn(async () => '20260810'),
}));

import { idxFetch, setCache, getLastTradingDate } from '../idxApiClient';
import {
    getStockScreener,
    getFinancialRatioFull,
    getTradingInfoDaily,
    getTradingInfoSS,
    getIndexSummary,
} from '@/lib/idxApiClientExtended';

const mockedIdxFetch = vi.mocked(idxFetch);
const mockedSetCache = vi.mocked(setCache);
const mockedGetLastTradingDate = vi.mocked(getLastTradingDate);

describe('idxApiClientExtended', () => {
    afterEach(() => {
        mockedIdxFetch.mockReset();
        mockedSetCache.mockClear();
        mockedGetLastTradingDate.mockClear();
    });

    it('getStockScreener memanggil idxFetch dengan URL stock-screener', async () => {
        mockedIdxFetch.mockResolvedValue({ results: [1] });
        const data = await getStockScreener('Energy', 'Coal');
        expect(data).toEqual({ results: [1] });
        expect(mockedIdxFetch).toHaveBeenCalledWith(
            expect.stringContaining('/support/stock-screener/api/v1/stock-screener/get?Sector=Energy&SubSector=Coal')
        );
    });

    it('getFinancialRatioFull meng-clamp pageSize ke 10', async () => {
        mockedIdxFetch.mockResolvedValue({ data: [] });
        await getFinancialRatioFull(2026, 8, 999, 1);
        const url = mockedIdxFetch.mock.calls[0][0] as string;
        expect(url).toContain('pageSize=10');
        expect(url).toContain('urlName=LINK_FINANCIAL_DATA_RATIO');
    });

    it('getTradingInfoDaily fallback ke URL absolut saat path relatif gagal', async () => {
        mockedIdxFetch.mockRejectedValueOnce(new Error('fail'));
        mockedIdxFetch.mockResolvedValueOnce({ SecurityCode: 'BBCA' });
        const data = await getTradingInfoDaily('BBCA');
        expect(data.SecurityCode).toBe('BBCA');
        expect(mockedIdxFetch.mock.calls[1][0]).toContain('https://www.idx.co.id/primary/ListedCompany/GetTradingInfoDaily');
    });

    it('getTradingInfoDaily mengembalikan null jika keduanya gagal', async () => {
        mockedIdxFetch.mockRejectedValue(new Error('fail'));
        expect(await getTradingInfoDaily('BBCA')).toBeNull();
    });

    it('getIndexSummary fallback ke tanggal bursa terakhir saat data kosong', async () => {
        mockedIdxFetch.mockResolvedValueOnce({ data: [] });
        mockedIdxFetch.mockResolvedValueOnce({ data: [{ IndexCode: 'COMPOSITE' }] });
        const data = await getIndexSummary();
        expect(data.data[0].IndexCode).toBe('COMPOSITE');
        const secondUrl = mockedIdxFetch.mock.calls[1][0] as string;
        expect(secondUrl).toContain('date=20260810');
        expect(mockedGetLastTradingDate).toHaveBeenCalled();
    });

    it('getTradingInfoSS mengembalikan data dan menulis cache', async () => {
        mockedIdxFetch.mockResolvedValue({ replies: [] });
        await getTradingInfoSS('BBCA', 0, 100);
        expect(mockedSetCache).toHaveBeenCalled();
    });
});