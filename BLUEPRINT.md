# PORTO — Application Blueprint

> **IDX Investment Terminal** — Next.js 16.1.1 (App Router) + Custom WebSocket Server (`server.ts`) + MySQL (Sequelize) + Yahoo Finance + IDX Bridge + OpenCode AI
>
> Generated: 2026-08-28 | Workspace: `D:\qna\porto` | Branch: `main`
>
> **Language:** English (primary) — each API endpoint includes **EN / ID** description.

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
| **Runtime WS** | Custom `server.ts` → `npx tsx server.ts` (`dev`/`start`), `next dev` fallback `dev:next` |
| **State** | Zustand (`usePortfolios`, `useWatchlist`), TanStack Query (`useCashAndHistory`), localStorage cache |
| **DB** | MySQL via `sequelize` + `mysql2`, auto-migrate `src/lib/migrate.ts` |
| **Charts** | `lightweight-charts` + `recharts` + `html2canvas` |
| **Page Routes** | 16 `page.tsx` (11 active + 5 redirect dead) + 1 dynamic `[ticker]` |
| **API Routes** | 61 active `route.ts` + 16 empty scaffold dirs (404) |
| **Sidebar Items** | 13 active (3 groups) + 1 dead (`Agregat`) + 2 dynamic sections (Watchlist, Portofolio Saya) |

---

## 2. Sidebar Menu Map

Source: `src/components/app-sidebar.tsx:52` — `MENU_GROUPS` hard-coded.

![Screenshot: Sidebar — Pasar / Portofolio / Riset & Data](docs/screenshots/sidebar.png)
*Placeholder — capture sidebar collapsed + expanded, IHSG LiveIhsgChip.*

### 2.1 Group: Pasar

| # | Title | URL | Icon | File | Status | EN Description | ID Deskripsi |
|---|-------|-----|------|------|--------|----------------|--------------|
| 1 | Ringkasan Pasar | `/` | `CandlestickChart` | `src/app/page.tsx` | **ACTIVE** | Market overview: hero, index strip, IHSG chart, breadth, top movers, sector heatmap, broker summary proxy | Ringkasan pasar, hero, strip indeks, chart IHSG, breadth, movers, heatmap sektor, ringkasan broker |
| 2 | Screener | `/screener` | `SlidersHorizontal` | `src/app/screener/page.tsx` | **ACTIVE** | Stock screener (Technical scan 959 stocks + Fundamental official + Position calculator + AI picks) | Screener saham (scan teknikal 959 saham + fundamental resmi + kalkulator posisi + AI picks) |
| 3 | Backtest | `/backtest` | `FlaskConical` | `src/app/backtest/page.tsx` | **ACTIVE** | 8 strategies backtest, equity curve vs B&H, next-entry level, ranking, AI summary & AI entry, position calculator (avg down/up) | Backtest 8 strategi, kurva ekuitas vs B&H, level entry berikutnya, ranking, ringkasan AI & entry AI, kalkulator posisi |
| 4 | Bandingkan | `/compare` | `Columns2` | `src/app/compare/page.tsx` | **ACTIVE** | Compare up to 3 tickers: 14 fundamental + risk metrics, best highlight ★ | Bandingkan hingga 3 saham: 14 metrik fundamental + risiko |
| 5 | Aksi Korporasi | `/corporate-actions` | `Rocket` | `src/app/corporate-actions/page.tsx` | **ACTIVE** | IPO/Split/HMETD/Delisting/Suspend tabs via IDX | Tab IPO/Split/HMETD/Delisting/Suspend via IDX |

### 2.2 Group: Portofolio

