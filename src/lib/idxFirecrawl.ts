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
            formats: ['rawHtml'],
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

    // Try rawHtml (IDX returns JSON, Firecrawl wraps it)
    const raw = result.data?.rawHtml || result.data?.markdown || '';
    
    // Find JSON content in the raw response
    try { return JSON.parse(raw.trim()) as T; } catch {}

    // Try extracting from HTML
    const preMatch = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    if (preMatch) {
        try { return JSON.parse(preMatch[1].trim()) as T; } catch {}
    }

    // Try code block
    const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) {
        try { return JSON.parse(codeMatch[1].trim()) as T; } catch {}
    }

    throw new Error(`Could not parse Firecrawl response as JSON. Response starts with: ${raw.substring(0, 100)}`);
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
    const tryDates: string[] = [];
    if (date) tryDates.push(date);
    
    // Generate last 14 days as candidates
    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        tryDates.push(
            `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
        );
    }

    let lastError: any;
    for (const d of tryDates) {
        try {
            const data = await fcScrape<any>(
                `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${d}`
            );
            const items: any[] = data?.data || data?.Data || data?.brokerSummaries || data?.BrokerSummaries || [];
            if (items.length > 0) {
                // Handle both original keys and any AI-renamed keys
                return items.map(i => ({
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
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('No trading data found for last 14 days');
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
