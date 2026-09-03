# PORTO — Application Blueprint

> **IDX Investment Terminal** — Next.js 16.1.1 (App Router) + Custom WebSocket Server (`server.ts`) + MySQL (Sequelize) + Yahoo Finance + IDX Bridge + OpenCode AI
>
> Generated: 2026-09-03 (updated after portfolio reliability + market-data sprint) | Workspace: `D:\qna\porto` | Branch: `main`
>
> **Language:** English (primary) — each API endpoint includes **EN / ID** description.

---

## Current Update — 2026-09-03

This blueprint reflects the current implementation, not the earlier sprint assumptions.

| Area | Current state |
|------|---------------|
| Portfolio return | Total Equity remains a chart; Total Equity Return is a Daily/Monthly table with normalized P&L, percentage return, and dividends. |
| Cash accounting | `CashHolding` is the current balance; `CashLedger` persists deposits, withdrawals, buys, sells, and adjustments. External cash flows are excluded from normalized return. |
| Historical portfolio | Equity history uses Yahoo Finance prices, ledger cash reconstruction, transaction-aware lots, and dividend events. Legacy cash changes before ledger creation cannot be reconstructed. |
| Market breadth | `/api/idx/market-breadth` is independent from the full market scan, accepts partial Yahoo quotes, stores a persistent cache, and returns stale/unavailable states instead of a hard 502. |
| Market dashboard | Breadth, movers, sectors, and stocks load with `Promise.allSettled`; one provider failure no longer hides successful panels. |
| Share return | Portfolio and per-ticker cards include a real one-month sparkline, explicit momentum percentage, native share-sheet support, PNG/PDF export, and privacy mode. |
| Mobile tables | Holdings prioritise core columns on small screens; financial tables use horizontal scrolling with a sticky metric column. |
| Data freshness | Portfolio and equity surfaces show source and update time; empty states distinguish loading, provider failure, market closed, and no history. |

### Data-flow note

