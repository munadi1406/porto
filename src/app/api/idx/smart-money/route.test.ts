import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
    },
}));

vi.mock('@/lib/idxSmartMoney', () => ({ getSmartMoneyData: vi.fn() }));
vi.mock('@/lib/idxApi', () => ({ getSmartMoneyData: vi.fn() }));

import { getSmartMoneyData as idxSM } from '@/lib/idxSmartMoney';
import { getSmartMoneyData as yahooSM } from '@/lib/idxApi';
import { GET } from '@/app/api/idx/smart-money/route';

const mockedIdxSM = vi.mocked(idxSM);
const mockedYahooSM = vi.mocked(yahooSM);

const emptyData = { foreignFlow: [], topBuyBrokers: [], topSellBrokers: [], summary: {} };

describe('API /api/idx/smart-money', () => {
    afterEach(() => {
        mockedIdxSM.mockReset();
        mockedYahooSM.mockReset();
    });

    it('mengembalikan data smart money dari IDX', async () => {
        mockedIdxSM.mockResolvedValue(emptyData as any);
        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.source).toBe('idx_direct');
    });

    it('fallback ke Yahoo saat IDX gagal', async () => {
        mockedIdxSM.mockRejectedValue(new Error('idx down'));
        mockedYahooSM.mockResolvedValue(emptyData as any);
        const res = await GET();
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.source).toBe('yahoo_fallback');
    });

    it('mengembalikan 502 saat semua sumber gagal', async () => {
        mockedIdxSM.mockRejectedValue(new Error('idx down'));
        mockedYahooSM.mockRejectedValue(new Error('yahoo down'));
        const res = await GET();
        expect(res.status).toBe(502);
    });
});