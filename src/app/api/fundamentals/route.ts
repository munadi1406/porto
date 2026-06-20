import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getBrokerSummary, getForeignFlow } from '@/lib/idxApi';

interface FundamentalCacheItem {
    data: any;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache: Record<string, FundamentalCacheItem> = {};

const yahooFinance = new YahooFinance();

async function fetchSmartMoneyData() {
    try {
        const [brokers, foreignFlow] = await Promise.all([
            getBrokerSummary(),
            getForeignFlow(),
        ]);

        const topBuy = [...brokers]
            .sort((a, b) => b.NET_BUY_VALUE - a.NET_BUY_VALUE)
            .slice(0, 5);

        const topSell = [...brokers]
            .sort((a, b) => a.NET_BUY_VALUE - b.NET_BUY_VALUE)
            .slice(0, 5);

        const totalBuy = brokers.reduce((s, b) => s + b.BUY_VALUE, 0);
        const totalSell = brokers.reduce((s, b) => s + b.SELL_VALUE, 0);
        const netValue = totalBuy - totalSell;

        const foreign = foreignFlow.find(f => f.investor === 'Foreign');
        const domestic = foreignFlow.find(f => f.investor === 'Domestic');

        let phase = 'Neutral';
        let phaseColor = 'gray';
        let description = `Total transaksi: ${(totalBuy + totalSell).toLocaleString()} nilai.`;

        if (foreign && foreign.netValue > 0) {
            phase = 'Foreign Net Buy';
            phaseColor = 'green';
            description = `Asing net buy Rp${(foreign.netValue / 1e9).toFixed(1)}M. ${topBuy[0]?.BRK_NAME || ''} top buyer.`;
        } else if (foreign && foreign.netValue < 0) {
            phase = 'Foreign Net Sell';
            phaseColor = 'red';
            description = `Asing net sell Rp${(Math.abs(foreign.netValue) / 1e9).toFixed(1)}M. ${topSell[0]?.BRK_NAME || ''} top seller.`;
        } else if (netValue > 0) {
            phase = 'Market Net Buy';
            phaseColor = 'blue';
            description = `Market net buy Rp${(netValue / 1e9).toFixed(1)}M.`;
        } else if (netValue < 0) {
            phase = 'Market Net Sell';
            phaseColor = 'red';
            description = `Market net sell Rp${(Math.abs(netValue) / 1e9).toFixed(1)}M.`;
        }

        return {
            foreignNetBuyValue: foreign?.netValue || 0,
            foreignNetBuyVolume: foreign?.buyVolume || 0,
            foreignBuyValue: foreign?.buyValue || 0,
            foreignSellValue: foreign?.sellValue || 0,
            foreignAccumulationStatus: foreign && foreign.netValue > 0 ? 'Akumulasi' : foreign && foreign.netValue < 0 ? 'Distribusi' : 'Netral',
            domesticNetBuyValue: domestic?.netValue || 0,
            domesticBuyValue: domestic?.buyValue || 0,
            domesticSellValue: domestic?.sellValue || 0,
            smartMoneyPhase: phase,
            smartMoneyColor: phaseColor,
            smartMoneyDescription: description,
            topBuyBrokers: topBuy.map(b => b.BRK_NAME || b.BRK_CODE),
            topSellBrokers: topSell.map(b => b.BRK_NAME || b.BRK_CODE),
            concentrationScore: Math.min(100, Math.round((topBuy.reduce((s, b) => s + b.BUY_VALUE, 0) / (totalBuy || 1)) * 100)),
            dataSource: 'idx',
            hasRealOwnership: true,
            institutionalOwnershipPct: 0,
        };
    } catch (e) {
        return getFallbackSmartMoneyData();
    }
}

function getFallbackSmartMoneyData() {
    return {
        foreignNetBuyValue: 0,
        foreignNetBuyVolume: 0,
        foreignBuyValue: 0,
        foreignSellValue: 0,
        foreignAccumulationStatus: 'Data Tidak Tersedia',
        domesticNetBuyValue: 0,
        domesticBuyValue: 0,
        domesticSellValue: 0,
        smartMoneyPhase: 'Data Tidak Tersedia',
        smartMoneyColor: 'gray',
        smartMoneyDescription: 'Data IDX tidak dapat dijangkau. Coba lagi nanti.',
        topBuyBrokers: [],
        topSellBrokers: [],
        concentrationScore: 0,
        dataSource: 'unavailable',
        hasRealOwnership: false,
        institutionalOwnershipPct: 0,
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
        const ownershipData = await fetchSmartMoneyData();

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
