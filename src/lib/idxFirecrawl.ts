// IDX Market Data via Firecrawl REST API (bypasses Cloudflare)
const FC_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-783b7b440ff94f4ab668613ac6908187';
const FC_API_URL = 'https://api.firecrawl.dev/v1/scrape';

async function fcScrape<T>(url: string): Promise<T> {
    const res = await fetch(FC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FC_API_KEY}`,
        },
        body: JSON.stringify({
            url,
            formats: ['json'],
            jsonOptions: {
                prompt: 'Extract all data fields from this JSON response. Return the complete data array with all fields.',
            },
            onlyMainContent: false,
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Firecrawl ${res.status}: ${errText}`);
    }

    const result = await res.json();
    if (!result.success) throw new Error(`Firecrawl: ${result.error}`);
    return result.data.json as T;
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

// 1. Broker Summary
export async function getBrokerSummary(date?: string): Promise<BrokerItem[]> {
    const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const data = await fcScrape<any>(
        `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${d}`
    );
    const items: any[] = data?.data || data?.Data || [];
    return items.map(i => ({
        BRK_NAME: i.BRK_NAME || '',
        BRK_CODE: i.BRK_CODE || '',
        BUY_VALUE: i.BUY_VALUE || 0,
        SELL_VALUE: i.SELL_VALUE || 0,
        NET_BUY_VALUE: i.NET_BUY_VALUE || 0,
        BUY_VOLUME: i.BUY_VOLUME || 0,
        SELL_VOLUME: i.SELL_VOLUME || 0,
        FREQUENCY: i.FREQUENCY || 0,
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
