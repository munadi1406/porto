# Peta Lengkap: Sidebar, Routes & Isi Page

> Dokumentasi ini dibuat otomatis. Terakhir diperbarui: Agustus 2026

---

## Sidebar Structure (Desktop)

```
┌─────────────────────────────────────┐
│  Porto                              │
│  Portfolio & Market IDX             │
├─────────────────────────────────────┤
│  PORTOFOLIO                         │
│    Dashboard        /portfolio-dashboard
│    Analytics        /analytics      │
│    History          /history        │
├─────────────────────────────────────┤
│  PASAR                              │
│    Market           /               │
│    Screener         /screener       │
│    Corporate Actions /corporate-actions
├─────────────────────────────────────┤
│  RISET                              │
│    Fundamental      /fundamentals   │
│    Dividends        /stocks/dividends
│    Sharia           /stocks/sharia  │
│    Prospectus       /stocks/prospectus
├─────────────────────────────────────┤
│  Portofolio Saya                    │
│    Portfolio 1       (dynamic)      │
│    Portfolio 2       (dynamic)      │
│    + Buat Baru                      │
├─────────────────────────────────────┤
│  [Dark/Light Mode Toggle]           │
└─────────────────────────────────────┘
```

## Mobile Navigation (Bottom Tabs)

### Portfolio Mode
```
┌──────────┬──────────┬──────────┐
│Dashboard │ History  │ Analytics│
└──────────┴──────────┴──────────┘
```

### Stocks Mode
```
┌──────────┬──────────┬──────────┬──────────┐
│ Market   │ Screener │ Teknikal │Fundamentl│
└──────────┴──────────┴──────────┴──────────┘
```

### Bottom Tab Bar (Always Visible)
```
┌──────────┬──────────┬──────────┬──────────┐
│ Portfolio│  Stocks  │ Portofolio│  Menu   │
│    /     │    /     │ /portfolio│  Sheet  │
│ dashboard│          │ dashboard│ drawer  │
└──────────┴──────────┴──────────┴──────────┘
```

---

## Route Map

### Content Pages (11 routes)

| # | Route | File | Deskripsi | Sidebar |
|---|-------|------|-----------|---------|
| 1 | `/` | `src/app/page.tsx` | Market Overview | Pasar > Market |
| 2 | `/portfolio-dashboard` | `src/app/portfolio-dashboard/page.tsx` | Portfolio Dashboard | Portofolio > Dashboard |
| 3 | `/analytics` | `src/app/analytics/page.tsx` | Portfolio Analytics | Portofolio > Analytics |
| 4 | `/history` | `src/app/history/page.tsx` | Transaction History | Portofolio > History |
| 5 | `/screener` | `src/app/screener/page.tsx` | Stock Screener | Pasar > Screener |
| 6 | `/fundamentals` | `src/app/fundamentals/page.tsx` | Fundamental Analysis | Riset > Fundamental |
| 7 | `/corporate-actions` | `src/app/corporate-actions/page.tsx` | Corporate Actions | Pasar > Corporate Actions |
| 8 | `/stocks/dividends` | `src/app/stocks/dividends/page.tsx` | Dividend Calendar | Riset > Dividends |
| 9 | `/stocks/sharia` | `src/app/stocks/sharia/page.tsx` | Sharia Stock List | Riset > Sharia |
| 10 | `/stocks/prospectus` | `src/app/stocks/prospectus/page.tsx` | IPO Prospectus Analyzer | Riset > Prospectus |
| 11 | `/analysis/[ticker]` | `src/app/analysis/[ticker]/page.tsx` | Individual Stock Analysis | Mobile > Teknikal |

### Redirect Pages (5 routes)

| # | Route | Redirect Ke | Alasan |
|---|-------|-------------|--------|
| 12 | `/dashboard` | `/portfolio-dashboard` | Duplikat |
| 13 | `/portfolio` | `/portfolio-dashboard` | Sudah ada di tab Holdings |
| 14 | `/stocks` | `/` | Duplikat |
| 15 | `/aggregate` | `/` | Orphan page |
| 16 | `/stock-analysis` | `/` | Duplikat |

### Error Boundaries (3 routes)

