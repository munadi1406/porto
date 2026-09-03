import { describe, it, expect } from 'vitest';
import { filterStockTickers, getAllStocks } from '@/lib/screenerStockList';

describe('screenerStockList', () => {
    it('memfilter ticker valid dan membuang baris header', () => {
        expect(filterStockTickers(['NO.JK', 'KODE.JK', 'BBCA.JK', 'TLKM.JK', 'bad-ticker', 'A.JK', 'ABCDE.JK'])).toEqual(['BBCA.JK', 'TLKM.JK']);
    });

    it('mengembalikan [] untuk input non-array', () => {
        expect(filterStockTickers(null)).toEqual([]);
    });

    it('membundel daftar saham ke runtime server', () => {
        expect(getAllStocks().length).toBeGreaterThan(900);
        expect(getAllStocks()).toContain('BBCA.JK');
    });
});
