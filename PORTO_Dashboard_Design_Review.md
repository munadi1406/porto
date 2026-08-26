# Porto — Dashboard & Information Architecture Review

## 1. Tujuan Desain

Porto diposisikan sebagai:

> **Investment Terminal untuk IDX**

Bukan sebagai "AI Stock Dashboard".

AI sebaiknya menjadi lapisan analisis di dalam produk, sedangkan antarmuka utama harus terasa seperti platform trading/research profesional: clean, data-driven, dense tetapi tetap mudah dibaca, dengan tabel, chart, dan navigasi yang kuat.

---

# 2. Struktur Sidebar yang Direkomendasikan

Sidebar sebaiknya tidak menampilkan seluruh route sebagai menu utama. Dokumentasi saat ini memiliki 11 content routes yang terbagi menjadi Portfolio, Pasar, dan Riset. Struktur tersebut sudah bagus sebagai dasar, tetapi beberapa fitur lebih tepat dijadikan tab/sub-feature agar sidebar tidak terlalu panjang.

## Sidebar Final

```text
PORTO
IDX INVESTMENT TERMINAL

────────────────────────

OVERVIEW
◉ Market

PORTFOLIO
▣ My Portfolio
◒ Performance
◷ Transactions

MARKET
◎ Screener
↗ Stocks
⇄ Market Flow

RESEARCH
◈ Fundamentals
◫ Technical
◆ Corporate Actions
▣ Dividends

────────────────────────

MY PORTFOLIOS

● Portfolio Utama
● Portfolio 2
+ New Portfolio

────────────────────────

⌘ K  Search

⚙ Settings
```

## Prinsip Sidebar

- Jangan membuat 15–20 menu utama.
- Gunakan grouping yang jelas.
- Menu yang sangat spesifik dijadikan tab atau sub-feature.
- Portfolio aktif ditampilkan sebagai selector tersendiri.
- Search global tersedia melalui `⌘ K`.
- Settings berada di bagian paling bawah.
- Sidebar desktop dapat dibuat collapsible.
- Pada mobile gunakan bottom navigation seperti dokumentasi awal.

---

# 3. Struktur Navigasi

## Overview

### Market

Route utama:

```text
/
```

Market menjadi landing page utama aplikasi.

Konten:

- IHSG
- Market indices
- Market breadth
- Most active stocks
- Top gainers
- Top losers
- Foreign/domestic flow
- Broker summary
- Sector performance
- Semua saham

Fitur seperti Gainers/Losers, Sector, dan Broker Flow tidak perlu menjadi item sidebar utama.

---

# 4. Market Dashboard

Market harus terasa seperti market terminal, bukan dashboard SaaS.

```text
MARKET

IHSG  7,xxx.25   +0.72%
LQ45  1,xxx.21   +0.43%
IDX30 xxx.xx     -0.12%

────────────────────────────────

MARKET BREADTH

Advancing     412
Declining     289
Unchanged      94

────────────────────────────────

IHSG
┌───────────────────────────────────────┐
│                                       │
│              PRICE CHART               │
│                                       │
└───────────────────────────────────────┘

────────────────────────────────

MOST ACTIVE
┌───────────────────────────────────────┐
│ BBCA   9,xxx   +1.2%   2.4T           │
│ BBRI   4,xxx   +0.8%   1.9T           │
│ BMRI   5,xxx   -0.4%   1.5T           │
└───────────────────────────────────────┘

TOP GAINERS          TOP LOSERS

FOREIGN FLOW         SECTOR PERFORMANCE
```

Prioritas layout:

1. Kondisi pasar.
2. Market breadth.
3. Chart indeks.
4. Aktivitas saham.
5. Flow.
6. Sector.

---

# 5. Portfolio

Portfolio Dashboard saat ini sudah memiliki banyak fitur:

- Net Worth
- Unrealized P/L
- Total Modal
- Cash
- Equity Growth
- Allocation
- Gain/Loss
- Monthly Heatmap
- Holdings
- Cash Manager
- Target Portfolio

Semua fitur tersebut tidak perlu dipisahkan menjadi banyak halaman.

Gunakan satu halaman utama:

```text
MY PORTFOLIO

Portfolio Utama ▼

Net Worth       Rp 245.8M
Invested        Rp 210.2M
Cash             Rp 35.6M
Unrealized P/L  +Rp 18.4M

────────────────────────

PERFORMANCE
[ Equity Growth Chart ]

────────────────────────

ALLOCATION
[ Donut ]       HOLDINGS

BBCA   25%
BMRI   18%
BBRI   15%
TLKM   12%

────────────────────────

TARGET ALLOCATION

────────────────────────

RECENT TRANSACTIONS
```

Gunakan tab:

```text
Overview | Holdings | Performance | Target
```

---

# 6. Screener

Screener merupakan salah satu fitur utama aplikasi.

Pisahkan dua mode:

```text
[ Technical ] [ Fundamental ]
```

## Technical

Filter:

- Golden Cross
- Accumulation
- Volume Surge
- RSI
- OBV
- Buy Signal
- Distribution
- Sharia

## Fundamental

Filter:

- Market Cap
- PER
- PBV
- ROE
- NPM
- YTD Performance

## Layout

```text
SCREENER

[ Technical ] [ Fundamental ]

──────────────────────────────────

FILTER

Signal
[ Golden Cross ]

Volume
[ > 2x Average ]

RSI
[ < 40 ]

Trend
[ Bullish ]

Sharia
[ All ]

                         [ RUN SCREEN ]

──────────────────────────────────

RESULTS

96 stocks found

Ticker   Price   Chg    RSI   Vol   Signal
BBCA     ...     ...    42    2.4x  BUY
BMRI     ...     ...    51    1.8x  HOLD
...
```

Screener harus menggunakan table-first design, bukan kumpulan card besar.

---

# 7. Fundamental Analysis

Fundamentals harus terasa seperti investment terminal.

Header:

```text
BBCA
Bank Central Asia

Rp 8,750     +1.16%

Market Cap    Rp 1,xxx T
PER           18.4x
PBV            4.1x
ROE           23.8%
Dividend       2.4%

[ Overview ] [ Valuation ] [ Financials ] [ Flow ]
```

Kemudian valuation:

```text
VALUATION

Intrinsic Value
Rp 9,420

Current Price
Rp 8,750

Upside
+7.65%

BUY AREA
Rp 8,200 — 8,600
```

Gunakan data yang padat tetapi terstruktur.

---

# 8. Individual Stock Analysis

Route:

```text
/analysis/[ticker]
```

Halaman ini harus menjadi salah satu halaman terkuat di aplikasi.

Header:

```text
BBCA  Bank Central Asia

8,750
+100  +1.16%

OPEN     8,650
HIGH     8,800
LOW      8,600
VOL      42.8M

[ CHART ] [ SUMMARY ] [ FINANCIAL ]
[ COMPANY ] [ NEWS ] [ OWNERSHIP ]
```

Chart menjadi elemen utama.

Tab yang direkomendasikan:

- Chart
- Summary
- Financial
- Company
- News
- Ownership

---

# 9. AI Jangan Menjadi Menu Utama

Hindari sidebar seperti:

```text
AI Analyst
AI Advisor
AI Stock Picker
AI Assistant
```

Ini membuat aplikasi terlihat seperti AI wrapper.

AI sebaiknya menjadi bagian dari fitur analisis.

Contoh:

```text
BBCA ANALYSIS

Fundamentals
Technical
Flow
Valuation

────────────────

ANALYTICAL NOTE

Valuation remains...
```

AI adalah analytical layer, bukan identitas utama produk.

---

# 10. Header

Gunakan header yang minimal.

```text
┌─────────────────────────────────────────────────────────────┐
│  ⌘K Search stocks...          Market Open ●   13:24          │
│                                      🔔   Portfolio ▼        │
└─────────────────────────────────────────────────────────────┘
```

Search global harus dapat mencari:

- Ticker
- Nama perusahaan
- Recent stocks
- Portfolio
- Halaman

Contoh:

```text
⌘ K

Search

BBCA
Bank Central Asia

BBRI
Bank Rakyat Indonesia

BMRI
Bank Mandiri

→ Recent
→ Portfolio
```

---

# 11. Visual Direction

## Light Mode