| # | File | Scope |
|---|------|-------|
| 17 | `src/app/error.tsx` | Global (semua route) |
| 18 | `src/app/portfolio-dashboard/error.tsx` | `/portfolio-dashboard` |
| 19 | `src/app/analysis/error.tsx` | `/analysis/*` |

---

## Detail Isi Setiap Page

### 1. `/` — Market Overview

**File:** `src/app/page.tsx` (997 baris)

**Tabs:**
- **Overview** — IHSG hero, market indices cards, most active stocks (volume/value), investor flow (foreign vs domestic), top gainers/losers
- **Gainers/Losers** — Table detail top 20 gainers dan losers, klik untuk ke analisis
- **Broker Summary** — Trading summary stats, foreign/detailed investor flow, top broker lists
- **Semua Saham** — Full table 959 saham, search, sort (code/change/volume/value), filter (all/gainer/loser/flat)
- **Sektor** — Tabel performa per sektor (volume, value, avg change%, gainers, losers)

**API yang dipanggil:**
- `GET /api/idx/market-index` — data indeks pasar
- `GET /api/idx/stock-summary` — gainers & losers
- `GET /api/idx/most-active` — saham paling aktif
- `GET /api/idx/sector-summary` — performa sektor
- `GET /api/idx/broker-summary` — ringkasan broker
- `GET /api/idx/all-stocks?limit=959` — semua saham (lazy load)

---

### 2. `/portfolio-dashboard` — Portfolio Dashboard

**File:** `src/app/portfolio-dashboard/page.tsx` (609 baris)

**Tabs:**
- **Overview** — Summary cards (Net Worth, Unrealized P/L, Total Modal, Cash), stats (jumlah saham, best/worst performer, cash ratio), equity growth chart, allocation pie chart, gain/loss chart, monthly heatmap, holdings preview, cash manager
- **Holdings** — Full portfolio table dengan live prices, add/edit/remove stocks, execute buy/sell transactions
- **Analytics** — Total return, day change, gain/loss metrics; equity growth, allocation, gain/loss per saham, monthly heatmap
- **Target** — Target portfolio allocation manager

**Komponen:**
- `SummaryCard` — Card ringkasan
- `CashManager` — Kelola cash (add/reduce)
- `MonthlyPerformanceHeatmap` — Heatmap performa bulanan
- `PortfolioTable` — Tabel holdings
- `StockForm` — Modal tambah/edit saham
- `TargetPortfolio` — Target alokasi
- `ExportPDFButton` — Export ke PDF
- `AllocationChart` (dynamic) — Pie chart alokasi
- `GainLossChart` (dynamic) — Pie chart gain/loss
- `EquityGrowthChart` (dynamic) — Area chart pertumbuhan ekuitas

**Hooks:**
- `usePortfolio()` — CRUD portfolio
- `usePortfolios()` — Pilihan portfolio (multi-portfolio)
- `useMarketData(tickers)` — Harga live
- `useCashAndHistory()` — Cash, snapshot, transaksi

---

### 3. `/analytics` — Portfolio Analytics

**File:** `src/app/analytics/page.tsx` (148 baris)

**Fitur:**
- Equity growth chart
- Return table
- Daily performance calendar
- Monthly performance heatmap
- Allocation breakdown (pie/donut tabs)
- Gain/loss chart
- Diversification score
- Cost basis analysis
- Holding period analysis
- Decision advisor (AI-driven recommendation)

**Komponen:**
- `PerformanceMetrics` — Metrik performa
- `DiversificationScore` — Skor diversifikasi
- `HoldingPeriodAnalysis` — Analisis periode holding
- `EquityReturnTable` — Tabel return ekuitas
- `MonthlyPerformanceHeatmap` — Heatmap bulanan
- `DailyPerformanceCalendar` — Kalender harian
- `DecisionAdvisor` — Rekomendasi AI
- `EquityGrowthChart` (dynamic)
- `AllocationTabs` (dynamic)
- `GainLossChart` (dynamic)
- `CostBasisAnalysis` (dynamic)

---

### 4. `/history` — Transaction History

**File:** `src/app/history/page.tsx` (22 baris)

**Fitur:**
- Daftar kronologis semua transaksi (buy/sell)
- Count summary

**Komponen:** `TransactionHistory`

