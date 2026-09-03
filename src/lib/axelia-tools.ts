// Tool Registry for Axelia — Fase 1 read-only (3.1-3.6) + Fase 2 personal (3.7) stub
// Each tool is a thin wrapper over existing API/engine, no new logic.

import YahooFinance from 'yahoo-finance2';
import { sma, rsiSeries, macdSeries, rollingStd } from '@/lib/quant';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export type ToolResult = { ok: boolean; data?: any; error?: string; tool: string };

async function fetchJSON(url: string, init?: RequestInit): Promise<any> {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) } as any);
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.success) throw new Error(j?.error || `HTTP ${r.status}`);
    return j.data ?? j;
}

// 3.1 Pasar & Harga
export async function getPriceRealtime(ticker: string): Promise<ToolResult> {
    try {
        const q: any = await yf.quote(`${ticker}.JK`);
        return { ok: true, tool: 'getPriceRealtime', data: { ticker, price: q.regularMarketPrice, changePercent: q.regularMarketChangePercent } };
    } catch (e: any) { return { ok: false, tool: 'getPriceRealtime', error: e.message }; }
}
export async function getPriceHistory(ticker: string, period = '3mo', interval = '1d'): Promise<ToolResult> {
    try {
        const url = `/api/stocks/history?ticker=${encodeURIComponent(ticker + '.JK')}&period=${period}&interval=${interval}`;
        const data = await fetchJSON(url);
        return { ok: true, tool: 'getPriceHistory', data };
    } catch (e: any) { return { ok: false, tool: 'getPriceHistory', error: e.message }; }
}
export async function getIndexOverview(): Promise<ToolResult> {
    try { const d = await fetchJSON('/api/idx/market-index'); return { ok: true, tool: 'getIndexOverview', data: d }; } catch (e: any) { return { ok: false, tool: 'getIndexOverview', error: e.message }; }
}
export async function getMarketBreadth(): Promise<ToolResult> {
    try { const d = await fetchJSON('/api/idx/market-scan'); return { ok: true, tool: 'getMarketBreadth', data: { breadth: d.breadth, gainers: d.gainers?.slice(0, 5), losers: d.losers?.slice(0, 5) } }; } catch (e: any) { return { ok: false, tool: 'getMarketBreadth', error: e.message }; }
}
export async function getSectorPerformance(): Promise<ToolResult> {
    try { const d = await fetchJSON('/api/idx/market-scan'); return { ok: true, tool: 'getSectorPerformance', data: d.sectorPerformance || d.sectors }; } catch (e: any) { return { ok: false, tool: 'getSectorPerformance', error: e.message }; }
}

// 3.2 Teknikal
export async function getTechnicalIndicators(ticker: string): Promise<ToolResult> {
    try {
        const hist: any = await fetchJSON(`/api/stocks/history?ticker=${ticker}.JK&period=3mo&interval=1d`);
        const closes: number[] = (Array.isArray(hist) ? hist : hist?.data || []).map((b: any) => b.close).filter((v: any) => Number.isFinite(v));
        if (!closes.length) throw new Error('no closes');
        const rsi = rsiSeries(closes, 14).filter(v => v != null).slice(-1)[0] as number | null;
        const ma20 = sma(closes, 20).filter(v => v != null).slice(-1)[0] as number | null;
        const ma50 = sma(closes, 50).filter(v => v != null).slice(-1)[0] as number | null;
        const { macd, signal } = macdSeries(closes);
        return { ok: true, tool: 'getTechnicalIndicators', data: { rsi, ma20, ma50, macd: macd.filter(v => v != null).slice(-1)[0], signal: signal.filter(v => v != null).slice(-1)[0], closes: closes.slice(-30) } };
    } catch (e: any) { return { ok: false, tool: 'getTechnicalIndicators', error: e.message }; }
}

// 3.3 Fundamental & Risiko
export async function getFundamentals(ticker: string): Promise<ToolResult> {
    try { const d = await fetchJSON(`/api/fundamentals?ticker=${ticker}.JK`); return { ok: true, tool: 'getFundamentals', data: d }; } catch (e: any) { return { ok: false, tool: 'getFundamentals', error: e.message }; }
}
export async function getRiskProfile(ticker: string, period = '1y'): Promise<ToolResult> {
    try { const d = await fetchJSON(`/api/risk?ticker=${ticker}&period=${period}`); return { ok: true, tool: 'getRiskProfile', data: d }; } catch (e: any) { return { ok: false, tool: 'getRiskProfile', error: e.message }; }
}

// 3.4 Strategi & Backtest
export async function rankStrategies(ticker: string, years = 2): Promise<ToolResult> {
    try { const d = await fetchJSON(`/api/backtest/rank?ticker=${ticker}&years=${years}`); return { ok: true, tool: 'rankStrategies', data: d }; } catch (e: any) { return { ok: false, tool: 'rankStrategies', error: e.message }; }
}
export async function runBacktest(ticker: string, strategy: string, years = 2): Promise<ToolResult> {
    try { const d = await fetchJSON(`/api/backtest?ticker=${ticker}&strategy=${strategy}&years=${years}`); return { ok: true, tool: 'runBacktest', data: d }; } catch (e: any) { return { ok: false, tool: 'runBacktest', error: e.message }; }
}

// 3.5 Screener
export async function runScreener(filters: any): Promise<ToolResult> {
    try {
        const qs = new URLSearchParams(filters).toString();
        const d = await fetchJSON(`/api/screener?${qs}`);
        return { ok: true, tool: 'runScreener', data: Array.isArray(d) ? d.slice(0, 10) : d };
    } catch (e: any) { return { ok: false, tool: 'runScreener', error: e.message }; }
}

// 3.6 Referensi
export async function getStockNews(ticker: string): Promise<ToolResult> {
    try { const d = await fetchJSON(`/api/news?symbol=${ticker}`); return { ok: true, tool: 'getStockNews', data: d }; } catch (e: any) { return { ok: false, tool: 'getStockNews', error: e.message }; }
}
export async function getBrokerSummary(ticker?: string): Promise<ToolResult> {
    try {
        const url = ticker ? `/api/idx/broker-stock?code=${ticker}` : '/api/idx/broker-summary';
        const d = await fetchJSON(url);
        return { ok: true, tool: 'getBrokerSummary', data: d };
    } catch (e: any) { return { ok: false, tool: 'getBrokerSummary', error: e.message }; }
}

// 3.7 Personal (read-only) — Fase 2, requires portfolioId context (passed from client)
export async function getMyPortfolio(): Promise<ToolResult> {
    try { const d = await fetchJSON('/api/portfolios/aggregate'); return { ok: true, tool: 'getMyPortfolio', data: d }; } catch (e: any) { return { ok: false, tool: 'getMyPortfolio', error: e.message }; }
}

export const TOOL_SCHEMAS = [
    { name: 'getPriceHistory', description: 'OHLCV historis', parameters: { ticker: 'string', period: 'string?' } },
    { name: 'getTechnicalIndicators', description: 'RSI/MACD/MA', parameters: { ticker: 'string' } },
    { name: 'getFundamentals', description: 'PER/PBV/ROE/EPS', parameters: { ticker: 'string' } },
    { name: 'getRiskProfile', description: 'Beta/correlation vs IHSG', parameters: { ticker: 'string' } },
    { name: 'rankStrategies', description: 'Ranking 8 strategi', parameters: { ticker: 'string' } },
    { name: 'runScreener', description: 'Scan 959 saham', parameters: { filters: 'object?' } },
    { name: 'getMyPortfolio', description: 'Holdings user', parameters: {} },
] as const;
