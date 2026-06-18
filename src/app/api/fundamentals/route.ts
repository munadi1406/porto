import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

interface FundamentalCacheItem {
    data: any;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache: Record<string, FundamentalCacheItem> = {};

const yahooFinance = new YahooFinance();

// NOTE: Yahoo Finance does NOT provide real-time foreign flow data for IDX stocks.
// The institutionOwnership module provides institution ownership percentages,
// but foreign buy/sell flow data requires IDX-specific APIs.
// We provide what Yahoo Finance CAN give, and clearly mark missing data.
async function fetchRealOwnershipData(ticker: string) {
    try {
        const result = await yahooFinance.quoteSummary(ticker, {
            modules: ['institutionOwnership', 'insiderTransactions', 'fundOwnership']
        });

        const institutionOwnership = result?.institutionOwnership?.ownershipList || [];
        const fundOwnership = result?.fundOwnership?.ownershipList || [];
        const insiderTransactions = result?.insiderTransactions?.transactions || [];

        // Build top holders list from real institution names
        const topBuyBrokers = institutionOwnership
            .slice(0, 3)
            .map((i: any) => {
                const name = i.organization || '';
                return name.length > 3 ? name.substring(0, 3).toUpperCase() : name.toUpperCase();
            })
            .filter(Boolean);

        // Recent insider sellers as "top sellers"
        const topSellBrokers = insiderTransactions
            .filter((t: any) => t.transactionType === 'Sale' || t.shares < 0)
            .slice(0, 3)
            .map((t: any) => {
                const name = t.filerName || '';
                return name.length > 3 ? name.substring(0, 3).toUpperCase() : name.toUpperCase();
            })
            .filter(Boolean);

        // Institution concentration indicates smart money interest
        const totalOwnership = institutionOwnership.reduce((sum: number, i: any) => {
            return sum + ((i.pctHeld?.raw || i.pctHeld || 0) * 100);
        }, 0);

        const concentrationScore = Math.min(Math.round(totalOwnership), 100);
        const totalInstitutions = institutionOwnership.length + fundOwnership.length;

        let phase = "Netral";
        let phaseColor = "gray";
        let description = `Terdeteksi ${totalInstitutions} institusi pemegang saham.`;

        if (concentrationScore > 50) {
            phase = "High Concentration";
            phaseColor = "emerald";
            description = `${totalInstitutions} institusi memegang ~${concentrationScore}% saham. Konsentrasi kepemilikan tinggi.`;
        } else if (concentrationScore > 20) {
            phase = "Moderate";
            phaseColor = "blue";
            description = `${totalInstitutions} institusi memegang ~${concentrationScore}% saham. Kepemilikan tersebar moderat.`;
        } else if (totalInstitutions > 0) {
            description = `${totalInstitutions} institusi memegang ~${concentrationScore}% saham. Kepemilikan institusi rendah.`;
        }

        // Insider selling activity
        const insiderSellers = insiderTransactions.filter((t: any) => t.transactionType === 'Sale' || t.shares < 0).length;
        if (insiderSellers > 0) {
            phase = "Insider Selling";
            phaseColor = "rose";
            description += ` Terdeteksi ${insiderSellers} transaksi jual insider.`;
        }

        return {
            foreignNetBuyValue: 0,
            foreignNetBuyVolume: 0,
            foreignBuyValue: 0,
            foreignSellValue: 0,
            foreignAccumulationStatus: "Data IDX Diperlukan",
            domesticNetBuyValue: 0,
            domesticBuyValue: 0,
            domesticSellValue: 0,
            smartMoneyPhase: phase,
            smartMoneyColor: phaseColor,
            smartMoneyDescription: description,
            topBuyBrokers: topBuyBrokers.length > 0 ? topBuyBrokers : [],
            topSellBrokers: topSellBrokers.length > 0 ? topSellBrokers : [],
            concentrationScore,
            dataSource: 'yahoo_institutions',
            hasRealOwnership: totalInstitutions > 0,
            institutionalOwnershipPct: concentrationScore
        };
    } catch (e) {
        return {
            foreignNetBuyValue: 0,
            foreignNetBuyVolume: 0,
            foreignBuyValue: 0,
            foreignSellValue: 0,
            foreignAccumulationStatus: "Data Tidak Tersedia",
            domesticNetBuyValue: 0,
            domesticBuyValue: 0,
            domesticSellValue: 0,
            smartMoneyPhase: "Data Tidak Tersedia",
            smartMoneyColor: "gray",
            smartMoneyDescription: "Data foreign flow IDX tidak tersedia melalui Yahoo Finance. Diperlukan integrasi API khusus bursa efek Indonesia.",
            topBuyBrokers: [],
            topSellBrokers: [],
            concentrationScore: 0,
            dataSource: 'unavailable',
            hasRealOwnership: false,
            institutionalOwnershipPct: 0
        };
    }
}

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
        // 1. Fetch Basic Quote Data
        const quoteResult = await yahooFinance.quote(ticker).catch(() => null);

