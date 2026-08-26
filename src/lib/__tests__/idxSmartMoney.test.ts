import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('../idxApiClient', () => ({
    idxFetch: vi.fn(),
}));

import { idxFetch } from '../idxApiClient';
import { getBrokerSummary, getSmartMoneyData } from '@/lib/idxSmartMoney';

const mockedIdxFetch = vi.mocked(idxFetch);

describe('idxSmartMoney', () => {
    afterEach(() => {
        mockedIdxFetch.mockReset();
    });

    it('getBrokerSummary memetakan field IDX ke format internal', async () => {
        mockedIdxFetch.mockResolvedValue({
            data: [{ FirmName: 'PT ABC Sekuritas', IDFirm: 'X', Value: 100, Volume: 10, Frequency: 5 }],
        });
        const brokers = await getBrokerSummary('20260818');
        expect(brokers).toHaveLength(1);
        expect(brokers[0]).toMatchObject({
            BRK_NAME: 'PT ABC Sekuritas',
            BRK_CODE: 'X',
            BUY_VALUE: 100,
            BUY_VOLUME: 10,
            FREQUENCY: 5,
        });
        expect(brokers[0].NET_BUY_VALUE).toBe(100);
    });

    it('getBrokerSummary melempar saat tidak ada data di semua tanggal kandidat', async () => {
        mockedIdxFetch.mockResolvedValue({ data: [] });
        await expect(getBrokerSummary('20260818')).rejects.toThrow(/No trading data/);
    });

    it('getSmartMoneyData menghitung foreign flow, top broker, dan ringkasan', async () => {
        mockedIdxFetch.mockResolvedValue({
            data: [
                { FirmName: 'Mandiri Sekuritas', IDFirm: 'M', Value: 5000, SELL_VALUE: 1000, Volume: 100, Frequency: 10 },
                { FirmName: 'Nomura Indonesia', IDFirm: 'N', Value: 3000, SELL_VALUE: 500, Volume: 60, Frequency: 5 },
            ],
        });
        const d = await getSmartMoneyData('20260818');
        expect(d.summary.totalBuyValue).toBe(8000);
        expect(d.summary.totalSellValue).toBe(1500);
        expect(d.summary.brokerCount).toBe(2);
        expect(d.foreignFlow).toHaveLength(2);
        expect(d.foreignFlow[0].investor).toBe('Foreign');
        expect(d.foreignFlow[0].buyValue).toBe(3000); // hanya Nomura yang match keyword asing
        expect(d.topBuyBrokers).toHaveLength(2);
        expect(d.topBuyBrokers[0].code).toBe('M');
    });
});