**Hooks:** `useCashAndHistory()` — `transactions` array

---

### 5. `/screener` — Stock Screener

**File:** `src/app/screener/page.tsx` (850+ baris)

**Modes:**
- **Technical** — Scan semua saham IDX untuk sinyal teknikal (golden cross, accumulation, volume surge, RSI, OBV). Top 5 buy/sell picks dengan entry/SL/TP, R:R. Filter: golden cross, accumulation, volume surge, oversold, buy signal, distribution, sharia. Save/load hasil screen.
- **Fundamental** — Tabel searchable/sortable semua saham dengan market cap, PER, PBV, ROE, NPM, YTD performance.

**API:**
- `GET /api/screener?tickers=...` — analisis teknikal per batch
- `GET /api/screener/history` — history screen tersimpan
- `POST /api/screener/save` — simpan hasil screen
- `useStockScreener()` hook — data fundamental

---

### 6. `/fundamentals` — Fundamental Analysis

**File:** `src/app/fundamentals/page.tsx` (589 baris)

**Fitur:**
- Hero header: ticker, harga, market cap, 52W range
- Health Rating (0-100) dengan status valuasi
- Flow Analysis: foreign/domestic flow, smart money phase, concentration score, top broker
- Fair Value Calculator: Graham Number, intrinsic value, buy area, take profit
- Fundamental Statistics: P/E, P/B, forward P/E, ROE, profit margin, ROA, current ratio, D/E, revenue growth
- Analyst Consensus: bar chart strong buy/buy/hold/sell/strong sell, target price, upside
- Detailed Insights: kategori good/warning/bad observations

**Hooks:** `useFundamentals(ticker)`

---

### 7. `/corporate-actions` — Corporate Actions

**File:** `src/app/corporate-actions/page.tsx` (350+ baris)

**Tabs:**
- **IPO Baru** — Daftar IPO baru (harga penawaran, jumlah saham, dana terhimpun, tanggal listing)
- **Stock Split** — Tipe split, rasio, nominal lama/baru, tanggal listing
- **HMETD** — Rights offering (rasio, harga pelaksanaan, target dana, ex-date, recording date)
- **Delisting** — Saham delisting (market cap, harga terakhir, tanggal listing/delisting)
- **Suspend** — Suspend perdagangan (judul, tanggal, tipe, dokumen PDF)

**Hooks:**
- `useNewListings()`
- `useStockSplits()`
- `useRightOfferings()`
- `useDelistings()`
- `useSuspendData(200)`

---

### 8. `/stocks/dividends` — Dividend Calendar

**File:** `src/app/stocks/dividends/page.tsx` (250+ baris)

**Fitur:**
- Summary bar: total saham dividen, rata-rata yield, yield tertinggi
- Desktop table (klik ke analisis, nama, rate, yield badge, ex-date, frekuensi)
- Mobile card view
- Color-coded yield badge (hijau >= 5%, kuning >= 2%, abu-abu lainnya)

**API:** `GET /api/idx/corporate-actions`

---

### 9. `/stocks/sharia` — Sharia Stock List

**File:** `src/app/stocks/sharia/page.tsx` (200+ baris)

**Fitur:**
- Summary cards: total saham, jumlah sharia, jumlah non-sharia
- Search by ticker
- Filter: All / Sharia / Non-Sharia
- Grid kartu saham dengan badge sharia/non-sharia, klik ke analisis

**API:** `GET /api/idx/sharia-list`

---

### 10. `/stocks/prospectus` — IPO Prospectus Analyzer

**File:** `src/app/stocks/prospectus/page.tsx` (461 baris)

**Fitur:**
- Upload PDF (drag-drop), input URL, atau paste text
- Live progress bar dan log saat analisis
- Hasil: rekomendasi (BUY/SELL), skor, harga IPO, fair value, upside, proyeksi ARA (5 hari), data keuangan (EPS, PER, PBV, ROE, DER, revenue growth), target harga (1 bulan, 3 bulan, 1 tahun), kekuatan/risiko
- Charts section (expandable)
- Multi-emiten comparison table (2+ analisis)

**API:** `POST /api/analyze/prospectus` (SSE streaming)

---

### 11. `/analysis/[ticker]` — Individual Stock Analysis