```text
Background       #F7F8FA
Sidebar          #FFFFFF
Card             #FFFFFF
Border           #E5E7EB
Text primary     #111827
Text secondary   #6B7280
Positive         #16803C
Negative         #D92D20
Accent           #1F2937
```

## Dark Mode

```text
Background       #0B0D10
Sidebar          #0F1115
Card             #14171C
Border           #252932
Text primary     #F3F4F6
Text secondary   #8B919C
```

Gunakan satu warna accent utama.

---

# 12. Hindari Gaya "AI Dashboard"

Jangan menggunakan secara berlebihan:

- Gradient ungu/biru.
- Glowing cards.
- Glassmorphism berlebihan.
- Sparkle AI.
- Robot atau icon AI sebagai dekorasi.
- Card dengan radius sangat besar.
- Gradient chart.
- Excessive shadow.
- Terlalu banyak floating elements.

Target visual:

> Bloomberg / TradingView / modern financial terminal

bukan:

> AI SaaS dashboard.

---

# 13. Mobile Navigation

Dokumentasi awal sudah memiliki konsep bottom navigation.

Pertahankan pendekatan tersebut.

```text
┌──────────┬──────────┬──────────┬──────────┐
│ Portfolio│  Stocks  │ Research │   Menu   │
└──────────┴──────────┴──────────┴──────────┘
```

Saat berada di Portfolio:

```text
Dashboard | Holdings | Performance | Menu
```

Saat berada di Stocks:

```text
Market | Screener | Technical | Fundamental
```

---

# 14. Information Architecture Final

```text
PORTO
│
├── Overview
│   └── Market
│
├── Portfolio
│   ├── My Portfolio
│   │   ├── Overview
│   │   ├── Holdings
│   │   ├── Performance
│   │   └── Target
│   │
│   └── Transactions
│
├── Market
│   ├── Stocks
│   ├── Screener
│   └── Market Flow
│
├── Research
│   ├── Fundamentals
│   ├── Technical
│   ├── Corporate Actions
│   ├── Dividends
│   ├── Sharia
│   └── Prospectus
│
├── Stock Analysis
│   └── /analysis/[ticker]
│
└── Settings
```

---

# 15. Route Mapping

Pertahankan route yang sudah ada dan lakukan penyederhanaan pada navigasi UI.

```text
/                       → Market
/portfolio-dashboard    → My Portfolio
/analytics              → Performance
/history                → Transactions
/screener               → Screener
/fundamentals           → Fundamentals
/corporate-actions      → Corporate Actions
/stocks/dividends       → Dividends
/stocks/sharia          → Sharia
/stocks/prospectus      → Prospectus
/analysis/[ticker]      → Stock Analysis
```

Route redirect yang sudah ada tetap dapat dipertahankan:

```text
/dashboard              → /portfolio-dashboard
/portfolio              → /portfolio-dashboard
/stocks                 → /
/aggregate              → /
/stock-analysis         → /
```

---

# 16. Prioritas Implementasi UI

## Phase 1 — Core

1. Sidebar
2. Header
3. Market Dashboard
4. Portfolio Dashboard
5. Stock Analysis
6. Screener

## Phase 2 — Research

7. Fundamentals
8. Technical Analysis
9. Corporate Actions
10. Dividends

## Phase 3 — Secondary Features

11. Sharia
12. Prospectus
13. Advanced Analytics
14. Settings

---

# 17. Kesimpulan

Desain terbaik untuk Porto adalah **financial terminal yang modern, bukan AI dashboard**.

Prinsip utamanya:

- Sidebar pendek.
- Market menjadi halaman utama.
- Portfolio menggunakan tab internal.
- Screener menggunakan table-first layout.
- Stock Analysis menggunakan chart-first layout.
- Fundamentals menggunakan terminal-style metrics.
- AI hanya menjadi analytical layer.
- Gunakan border dan typography untuk hierarchy, bukan gradient dan glow.
- Desktop menggunakan sidebar.
- Mobile menggunakan bottom navigation.
- Data harus menjadi fokus utama UI.

Dengan pendekatan ini, Porto akan terasa lebih profesional, matang, dan kredibel sebagai platform analisis saham IDX.