| # | Title | URL | Icon | File | Status | EN | ID |
|---|-------|-----|------|------|--------|----|----|
| 6 | Dashboard | `/portfolio-dashboard` | `LayoutDashboard` | `src/app/portfolio-dashboard/page.tsx` | **ACTIVE** (primary) | Holdings overview, P/L, allocation, equity growth, target | Overview holdings, P/L, alokasi, pertumbuhan ekuitas, target |
| 7 | Agregat | `/aggregate` | `Layers` | `src/app/aggregate/page.tsx` | **DEAD** — `redirect('/')` | Should aggregate all portfolios via `/api/portfolios/aggregate` but no UI | Seharusnya agregasi semua portofolio via API tapi tidak ada UI |
| 8 | Performa | `/analytics` | `TrendingUp` | `src/app/analytics/page.tsx` | **ACTIVE** (mislabeled) | Label “Performa” but URL `/analytics` → header “Portfolio Analytics”, dark cumulative return vs IHSG | Label “Performa” tapi URL `/analytics` → header “Portfolio Analytics”, chart gelap kumulatif vs IHSG |
| 9 | Transaksi | `/history` | `History` | `src/app/history/page.tsx` | **ACTIVE** | Thin wrapper → `<TransactionHistory>` with count badge | Wrapper tipis → TransactionHistory |

### 2.3 Group: Riset & Data

| # | Title | URL | Icon | File | Status | EN | ID |
|---|-------|-----|------|------|--------|----|----|
| 10 | Fundamental | `/fundamentals` | `Building2` | `src/app/fundamentals/page.tsx` | **ACTIVE** | Terminal: health score, foreign flow, smart money, Graham fair value, roe/margin, analyst consensus | Terminal: skor kesehatan, flow asing, smart money, fair value Graham |
| 11 | Dividen | `/stocks/dividends` | `Wallet` | `src/app/stocks/dividends/page.tsx` | **ACTIVE** | Dividend calendar sorted by yield, yield badge, mobile cards | Kalender dividen urut yield |
| 12 | Saham Syariah | `/stocks/sharia` | `Scale` | `src/app/stocks/sharia/page.tsx` | **ACTIVE** | SHARIA list total/sharia/nonSharia filter + grid | Daftar syariah filter + grid |
| 13 | Prospektus | `/stocks/prospectus` | `FileText` | `src/app/stocks/prospectus/page.tsx` | **ACTIVE** | Multi-IPO PDF AI analyzer (drag&drop / URL / paste → SSE, DeepSeek) | Analyzer prospektus IPO multi-emiten (SSE, DeepSeek) |

### 2.4 Dynamic Sections (not in MENU_GROUPS)

| Section | Visibility | URL Pattern | Icon | Source |
|---------|------------|-------------|------|--------|
| Watchlist | if `watchlist.items.length > 0` | `/analysis/${code}.JK` | `Star` amber fill | `useWatchlist()` localStorage |
| Portofolio Saya | if `portfolios.length > 0` | `/portfolio-dashboard` (with `selectedPortfolioId`) | `CircleDot` per-color | `usePortfolios()` |
| IHSG Live Chip | always (hidden when collapsed) | `/` | dot `bg-success` pulse | `LiveIhsgChip()` WS `^JKSE` |
| Market Status | header | — | `Command` logo + `SESSION_LABEL` | `getMarketStatus()` WIB poll 30s |
| Theme Toggle | footer | — | `Sun`/`Moon` | `useTheme()` |

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
- **Data:** `GET /api/idx/market-index`, `GET /api/idx/market-scan` (959 stocks → mostActive/gainers/losers/breadth/sectors), `GET /api/idx/broker-summary` (warmup session+proxy 15-60s), `GET /api/idx/foreign-flow` (official).
- **WS:** Build `liveTickers` ~40 (tape + indices + mostActive + gainers/losers) single WS via `useMarketData`.

### 3.2 `/screener` — Stock Screener

![Screenshot: Screener — Technical Scan Progress](docs/screenshots/screener-technical.png)
![Screenshot: Screener — Filter & Table](docs/screenshots/screener-table.png)
![Screenshot: Screener — Fundamental Tab](docs/screenshots/screener-fundamental.png)
![Screenshot: Screener — AI Recommendation + Position](docs/screenshots/screener-position.png)