        // 2. Fetch Comprehensive Fundamental Data
        let result: any = null;
        try {
            result = await yahooFinance.quoteSummary(ticker, {
                modules: [
                    'summaryDetail',
                    'financialData',
                    'defaultKeyStatistics',
                    'assetProfile',
                    'recommendationTrend'
                ]
            });
        } catch (e) {
            console.warn(`Full quoteSummary failed for ${ticker}, trying minimal modules...`);
            try {
                result = await yahooFinance.quoteSummary(ticker, {
                    modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics']
                });
            } catch (e2) {
                console.error(`Minimal quoteSummary also failed for ${ticker}`);
            }
        }

        const summaryDetail = result?.summaryDetail || {};
        const financialData = result?.financialData || {};
        const keyStats = result?.defaultKeyStatistics || {};
        const profile = result?.assetProfile || {};
        const recommendations = result?.recommendationTrend?.trend?.[0] || {};

        // 3. Fetch real ownership/flow data
        const ownershipData = await fetchRealOwnershipData(ticker);

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

            // Per Share Data
            trailingEps: keyStats.trailingEps || null,
            bookValue: keyStats.bookValue || null,

            // Market Data
            marketCap: summaryDetail.marketCap || quoteResult?.marketCap || null,
            beta: keyStats.beta || null,
            fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh || quoteResult?.fiftyTwoWeekHigh || null,
            fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow || quoteResult?.fiftyTwoWeekLow || null,
            currentPrice: financialData.currentPrice || summaryDetail.regularMarketPreviousClose || quoteResult?.regularMarketPrice || null,
            priceChangePercent: summaryDetail.regularMarketChangePercent || quoteResult?.regularMarketChangePercent || null,
            volume: summaryDetail.regularMarketVolume || quoteResult?.regularMarketVolume || null,
            averageVolume: summaryDetail.averageVolume || summaryDetail.averageVolume10Days || quoteResult?.averageDailyVolume3Month || null,

            // Company Info
            sector: profile.sector || null,
            industry: profile.industry || null,

            // Analyst Recommendations
            strongBuy: recommendations.strongBuy || 0,
            buy: recommendations.buy || 0,
            hold: recommendations.hold || 0,
            sell: recommendations.sell || 0,
            strongSell: recommendations.strongSell || 0,
            targetMeanPrice: financialData.targetMeanPrice || null,
            targetHighPrice: financialData.targetHighPrice || null,
            targetLowPrice: financialData.targetLowPrice || null,

            // Timestamps
            lastFiscalYearEnd: keyStats.lastFiscalYearEnd || null,
            mostRecentQuarter: keyStats.mostRecentQuarter || null,
            lastUpdated: quoteResult?.regularMarketTime || summaryDetail.regularMarketTime || new Date(),

            // REAL ownership & flow data (not simulated!)
            foreignNetBuyValue: ownershipData.foreignNetBuyValue,
            foreignNetBuyVolume: ownershipData.foreignNetBuyVolume,
            foreignBuyValue: ownershipData.foreignBuyValue,
            foreignSellValue: ownershipData.foreignSellValue,
            foreignAccumulationStatus: ownershipData.foreignAccumulationStatus,
            domesticNetBuyValue: ownershipData.domesticNetBuyValue,
            domesticBuyValue: ownershipData.domesticBuyValue,
            domesticSellValue: ownershipData.domesticSellValue,
            smartMoneyPhase: ownershipData.smartMoneyPhase,
            smartMoneyColor: ownershipData.smartMoneyColor,
            smartMoneyDescription: ownershipData.smartMoneyDescription,
            topBuyBrokers: ownershipData.topBuyBrokers,
            topSellBrokers: ownershipData.topSellBrokers,
            concentrationScore: ownershipData.concentrationScore,
        };

        // Update cache
        cache[ticker] = {
            data: fundamentalData,
            timestamp: now
        };

        return NextResponse.json({
            ticker,
            ...fundamentalData,
            source: 'api',
            flowDataSource: ownershipData.dataSource
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
