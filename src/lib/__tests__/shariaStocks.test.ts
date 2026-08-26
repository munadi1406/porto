import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../screenerStockList', () => ({
    getAllStocks: vi.fn(),
}));

import { getAllStocks } from '../screenerStockList';
import { isSharia, getShariaTickers, getShariaStockList } from '@/lib/shariaStocks';

const mockedGetAllStocks = vi.mocked(getAllStocks);

describe('shariaStocks', () => {
    afterEach(() => mockedGetAllStocks.mockReset());

    it('isSharia mengenali ticker syariah (case-insensitive)', () => {
        expect(isSharia('BBCA')).toBe(true);
        expect(isSharia('bbca')).toBe(true);
        expect(isSharia('TLKM')).toBe(true);
    });

    it('isSharia menolak ticker non-syariah', () => {
        expect(isSharia('ZZZZ')).toBe(false);
        expect(isSharia('')).toBe(false);
    });

    it('getShariaTickers mengembalikan daftar terurut tanpa duplikat', () => {
        const list = getShariaTickers();
        expect(list.length).toBeGreaterThan(500);
        const sorted = [...list].sort();
        expect(list).toEqual(sorted);
        expect(new Set(list).size).toBe(list.length);
        expect(list).toContain('BBCA');
    });

    it('getShariaStockList memetakan semua saham dengan flag sharia', () => {
        mockedGetAllStocks.mockReturnValue(['BBCA.JK', 'ZZZZ.JK', 'INVALID']);
        const result = getShariaStockList();
        expect(result).toEqual([
            { ticker: 'BBCA', sharia: true },
            { ticker: 'ZZZZ', sharia: false },
            { ticker: 'INVALID', sharia: false },
        ]);
    });
});