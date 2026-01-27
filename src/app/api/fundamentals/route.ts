import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

interface FundamentalCacheItem {
    data: any;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache: Record<string, FundamentalCacheItem> = {};

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    // Check cache
    const now = Date.now();
    if (cache[ticker] && (now - cache[ticker].timestamp < CACHE_TTL)) {
        return NextResponse.json({
            ticker,
            ...cache[ticker].data,
            source: 'cache'
        });
    }

    try {
        // Fetch comprehensive fundamental data
        const result: any = await yahooFinance.quoteSummary(ticker, {
            modules: [
                'summaryDetail',
                'financialData',
                'defaultKeyStatistics',
                'assetProfile',
                'earningsHistory',
                'recommendationTrend'
            ]
        });

        const summaryDetail = result?.summaryDetail || {};
        const financialData = result?.financialData || {};
        const keyStats = result?.defaultKeyStatistics || {};
        const profile = result?.assetProfile || {};
        const recommendations = result?.recommendationTrend?.trend?.[0] || {};

        const fundamentalData = {
            // Valuation Metrics
            peRatio: summaryDetail.trailingPE || keyStats.trailingPE || null,
            forwardPE: summaryDetail.forwardPE || null,
            pbRatio: keyStats.priceToBook || null,
            psRatio: keyStats.priceToSalesTrailing12Months || null,
            pegRatio: keyStats.pegRatio || null,

            // Profitability
            profitMargin: financialData.profitMargins || null,
            operatingMargin: financialData.operatingMargins || null,
            grossMargin: financialData.grossMargins || null,
            roe: financialData.returnOnEquity || null,
            roa: financialData.returnOnAssets || null,

            // Financial Health
            currentRatio: financialData.currentRatio || null,
            quickRatio: financialData.quickRatio || null,
            debtToEquity: financialData.debtToEquity || null,
            totalCash: financialData.totalCash || null,
            totalDebt: financialData.totalDebt || null,

            // Growth
            revenueGrowth: financialData.revenueGrowth || null,
            earningsGrowth: financialData.earningsGrowth || null,

            // Dividend
            dividendYield: summaryDetail.dividendYield || null,
            dividendRate: summaryDetail.dividendRate || null,
            payoutRatio: keyStats.payoutRatio || null,

            // Per Share Data (New for Fair Value)
            trailingEps: keyStats.trailingEps || null,
            bookValue: keyStats.bookValue || null,

            // Market Data
            marketCap: summaryDetail.marketCap || null,
            beta: keyStats.beta || null,
            fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh || null,
            fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow || null,
            currentPrice: financialData.currentPrice || summaryDetail.regularMarketPreviousClose || null,
            priceChangePercent: summaryDetail.regularMarketChangePercent || null,
            volume: summaryDetail.regularMarketVolume || null,
            averageVolume: summaryDetail.averageVolume || summaryDetail.averageVolume10Days || null,

            // Company Info
            sector: profile.sector || null,
            industry: profile.industry || null,

            // Analyst Recommendations & Targets
            strongBuy: recommendations.strongBuy || 0,
            buy: recommendations.buy || 0,
            hold: recommendations.hold || 0,
            sell: recommendations.sell || 0,
            strongSell: recommendations.strongSell || 0,
            targetMeanPrice: financialData.targetMeanPrice || null,
            targetHighPrice: financialData.targetHighPrice || null,
            targetLowPrice: financialData.targetLowPrice || null,
        };

        // Update cache
        cache[ticker] = {
            data: fundamentalData,
            timestamp: now
        };

        return NextResponse.json({
            ticker,
            ...fundamentalData,
            source: 'api'
        });

    } catch (error: any) {
        console.error(`Error fetching fundamentals for ${ticker}:`, error.message);

        return NextResponse.json({
            ticker,
            error: error.message,
            source: 'error'
        }, { status: 500 });
    }
}
