import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
    },
}));

vi.mock('@/lib/shariaStocks', () => ({ getShariaStockList: vi.fn() }));

import { getShariaStockList } from '@/lib/shariaStocks';
import { GET } from '@/app/api/idx/sharia-list/route';

const mockedGetShariaStockList = vi.mocked(getShariaStockList);

describe('API /api/idx/sharia-list', () => {
    afterEach(() => mockedGetShariaStockList.mockReset());

    it('mengembalikan daftar dan menghitung jumlah syariah/non-syariah', async () => {
        mockedGetShariaStockList.mockReturnValue([
            { ticker: 'BBCA', sharia: true },
            { ticker: 'ZZZZ', sharia: false },
        ]);
        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.totalStocks).toBe(2);
        expect(json.data.shariaStocks).toBe(1);
        expect(json.data.nonSharia).toBe(1);
        expect(json.source).toBe('ojk');
    });

    it('mengembalikan 500 saat daftar gagal diambil', async () => {
        mockedGetShariaStockList.mockImplementation(() => {
            throw new Error('boom');
        });
        const res = await GET();
        expect(res.status).toBe(500);
    });
});