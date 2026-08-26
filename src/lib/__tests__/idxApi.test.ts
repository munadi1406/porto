import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ instances: [] as any[] }));

vi.mock('yahoo-finance2', () => {
    class MockYF {
        quote = vi.fn();
        quoteSummary = vi.fn();
        constructor() {
            h.instances.push(this);
        }
    }
    return { default: MockYF };
});

vi.mock('../screenerStockList', () => ({ getAllStocks: vi.fn() }));

import { getAllStocks } from '../screenerStockList';
import {
    getStockSummary,
    getTopGainer,
    getTopLoser,
    getSmartMoneyData,
    getFinancialRatiosForTicker,
} from '@/lib/idxApi';

const mockedGetAllStocks = vi.mocked(getAllStocks);

function yf() {
    return h.instances[h.instances.length - 1];
}

describe('idxApi (Yahoo)', () => {
    beforeEach(() => mockedGetAllStocks.mockReset());
    afterEach(() => vi.clearAllMocks());

    it('getStockSummary mengambil quote per batch dan mengurutkan berdasarkan |perubahan|', async () => {
        mockedGetAllStocks.mockReturnValue(['BBCA.JK', 'BBRI.JK']);
        yf().quote.mockImplementation(async (t: string) => ({
            regularMarketPrice: t === 'BBCA.JK' ? 9800 : 5000,
            regularMarketChange: t === 'BBCA.JK' ? 196 : -50,
            regularMarketChangePercent: t === 'BBCA.JK' ? 2 : -1,
            regularMarketVolume: 1000,
            shortName: 'Bank',
        }));
        const rows = await getStockSummary();
        expect(rows).toHaveLength(2);
        expect(rows[0].KODE_SAHAM).toBe('BBCA');
        expect(rows[1].KODE_SAHAM).toBe('BBRI');
    });

    it('getTopGainer hanya menyertakan saham positif', async () => {
        mockedGetAllStocks.mockReturnValue(['A.JK', 'B.JK', 'C.JK']);
        yf().quote.mockImplementation(async (t: string) => ({
            regularMarketPrice: 100,
            regularMarketChangePercent: t === 'A.JK' ? 5 : t === 'B.JK' ? -3 : 0,
        }));
        const top = await getTopGainer();
        expect(top).toHaveLength(1);
        expect(top[0].KODE_SAHAM).toBe('A');
    });

    it('getTopLoser hanya menyertakan saham negatif', async () => {
        mockedGetAllStocks.mockReturnValue(['A.JK', 'B.JK']);
        yf().quote.mockImplementation(async (t: string) => ({
            regularMarketPrice: 100,
            regularMarketChangePercent: t === 'A.JK' ? 5 : -3,
        }));
        const top = await getTopLoser();
        expect(top).toHaveLength(1);
        expect(top[0].KODE_SAHAM).toBe('B');
    });

    it('getSmartMoneyData menghitung dari institutional ownership', async () => {
        yf().quoteSummary.mockResolvedValue({
            institutionOwnership: { ownershipList: [{ organization: 'Vanguard Group', pctHeld: { raw: 0.1 } }] },
        });
        const d = await getSmartMoneyData();
        expect(d.topBuyBrokers.length).toBeGreaterThan(0);
        expect(d.topBuyBrokers[0].name).toBe('Vanguard Group');
        expect(d.foreignFlow).toHaveLength(2);
        expect(d.summary.totalBuyValue).toBeGreaterThan(0);
    });

    it('getFinancialRatiosForTicker memetakan rasio dari quoteSummary', async () => {
        yf().quoteSummary.mockResolvedValue({
            summaryDetail: { trailingPE: 12.5 },
            financialData: { returnOnEquity: 0.2, debtToEquity: 1.5 },
            defaultKeyStatistics: { priceToBook: 3.2 },
        });
        const r = await getFinancialRatiosForTicker('BBCA.JK');
        expect(r).toMatchObject({ KODE_EMITEN: 'BBCA', PER: 12.5, PBV: 3.2, ROE: 20, DER: 1.5 });
    });

    it('getFinancialRatiosForTicker mengembalikan null saat error', async () => {
        yf().quoteSummary.mockRejectedValue(new Error('boom'));
        expect(await getFinancialRatiosForTicker('BBCA.JK')).toBeNull();
    });
});