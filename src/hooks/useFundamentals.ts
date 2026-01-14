"use client";

import { useState, useEffect } from "react";

interface FundamentalData {
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
    marketCap: number | null;
    beta: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    sector: string | null;
    industry: string | null;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
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
