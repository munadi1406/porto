// Client-side IDX API fetcher
// Tries multiple strategies to bypass CORS & Cloudflare

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
];

const IDX_BASE = 'https://www.idx.co.id';

async function fetchViaProxy(url: string): Promise<any> {
    // Strategy 1: Try Next.js rewrite first (fastest, zero extra cost)
    try {
        const rewritePath = url.replace(IDX_BASE, '');
        const res = await fetch(`/api/idxx${rewritePath}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch { return text; }
        }
    } catch { /* rewrite failed */ }

    // Strategy 2: Try public CORS proxies
    for (const proxy of CORS_PROXIES) {
        try {
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
            if (res.ok) {
                const text = await res.text();
                try { return JSON.parse(text); } catch { return text; }
            }
        } catch { /* proxy failed */ }
    }

    throw new Error('All IDX fetch strategies failed');
}

// Broker Summary (net buy/sell by broker)
export async function getBrokerSummaryFromIDX(date?: string) {
    const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const data = await fetchViaProxy(
        `${IDX_BASE}/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${d}`
    );
    return data?.data || data?.Data || [];
}

// Foreign/Domestic investor flow
export async function getForeignFlowFromIDX(brokers: any[]) {
    const foreignKeywords = /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley|macquarie|dbs|hsbc|bnp|abn|ing|standard chartered|bofa/i;

    const foreignBuy = brokers.filter((b: any) => foreignKeywords.test(b.BRK_NAME || ''))
        .reduce((s: number, b: any) => s + (b.BUY_VALUE || 0), 0);
    const foreignSell = brokers.filter((b: any) => foreignKeywords.test(b.BRK_NAME || ''))
        .reduce((s: number, b: any) => s + (b.SELL_VALUE || 0), 0);
    const totalBuy = brokers.reduce((s: number, b: any) => s + (b.BUY_VALUE || 0), 0);
    const totalSell = brokers.reduce((s: number, b: any) => s + (b.SELL_VALUE || 0), 0);
    const domesticBuy = totalBuy - foreignBuy;
    const domesticSell = totalSell - foreignSell;

    return [
        { investor: 'Foreign', buyValue: foreignBuy, sellValue: foreignSell, netValue: foreignBuy - foreignSell },
        { investor: 'Domestic', buyValue: domesticBuy, sellValue: domesticSell, netValue: domesticBuy - domesticSell },
    ];
}

// Stock Summary (daily OHLC all stocks)
export async function getStockSummaryFromIDX(date?: string) {
    const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const data = await fetchViaProxy(
        `${IDX_BASE}/primary/TradingSummary/GetStockSummary?date=${d}`
    );
    return data?.data || data?.Data || [];
}
