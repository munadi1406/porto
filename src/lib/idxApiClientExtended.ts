// Extended IDX API Client - New endpoints from IDX-API
import { idxFetch, getCached, setCache, todayStr, dateStr, CACHE_TTL } from './idxApiClient';

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL RATIO / STATEMENT (assets, liabilities, equity, sales, profit)
// ═══════════════════════════════════════════════════════════════════
export async function getFinancialRatioFull(year?: number, month?: number, pageSize = 10, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const safePageSize = Math.min(Math.max(pageSize, 10), 10);
    const params = new URLSearchParams({
        urlName: 'LINK_FINANCIAL_DATA_RATIO',
        periodYear: String(y),
        periodMonth: String(m),
        periodType: 'monthly',
        isPrint: 'False',
        cumulative: 'false',
        pageSize: String(safePageSize),
        pageNumber: String(pageNumber),
    });
    const key = `financial-ratio:${y}:${m}:${safePageSize}:${pageNumber}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(`/primary/DigitalStatistic/GetApiDataPaginated?${params}`);
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// STOCK SCREENER (Official/Fundamental)
// ═══════════════════════════════════════════════════════════════════
export async function getStockScreener(sector = '', subSector = '') {
    const key = `stock-screener:${sector}:${subSector}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/support/stock-screener/api/v1/stock-screener/get?Sector=${sector}&SubSector=${subSector}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// TRADING INFO DAILY (with orderbook)
// ═══════════════════════════════════════════════════════════════════
export async function getTradingInfoDaily(code: string) {
    const key = `trading-daily:${code}`;
    if (getCached(key, 60 * 1000)) return getCached(key, 60 * 1000);
    try {
        const data = await idxFetch<any>(
            `/primary/ListedCompany/GetTradingInfoDaily?code=${code}`
        );
        setCache(key, data);
        return data;
    } catch {
        // Fallback: try with full URL
        try {
            const data = await idxFetch<any>(
                `https://www.idx.co.id/primary/ListedCompany/GetTradingInfoDaily?code=${code}`
            );
            setCache(key, data);
            return data;
        } catch {
            return null;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// TRADING INFO SS (Historical with orderbook)
// ═══════════════════════════════════════════════════════════════════
export async function getTradingInfoSS(code: string, start = 0, length = 1000) {
    const key = `trading-ss:${code}:${start}:${length}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(
        `/primary/ListedCompany/GetTradingInfoSS?code=${code}&start=${start}&length=${length}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// COMPANY DETAIL (Full profile)
// ═══════════════════════════════════════════════════════════════════
export async function getCompanyDetail(code: string, language = 'id-id') {
    const key = `company-detail:${code}:${language}`;
    if (getCached(key, 60 * 60 * 1000)) return getCached(key, 60 * 60 * 1000);
    const data = await idxFetch<any>(
        `/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=${language}`
    );
    setCache(key, data);
    return data;
}

// ══════════════════════════════════════════════════════════════════
// INDEX SUMMARY
// ═══════════════════════════════════════════════════════════════════
export async function getIndexSummary(date?: string) {
    const d = date || todayStr();
    const key = `index-summary:${d}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(
        `/primary/TradingSummary/GetIndexSummary?lang=id&date=${d}`
    );
    setCache(key, data);

    // Fallback ke tanggal bursa buka terakhir jika data kosong
    if ((!data?.data || data.data.length === 0) && !date) {
        const { getLastTradingDate } = await import('./idxApiClient');
        const lastDate = await getLastTradingDate();
        if (lastDate !== d) {
            const lastKey = `index-summary:${lastDate}`;
            const cached = getCached(lastKey);
            if (cached) return cached;
            const lastData = await idxFetch<any>(
                `/primary/TradingSummary/GetIndexSummary?lang=id&date=${lastDate}`
            );
            setCache(lastKey, lastData);
            return lastData;
        }
    }
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// INDUSTRY TRADING SUMMARY
// ═══════════════════════════════════════════════════════════════════
export async function getIndustryTradingSummary(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const queryObj = { year: y.toString(), month: m.toString(), quarter: 0, type: 'monthly' };
    const queryBase64 = Buffer.from(JSON.stringify(queryObj)).toString('base64');
    const key = `industry-trading:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiData?urlName=LINK_LIST_TRADING_SUMMARY_INDUSTRY_CLASSIFICATION&query=${queryBase64}&isPrint=False&cumulative=false`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// MOST ACTIVE BY FREQUENCY
// ═══════════════════════════════════════════════════════════════════
export async function getMostActiveByFrequency(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `most-active-freq:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_MOST_ACTIVE_STOCK_FREQ&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false`
    );
    setCache(key, data);
    return data;
}

// ══════════════════════════════════════════════════════════════════
// SECTORAL MOVEMENT
// ═══════════════════════════════════════════════════════════════════
export async function getSectoralMovement(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const queryObj = { year: y.toString(), month: m.toString(), quarter: 0, type: 'monthly' };
    const queryBase64 = Buffer.from(JSON.stringify(queryObj)).toString('base64');
    const key = `sectoral-movement:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiData?urlName=LINK_DPS_JCI_SECTORAL_MOVEMENT&query=${queryBase64}&isPrint=False&cumulative=false`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// DAILY INDEX HISTORICAL
// ═══════════════════════════════════════════════════════════════════
export async function getDailyIndices(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const queryObj = { year: y.toString(), month: m.toString(), quarter: 0, type: 'monthly' };
    const queryBase64 = Buffer.from(JSON.stringify(queryObj)).toString('base64');
    const key = `daily-indices:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiData?urlName=LINK_DAILY_IDX_INDICES&query=${queryBase64}&isPrint=False&cumulative=false`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// SUSPEND DATA
// ═══════════════════════════════════════════════════════════════════
export async function getSuspendData(resultCount = 100) {
    const key = `suspend-data:${resultCount}`;
    if (getCached(key, 5 * 60 * 1000)) return getCached(key, 5 * 60 * 1000);
    const data = await idxFetch<any>(
        `/primary/Home/GetSuspendData?resultCount=${resultCount}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// ISSUED HISTORY
// ═══════════════════════════════════════════════════════════════════
export async function getIssuedHistory(code: string, start = 0, length = 100) {
    const key = `issued-history:${code}:${start}:${length}`;
    if (getCached(key)) return getCached(key);
    const data = await idxFetch<any>(
        `/primary/ListingActivity/GetIssuedHistory?kodeEmiten=${code}&start=${start}&length=${length}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// NEW LISTINGS (IPO)
// ═══════════════════════════════════════════════════════════════════
export async function getNewListings(year?: number, month?: number, pageSize = 50, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `new-listings:${y}:${m}:${pageSize}:${pageNumber}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_STOCK_NEW_LISTING&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// STOCK SPLITS
// ═══════════════════════════════════════════════════════════════════
export async function getStockSplits(year?: number, month?: number, pageSize = 50, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `stock-splits:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_STOCK_SPLIT&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// RIGHT OFFERINGS
// ═══════════════════════════════════════════════════════════════════
export async function getRightOfferings(year?: number, month?: number, pageSize = 50, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `right-offerings:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_RIGHT_OFFERING&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// DELISTINGS
// ═══════════════════════════════════════════════════════════════════
export async function getDelistings(year?: number, month?: number, pageSize = 50, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `delistings:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_DELISTING&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// ADDITIONAL LISTINGS
// ═══════════════════════════════════════════════════════════════════
export async function getAdditionalListings(year?: number, month?: number, pageSize = 50, pageNumber = 1) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = `additional-listings:${y}:${m}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_LISTING&periodYear=${y}&periodMonth=${m}&periodType=monthly&isPrint=False&cumulative=false&pageSize=${pageSize}&pageNumber=${pageNumber}`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// TRADE SUMMARY
// ═══════════════════════════════════════════════════════════════════
export async function getTradeSummary() {
    const key = 'trade-summary';
    if (getCached(key, 5 * 60 * 1000)) return getCached(key, 5 * 60 * 1000);
    const data = await idxFetch<any>(
        `/primary/Home/GetTradeSummary?lang=id`
    );
    setCache(key, data);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// RELISTING DATA
// ═══════════════════════════════════════════════════════════════════
export async function getRelistingData(pageSize = 100, indexFrom = 0) {
    const key = `relisting:${pageSize}:${indexFrom}`;
    if (getCached(key, 30 * 60 * 1000)) return getCached(key, 30 * 60 * 1000);
    const data = await idxFetch<any>(
        `/primary/Home/GetRelistingData?pageSize=${pageSize}&indexFrom=${indexFrom}`
    );
    setCache(key, data);
    return data;
}
