"use client";

import { useState, useEffect } from "react";

interface SectorData {
    ticker: string;
    sector: string;
    industry: string;
}

export function useSectorData(tickers: string[]) {
    const [sectors, setSectors] = useState<Record<string, SectorData>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tickers.length === 0) return;

        const fetchSectors = async () => {
            setLoading(true);
            const newSectors: Record<string, SectorData> = {};

            // Fetch sectors in parallel
            await Promise.all(
                tickers.map(async (ticker) => {
                    try {
                        const response = await fetch(`/api/sector?ticker=${encodeURIComponent(ticker)}`);
                        if (response.ok) {
                            const data = await response.json();
                            newSectors[ticker] = {
                                ticker: data.ticker,
                                sector: data.sector,
                                industry: data.industry,
                            };
                        }
                    } catch (error) {
                        console.error(`Error fetching sector for ${ticker}:`, error);
                        newSectors[ticker] = {
                            ticker,
                            sector: 'Others',
                            industry: 'Unknown',
                        };
                    }
                })
            );

            setSectors(newSectors);
            setLoading(false);
        };

        fetchSectors();
    }, [tickers.join(',')]); // Re-fetch when tickers change

    return { sectors, loading };
}
