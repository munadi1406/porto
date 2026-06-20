// IDX API Service - Unofficial endpoints from www.idx.co.id
// Source: https://github.com/NeaByteLab/IDX-API
const IDX_BASE = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api/idx-proxy/primary'
    : 'https://www.idx.co.id/primary';

const HEADERS = {
    'Referer': 'https://www.idx.co.id/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
};

async function fetchJson<T>(url: string, timeout = 10000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            headers: HEADERS,
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`IDX API ${res.status}: ${res.statusText}`);
        return res.json();
    } finally {
        clearTimeout(timer);
    }
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export interface BrokerSummaryItem {
    BRK_NAME: string;
    BRK_CODE: string;
    BUY_VOLUME: number;
    BUY_VALUE: number;
    SELL_VOLUME: number;
    SELL_VALUE: number;
    NET_BUY_VALUE: number;
    NET_BUY_VOLUME: number;
    FREQUENCY: number;
}

export interface StockSummaryItem {
    KODE_SAHAM: string;
    NAMA_SAHAM: string;
    HARGA_PENUTUPAN: number;
    PERUBAHAN: number;
    PERSEN_PERUBAHAN: number;
    VOLUME: number;
    NILAI: number;
    FREQUENSI: number;
    HARGA_TERENDAH: number;
    HARGA_TERTINGGI: number;
    HARGA_PEMBUKAAN: number;
}

export interface ForeignFlowItem {
    investor: string;
    buyValue: number;
    sellValue: number;
    netValue: number;
    buyVolume: number;
    sellVolume: number;
}

export interface TopGainerLoserItem {
    KODE_SAHAM: string;
    NAMA_SAHAM: string;
    HARGA_PENUTUPAN: number;
    PERUBAHAN: number;
    PERSEN_PERUBAHAN: number;
    VOLUME: number;
    NILAI: number;
}

export interface FinancialRatioItem {
    KODE_EMITEN: string;
    NAMA_EMITEN: string;
    PER: number | null;
    PBV: number | null;
    ROE: number | null;
    DER: number | null;
    EPS: number | null;
    BV: number | null;
}

// 1. Broker Summary (Top net buy/sell by broker)
export async function getBrokerSummary(date?: string): Promise<BrokerSummaryItem[]> {
    const d = date || todayStr();
    const data: any = await fetchJson(`${IDX_BASE}/primary/TradingSummary/GetBrokerSummary?length=20&start=0&date=${d}`);
    return data?.data || data?.Data || [];
}

// 2. Stock Summary (daily OHLC all stocks)
export async function getStockSummary(date?: string): Promise<StockSummaryItem[]> {
    const d = date || todayStr();
    const data: any = await fetchJson(`${IDX_BASE}/primary/TradingSummary/GetStockSummary?date=${d}`);
    return data?.data || data?.Data || [];
}

// 3. Top Gainer
export async function getTopGainer(date?: string): Promise<TopGainerLoserItem[]> {
    const d = date || todayStr();
    const data: any = await fetchJson(`${IDX_BASE}/primary/TradingSummary/GetStockSummary?date=${d}`);
    const stocks: StockSummaryItem[] = data?.data || data?.Data || [];
    return stocks
        .filter(s => s.PERSEN_PERUBAHAN > 0)
        .sort((a, b) => b.PERSEN_PERUBAHAN - a.PERSEN_PERUBAHAN)
        .slice(0, 10)
        .map(s => ({
            KODE_SAHAM: s.KODE_SAHAM,
            NAMA_SAHAM: s.NAMA_SAHAM,
            HARGA_PENUTUPAN: s.HARGA_PENUTUPAN,
            PERUBAHAN: s.PERUBAHAN,
            PERSEN_PERUBAHAN: s.PERSEN_PERUBAHAN,
            VOLUME: s.VOLUME,
            NILAI: s.NILAI,
        }));
}

