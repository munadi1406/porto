export interface PortfolioItem {
    id: string;
    ticker: string; // e.g. "BBCA.JK"
    name: string;   // e.g. "Bank Central Asia Tbk"
    lots: number;   // 1 lot = 100 shares
    averagePrice: number; // Avg price per share
}

export interface StockPrice {
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    lastUpdated: number;
}

export interface PortfolioSummary {
    totalCapital: number;
    totalMarketValue: number;
    totalUnrealizedPL: number;
    totalReturnPercent: number;
}

export interface PortfolioSnapshot {
    timestamp: number;
    totalValue: number; // stocks + cash
    stockValue: number;
    cashValue: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
}

export interface CashHolding {
    amount: number;
    lastUpdated: number;
}

export interface Transaction {
    id: string;
    type: 'buy' | 'sell';
    ticker: string;
    name: string;
    lots: number;
    pricePerShare: number;
    totalAmount: number;
    timestamp: number;
    notes?: string;
}
