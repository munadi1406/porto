import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getSmartMoneyData } from '@/lib/idxApi';

interface FundamentalCacheItem {
    data: any;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache: Record<string, FundamentalCacheItem> = {};

const yahooFinance = new YahooFinance();

async function fetchSmartMoneyData(ticker?: string) {
    try {
        const smartData = await getSmartMoneyData();

        const topBuy = smartData.topBuyBrokers || [];
        const topSell = smartData.topSellBrokers || [];
        const foreignFlow = smartData.foreignFlow || [];

        const totalBuyValue = smartData.summary?.totalBuyValue || 0;
        const totalSellValue = smartData.summary?.totalSellValue || 0;
        const netValue = totalBuyValue - totalSellValue;

        const foreign = foreignFlow.find(f => f.investor === 'Foreign');
        const domestic = foreignFlow.find(f => f.investor === 'Domestic');

        let phase = 'Neutral';
        let phaseColor = 'gray';
        let description = `Market scan from ${smartData.summary?.brokerCount || 0} institutions.`;

        if (foreign && foreign.netValue > 0) {
            phase = 'Foreign Net Buy';
            phaseColor = 'green';
            description = `Institutional accumulation detected. Top holder: ${topBuy[0]?.name || 'N/A'}.`;
        } else if (foreign && foreign.netValue < 0) {
            phase = 'Foreign Net Sell';
            phaseColor = 'red';
            description = `Institutional distribution detected.`;
        } else if (netValue > 0) {
            phase = 'Institutional Accumulation';
            phaseColor = 'blue';
            description = `Positive institutional flow across ${smartData.summary?.brokerCount || 0} tracked institutions.`;
        } else if (netValue < 0) {
            phase = 'Institutional Distribution';
            phaseColor = 'red';
            description = `Negative institutional flow.`;
        }

        return {
            foreignNetBuyValue: foreign?.netValue || 0,
            foreignNetBuyVolume: foreign?.netValue || 0,
            foreignBuyValue: foreign?.buyValue || 0,
            foreignSellValue: foreign?.sellValue || 0,
            foreignAccumulationStatus: foreign && foreign.netValue > 0 ? 'Akumulasi' : foreign && foreign.netValue < 0 ? 'Distribusi' : 'Netral',
            domesticNetBuyValue: domestic?.netValue || 0,
            domesticBuyValue: domestic?.buyValue || 0,
            domesticSellValue: domestic?.sellValue || 0,
            smartMoneyPhase: phase,
            smartMoneyColor: phaseColor,
            smartMoneyDescription: description,
            topBuyBrokers: topBuy.map(b => b.name),
            topSellBrokers: topSell.map(b => b.name),
            concentrationScore: Math.min(100, Math.round((totalBuyValue / ((totalBuyValue + totalSellValue) || 1)) * 100)),
            dataSource: 'yahoo_institutions',
            hasRealOwnership: true,
            institutionalOwnershipPct: 0,
        };
    } catch (e) {
        return getFallbackSmartMoneyData(ticker);
    }
}

async function getFallbackSmartMoneyData(ticker?: string) {
    // Try Yahoo institutional ownership as fallback
    if (ticker) {
        try {
            const result = await yahooFinance.quoteSummary(ticker, {
                modules: ['institutionOwnership', 'insiderTransactions', 'fundOwnership']
            });
            const institutionOwnership = result?.institutionOwnership?.ownershipList || [];
            const fundOwnership = result?.fundOwnership?.ownershipList || [];
            const totalInstitutions = institutionOwnership.length + fundOwnership.length;
            const concentrationScore = Math.min(100, Math.round(
                institutionOwnership.reduce((sum: number, i: any) => sum + ((i.pctHeld?.raw || i.pctHeld || 0) * 100), 0)
            ));

            let phase = 'Netral', phaseColor = 'gray';
            let description = `${totalInstitutions} institusi pemegang saham. Konsentrasi ${concentrationScore}%.`;
            if (concentrationScore > 50) { phase = 'High Concentration'; phaseColor = 'green'; }
            else if (concentrationScore > 20) { phase = 'Moderate'; phaseColor = 'blue'; }

            return {
                foreignNetBuyValue: 0, foreignNetBuyVolume: 0, foreignBuyValue: 0, foreignSellValue: 0,
                foreignAccumulationStatus: 'Data IDX diperlukan',
                domesticNetBuyValue: 0, domesticBuyValue: 0, domesticSellValue: 0,
                smartMoneyPhase: phase, smartMoneyColor: phaseColor,
                smartMoneyDescription: description,
                topBuyBrokers: institutionOwnership.slice(0, 3).map((i: any) => (i.organization || '').substring(0, 6).toUpperCase()).filter(Boolean),
                topSellBrokers: [],
                concentrationScore, dataSource: 'yahoo', hasRealOwnership: totalInstitutions > 0,
                institutionalOwnershipPct: concentrationScore,
            };
        } catch { /* yahoo also failed */ }
    }

    return {
        foreignNetBuyValue: 0, foreignNetBuyVolume: 0, foreignBuyValue: 0, foreignSellValue: 0,
        foreignAccumulationStatus: 'Data Tidak Tersedia',
        domesticNetBuyValue: 0, domesticBuyValue: 0, domesticSellValue: 0,
        smartMoneyPhase: 'IDX API Tidak Terjangkau', smartMoneyColor: 'gray',
        smartMoneyDescription: 'IDX API sedang tidak dapat dijangkau. Data institutional dari Yahoo Finance juga tidak tersedia.',
        topBuyBrokers: [], topSellBrokers: [], concentrationScore: 0,
        dataSource: 'unavailable', hasRealOwnership: false, institutionalOwnershipPct: 0,
    };
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

        // 3. Fetch real IDX smart money data (broker summary + foreign flow)
        const ownershipData = await fetchSmartMoneyData(ticker);

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
