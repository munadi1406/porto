"use client";

import { useState, useEffect } from "react";

export interface FundamentalData {
    ticker: string;
    peRatio: number | null;
    forwardPE: number | null;
    pbRatio: number | null;
    psRatio: number | null;
    pegRatio: number | null;
    profitMargin: number | null;
    operatingMargin: number | null;
    grossMargin: number | null;
    roe: number | null;
    roa: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    debtToEquity: number | null;
    totalCash: number | null;
    totalDebt: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    dividendYield: number | null;
    dividendRate: number | null;
    payoutRatio: number | null;
    trailingEps: number | null;
    bookValue: number | null;
    marketCap: number | null;
    beta: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    currentPrice: number | null;
    priceChangePercent: number | null;
    volume: number | null;
    averageVolume: number | null;
    sector: string | null;
    industry: string | null;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    targetMeanPrice: number | null;
    targetHighPrice: number | null;
    targetLowPrice: number | null;
    foreignNetBuyValue: number;
    foreignNetBuyVolume: number;
    foreignBuyValue: number;
    foreignSellValue: number;
    foreignAccumulationStatus: string;
    domesticNetBuyValue: number;
    domesticBuyValue: number;
    domesticSellValue: number;
    smartMoneyPhase: string;
    smartMoneyColor: string;
    smartMoneyDescription: string;
    topBuyBrokers: string[];
    topSellBrokers: string[];
    concentrationScore: number;
    lastFiscalYearEnd: Date | string | null;
    mostRecentQuarter: Date | string | null;
    lastUpdated: Date | string | null;
    hasRealOwnership?: boolean;
    institutionalOwnershipPct?: number;
    dataSource?: string;
    sharia?: boolean;
    foreignOwnershipPct?: number;
    foreignOwnershipStatus?: string;
    insidersPercentHeld?: number | null;
    institutionsPercentHeld?: number | null;
    institutionsFloatPercentHeld?: number | null;
    institutionsCount?: number | null;
    sharesOutstanding?: number | null;
    floatShares?: number | null;
    incomeStatementHistory?: Array<{
        period: string;
        totalRevenue: number | null;
        costOfRevenue: number | null;
        grossProfit: number | null;
        operatingIncome: number | null;
        preTaxIncome: number | null;
        taxProvision: number | null;
        netIncome: number | null;
        netIncomeCommonStockholders: number | null;
        dilutedEPS: number | null;
        basicEPS: number | null;
        ebitda: number | null;
        interestExpense: number | null;
    }>;
    balanceSheetHistory?: Array<{
        year: string;
        totalAssets: number | null;
        totalCurrentAssets: number | null;
        totalLiab: number | null;
        totalCurrentLiabilities: number | null;
        totalStockholderEquity: number | null;
        commonStock: number | null;
        retainedEarnings: number | null;
        longTermDebt: number | null;
        shortLongTermDebt: number | null;
        cash: number | null;
        inventory: number | null;
        netReceivables: number | null;
    }>;
    cashflowStatementHistory?: Array<{
        period: string;
        operatingCashflow: number | null;
        capitalExpenditures: number | null;
        freeCashFlow: number | null;
        investingCashflow: number | null;
        financingCashflow: number | null;
        dividendsPaid: number | null;
        changeToLiabilities: number | null;
        changeToOperatingActivities: number | null;
    }>;
}

export function useFundamentals(ticker: string) {
    const [data, setData] = useState<FundamentalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ticker) return;

        const fetchFundamentals = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/fundamentals?ticker=${encodeURIComponent(ticker)}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch fundamentals');
                }

                const result = await response.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchFundamentals();
    }, [ticker]);

    return { data, loading, error };
}
