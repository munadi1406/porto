// Central navigation config — single source for sidebar, breadcrumb, command palette.
// Language: bilingual EN/ID per item. Status controls visibility.
// Rule: technical terms Screen/Backtest keep English, rest localized per user request.

import {
    CandlestickChart, SlidersHorizontal, FlaskConical, Columns2, Rocket,
    LayoutDashboard, Layers, TrendingUp, History,
    Building2, Wallet, Scale, FileText,
} from "lucide-react";

export type Lang = "en" | "id";
export type NavStatus = "active" | "dead" | "wip";

export interface NavItem {
    id: string;
    url: string;
    icon: any;
    group: "market" | "portfolio" | "research";
    status: NavStatus;
    title: Record<Lang, string>;
    description: Record<Lang, string>;
}

export const NAV_ITEMS: NavItem[] = [
    // Pasar / Market
    { id: "market", url: "/", icon: CandlestickChart, group: "market", status: "active", title: { en: "Market Overview", id: "Ringkasan Pasar" }, description: { en: "IHSG, movers, sectors, broker summary", id: "IHSG, movers, sektor, ringkasan broker" } },
    { id: "screener", url: "/screener", icon: SlidersHorizontal, group: "market", status: "active", title: { en: "Screener", id: "Screener" }, description: { en: "Technical & fundamental scan", id: "Scan teknikal & fundamental" } },
    { id: "backtest", url: "/backtest", icon: FlaskConical, group: "market", status: "active", title: { en: "Backtest", id: "Backtest" }, description: { en: "8 strategies, AI entry, position calculator", id: "8 strategi, AI entry, kalkulator posisi" } },
    { id: "compare", url: "/compare", icon: Columns2, group: "market", status: "active", title: { en: "Compare", id: "Bandingkan" }, description: { en: "Compare up to 3 stocks", id: "Bandingkan hingga 3 saham" } },
    { id: "corporate-actions", url: "/corporate-actions", icon: Rocket, group: "market", status: "active", title: { en: "Corporate Actions", id: "Aksi Korporasi" }, description: { en: "IPO, Split, Rights, Delisting, Suspend", id: "IPO, Split, Rights, Delisting, Suspend" } },
    // Portfolio — Agregat hidden per user request
    { id: "portfolio-dashboard", url: "/portfolio-dashboard", icon: LayoutDashboard, group: "portfolio", status: "active", title: { en: "Dashboard", id: "Dashboard" }, description: { en: "Holdings, P/L, allocation", id: "Holdings, P/L, alokasi" } },
    { id: "aggregate", url: "/aggregate", icon: Layers, group: "portfolio", status: "dead", title: { en: "Aggregate", id: "Agregat" }, description: { en: "Hidden — redirect to /", id: "Disembunyikan — redirect ke /" } },
    { id: "analytics", url: "/analytics", icon: TrendingUp, group: "portfolio", status: "active", title: { en: "Performance", id: "Performa" }, description: { en: "Cumulative return vs IHSG", id: "Return kumulatif vs IHSG" } },
    { id: "history", url: "/history", icon: History, group: "portfolio", status: "active", title: { en: "Transactions", id: "Transaksi" }, description: { en: "Buy/sell history", id: "Riwayat transaksi" } },
    // Riset & Data
    { id: "fundamentals", url: "/fundamentals", icon: Building2, group: "research", status: "active", title: { en: "Fundamentals", id: "Fundamental" }, description: { en: "Health score, fair value", id: "Skor kesehatan, fair value" } },
    { id: "dividends", url: "/stocks/dividends", icon: Wallet, group: "research", status: "active", title: { en: "Dividends", id: "Dividen" }, description: { en: "Yield calendar", id: "Kalender yield" } },
    { id: "sharia", url: "/stocks/sharia", icon: Scale, group: "research", status: "active", title: { en: "Sharia Stocks", id: "Saham Syariah" }, description: { en: "DES OJK list", id: "Daftar DES OJK" } },
    { id: "prospectus", url: "/stocks/prospectus", icon: FileText, group: "research", status: "active", title: { en: "Prospectus", id: "Prospektus" }, description: { en: "AI IPO analyzer (SSE)", id: "Analyzer IPO AI (SSE)" } },
];

export const GROUP_LABEL: Record<string, Record<Lang, string>> = {
    market: { en: "Market", id: "Pasar" },
    portfolio: { en: "Portfolio", id: "Portofolio" },
    research: { en: "Research & Data", id: "Riset & Data" },
};

export function getNavByUrl(url: string): NavItem | undefined {
    return NAV_ITEMS.find(n => n.url === url);
}
export function getActiveNav() { return NAV_ITEMS.filter(n => n.status === "active"); }
