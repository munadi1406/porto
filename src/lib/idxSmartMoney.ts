// IDX Smart Money / Broker Summary — via idxFetch (session-cookie direct)
import { idxFetch, getLastTradingDate } from './idxApiClient';

async function getBrokerSummaryRaw(date?: string): Promise<any[]> {
    // Optimasi: gunakan getLastTradingDate() yang sudah di-cache
    const lastDate = date || await getLastTradingDate();

    try {
        const data = await idxFetch<any>(
            `/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${lastDate}`
        );
        const items: any[] = data?.data || data?.Data || data?.brokerSummaries || [];
        if (items.length > 0) return items;
    } catch {}

    // Fallback: coba 3 hari terakhir
    for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        try {
            const data = await idxFetch<any>(
                `/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${ds}`
            );
            const items: any[] = data?.data || data?.Data || data?.brokerSummaries || [];
            if (items.length > 0) return items;
        } catch {}
    }

    throw new Error('No trading data found');
}

export interface BrokerItem {
    BRK_NAME: string;
    BRK_CODE: string;
    BUY_VALUE: number;
    SELL_VALUE: number;
    NET_BUY_VALUE: number;
    BUY_VOLUME: number;
    SELL_VOLUME: number;
    FREQUENCY: number;
}

// 1. Broker Summary (auto-fallback to last trading day)
export async function getBrokerSummary(date?: string): Promise<BrokerItem[]> {
    const raw = await getBrokerSummaryRaw(date);
    return raw.map((i: any) => ({
        BRK_NAME: i.FirmName || i.BRK_NAME || i.brokerName || i.name || '',
        BRK_CODE: i.IDFirm || i.BRK_CODE || i.brokerCode || i.code || '',
        BUY_VALUE: i.Value || i.BUY_VALUE || i.buyValue || 0,
        SELL_VALUE: i.SELL_VALUE || i.sellValue || 0,
        NET_BUY_VALUE: (i.Value || i.BUY_VALUE || i.buyValue || 0) - (i.SELL_VALUE || i.sellValue || 0),
        BUY_VOLUME: i.Volume || i.BUY_VOLUME || i.buyVolume || 0,
        SELL_VOLUME: i.SELL_VOLUME || i.sellVolume || 0,
        FREQUENCY: i.Frequency || i.FREQUENCY || i.frequency || 0,
    }));
}

// 2. Smart Money Data
export async function getSmartMoneyData(date?: string) {
    const brokers = await getBrokerSummary(date);
    const topBuy = [...brokers].sort((a, b) => b.NET_BUY_VALUE - a.NET_BUY_VALUE).slice(0, 10);
    const topSell = [...brokers].sort((a, b) => a.NET_BUY_VALUE - b.NET_BUY_VALUE).slice(0, 10);
    const totalBuyValue = brokers.reduce((s, b) => s + b.BUY_VALUE, 0);
    const totalSellValue = brokers.reduce((s, b) => s + b.SELL_VALUE, 0);

    const foreignKeywords = /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley|macquarie|dbs|hsbc|bnp|abn|ing|standard chartered|bofa/i;
    const foreignBuy = brokers.filter(b => foreignKeywords.test(b.BRK_NAME)).reduce((s, b) => s + b.BUY_VALUE, 0);
    const foreignSell = brokers.filter(b => foreignKeywords.test(b.BRK_NAME)).reduce((s, b) => s + b.SELL_VALUE, 0);

    return {
        foreignFlow: [
            { investor: 'Foreign', buyValue: foreignBuy, sellValue: foreignSell, netValue: foreignBuy - foreignSell },
            { investor: 'Domestic', buyValue: totalBuyValue - foreignBuy, sellValue: totalSellValue - foreignSell, netValue: (totalBuyValue - foreignBuy) - (totalSellValue - foreignSell) },
        ],
        topBuyBrokers: topBuy.map(b => ({ name: b.BRK_NAME, code: b.BRK_CODE, netValue: b.NET_BUY_VALUE })),
        topSellBrokers: topSell.map(b => ({ name: b.BRK_NAME, code: b.BRK_CODE, netValue: b.NET_BUY_VALUE })),
        summary: { totalBuyValue, totalSellValue, totalNetValue: totalBuyValue - totalSellValue, brokerCount: brokers.length },
    };
}