- **File:** `src/app/screener/page.tsx` 900+ lines, tabs `technical | fundamental | position`.
- **Technical:** Batch scan `BATCH_SIZE=10` `BATCH_DELAY=1200ms` → `GET /api/screener?tickers=...` for 959 stocks, progress bar, `errorSummary` (`only X bars: N, no quote: M`), Top Picks 5 buys, filters `All/Buy/GC/Acc/Oversold/Surge/Sharia`, sort `score/ticker/change/rsi/signal`, table cols: Ticker/Name/Price/Signal (+score)/Best Strategy/Win%/Sharpe/Action→Position. Save `POST /api/screener/save`, History `GET /api/screener/history` & `history/[id]`.
- **Engine:** `calculateIndicators` (MA20/50, goldenCross/deathCross/nearGC <1%, RSI14, volumeSurge >1.8×, OBV trend, MFI, Chaikin A/D, netFlow, divergence) + `rankStrategiesFast` over 3 strategies `sma_cross/ema_cross/rsi_reversion` (consensus 2+ BUY = BUY, 4+ = STRONG_BUY). Score composite from backtest engine. `EXCLUDED_TICKERS = ['FCA']`.
- **Fundamental:** `useStockScreener()` → `GET /api/idx/stock-screener` official (per/pbv/roe/der/ytd/marketCapital), sort/search.
- **Position/AI:** `PositionCalculator` (entry/nextEntry, support/resistance, avg down/up, lot calc) + AI Recommendation cards (backtest-based `WR/Sharpe/Return`).

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

### 3.4 `/analytics` — Performa (Portfolio Analytics)

![Screenshot: Analytics — KPI Cards](docs/screenshots/analytics-kpi.png)
![Screenshot: Analytics — Cumulative Return Dark Chart](docs/screenshots/analytics-cumulative.png)
![Screenshot: Analytics — Drawdown + Allocation](docs/screenshots/analytics-drawdown-allocation.png)
![Screenshot: Analytics — Holdings Table](docs/screenshots/analytics-table.png)

