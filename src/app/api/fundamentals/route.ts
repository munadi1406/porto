import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

interface FundamentalCacheItem {
    data: any;
    timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache: Record<string, FundamentalCacheItem> = {};

const yahooFinance = new YahooFinance();

// Helper for simulated foreign flow data
function generateSimulatedForeignFlow(ticker: string, price: number | null, volume: number | null) {
    // Generate deterministic pseudo-random value based on ticker string and current date
    const dateStr = new Date().toISOString().split('T')[0];
    let hash = 0;
    const str = ticker + dateStr;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    
    // Determine sentiment (-1 to 1)
    const sentiment = (Math.abs(hash) % 200 - 100) / 100; 
    
    // If no volume data, simulate it
    const baseVolume = volume ? volume * 0.15 : 50000000; // Assume foreign makes up ~15% of volume
    const foreignVolume = Math.floor(baseVolume * Math.abs(sentiment));
    
    const isNetBuy = sentiment > 0;
    const foreignNetBuyVolume = isNetBuy ? foreignVolume : -foreignVolume;
    
    // Estimate value based on current price (or 1000 if not available)
    const p = price || 1000;
    const foreignNetBuyValue = foreignNetBuyVolume * p;
    
    let foreignAccumulationStatus = "Netral";
    // Increase sensitivity: 0.1 threshold instead of 0.3
    if (sentiment > 0.1) {
        foreignAccumulationStatus = "Akumulasi";
    } else if (sentiment < -0.1) {
        foreignAccumulationStatus = "Distribusi";
    }
    
    // Calculate buy and sell values
    const totalMarketValue = baseVolume * p;
    const foreignBuyValue = (totalMarketValue * 0.4 + foreignNetBuyValue) / 2; // Assume 40% participation
    const foreignSellValue = (totalMarketValue * 0.4 - foreignNetBuyValue) / 2;
    
    // Domestic is the remainder
    const domesticBuyValue = (totalMarketValue * 0.6) - foreignBuyValue;
    const domesticSellValue = (totalMarketValue * 0.6) - foreignSellValue;
    const domesticNetBuyValue = domesticBuyValue - domesticSellValue;
    
    return {
        foreignNetBuyValue,
        foreignNetBuyVolume,
        foreignBuyValue,
        foreignSellValue,
        foreignAccumulationStatus,
        domesticNetBuyValue,
        domesticBuyValue,
        domesticSellValue,
        sentiment // Add this to the return object
    };
}

// Helper for simulated smart money (bandarmology) data
function generateSimulatedSmartMoney(ticker: string, foreignSentiment: number = 0) {
    const dateStr = new Date().toISOString().split('T')[0];
    let hash = 0;
    const str = ticker + dateStr + "smart";
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    
    // Base intensity from hash (0-100)
    let baseIntensity = (Math.abs(hash) % 100);
    
    // Higher bias to ensure consistency with Foreign Flow
    // If foreigners are selling (sentiment < -0.1), we force the intensity down
    // If foreigners are buying (sentiment > 0.1), we force the intensity up
    let intensity = baseIntensity;
    if (foreignSentiment > 0.1) {
        intensity = Math.max(baseIntensity, 60 + (foreignSentiment * 40)); 
    } else if (foreignSentiment < -0.1) {
        intensity = Math.min(baseIntensity, 40 + (foreignSentiment * 40));
    }
    
    intensity = Math.min(Math.max(intensity, 0), 100);
    
    let phase = "Neutral";
    let phaseColor = "gray";
    let description = "";
    
    if (intensity > 75) {
        phase = "Big Accumulation";
        phaseColor = "emerald";
        description = "Big players are heavily accumulating shares. Strong potential for markup.";
    } else if (intensity > 55) {
        phase = "Accumulation";
        phaseColor = "green";
        description = "Smart money is gradually building positions.";
    } else if (intensity < 25) {
        phase = "Big Distribution";
        phaseColor = "rose";
        description = "Large players are exiting positions. High risk of price markdown.";
    } else if (intensity < 45) {
        phase = "Distribution";
        phaseColor = "red";
        description = "Signs of distribution by major holders.";
    } else {
        phase = "Neutral / Sideways";
        phaseColor = "blue";
        description = "Price is moving with balanced flow or in a markup phase.";
    }
    
    // Top brokers simulation - pick brokers based on intensity
    const buyersList = ["PD", "YP", "CC", "NI", "OD", "AZ", "BK", "RX", "KZ", "ZP"];
    const sellersList = ["BK", "RX", "KZ", "ZP", "PD", "YP", "CC", "NI", "OD", "AZ"];
    
    // Pick unique brokers
    const getBrokers = (list: string[], offset: number) => {
        const result = new Set<string>();
        let i = 0;
        while (result.size < 3 && i < 10) {
            result.add(list[(Math.abs(hash) + offset + i) % 10]);
            i++;
        }
        return Array.from(result);
    };

    const topBuyBrokers = getBrokers(buyersList, 0);
    const topSellBrokers = getBrokers(sellersList, 5);
    
    return {
        smartMoneyPhase: phase,
        smartMoneyColor: phaseColor,
        smartMoneyDescription: description,
        topBuyBrokers,
        topSellBrokers,
        concentrationScore: Math.floor(intensity)
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
        // 1. Fetch Basic Quote Data (more reliable)
        const quoteResult = await yahooFinance.quote(ticker).catch(() => null);

        // 2. Fetch Comprehensive Fundamental Data (more likely to fail for small stocks)
        // We try with a reduced set of modules first if it's likely a small stock or if the first attempt fails
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

        const foreignFlow = generateSimulatedForeignFlow(ticker, financialData.currentPrice, summaryDetail.regularMarketVolume);

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

            // Analyst Recommendations & Targets
            strongBuy: recommendations.strongBuy || 0,
            buy: recommendations.buy || 0,
            hold: recommendations.hold || 0,
            sell: recommendations.sell || 0,
            strongSell: recommendations.strongSell || 0,
            targetLowPrice: financialData.targetLowPrice || null,

            // Data Period / Timestamp Info
            lastFiscalYearEnd: keyStats.lastFiscalYearEnd || null,
            mostRecentQuarter: keyStats.mostRecentQuarter || null,
            lastUpdated: quoteResult?.regularMarketTime || summaryDetail.regularMarketTime || new Date(),

            // Simulated Foreign Flow (Net Foreign Buy/Sell)
            ...foreignFlow,

            // Simulated Smart Money (Bandarmology)
            ...generateSimulatedSmartMoney(ticker, foreignFlow.sentiment),
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
