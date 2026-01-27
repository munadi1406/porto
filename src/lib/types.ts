export interface Portfolio {
    id: string;
    name: string;
    description?: string;
    color?: string;
    targetValue?: number;
    createdAt?: string;
}

export interface PortfolioItem {
    id: string;
    portfolioId: string;
    ticker: string; // e.g. "BBCA.JK"
    name: string;   // e.g. "Bank Central Asia Tbk"
    lots: number;   // 1 lot = 100 shares
    averagePrice: number; // Avg price per share
    targetPercentage?: number;
}

export interface StockPrice {
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
    high52w?: number;
    lastUpdated: number;
}

export interface PortfolioSummary {
    totalCapital: number;
    totalMarketValue: number;
    totalUnrealizedPL: number;
    totalReturnPercent: number;
}

export interface PortfolioSnapshot {
    id?: string;
    portfolioId: string;
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
    portfolioId: string;
    amount: number;
    lastUpdated: number;
}

export interface Transaction {
    id: string;
    portfolioId: string;
    type: 'buy' | 'sell';
    ticker: string;
    name: string;
    lots: number;
    pricePerShare: number;
    totalAmount: number;
    timestamp: number;
    notes?: string;
}