- **File:** `src/app/analytics/page.tsx` ~450 lines, `history` via `useCashAndHistory` (`PortfolioSnapshot` `totalValue` not `equity`), `tickers` via `usePortfolios`.
- **KPI 6:** Total Value, Beta, Correlation, Volatility (annualVolatility), Sharpe (252√), MaxDD.
- **Sources:** `GET /api/risk?ticker=&period=1y` (beta/correlation/volatility vs IHSG via `dailyReturns`/`betaAndCorrelation`), `GET /api/idx/index-chart?period=1y&interval=1d` (API returns `{Date,Close}` capitalized → mapped to `date/close`), `history` snapshots.
- **Charts:** Dark Cumulative Return (LineChart portfolio #10b981 vs IHSG #a855f7, base 100, Y `+ -%`, X `label` MM/DD, period filter 1W/1M/3M/YTD/1Y/All with re-normalize), Drawdown AreaChart (destructive gradient), Allocation Pie/Bar, AI Recommendations grid, Holdings Detail table (weight color).
- **Gotchas fixed:** duplicate `.JK` guard, `j.data` shape, `history.length<2` fallback to flat 100, null `i.date`.

### 3.5 `/portfolio-dashboard` — Dashboard Utama

![Screenshot: Portfolio Dashboard — Overview](docs/screenshots/portfolio-overview.png)
![Screenshot: Portfolio Dashboard — Holdings](docs/screenshots/portfolio-holdings.png)

- **File:** `src/app/portfolio-dashboard/page.tsx` 600+ lines.
- **Hooks:** `usePortfolio` + `usePortfolios` + `useMarketData(tickers)` + `useCashAndHistory` (cash, transactions, history, `getHistoryForPeriod`, `recordSnapshot` throttled 5min).
- **Tabs:** `overview | holdings | analytics | target`. Overview: SummaryCard 4 (Net Worth, Unreal P/L, Modal, Cash), 4 stat mini (Total Saham, Best/Worst, Cash Ratio), `EquityGrowthChart`, `AllocationChart` pie, `GainLossChart`, `MonthlyPerformanceHeatmap`, Holdings Preview 5 rows → `/analysis`, `CashManager`, `ExportPDFButton`. Holdings: `PortfolioTable` + add modal. Target: `TargetPortfolio`.

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
| 11 | `GET /api/idx/market-scan` | `api/idx/market-scan/route.ts` | **Core** — fetch ALL 959 Yahoo, derive mostActive byVolume/byValue, gainers/losers, breadth (advance/decline), sector performance, allStocks | Inti — fetch SEMUA 959 saham | — | `{mostActive, gainers, losers, breadth, sectorPerformance, all}` | `/` 4-card + all-stocks, breadth |
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

### 5.6 Screener Engine

| # | Method & Path | File | EN | ID | Req | Resp | Consumer |
|---|---------------|------|----|----|-----|------|----------|
| 45 | `GET /api/screener?tickers=` | `api/screener/route.ts` | Heavy: Yahoo quote+chart, `calculateIndicators` (MA20/50, RSI, MFI, OBV, A/D, divergence) + `runBacktest` 3 strategies fast, score, entry/SL/TP, bestStrategy, FCA exclude | Berat: Yahoo + indikator + backtest 3 strategi | `?tickers=BBCA.JK,BBRI.JK` (max 100, batch 5×3 tickers, 210 bars min) | `{success:true,data:[ScreenerItem],errors,errorSummary,total}` | Screener Technical |
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
| 61 | `GET/POST /api/cash?portfolioId=` | `api/cash/route.ts` | `CashHolding`, userId aware, validate portfolio exists | Cash | `GET ?portfolioId`, `POST {portfolioId,amount,operation:set|add|subtract}` |
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

## 6. WebSocket Architecture

![Diagram: WS Flow](docs/screenshots/ws-diagram.png)

| Layer | File | Detail |
|-------|------|--------|
| **Custom Server** | `server.ts:1` 27 lines | `createServer + next({dev,hostname,port})` + `initWebSocket(server)`. Scripts `dev` & `start` = `npx tsx server.ts` (3000, localhost). Not `next dev`. |
| **WS Server** | `src/server/ws-server.ts:14` 110 lines | `WebSocketServer({noServer:true})` + manual `server.on("upgrade")` filter `pathname==="/ws"` so `/_next/webpack-hmr` not hijacked. `connection` → `manager.addClient(client_${counter})` + welcome `marketOpen:false`. Handlers `message→handleMessage`, `close→removeClient`, `error`, `pong→updateHeartbeat`. Ping 30s. `publisher.start()`. |
| **Subscription Manager** | `src/server/subscription-manager.ts:1` 145 lines | `Map clientId→{ws,tickers:Set,lastHeartbeat}` + `Map ticker→Set<clientId>`. `subscribe/unsubscribe`, `getAllSubscribedTickers()`, `broadcast(tickers,msg)` per-ticker, `broadcastAll`, `cleanup()` stale >60s every 30s. |
| **Price Publisher** | `src/server/price-publisher.ts` ~80 lines | `setInterval 3000ms` check `getMarketStatus().session` + `market_status` if changed, `getAllSubscribedTickers()` → `fetchPrices(tickers)` (`src/lib/price-fetcher.ts` yahoo quote, TTL 3s) → `broadcast` `PriceUpdateMessage {type:"price_update",data:Record<string,PriceData>}`. |
| **Types** | `src/lib/ws-types.ts:1` 70 lines | `ClientMessage`: `Subscribe{"type":"subscribe",tickers[]}`, `Unsubscribe`, `Ping`; `ServerMessage`: `PriceUpdateMessage`, `MarketStatusMessage{isOpen,session}`, `Pong`, `Welcome{sessionId,marketOpen}`, `Error` |
| **Market Hours** | `src/lib/market-hours.ts` | `getMarketStatus() → {isOpen, session: pre_open|trading|post_close|closed}` WIB, used server & `SESSION_LABEL` in sidebar. |
| **Hook `useWebSocket`** | `src/hooks/useWebSocket.ts:21` 147 lines | Build `ws://host/ws` or `wss://` via `getWsUrl()`, `onopen` re-subscribe Set, `onmessage` switch `price_update→setPrices`, `market_status`, `welcome/pong`, `onclose` auto-reconnect `reconnectCount<10` + `setTimeout(3000)`, `subscribe(tickers)` add Set + `ws.send` if OPEN. |
| **Hook `useMarketData`** | `src/hooks/useMarketData.ts:1` 130 lines | Wrapper over `useWebSocket`. Two effects: `connected&&wsPrices→setPrices` + `subscribe(tickers)` on change. Fallback HTTP: if WS not connected in 2s → `setUseWs(false)` + `fetchPricesHttp()` → `POST /api/price-batch` polling `5000ms`. Return `{prices,loading,lastUpdated,refresh,connected,useWs}` |
| **Consumers** | `/` (40 tickers), `LiveIhsgChip` (`^JKSE` own WS), `portfolio-dashboard`, `analytics`, `analysis/[ticker]`, `TickerTape`, `LivePrice`, `AlertChecker` | `/` builds ~40 liveTickers single WS; sidebar chip owns separate WS (`autoConnect:true`). Dual socket per tab (isolated, wasteful). |

**Flow:**

```
Browser useMarketData(["BBCA.JK","^JKSE"])
  → useWebSocket subscribe → ws.send {"type":"subscribe","tickers":[...]}
  → ws-server handleMessage → SubscriptionManager.subscribe(clientId, tickers)
  → PricePublisher 3s → getAllSubscribedTickers() → price-fetcher yahoo quote → broadcast()
  → client onmessage price_update → setPrices → LivePrice re-render (useCountUp)
Fallback: ws not connected 2s → POST /api/price-batch polling 5s
Heartbeat: server ping 30s → pong → updateHeartbeat; cleanup stale 60s
```

---

## 7. Data Authority & External Services

| Source | Library | Pages | APIs | Env |
|--------|---------|-------|------|-----|
| **Yahoo Finance** | `yahoo-finance2` + `google-finance` | Price, fundamentals, history, indices, market-scan | `/api/price*`, `/api/stocks/history`, `/api/fundamentals`, `/api/idx/*` | — |
| **IDX Direct** | `src/lib/idxApiClient.ts` (3-strategy: direct→proxy→Chromium) + `idxApiClientExtended` + `idxBrowserFetch` (Playwright) | Corporate actions, company, financial statement, broker summary anti-Cloudflare | `/api/idx/*` (22 bridge) + `/api/idxx/[...path]` | `INDEXALPHA_API_KEY` |
| **Index Alpha** | REST `indexalpha.id`, quota 5/day | Broker stock top buy/sell | `/api/idx/broker-stock` (MySQL `brokerCacheDb`) | `INDEXALPHA_API_KEY` |
| **AI OpenCode Zen Go** | `opencode.ai/zen/go/v1` `MODEL_CHAIN mimo-v2.5→ox-alpha→deepseek` | IHSG ai-analysis, backtest ai-summary/ai-entry, screener ai-analysis, prospectus deepseek-chat | `/api/idx/ai-analysis`, `/api/backtest/ai-*`, `/api/screener/ai-analysis`, `/api/analyze/prospectus` | `OPENCODE_API_KEY`, `OPENCODE_MODEL`, `OPENCODE_BASE_URL`, `DEEPSEEK_API_KEY` |
| **DB** | `sequelize` + `mysql2`, auto-migrate | Portfolios, snapshots, broker cache, screener history | `/api/portfolios*`, `/api/snapshots`, `/api/cash`, `brokerCacheDb` | `DATABASE_URL` |

---

## 8. Tech Debt & Recommendations

| Priority | Debt | Impact | Recommendation |
|----------|------|--------|----------------|
| P0 | Dead sidebar `Agregat` → `redirect('/')` | User deception | Remove menu or build UI using existing `GET /api/portfolios/aggregate` |
| P0 | Orphan `/analysis/[ticker]` no direct menu, discoverability low | New user lost | Add `Riset → Analisis Saham` search landing at `/stocks` listing |
| P1 | 16 empty API scaffolds (404) | Blueprint confusion | Delete dirs or implement stubs with 501 |
| P1 | Dual WS per tab (page + sidebar chip) | 2× connections waste | Unify to single `WsProvider` context |
| P1 | WS server `hostname="localhost"` + no `0.0.0.0` | Deploy fails on Vercel serverless (needs long-running Node) | Use VPS/Fly/Railway with `HOST=0.0.0.0`, `npm start` (`tsx server.ts`), Nginx Upgrade headers; or fallback fully to polling |
| P2 | Publisher 3s even market closed (should 10s) | Yahoo quota waste | Pause/throttle when `session===closed` |
| P2 | `MENU_GROUPS` hard-coded | New route requires edit `app-sidebar.tsx` + `page.tsx` | Auto-discover via `src/app` filesystem or CMS |
| P2 | Naming mismatch `/analytics` vs sidebar `Performa` → header `Portfolio Analytics` | Confusing | Rename route to `/performa` or sidebar to `Analytics` |
| P3 | Dashboard layout passthrough `return children` | Useless file | Remove `src/app/dashboard/layout.tsx` |
| P3 | No WS auth, no rate-limit per client | Abuse | Add `clientId` signed + ticker allowlist, heartbeat cleanup already 60s |

---

## 9. Appendix — File Manifest

### 9.1 Page Manifest

```
src/app/layout.tsx                RootLayout (SidebarProvider, SiteHeader, QueryProvider, ThemeInit)
src/app/page.tsx                  / — Ringkasan Pasar
src/app/screener/page.tsx         /screener
src/app/backtest/page.tsx         /backtest
src/app/compare/page.tsx          /compare
src/app/corporate-actions/page.tsx /corporate-actions
src/app/portfolio-dashboard/page.tsx /portfolio-dashboard
src/app/analytics/page.tsx        /analytics (Performa)
src/app/history/page.tsx          /history (Transaksi)
src/app/fundamentals/page.tsx     /fundamentals
src/app/stocks/dividends/page.tsx /stocks/dividends
src/app/stocks/sharia/page.tsx    /stocks/sharia
src/app/stocks/prospectus/page.tsx /stocks/prospectus
src/app/analysis/[ticker]/page.tsx /analysis/[ticker] (+ opengraph-image.tsx)
src/app/aggregate/page.tsx        /aggregate  REDIRECT
src/app/dashboard/page.tsx        /dashboard  REDIRECT (+ layout.tsx passthrough)
src/app/portfolio/page.tsx        /portfolio  REDIRECT
src/app/stocks/page.tsx           /stocks     REDIRECT
src/app/stock-analysis/page.tsx   /stock-analysis REDIRECT
src/app/error.tsx                 Global error boundary
src/app/analysis/error.tsx        Analysis error boundary
src/app/portfolio-dashboard/error.tsx Dashboard error
```

### 9.2 Key Components & Libs

```
src/components/app-sidebar.tsx    Sidebar + IHSG live chip + Watchlist + Portofolio Saya
src/lib/quant.ts                  EMA/SMA/RSI/rollingStd/macd/dailyReturns/beta/maxDrawdown/monthlyMatrix/nextEntryLevel/grahamNumber/runBacktest (8 strategies)
src/lib/backtestService.ts        fetchBars (yahoo chart .JK), scoreStrategy, rankStrategies
src/lib/positionCalc.ts           Position + lot calc, avg down/up
src/lib/patternDetection.ts       Double Top/Head&Shoulders/Triple/drawings
src/lib/analysis-utils.ts         analyzeCandlesticks
src/hooks/useMarketData.ts        WS wrapper + HTTP fallback
src/hooks/useWebSocket.ts         WS client
src/server/ws-server.ts           WS server + heartbeat 30s
src/server/price-publisher.ts     3s publisher
src/server/subscription-manager.ts Sub man
```

### 9.3 WS & API Summary Counts

- **Page routes:** 16 file-based (11 alive, 5 dead) + 1 dynamic `[ticker]` = 17 logical URLs, 13 sidebar items.
- **API active:** 61 `route.ts` + proxy rewrite 1.
- **API empty stubs:** 16 dirs without `route.ts`.

---

> **Screenshot Checklist for maintainer:** Create `docs/screenshots/` and capture each placeholder tagged above. File naming mirrors section anchors for auto-link.