**File:** `src/app/analysis/[ticker]/page.tsx` (700+ baris)

**Tabs:**
- **Chart** — Interactive price chart (1D-5Y), OHLCV, MA20/MA50, candlestick markers, RSI, MACD, technical signals
- **Rangkuman** — Stock statistics, fundamental summary, broker summary, support/resistance, volume analysis (accumulation/distribution, MFI, OBV, volume surge)
- **Keuangan** — Laporan keuangan dari IDX
- **Perusahaan** — Order book, company profile (sektor, industri, board, listing date, website), direksi, komisaris, pemegang saham mayoritas, anak perusahaan
- **Berita** — Berita terkait saham
- **Pemegang Saham** — Chart struktur kepemilikan (insiders vs institutions)

**Hooks:**
- `useFundamentals(ticker)`
- `useCompanyDetail(companyCode)`
- `useTradingDaily(companyCode)`
- `useFinancialStatement(companyCode)`

**API:** `GET /api/stocks/history?ticker=...&period=...&interval=1d`

---

## API Routes

### Portfolio APIs
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/portfolio` | GET/POST/PUT/DELETE | CRUD portfolio items |
| `/api/portfolios` | GET/POST/PUT/DELETE | Multi-portfolio management |
| `/api/cash` | GET/PUT | Cash balance |
| `/api/transactions` | GET/POST | Transaction history |
| `/api/snapshots` | GET/POST | Portfolio snapshots |

### Market Data APIs
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/price` | GET | Harga 1 ticker (Yahoo Finance) |
| `/api/price-batch` | POST | Harga multiple tickers (batch) |
| `/api/stocks/history` | GET | Historical OHLCV |
| `/api/idx/market-index` | GET | Market indices (IHSG, LQ45, dll) |
| `/api/idx/stock-summary` | GET | Ringkasan saham + gainers/losers |
| `/api/idx/most-active` | GET | Saham paling aktif |
| `/api/idx/sector-summary` | GET | Performa sektor |
| `/api/idx/broker-summary` | GET | Ringkasan broker |
| `/api/idx/all-stocks` | GET | Semua saham (959 ticker) |

### Research APIs
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/fundamentals` | GET | Data fundamental |
| `/api/screener` | GET | Technical screener |
| `/api/screener/history` | GET | History screen |
| `/api/screener/save` | POST | Simpan hasil screen |
| `/api/news` | GET | Berita saham |
| `/api/analyze/prospectus` | POST | AI analisis prospektus (SSE) |
| `/api/analyze/ai-analysis` | POST | AI analisis saham |

### IDX Data APIs (30+ routes)
| Endpoint | Deskripsi |
|----------|-----------|
| `/api/idx/corporate-actions` | IPO, split, HMETD, delisting, suspend |
| `/api/idx/sharia-list` | Daftar efek syariah |
| `/api/idx/financial-report` | Laporan keuangan |
| `/api/idx/financial-ratios` | Rasio keuangan |
| `/api/idx/company-detail` | Detail perusahaan |
| `/api/idx/daily-indices` | Indeks harian |
| `/api/idx/foreign-flow` | Aliran asing |
| `/api/idx/smart-money` | Smart money analysis |
| `/api/idx/diagnose` | Diagnosis koneksi IDX |

---

## Route Tree

```
/                                   [Market Overview]
├── /analysis/[ticker]              [Individual Stock Analysis - 6 tabs]
├── /analytics                      [Portfolio Analytics]
├── /corporate-actions              [Corporate Actions - 5 tabs]
├── /fundamentals                   [Fundamental Analysis Terminal]
├── /history                        [Transaction History]
├── /portfolio-dashboard            [Portfolio Dashboard - 4 tabs]
├── /screener                       [Stock Screener - 2 modes]
├── /stocks/
│   ├── /dividends                  [Dividend Calendar]
│   ├── /prospectus                 [IPO Prospectus Analyzer]
│   └── /sharia                     [Sharia Stock List]
│
├── /dashboard      ──redirect──> /portfolio-dashboard
├── /portfolio      ──redirect──> /portfolio-dashboard
├── /stocks         ──redirect──> /
├── /aggregate      ──redirect──> /
└── /stock-analysis ──redirect──> /
```