The market overview uses Yahoo Finance for the broad 959-stock scan. IDX/Firecrawl settings do not control breadth. The JSON ticker catalogue is statically bundled so `.next`-only deployments do not lose the ticker list.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Sidebar Menu Map](#2-sidebar-menu-map)
3. [Page Deep Dive](#3-page-deep-dive)
4. [Dead / Orphan / Unused Routes Audit](#4-dead--orphan--unused-routes-audit)
5. [API Surface — Full Detail (60+ endpoints)](#5-api-surface--full-detail)
6. [WebSocket Architecture](#6-websocket-architecture)
7. [Data Authority & External Services](#7-data-authority--external-services)
8. [Tech Debt & Recommendations](#8-tech-debt--recommendations)
9. [Appendix — File Manifest](#9-appendix--file-manifest)

---

## 1. Overview

| Dimension | Value |
|-----------|-------|
| **Framework** | Next.js 16.1.1 App Router, Turbopack, `src/app/layout.tsx` RootLayout |
| **Runtime** | Next custom server remains cPanel-ready; market prices are currently fetched through HTTP polling (`POST /api/price-batch`) every 5s. Socket.IO infrastructure remains available for legacy/live consumers but is not the primary portfolio market-data path. |
| **State** | Zustand (`usePortfolios`, `useWatchlist`), TanStack Query (`useCashAndHistory`), localStorage cache |
| **DB** | MySQL via `sequelize` + `mysql2`, auto-migrate `src/lib/migrate.ts` |
| **Charts** | `lightweight-charts` + `recharts` + `html2canvas` |
| **Page Routes** | 16 `page.tsx` (visible active routes plus compatibility redirects) + 1 dynamic `[ticker]` + route-level error/loading boundaries |
| **API Routes** | 64 active `route.ts` (61 + 3 new: `news/ihsg`, `backtest/ai-*` ) + 12 scaffold now 501 (was 16 empty) |
| **Sidebar Items** | Active navigation is sourced from `src/config/navigation.ts`; Performance is no longer a visible portfolio menu item, while the legacy `/analytics` route remains compatible. |

---

## 2. Sidebar Menu Map

Source: `src/config/navigation.ts:1` (central bilingual EN/ID, was `src/components/app-sidebar.tsx:52` hard-coded) + `src/config/locale.tsx` (`LocaleProvider`).

![Screenshot: Sidebar — Pasar / Analisis Saham / Data Referensi / Portofolio](docs/screenshots/sidebar.png)
*Placeholder — capture sidebar expanded + collapsed (mini IHSG `▲1.2%`), Watchlist/Portofolio empty CTA, EN/ID toggle.*

### 2.1 Group: Pasar (read-only snapshot)

| # | Title | URL | Icon | File | Status | EN Description | ID Deskripsi |
|---|-------|-----|------|------|--------|----------------|--------------|
| 1 | Ringkasan Pasar | `/` | `CandlestickChart` | `src/app/page.tsx` | **ACTIVE** | Market overview: hero, index strip, IHSG chart, breadth, top movers, sector heatmap, broker summary, **NewsCarousel IHSG** (Serper/Firecrawl/mimo-v2.5) | Ringkasan pasar + carousel berita IHSG |

### 2.2 Group: Analisis Saham (toolbox — input ticker → insight)

| # | Title | URL | Icon | File | Status | EN | ID |
|---|-------|-----|------|------|--------|----|----|
| 2 | Screener | `/screener` | `SlidersHorizontal` | `src/app/screener/page.tsx` | **ACTIVE** | Stock screener 959 stocks (8-strategy backtest engine, not MA-only), Fundamental official, Position calc, AI recommendation | Screener 959 saham (engine 8 strategi), fundamental resmi |
| 3 | Backtest | `/backtest` | `FlaskConical` | `src/app/backtest/page.tsx` | **ACTIVE** | 8 strategies, ranking (consensus), AI summary/entry (mimo-v2.5), position avg down/up | 8 strategi, ranking konsensus, AI entry, kalkulator |
| 4 | Bandingkan | `/compare` | `Columns2` | `src/app/compare/page.tsx` | **ACTIVE** | Compare 3 tickers, 14 metrics, best ★ | Bandingkan 3 saham |
| 5 | Fundamental | `/fundamentals` | `Building2` | `src/app/fundamentals/page.tsx` | **ACTIVE** | Terminal health score, foreign flow, smart money, Graham, with sticky mini-nav & source badges | Terminal skor kesehatan, smart money |

### 2.3 Group: Data Referensi (browse/list)

| # | Title | URL | Icon | File | Status | EN | ID |
|---|-------|-----|------|------|--------|----|----|
| 6 | Aksi Korporasi | `/corporate-actions` | `Rocket` | `src/app/corporate-actions/page.tsx` | **ACTIVE** | IPO/Split/Rights/Delisting/Suspend | IPO/Split/Rights/Delisting/Suspend |
| 7 | Dividen | `/stocks/dividends` | `Wallet` | `src/app/stocks/dividends/page.tsx` | **ACTIVE** | Dividend calendar, yield badge | Kalender dividen |
| 8 | Saham Syariah | `/stocks/sharia` | `Scale` | `src/app/stocks/sharia/page.tsx` | **ACTIVE** | SHARIA list filter | Daftar syariah |
| 9 | Prospektus | `/stocks/prospectus` | `FileText` | `src/app/stocks/prospectus/page.tsx` | **ACTIVE** | Multi-IPO PDF SSE DeepSeek | Analyzer prospektus |

### 2.4 Group: Portofolio (my data)

| # | Title | URL | Icon | File | Status | EN | ID |
|---|-------|-----|------|------|--------|----|----|
| 10 | Ringkasan Portofolio | `/portfolio-dashboard` | `LayoutDashboard` | `src/app/portfolio-dashboard/page.tsx` | **ACTIVE** | Holdings overview, P/L, allocation, equity growth, target, **StressTest, RebalancingAdvisor**, tax 0.1% | Overview holdings, stress test, rebalancing |
| 11 | Agregat | `/aggregate` | `Layers` | `src/app/aggregate/page.tsx` | **HIDDEN** `status:dead` filtered via `getActiveNav()` — redirect kept for compat | Hidden | Disembunyikan |
| 12 | Performa | `/analytics` | `TrendingUp` | `src/app/analytics/page.tsx` | **ROUTE KEPT, MENU REMOVED** | Legacy analytics route retained for compatibility; primary performance view is now inside Ringkasan Portofolio | Route lama dipertahankan, menu dihapus |
| 13 | Transaksi | `/history` | `History` | `src/app/history/page.tsx` | **ACTIVE** | Transactions + Tax 0.1% card + Journal note | Transaksi + pajak |

### 2.5 Dynamic Sections

| Section | Visibility | URL Pattern | Icon | Source |
|---------|------------|-------------|------|--------|
| Watchlist | **always** (empty CTA if 0) | `/analysis/${code}.JK` | `Star` amber | `useWatchlist()` with `tag/group` support (`WatchlistEntry`) |
| Portofolio Saya | **always** (empty CTA if 0) | `/portfolio-dashboard` | `CircleDot` | `usePortfolios()` |
| IHSG Live Chip | always — **collapsed mini** `▲▼%` | `/` | dot | `LiveIhsgChip({collapsed})` via `useSharedWs()` |
| Locale Toggle | footer | — | `ID/EN` | `useLocale()` localStorage `porto-lang` |
| Theme Toggle | footer | — | `Sun/Moon` | `useTheme()` |

---

## 3. Page Deep Dive

### 3.1 `/` — Ringkasan Pasar

![Screenshot: Ringkasan Pasar — Hero + Index Strip + Tabs](docs/screenshots/page-root-overview.png)
![Screenshot: TableCard — Top Value / Gainers](docs/screenshots/page-root-tablecard.png)
![Screenshot: Sector Heatmap](docs/screenshots/page-root-heatmap.png)

- **File:** `src/app/page.tsx` — `"use client"` 543 lines.
- **Top:** `MarketStatusBar`, `TechnicalAlertChecker`, `AlertChecker` (WS-aware toast).
- **Hero:** Gradient `from-primary/10`, 5 stat tiles: Naik/Turun/Tetap (`MarketBreadthSection`), Net Foreign priority (`officialFF.netValue` → `participationValue` → `broker-summary` proxy → "—"), Total Saham, LastUpdate + AlertBadge.
- **Tabs:** `overview | gainers | brokers | all-stocks | sectors`.
  - `overview`: `TickerTape` (portfolioTickers fallback mostActive), Index Strip 4 cards `MiniSparkline` + `LivePrice` (`useCountUp`), `IHSGChart` (dynamic ssr false), `ForeignFlowCard`, 4-col `TableCard` (byValue/byVolume/Gainers/Losers → `/analysis/${ticker}.JK`), `SectorHeatmap` Finviz + `SectorPerformanceCard`.
  - `gainers`: 2 TableCards.
  - `brokers`: `<BrokerSummaryPanel />`.
  - `all-stocks`: searchable table 100 rows (code, name, price, change, volume, value).
  - `sectors`: SectorPerformanceCard full.
- **Data:** `GET /api/idx/market-index`, independent `/api/idx/market-breadth`, `/api/idx/market-movers`, `/api/idx/market-sectors`, `/api/idx/market-stocks`, `GET /api/idx/broker-summary`, and `GET /api/idx/foreign-flow`.
- **Live prices:** `useMarketData` currently uses HTTP `POST /api/price-batch` polling every 5s. The market scan endpoints use Yahoo Finance and persistent/stale cache behavior.

### 3.2 `/screener` — Stock Screener

![Screenshot: Screener — Technical Scan Progress](docs/screenshots/screener-technical.png)
![Screenshot: Screener — Filter & Table](docs/screenshots/screener-table.png)
![Screenshot: Screener — Fundamental Tab](docs/screenshots/screener-fundamental.png)
![Screenshot: Screener — AI Recommendation + Position](docs/screenshots/screener-position.png)

- **File:** `src/app/screener/page.tsx` 900+ lines, tabs `technical | fundamental | position` via `PageTabs` (Sprint 2), mobile `hidden sm:block` table + `sm:hidden` cards.
- **Technical:** Batch scan `BATCH_SIZE=10` `BATCH_DELAY=1200ms` → `GET /api/screener?tickers=...` for 959 stocks, progress bar with ETA `342/959 (~45s)` + human error `12 dilewati karena data tidak cukup`, Top Picks 5 buys, filters `All/Buy/GC/Acc/Oversold/Surge/Sharia`, sort `score/ticker/change/rsi/signal`, table cols: Ticker/Name/Price/Signal (+score)/Best Strategy/Win%/Sharpe/Action→Position. Save `POST /api/screener/save`, History `GET /api/screener/history` & `history/[id]`.
- **Engine:** `calculateIndicators` (MA20/50, goldenCross/deathCross/nearGC <1%, RSI14, volumeSurge >1.8×, OBV trend, MFI, Chaikin A/D, netFlow, divergence) + `rankStrategiesFast` over **8 strategies** `golden_cross/sma_cross/ema_cross/macd/bollinger_breakout/reversion/donchian/rsi` (consensus 2+ BUY=BUY, 4+ = STRONG_BUY, 3+ SELL=AVOID), score 35%WR+20%PF+25%Sharpe+20%Return, `EXCLUDED_TICKERS = ['FCA']`.
- **Fundamental:** `useStockScreener()` → `GET /api/idx/stock-screener` official, sort/search.
- **Position/AI:** `PositionCalculator` + AI Recommendation (top 5, `mimo-v2.5` batch) integrated at bottom of Technical tab after 100%.

### 3.3 `/backtest` — Backtest Strategi

![Screenshot: Backtest — Form](docs/screenshots/backtest-form.png)
![Screenshot: Backtest — Statistik + Equity Curve](docs/screenshots/backtest-statistik.png)
![Screenshot: Backtest — Entry AI](docs/screenshots/backtest-entry-ai.png)
![Screenshot: Backtest — Kalkulator Posisi](docs/screenshots/backtest-kalkulator.png)
![Screenshot: Backtest — Banding (Ranking)](docs/screenshots/backtest-banding.png)

- **File:** `src/app/backtest/page.tsx` 700+ lines, `src/lib/quant.ts:500` 8 strategies, `src/lib/backtestService.ts:55` `rankStrategies`.
- **Strategies:** `golden_cross` SMA50/200, `sma_cross` 20/50, `ema_cross` 9/21, `macd_signal` 12/26/9, `bollinger_breakout`/`reversion` 20 2σ, `breakout_donchian` 20/10, `rsi_reversion` 30/70.
- **Form:** Ticker + Strategy select `STRATEGIES` + Years 1/2/3/5 → `GET /api/backtest?ticker=&strategy=&years=` → `BacktestResult` (equityCurve, trades, stats: totalReturn/buyHold/CAGR/winRate/maxDD/sharpe/profitFactor/exposure/avgDaysHeld/barsUsed) + `nextEntryLevel` magic price; `GET /api/backtest/rank?ticker=&years=` → ranked 8 (score 45%WR+25%PF+30%Sharpe). 10-min mem-cache.
- **Tabs:** **Statistik** (6 StatCards + EquityCurve vs B&H + NextEntryCard + TradesTable), **Entry AI** (`BacktestAiSummary` POST `/api/backtest/ai-summary` + `PositionCalculator` ranking-aware), **Kalkulator** (`PositionCalculator` manual/avg_down/avg_up), **Banding** (`RankTable` trophy, barsUsed warning for SMA200 <210).
- **Calculator:** `src/lib/positionCalc.ts` pure, lot = floor(shares/100)*100, riskBudget, slPrice, avgEntry.

### 3.4 `/analytics` — Performa (legacy compatibility route)

![Screenshot: Analytics — KPI Cards](docs/screenshots/analytics-kpi.png)
![Screenshot: Analytics — Cumulative Return Dark Chart](docs/screenshots/analytics-cumulative.png)
![Screenshot: Analytics — Drawdown + Allocation](docs/screenshots/analytics-drawdown-allocation.png)
![Screenshot: Analytics — Holdings Table](docs/screenshots/analytics-table.png)

- **File:** `src/app/analytics/page.tsx` ~460 lines, `history` via `useCashAndHistory` (`PortfolioSnapshot` `totalValue`), `tickers` via `usePortfolios`, `useLocale` bilingual `Performa Portofolio / Portfolio Analytics`.
- **KPI 6:** Total Value, Beta, Correlation, Volatility, Sharpe, MaxDD via `StatCard` (unified, `tone`).
- **Sources:** `GET /api/risk?ticker=&period=1y` (beta/correlation/volatility), `GET /api/idx/index-chart?period=1y&interval=1d` (`{Date,Close}` → `date/close`), `history` snapshots with forward-fill onto IHSG dates (no step artifact).
- **Charts:** Dark Cumulative Return **normalized 0%** (Line `var(--chart-1)` portfolio vs `var(--chart-2)` IHSG, `Base 100` hidden, Y `+ -%` right, X `label` `30 Dec`, reference `y=0`), period 1W/1M/3M/YTD/1Y/All re-normalized per period, empty state `≥2 snapshot`; Drawdown AreaChart; Allocation Pie/Bar (`var(--chart-*)` tokens, not hex).
- **Extras:** `StressTestCard` (beta slider -5/-10/-20% via `/api/risk`), `Bilingual`, `staleTime` tuned.

### 3.5 `/portfolio-dashboard` — Dashboard Utama

![Screenshot: Portfolio Dashboard — Overview](docs/screenshots/portfolio-overview.png)
![Screenshot: Portfolio Dashboard — Holdings](docs/screenshots/portfolio-holdings.png)

- **File:** `src/app/portfolio-dashboard/page.tsx` 600+ lines.
- **Hooks:** `usePortfolio` + `usePortfolios` + `useMarketData(tickers)` + `useCashAndHistory` (cash, transactions, history, `getHistoryForPeriod`, `recordSnapshot` throttled 5min).
- **Tabs:** `overview | holdings | target | compare`. Overview: SummaryCard 4 (Net Worth, Unreal P/L, Modal, Cash), 4 stat mini (Total Saham, Best/Worst, Cash Ratio), `EquityGrowthChart` plus Total Equity Return table, `AllocationChart` pie, `GainLossChart`, `MonthlyPerformanceHeatmap`, `StressTestCard`, Holdings Preview 5 rows → `/analysis`, `CashManager`, `ExportPDFButton`. Holdings: `PortfolioTable` + add modal + share return per ticker. Target: `TargetPortfolio`. Performa is no longer a visible tab.

### 3.6 `/fundamentals` — Fundamental Terminal

![Screenshot: Fundamentals — Health Score](docs/screenshots/fundamentals-health.png)
![Screenshot: Fundamentals — Smart Money](docs/screenshots/fundamentals-smartmoney.png)

- **File:** `src/app/fundamentals/page.tsx` 589 lines.
- **Hook:** `useFundamentals(ticker)` (Yahoo `fundamentalsTimeSeries` + `getSmartMoneyData` + `isSharia`), quick chips BBCA/TLKM/AAPL.
- **Sections:** Health score /100 + rating, Flow Analysis (Foreign/Domestic Buy/Sell + Net, Smart Money topBuy/topSell + concentrationScore/phase), Fair Value (Graham `sqrt(22.5*EPS*BV)` + intrinsic `EPS*(8.5+2*growth)`), Valuation (PE/PB/ForwardPE), Profitability (ROE/Margin/ROA), Health (CurrentRatio/DER/RevenueGrowth), Analyst Consensus BarChart, Detailed Insights Good/Warning/Bad.

### 3.7 `/compare` — Bandingkan

![Screenshot: Compare — 3 Tickers](docs/screenshots/compare.png)

- **File:** `src/app/compare/page.tsx` 252 lines.
- **Flow:** Up to 3 tickers input + chips, `Promise.all` `GET /api/fundamentals?ticker=&` + `GET /api/risk?ticker=&` per ticker. 14 rows: Harga/Perubahan/MarketCap/PER/PBV/ROE/DER/DivYield/EPS/BookValue/Beta/Volatility/MaxDD/Return1Y. Best ★ (min PER/PBV/DER/Vol, max others).

### 3.8 `/history` — Transaksi

![Screenshot: History — Transaction History](docs/screenshots/history.png)

- **File:** `src/app/history/page.tsx` 22 lines — thin wrapper `transactions` → `<TransactionHistory>` count badge. `useCashAndHistory().transactions`.

### 3.9 `/corporate-actions` — Aksi Korporasi

![Screenshot: Corporate Actions — IPO Tab](docs/screenshots/corporate-actions.png)

- **File:** `src/app/corporate-actions/page.tsx` 246 lines, 5 tabs driven by `useNewListings`/`useStockSplits`/`useRightOfferings`/`useDelistings`/`useSuspendData` → `/api/idx/new-listings` etc. Search filter, DataTable + `TickerCell` → `/analysis`.

### 3.10 `stocks/*` Family

| Route | File | Screenshot | EN / ID |
|-------|------|------------|---------|
| `/stocks/dividends` | `src/app/stocks/dividends/page.tsx` 227 lines | ![Dividends](docs/screenshots/stocks-dividends.png) | Dividend calendar via `GET /api/idx/corporate-actions` → sorted yield desc, 3 summary cards (Dividend Stocks, Avg Yield, Highest Yield), desktop table + mobile cards, YieldBadge (<2 gray, 2-5 yellow, >=5 green) / Kalender dividen urut yield |
| `/stocks/sharia` | `src/app/stocks/sharia/page.tsx` 205 lines | ![Sharia](docs/screenshots/stocks-sharia.png) | `GET /api/idx/sharia-list` → total/sharia/nonSharia, filter All/Sharia/NonSharia + search, grid cards (Check/XCircle) → `/analysis` / Daftar syariah |
| `/stocks/prospectus` | `src/app/stocks/prospectus/page.tsx` 461 lines | ![Prospectus](docs/screenshots/stocks-prospectus.png) | Multi-IPO PDF AI analyzer — upload drag&drop / URL / paste → `POST /api/analyze/prospectus` SSE streaming (step/progress/data/error), `ProspectusAnalysis` array: BUY/SELL score, IPO Price, Fair Value, Upside, ARA 5d, Financials EPS/PER/PBV/ROE/DER, ProspectusCharts, Target 1m/3m/1y, Reasoning, Strength/Risk, Comparison Table / Analyzer multi-emiten |
| `/stocks` | `src/app/stocks/page.tsx` | — | **DEAD** `redirect('/')` |
| `/stock-analysis` | `src/app/stock-analysis/page.tsx` | — | **DEAD** `redirect('/')` |

### 3.11 `/analysis/[ticker]` — Dynamic Detail (Orphan, richest)

![Screenshot: Analysis — Header + OHLC](docs/screenshots/analysis-header.png)
![Screenshot: Analysis — Chart + Drawings](docs/screenshots/analysis-chart.png)
![Screenshot: Analysis — 8 Tabs](docs/screenshots/analysis-tabs.png)

- **File:** `src/app/analysis/[ticker]/page.tsx` 705 lines, `params: Promise<{ticker}>`.
- **Hooks:** `useFundamentals(ticker)` (smartMoney), `useCompanyDetail`, `useFinancialStatement`, `GET /api/stocks/history?ticker=&period=&interval=1d` → `analyzeCandlesticks` + `detectChartDrawings/markers`.
- **Header:** price/change, Syariah badge, Share (Web Share → clipboard), Star Watchlist, AlertsPopover, OHLC bar.
- **Period pills:** 1D/1W/1M/3M/6M/1Y/5Y.
- **Chart:** `StockChart` (dynamic lightweight-charts) + drawings legend.
- **8 Tabs:** Overview (Key Metrics 8, About, RiskMetricsCard, Valuation/Profitability, SeasonalityHeatmap), Chart (RSI/MACD/Signal/Trend + TechnicalSignals + ChartPatterns), Summary (StockStatistics + FundamentalSummary + FairValueCard + Broker Summary Top Buy/Sell + Support/Resistance + Advice), Financials (FinancialReports + idxFinancial), Company (OrderBookPanel + Profile + Directors/Shareholders/Subsidiaries), News (`NewsPanel` → `/api/news`), Ownership (ShareholderChart), Technical (signals). SEO meta + `opengraph-image.tsx`.

---

## 4. Dead / Orphan / Unused Routes Audit

| URL | File | Type | Status Detail | Action |
|-----|------|------|---------------|--------|
| `/aggregate` | `src/app/aggregate/page.tsx` | redirect | `redirect('/')` — sidebar **Portofolio → Agregat** is decoy. API `GET /api/portfolios/aggregate` is mature (sequelize) but no UI. | Remove menu or build UI |
| `/dashboard` | `src/app/dashboard/page.tsx` + `layout.tsx` | redirect | `redirect('/portfolio-dashboard')`, passthrough layout `return children` | Keep alias for backward link but remove layout |
| `/portfolio` | `src/app/portfolio/page.tsx` | redirect | Legacy `redirect('/portfolio-dashboard')` | Keep 301 |
| `/stocks` | `src/app/stocks/page.tsx` | redirect | Parent index dead | No parent needed |
| `/stock-analysis` | `src/app/stock-analysis/page.tsx` | redirect | Dead, goto `/analysis/[ticker]` | Remove route |
| `/analysis/[ticker]` | `src/app/analysis/[ticker]/page.tsx` | orphan | No sidebar entry; reachable via TickerTape click, TableCard, search, Watchlist star, screener/dividends links | Add `Riset → Analisis Saham` search landing or expose `/stocks` listing |
| `/api/*` empty dirs | 16 scaffold | 404 | `api/analyze/ai-analysis`, `api/idx/announcements`, `broker-search`, `calendar`, `diagnose`, `digital-stats`, `financial-ratios`, `financial-report`, `index-list`, `ipo-list`, `stock-detail`, `api/test-db`, etc | Delete or implement |

*Screenshot placeholder for dead audit:* ![Audit — Dead Routes Highlight](docs/screenshots/audit-dead.png)

---

## 5. API Surface — Full Detail

> Each endpoint: **EN** primary + **ID** translation, plus Request/Response example. Auth: none (public), except DB routes rely on implicit `portfolioId` from client state (no JWT yet).

### 5.1 Market Data — Yahoo Finance (fallback for WS)

| # | Method & Path | File | EN Purpose | ID Tujuan | Query/Body | Response (success) | Consumer | Cache/Note |
|---|---------------|------|------------|-----------|------------|--------------------|----------|------------|
| 1 | `POST /api/price-batch` | `api/price-batch/route.ts` | Batch fetch many tickers via `yahoo-finance2` quote, TTL 3s | Batch fetch banyak ticker via Yahoo, TTL 3s | Body `{tickers: string[]}` | `{success:true, data:{AAPL:{price,change,changePercent}}}` | `useMarketData` HTTP fallback when WS down, polling 5s | In-mem 3s |
| 2 | `GET /api/price?ticker=` | `api/price/route.ts` | Single quote CacheItem | Quote tunggal | `?ticker=BBCA.JK` | `{price,change,changePercent}` | Direct price | 24h |
| 3 | `GET /api/name?symbol=` | `api/name/route.ts` | Resolve company name via Yahoo | Resolve nama perusahaan | `?symbol=BBCA.JK` | `{name:"Bank Central Asia"}` | Search | 24h |
| 4 | `GET /api/news?symbol=` | `api/news/route.ts` | `getStockNews(symbol)` via `lib/news` | Berita saham | `?symbol=BBCA` | `{success:true,data:[{title,url,date}]}` | `NewsPanel` in Analysis | — |
| 5 | `GET /api/google-finance?ticker=` | `api/google-finance/route.ts` | Wrapper `fetchGoogleFinance` | Wrapper Google Finance | `?ticker=BBCA` | `{price, change}` | Fallback | — |
| 6 | `GET /api/stocks/history?ticker=&period=&interval=` | `api/stocks/history/route.ts` | Yahoo `yahoo-finance2` → OHLCV candles | Candles OHLCV | `?ticker=BBCA.JK&period=1y&interval=1d` | `{success:true,data:[{date,open,high,low,close,volume}]}` | `analysis/[ticker]` chart | — |
| 7 | `GET /api/sector?code=` | `api/sector/route.ts` | Sector/industry lookup | Lookup sektor | `?code=BBCA.JK` | `{sector:"Financials"}` | Sector mapping | — |

### 5.2 Fundamental & Risk

| # | Method & Path | File | EN | ID | Query | Response | Consumer | Cache |
|---|---------------|------|----|----|-------|----------|----------|-------|
| 8 | `GET /api/fundamentals?ticker=` | `api/fundamentals/route.ts` | Yahoo `fundamentalsTimeSeries` + `getSmartMoneyData` + `isSharia` | Fundamental Yahoo + smart money + syariah | `?ticker=BBCA.JK` | `{success:true,data:{eps, per, roe, marketCap, smartMoney:{...}, sharia:boolean}}` | Fundamentals, Analysis, Compare | Aggressive |
| 9 | `GET /api/risk?ticker=&period=` | `api/risk/route.ts` | `dailyReturns`, `betaAndCorrelation`, `annualizedVolatility`, `maxDrawdown` vs `^JKSE` | Risiko vs IHSG | `?ticker=BBCA&period=1y` | `{success:true,data:{beta, correlation, annualVolatilityPct, maxDrawdownPct, sampleDays}}` | Analytics, Compare, Analysis | — |

### 5.3 IDX Bridge — Yahoo Hybrid (market meta)

| # | Method & Path | File | EN | ID | Query | Response | Consumer |
|---|---------------|------|----|----|-------|----------|----------|
| 10 | `GET /api/idx/market-index` | `api/idx/market-index/route.ts` | Yahoo `YAHOO_INDICES` (^JKSE, ^JKSE etc) | Indeks Yahoo | — | `{success:true,data:[{symbol,price,change}]}` | `/` Index Strip, `getMarketStatus` |
| 11 | `GET /api/idx/market-scan` | `api/idx/market-scan/route.ts` | Full Yahoo scan for movers/sectors/stocks; breadth has its own fast route | Scan penuh untuk movers/sektor/daftar saham | — | `{mostActive, gainers, losers, breadth, sectorPerformance, all}` | Legacy/full-scan consumers |
| 11a | `GET /api/idx/market-breadth` | `api/idx/market-breadth/route.ts` | Independent breadth scan with partial coverage + persistent/stale cache | Breadth independen dengan coverage parsial + cache persisten | — | `{total,breadth,coverage,timestamp,source}` | Market overview breadth |
| 11b | `GET /api/idx/market-movers` | `api/idx/market-movers/route.ts` | Most active, gainers, losers projection | Top aktif, naik, turun | — | `{mostActive,gainers,losers,timestamp}` | Market overview movers |
| 11c | `GET /api/idx/market-sectors` | `api/idx/market-sectors/route.ts` | Sector projection | Performa sektor | — | `{sectors,timestamp}` | Market overview sectors |
| 11d | `GET /api/idx/market-stocks` | `api/idx/market-stocks/route.ts` | Full stock list projection | Daftar saham penuh | — | `{total,stocks,timestamp}` | Market overview all stocks |
| 12 | `GET /api/idx/index-chart?period=&interval=` | `api/idx/index-chart/route.ts` | `PERIOD_DAYS` 1d 5m → 5y 1d, `^JKSE` chart, pivot calc, lastPrice from quote, gap separator | Chart indeks, pivot | `?period=1mo&interval=30m` | `{success:true,data:[{Date,Close,Open,High,Low,Volume}], pivot, lastPrice, quote}` | Analytics, IHSGChart |
| 13 | `GET /api/idx/all-stocks` | `api/idx/all-stocks/route.ts` | `getStockSummary` + `getLastTradingDate` + Yahoo fallback | Legacy all-stocks | — | `{data:[{code,name}]}` | — |
| 14 | `GET /api/idx/most-active` | `api/idx/most-active/route.ts` | TOP_TICKERS 30 hard-coded Yahoo most active | Most active legacy | — | `{data:[...]}` | — |
| 15 | `GET /api/idx/most-active-frequency` | `api/idx/most-active-frequency/route.ts` | `getMostActiveByFrequency` | By frequency | — | `{...}` | Corporate |
| 16 | `GET /api/idx/stock-summary` | `api/idx/stock-summary/route.ts` | MoverItem `{KODE_SAHAM,NAMA_SAHAM,HARGA_PENUTUPAN}` | Ringkasan saham | — | `{...}` | — |
| 17 | `GET /api/idx/sector-summary` | `api/idx/sector-summary/route.ts` | SECTOR_TICKERS map Perbankan/Infrastruktur → Yahoo aggregate | Agregasi sektor | — | `{...}` | — |

### 5.4 Broker & Flow

| # | Method & Path | File | EN | ID | Query | Response | Consumer | Note |
|---|---------------|------|----|----|-------|----------|----------|------|
| 18 | `GET /api/idx/broker-summary` | `api/idx/broker-summary/route.ts` | IDX broker summary via browser warmup + proxy (15-60s), foreignFlow, Cloudflare bypass | Ringkasan broker via browser, flow asing | — | `{success:true,data:{topBrokers, foreignFlow}}` | `/` brokers tab, `BrokerSummaryPanel` | Warmup session, proxy fallback |
| 19 | `GET /api/idx/broker-stock?code=&date=` | `api/idx/broker-stock/route.ts` | Per-stock Top Buy/Sell via Index Alpha, MySQL `brokerCacheDb`, quota 5/day, `lastTradingDayWIB` | Per saham Top Buy/Sell via Index Alpha | `?code=BBCA&date=2024-02-01` | `{topBuy,topSell}` | Analysis Summary | Cache MySQL, 5/day |
| 20 | `GET /api/idx/foreign-flow` | `api/idx/foreign-flow/route.ts` | Cached JSON + DB + todayUsage DAILY_QUOTA, net foreign resmi vs proxy | Flow asing resmi vs proxy | — | `{netValue, source:"official"|"proxy"}` | `/` hero tile | 30m cron |
| 21 | `GET /api/idx/smart-money` | `api/idx/smart-money/route.ts` | `getSmartMoneyData()` idx_direct | Smart money | — | `{...}` | Fundamentals | — |

### 5.5 IDX Corporate & Market Structure (Bridge via `idxApiClient` / `idxApiClientExtended` / `idxBrowserFetch`)

| # | Method & Path | File | IDX Source Function | EN/ID | Query |
|---|---------------|------|---------------------|-------|-------|
| 22 | `GET /api/idx/trading-daily?code=` | `trading-daily` | `getTradingInfoDaily` | Daily per code / Harian per kode | `?code=BBCA` |
| 23 | `GET /api/idx/company?kode=` | `company` | `getCompanyProfiles` | Company profiles | `?kode=BBCA` |
| 24 | `GET /api/idx/company-detail?code=` | `company-detail` | `getCompanyDetail` | Detail for Analysis Company tab | `?code=BBCA` |
| 25 | `GET /api/idx/corporate-actions` | `corporate-actions` | `DIVIDEND_TICKERS` Yahoo fallback | Dividend calendar | — |
| 26 | `GET /api/idx/financial-statement?code=` | `financial-statement` | `fundamentalsTimeSeries` income/balance/cashflow | Laporan keuangan | `?code=BBCA` |
| 27 | `GET /api/idx/new-listings?year=&month=` | `new-listings` | `getNewListings` IPO | Listing baru IPO | `?year=2024&month=02` |
| 28 | `GET /api/idx/delistings?year=&month=` | `delistings` | `getDelistings` | Delisting | — |
| 29 | `GET /api/idx/relisting` | `relisting` | `getRelistingData` | Relisting | — |
| 30 | `GET /api/idx/right-offerings?year=&month=` | `right-offerings` | `getRightOfferings` HMETD | HMETD | — |
| 31 | `GET /api/idx/stock-splits?year=&month=` | `stock-splits` | `getStockSplits` | Stock split | — |
| 32 | `GET /api/idx/additional-listings?year=&month=` | `additional-listings` | `getAdditionalListings` | Pencatatan tambahan | — |
| 33 | `GET /api/idx/suspend?count=` | `suspend` | `getSuspendData(count=100)` | Suspend | `?count=100` |
| 34 | `GET /api/idx/daily-indices?year=&month=` | `daily-indices` | `getDailyIndices` | Indeks harian | — |
| 35 | `GET /api/idx/index-summary?date=` | `index-summary` | `getIndexSummary(date)` | Ringkasan indeks | `?date=2024-02-01` |
| 36 | `GET /api/idx/industry-trading?year=&month=` | `industry-trading` | `getIndustryTradingSummary` | Trading industri | — |
| 37 | `GET /api/idx/issued-history?code=` | `issued-history` | `getIssuedHistory` saham beredar | Riwayat saham beredar | `?code=BBCA` |
| 38 | `GET /api/idx/sectoral-movement?year=&month=` | `sectoral-movement` | `getSectoralMovement` | Pergerakan sektoral | — |
| 39 | `GET /api/idx/trade-summary` | `trade-summary` | `getTradeSummary` | Ringkasan perdagangan | — |
| 40 | `GET /api/idx/stock-screener?sector=&subSector=` | `stock-screener` | `getStockScreener` official per/pbv/roe/der/ytd/marketCapital | Screener resmi | `?sector=Financials` | Fundamental tab |
| 41 | `GET /api/idx/sharia-list` | `sharia-list` | `getShariaStockList()` | Daftar syariah | — |
| 42 | `GET /api/idx/sector-summary` | `sector-summary` | SECTOR_TICKERS aggregate | — | — |
| 43 | `GET /api/idx/index-summary` | `index-summary` | `getIndexSummary` | — | — |
| 44 | `GET /api/idx/daily-indices` | `daily-indices` | `getDailyIndices` | — | — |

### 5.6 Screener Engine + News

| # | Method & Path | File | EN | ID | Req | Resp | Consumer |
|---|---------------|------|----|----|-----|------|----------|
| 45 | `GET /api/screener?tickers=` | `api/screener/route.ts` | Heavy: Yahoo quote+chart (5y fetch, 60 bars min, ticker `.JK` guard), `calculateIndicators` + `runBacktest` **8 strategies** (composite 35%WR+20%PF+25%Sharpe+20%Return, consensus 2+ BUY/4+ STRONG_BUY), FCA exclude | Berat: Yahoo + 8 strategi | `?tickers=BBCA.JK` (max 100, batch 5, BARS_MIN 60) | `{success:true,data:[ScreenerItem {score, consensus, buySignals/sellSignals, bestStrategy, winRate, sharpe}], errors, errorSummary, total}` | Screener Technical |
| 45b | `GET /api/news/ihsg?symbols=` | `api/news/ihsg/route.ts` | Enriched IHSG news via Serper (1-2 search) + Firecrawl (max 5 scrape, 30m cache) + AI `mimo-v2.5` batch 5 per call (impact/category/tickers/summary parafrase, not verbatim), fallback RSS | Berita IHSG ter-enrich | `?symbols=IHSG,BBCA,EMAS` (max 10, 6 cache key) | `{success:true,data:[{title,link,source,publishTime,summary,rawSnippet,impact,confidence,reason,tickers,category}], meta:{serper,firecrawl,ai}}` | `NewsCarousel` in `/` | TTL 30m, v9 cache, scrub `<a href` |
| 46 | `GET /api/screener/history` | `api/screener/history/route.ts` | List saved screens `ScreenerResult` DB | Daftar screener tersimpan | — | `{success:true,data:[SavedScreen]}` | History panel |
| 47 | `GET /api/screener/history/[id]` | `api/screener/history/[id]/route.ts` | Single saved by id | Satu tersimpan | `?id=...` | `{success:true,data:{results}}` | Load |
| 48 | `POST /api/screener/save` | `api/screener/save/route.ts` | Create saved, body `{name,label,results}` | Simpan | Body JSON | `{success:true,data:SavedScreen}` | Save dialog |
| 49 | `POST /api/screener/ai-analysis` | `api/screener/ai-analysis/route.ts` | OpenCode AI for picks (`MODEL_CHAIN mimo-v2.5→ox-alpha→deepseek`) | AI untuk picks | Body `{picks:[{ticker,score,price,rsi,signal,divergence,entry,sl,tp}], totalScanned}` | `{success:true,source:"ai",model,analysis:{ringkasan,top_pick,risiko,saran_alokasi}}` | AIPicksTab (future) | 90s timeout, json_object fallback |

### 5.7 Quant / Backtest

| # | Method & Path | File | EN | ID | Req | Resp |
|---|---------------|------|----|----|-----|------|
| 50 | `GET /api/backtest?ticker=&strategy=&years=` | `api/backtest/route.ts` | `fetchBars` (yahoo `^JKSE` chart) + `runBacktest` + `nextEntryLevel`, VALID 8 strategies, mem-cache 10m | Bar + backtest + level entry | `?ticker=BBCA&strategy=golden_cross&years=2` | `{success:true,data:{ticker,strategyLabel,trades,equityCurve,stats,nextEntry,barsUsed,assumptions}}` |
| 51 | `GET /api/backtest/rank?ticker=&years=` | `api/backtest/rank/route.ts` | `rankStrategies` 8 ranked (score 45%WR+25%PF+30%Sharpe), min 210 bars, cache 10m | Ranking 8 | `?ticker=BBCA&years=2` | `{success:true,data:{ticker,years,barsUsed,from,to,ranked:[RankedStrategy],best}}` |
| 52 | `POST /api/backtest/ai-entry` | `api/backtest/ai-entry/route.ts` | AI entry advice with ranking, `MODEL_CHAIN mimo-v2.5→ox-alpha→deepseek`, cache 10m | Saran entry AI | Body `{ticker,technicalData:{nextEntry,indicators},strategyLabel,ranking}` | `{success:true,source:"ai",model,bestStrategy,recommendation:{ringkasan,entries:[{label,price,alasan,tipe}],alokasi,skema,stop_loss_saran,catatan}}` |
| 53 | `POST /api/backtest/ai-summary` | `api/backtest/ai-summary/route.ts` | AI summary for backtest result | Ringkasan AI | Body `{backtestResult,positionCalc,ticker,strategyLabel}` | `{success:true,source:"ai",model,analysis:{ringkasan,risiko_utama,risk_reward,saran_posisi,rekomendasi,confidence,catatan}}` |
| 54 | `GET /api/risk?ticker=&period=` | `api/risk/route.ts` | `dailyReturns` + `betaAndCorrelation` vs `^JKSE` + `annualizedVolatility` + `maxDrawdown` | Risiko vs IHSG | `?ticker=BBCA&period=1y` (1y/2y/3y) | `{success:true,data:{ticker,period,sampleDays,beta,correlation,annualVolatilityPct,maxDrawdownPct,returnPct}}` |

### 5.8 AI — OpenCode Zen Go (model chain: `ox-alpha-free` → `mimo-v2.5` → `deepseek-v4-flash-free`, fallback `json_object` → raw)

| # | Method & Path | File | EN | ID |
|---|---------------|------|----|----|
| 55 | `GET /api/idx/ai-analysis?period=&interval=` | `api/idx/ai-analysis/route.ts` | IHSG projection: build tech (RSI,SMA,pivots,tail 30 candles) → prompt → `callModel` loop, cache 10m per timeframe | Proyeksi IHSG dari teknikal |
| 56 | `POST /api/analyze/prospectus` | `api/analyze/prospectus/route.ts` | `analyzeProspectus` (pdfjs + Tesseract OCR) — 3-pass DeepSeek `deepseek-chat` (info → financials → rec), SSE `event: step/progress/data/error`, 60s timeout per call | Analisis prospektus 3-pass, SSE |

### 5.9 Portfolio / Cash / Transactions / Snapshots (Sequelize, `portfolioId` implicit)

| # | Method & Path | File | EN | ID | Body/Query |
|---|---------------|------|----|----|------------|
| 57 | `GET/POST/PUT /api/portfolios` | `api/portfolios/route.ts` | CRUD portfolios, `syncDatabase` | CRUD portofolio | `GET ?id`, `POST {name,color}`, `PUT {id,name,color}`, `DELETE ?id=&portfolioId=` |
| 58 | `GET /api/portfolios/aggregate` | `api/portfolios/aggregate/route.ts` | Aggregate all portfolios items + cash | Agregat semua | — |
| 59 | `GET /api/portfolios/aggregate/history` | `api/portfolios/aggregate/history/route.ts` | `getAggregateHistory()` | Histori agregat | — |
| 60 | `GET/POST/PUT /api/portfolio?id=&portfolioId=` | `api/portfolio/route.ts` | `PortfolioItem` CRUD per portfolio | CRUD item per portofolio | `?id=&portfolioId=` |
| 61 | `GET/POST /api/cash?portfolioId=` | `api/cash/route.ts` | `CashHolding` + persistent `CashLedger`; `GET ?history=true` includes ledger | Cash + riwayat cash | `GET ?portfolioId&history=true`, `POST {portfolioId,amount,operation:set|add|subtract,kind?}` |
| 62 | `GET/POST /api/transactions?portfolioId=` | `api/transactions/route.ts` | `Transaction` + `PortfolioItem` buy/sell | Transaksi | `GET ?portfolioId`, `POST {type,amount}` |
| 63 | `GET/POST /api/snapshots?portfolioId=&period=` | `api/snapshots/route.ts` | `PortfolioSnapshot` equity growth, `portfolioId`+`period=all|today|...`, 5s refetch | Snapshot ekuitas | `GET ?portfolioId&period=all`, `POST {portfolioId,stockValue,cashValue}`, `DELETE ?portfolioId` |

### 5.10 Proxy

| # | Method & Path | File | EN | ID |
|---|---------------|------|----|----|
| 64 | `ANY /api/idxx/[...path]` | `api/idxx/[...path]/route.ts` | Generic IDX proxy, forward `User-Agent: Mozilla/5.0` to `https://www.idx.co.id/:path*` | Proxy generik IDX |
| 65 | `ANY /api/sector` (rewritten) | `next.config.ts:5` | `rewrites /api/idxx/:path*` → `https://www.idx.co.id/:path*` | Rewrite Next.js |

### 5.11 Empty Scaffold (404)

`api/analyze/ai-analysis`, `api/idx/announcements`, `broker-search`, `calendar`, `diagnose`, `digital-stats`, `financial-ratios`, `financial-report`, `index-list`, `ipo-list`, `stock-detail`, `api/test-db`, `api/idx`, `api/idxx` parent, `api/stocks` parent, `api/analyze` parent — no `route.ts`.

*Screenshot placeholders per endpoint:* ![Endpoint: /api/backtest](docs/screenshots/api-backtest.png) ![Endpoint: /api/screener](docs/screenshots/api-screener.png) ![Endpoint: /api/portfolio](docs/screenshots/api-portfolio.png)

---

## 6. Realtime Architecture (HTTP primary, Socket.IO optional)

![Diagram: WS Flow](docs/screenshots/ws-diagram.png)

| Layer | File | Detail |
|-------|------|--------|
| **Custom Server** | `server.ts` + `server.js:1` 60 lines (cPanel-ready `HOST 0.0.0.0`, `PORT||port`, `tsx/cjs` fallback, `initWebSocket` graceful) | `createServer + next({dev,hostname,port})` + `initWebSocket(server)`. Scripts `dev` & `start` = `npx tsx server.ts` (3000), `server.js` for `node server.js` on cPanel Passenger. |
| **WS Server** | `src/server/ws-server.ts:1` ~110 lines | **`Socket.IO` `new Server(server,{path:"/ws", cors:"*", transports:["websocket","polling"], pingInterval 25s})`** + `io.on("connection")` → `manager.addClient` + `welcome`, handlers `subscribe`/`unsubscribe`/`ping`/`message` → `handleMessage`, `disconnect` → `removeClient`. `publisher.start()`. |
| **Subscription Manager** | `src/server/subscription-manager.ts:1` ~140 lines | `Map clientId→{socket, tickers:Set}` + `ticker→Set<clientId>`, `socket.join(ticker)` room per ticker, `broadcast(tickers,event,data)` via `io.to(ticker).emit`, `broadcastAll` via `io.emit`, cleanup 60s. |
| **Price Publisher** | `src/server/price-publisher.ts:1` ~40 lines | Dynamic throttle: `getDesiredIntervalMs()`: `closed` → 30s else 3s, `schedule()` reset on status change; `publish()` → `fetchPrices` → `manager.broadcast(tickers,"price_update",message)`, `broadcastAll("market_status")`. |
| **WsProvider** | `src/components/WsProvider.tsx:1` 67 lines | `createContext` single `useWebSocket` at `src/app/layout.tsx:32` → `WsProvider` wraps app, `useSharedWs()` opt-in hook (fallback to own socket if no provider). Unifies dual WS (page 40 + chip `^JKSE`) into 1 socket/tab. |
| **Types** | `src/lib/ws-types.ts:1` 70 lines | Same `Subscribe/Unsubscribe/Ping` + `PriceUpdate/MarketStatus/Pong/Welcome/Error`. Socket.IO events: `subscribe`, `unsubscribe`, `price_update`, `market_status`, `pong`, `welcome`. |
| **Market Hours** | `src/lib/market-hours.ts` | `getMarketStatus()` WIB session. |
| **Hook `useWebSocket`** | `src/hooks/useWebSocket.ts:1` ~120 lines | Now `socket.io-client` `io(origin,{path:"/ws", transports:["websocket","polling"], reconnection 10×3s})`, `on("connect")` re-subscribe, `on("price_update")` → `setPrices`, `on("market_status"/"welcome"/"pong")`, `on("disconnect")`. `subscribe` → `socket.emit("subscribe",{tickers})`. |
| **Hook `useMarketData`** | `src/hooks/useMarketData.ts:1` | Primary path is HTTP `POST /api/price-batch` polling every 5s with retry, timeout, last-value retention, and explicit `loading/error/lastUpdated`. |
| **Consumers** | `/`, `LiveIhsgChip` (now `useSharedWs`), `portfolio-dashboard`, `analytics`, `analysis/[ticker]`, `TickerTape`, `LivePrice`, `AlertChecker` | Single shared socket per tab via `WsProvider` (was dual). |

**Primary flow (HTTP polling):**

```
Browser useMarketData(["BBCA.JK","^JKSE"]) → useSharedWs() → socket.emit("subscribe",{tickers})
  → ws-server io.on("subscribe") → manager.subscribe + socket.join(room)
  → PricePublisher 3s/30s → io.to(ticker).emit("price_update",{data})
  → client on("price_update") → setPrices → LivePrice
Browser `useMarketData` → `POST /api/price-batch` → Yahoo quote cache → `setPrices` → market UI. Retry and last-value retention handle transient failures. Socket.IO `/ws` remains an optional legacy path.
```

The Socket.IO sequence above documents the retained legacy infrastructure only. Portfolio and market overview values currently follow the HTTP polling flow described in the table and the current-update section.

---

## 7. Data Authority & External Services

| Source | Library | Pages | APIs | Env |
|--------|---------|-------|------|-----|
| **Yahoo Finance** | `yahoo-finance2` + `google-finance` | Price, fundamentals, history, indices, market-scan | `/api/price*`, `/api/stocks/history`, `/api/fundamentals`, `/api/idx/*` | — |
| **IDX Direct** | `src/lib/idxApiClient.ts` (3-strategy: direct→proxy→Chromium) + `idxApiClientExtended` + `idxBrowserFetch` (Playwright) | Corporate actions, company, financial statement, broker summary anti-Cloudflare | `/api/idx/*` (22 bridge) + `/api/idxx/[...path]` | `INDEXALPHA_API_KEY` |
| **Index Alpha** | REST `indexalpha.id`, quota 5/day | Broker stock top buy/sell | `/api/idx/broker-stock` (MySQL `brokerCacheDb`) | `INDEXALPHA_API_KEY` |
| **AI OpenCode Zen Go** | `opencode.ai/zen/go/v1` `MODEL_CHAIN mimo-v2.5→ox-alpha→deepseek` | IHSG ai-analysis, backtest ai-summary/ai-entry, screener ai-analysis, prospectus deepseek-chat | `/api/idx/ai-analysis`, `/api/backtest/ai-*`, `/api/screener/ai-analysis`, `/api/analyze/prospectus` | `OPENCODE_API_KEY`, `OPENCODE_MODEL`, `OPENCODE_BASE_URL`, `DEEPSEEK_API_KEY` |
| **DB** | `sequelize` + `mysql2`, auto-migrate | Portfolios, snapshots, cash ledger, persistent API cache, broker cache, screener history | `/api/portfolios*`, `/api/snapshots`, `/api/cash`, market breadth, `brokerCacheDb` | `DATABASE_URL` |

---

## 8. Tech Debt & Recommendations (updated after Sprint 1-5)

| Priority | Debt | Status | Recommendation |
|----------|------|--------|----------------|
| P0 | Dead sidebar `Agregat` | **FIXED** `agregat` hidden via `status:dead` in `navigation.ts` | Keep hidden, route stays for compat |
| P0 | Orphan `/analysis/[ticker]` | **FIXED** via `CommandPalette` global search (959 stocks) + `Breadcrumb` `Pasar › Analisis › BBCA` | — |
| P1 | 16 empty API scaffolds | **FIXED** → 12 stubs `501 Not Implemented` + 4 parents kept | — |
| P1 | Dual realtime paths | **UPDATED** portfolio market prices use HTTP polling as the primary path; Socket.IO remains optional for legacy consumers | Consolidate further when all consumers migrate |
| P1 | WS `localhost` | **FIXED** `server.js` `HOST 0.0.0.0` + `PORT||port` + `server.ts` cPanel-ready, fallback polling if WS init fails | — |
| P2 | Publisher 3s even closed | **FIXED** dynamic `3s→30s` when `session===closed` (`price-publisher.ts`) | — |
| P2 | `MENU_GROUPS` hard-coded | **FIXED** → `src/config/navigation.ts` + `src/config/locale.tsx` EN/ID | — |
| P2 | Naming mismatch `/analytics` | **FIXED** bilingual `Performa Portofolio / Portfolio Analytics` via `useLocale` | — |
| P2 | Chart hardcode `#10b981` | **FIXED** → `var(--chart-1/2)` tokens | — |
| P1 | Breadth 502 on cold start | **FIXED** independent partial scan + persistent/stale cache + HTTP 200 unavailable state | Monitor Yahoo quote coverage |
| P1 | `stocks-idx.json` missing in `.next`-only deployment | **FIXED** static JSON import in `screenerStockList.ts` | Rebuild `.next` after catalogue changes |
| P1 | Portfolio return double-counted trades | **FIXED** cash ledger + external-flow normalization | Legacy pre-ledger cash changes remain unrecoverable |
| P3 | Dashboard layout passthrough | **TODO** still `return children` | Remove |
| P3 | No WS auth | TODO | Sign clientId + allowlist |

---

## 9. Appendix — File Manifest

### 9.1 Page Manifest

```
src/app/layout.tsx                RootLayout (SidebarProvider, SiteHeader, QueryProvider, ThemeInit, LocaleProvider, WsProvider)
src/app/page.tsx                  / — Ringkasan Pasar (+ NewsCarousel)
src/app/screener/page.tsx         /screener (+ error/loading, mobile cards)
src/app/backtest/page.tsx         /backtest (+ error/loading, reordered Banding first)
src/app/compare/page.tsx          /compare
src/app/corporate-actions/page.tsx /corporate-actions (+ error/loading)
src/app/portfolio-dashboard/page.tsx /portfolio-dashboard (+ StressTestCard, RebalancingAdvisor, tax card)
src/app/analytics/page.tsx        /analytics (Performa) bilingual, var(--chart-*) (+ error/loading)
src/app/history/page.tsx          /history (+ Tax 0.1% card + Journal note)
src/app/fundamentals/page.tsx     /fundamentals (+ sticky mini-nav, source badges)
src/app/stocks/dividends/page.tsx /stocks/dividends (+ error/loading)
src/app/stocks/sharia/page.tsx    /stocks/sharia (+ error/loading)
src/app/stocks/prospectus/page.tsx /stocks/prospectus (+ error/loading)
src/app/analysis/[ticker]/page.tsx /analysis/[ticker] (+ Breadcrumb, 8-tab PageTabs, opengraph-image)
src/app/aggregate/page.tsx        /aggregate  REDIRECT (hidden)
src/app/dashboard/page.tsx        /dashboard  REDIRECT (+ layout.tsx passthrough — TODO remove)
src/app/portfolio/page.tsx        /portfolio  REDIRECT
src/app/stocks/page.tsx           /stocks     REDIRECT
src/app/stock-analysis/page.tsx   /stock-analysis REDIRECT
src/app/error.tsx                 Global error boundary
src/app/analysis/error.tsx        Analysis error boundary
src/app/portfolio-dashboard/error.tsx Dashboard error
+ 10 new error.tsx/loading.tsx (screener, backtest, compare, corporate-actions, analytics, history, fundamentals, stocks/*)
```

### 9.2 Key Components & Libs

```
src/config/navigation.ts          Central bilingual nav (active/dead, 4 groups)
src/config/locale.tsx             LocaleProvider EN/ID (localStorage porto-lang)
src/components/app-sidebar.tsx    Sidebar + IHSG mini chip + Watchlist/Portofolio empty CTA + lang toggle
src/components/PageTabs.tsx       Reusable sticky tabs (Sprint 2) — wired to 4 pages
src/components/StatCard.tsx       Unified stat tile
src/components/Breadcrumb.tsx     Breadcrumb Pasar › Analisis › BBCA
src/components/NewsCarousel.tsx   Auto carousel 4.5s, Serper+Firecrawl+mimo-v2.5, impact bullish/bearish
src/components/WsProvider.tsx     Single Socket.IO provider (unifies dual WS)
src/components/StressTestCard.tsx Beta slider -5/-10/-20% (portfolio stress)
src/components/RebalancingAdvisor.tsx Diff target vs actual → lot advice
src/components/AiLoadingState.tsx (planned) SSE step 1/3 for AI
src/lib/quant.ts                  8 strategies + indicators
src/lib/backtestService.ts        fetchBars, scoreStrategy, rankStrategies
src/lib/positionCalc.ts           Position + lot calc
src/lib/patternDetection.ts       Chart patterns
src/hooks/useMarketData.ts        Via useSharedWs + HTTP fallback
src/hooks/useWebSocket.ts         Socket.IO client (socket.io-client)
src/hooks/useWatchlist.ts         With tag/group support
src/server/ws-server.ts           Socket.IO server (path /ws, ping 25s)
src/server/price-publisher.ts     Dynamic 3s/30s throttle
src/server/subscription-manager.ts Room per ticker (Socket.IO)
src/server.js                     cPanel-ready 0.0.0.0 + PORT + WS graceful fallback
```

### 9.3 WS & API Summary Counts

- **Page routes:** 16 file-based (11 alive, 5 dead) + 1 dynamic `[ticker]` = 17 logical URLs, 13 sidebar items.
- **API active:** 61 `route.ts` + proxy rewrite 1.
- **API empty stubs:** 16 dirs without `route.ts`.

---

> **Screenshot Checklist for maintainer:** Create `docs/screenshots/` and capture each placeholder tagged above. File naming mirrors section anchors for auto-link.