// 4. Top Loser
export async function getTopLoser(date?: string): Promise<TopGainerLoserItem[]> {
    const d = date || todayStr();
    const data: any = await fetchJson(`${IDX_BASE}/primary/TradingSummary/GetStockSummary?date=${d}`);
    const stocks: StockSummaryItem[] = data?.data || data?.Data || [];
    return stocks
        .filter(s => s.PERSEN_PERUBAHAN < 0)
        .sort((a, b) => a.PERSEN_PERUBAHAN - b.PERSEN_PERUBAHAN)
        .slice(0, 10)
        .map(s => ({
            KODE_SAHAM: s.KODE_SAHAM,
            NAMA_SAHAM: s.NAMA_SAHAM,
            HARGA_PENUTUPAN: s.HARGA_PENUTUPAN,
            PERUBAHAN: s.PERUBAHAN,
            PERSEN_PERUBAHAN: s.PERSEN_PERUBAHAN,
            VOLUME: s.VOLUME,
            NILAI: s.NILAI,
        }));
}

// 5. Foreign vs Domestic trading flow
export async function getForeignFlow(date?: string): Promise<ForeignFlowItem[]> {
    const d = date || todayStr();
    const data: any = await fetchJson(`${IDX_BASE}/primary/TradingSummary/GetStockSummary?date=${d}`);
    // IDX returns investor type data within stock summary
    // We compute aggregate foreign vs domestic from broker data
    const brokers: BrokerSummaryItem[] = await getBrokerSummary(date);

    const foreignBuy = brokers.filter(b =>
        /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley|macquarie|dbs|hsbc|bnp|abn|ing|standard chartered|bofa/i
            .test(b.BRK_NAME || ''))
        .reduce((sum, b) => sum + b.BUY_VALUE, 0);

    const foreignSell = brokers.filter(b =>
        /foreign|asing|nomura|jp morgan|credit suisse|ubs|deutsche|goldman|citi|morgan stanley|macquarie|dbs|hsbc|bnp|abn|ing|standard chartered|bofa/i
            .test(b.BRK_NAME || ''))
        .reduce((sum, b) => sum + b.SELL_VALUE, 0);

    const totalBuy = brokers.reduce((sum, b) => sum + b.BUY_VALUE, 0);
    const totalSell = brokers.reduce((sum, b) => sum + b.SELL_VALUE, 0);
    const domesticBuy = totalBuy - foreignBuy;
    const domesticSell = totalSell - foreignSell;

    return [
        {
            investor: 'Foreign',
            buyValue: foreignBuy,
            sellValue: foreignSell,
            netValue: foreignBuy - foreignSell,
            buyVolume: brokers.filter(b => /foreign/i.test(b.BRK_NAME || '')).reduce((s, b) => s + b.BUY_VOLUME, 0),
            sellVolume: brokers.filter(b => /foreign/i.test(b.BRK_NAME || '')).reduce((s, b) => s + b.SELL_VOLUME, 0),
        },
        {
            investor: 'Domestic',
            buyValue: domesticBuy,
            sellValue: domesticSell,
            netValue: domesticBuy - domesticSell,
            buyVolume: brokers.filter(b => !/foreign/i.test(b.BRK_NAME || '')).reduce((s, b) => s + b.BUY_VOLUME, 0),
            sellVolume: brokers.filter(b => !/foreign/i.test(b.BRK_NAME || '')).reduce((s, b) => s + b.SELL_VOLUME, 0),
        },
    ];
}

// 6. Financial Ratios (PER, PBV, ROE, DER) from IDX
export async function getFinancialRatios(year?: number, month?: number): Promise<FinancialRatioItem[]> {
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    const data: any = await fetchJson(
        `${IDX_BASE}/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_FINANCIAL_DATA_RATIO&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=500&pageNumber=1`
    );
    const rows = data?.data || data?.Data || [];
    return rows.map((r: any) => ({
        KODE_EMITEN: r.KODE_EMITEN || r.kodeEmiten || '',
        NAMA_EMITEN: r.NAMA_EMITEN || r.namaEmiten || '',
        PER: r.PER || r.per || null,
        PBV: r.PBV || r.pbv || null,
        ROE: r.ROE || r.roe || null,
        DER: r.DER || r.der || null,
        EPS: r.EPS || r.eps || null,
        BV: r.BV || r.bv || null,
    }));
}
