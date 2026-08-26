import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
    default: { existsSync: mocks.existsSync, readFileSync: mocks.readFileSync },
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
}));

import { getAllStocks } from '@/lib/screenerStockList';

describe('screenerStockList', () => {
    let cwdSpy: any;

    beforeEach(() => {
        mocks.existsSync.mockReset();
        mocks.readFileSync.mockReset();
        cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake/cwd');
    });

    afterEach(() => cwdSpy.mockRestore());

    it('membaca dan memfilter ticker valid (2-4 huruf + .JK) dari stocks-idx.json', () => {
        mocks.existsSync.mockReturnValue(true);
        mocks.readFileSync.mockReturnValue(JSON.stringify({ stocks: ['BBCA.JK', 'TLKM.JK', 'bad-ticker', 'A.JK', 'ABCDE.JK'] }));
        expect(getAllStocks()).toEqual(['BBCA.JK', 'TLKM.JK']);
    });

    it('mengembalikan [] jika file tidak ada', () => {
        mocks.existsSync.mockReturnValue(false);
        expect(getAllStocks()).toEqual([]);
    });

    it('mengembalikan [] jika JSON rusak', () => {
        mocks.existsSync.mockReturnValue(true);
        mocks.readFileSync.mockReturnValue('bukan json');
        expect(getAllStocks()).toEqual([]);
    });
});