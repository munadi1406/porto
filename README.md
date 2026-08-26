# Porto — IDX Investment Terminal

Portfolio tracker & market terminal untuk Bursa Efek Indonesia, dengan data real-time, analisis AI, dan broker summary.

## Fitur Utama

### Live Market
- **IHSG Chart real-time** — timeframe 1D (1m) s/d 1Y, tick engine 600ms saat pasar buka, MA20/50, pivot points klasik (PP/R1-R3/S1-S3), volume (harian)
- **WebSocket server** (`/ws`) — broadcast harga tiap 3 detik via `price-fetcher` (Yahoo), fallback polling otomatis
- **Ticker tape** berjalan (kecepatan 0.5×/1×/2×, pause) + **Market status bar** (jam WIB, sesi bursa)
- **Net Foreign resmi** dari IDX Daily Trading by Investor Type (cache disk, cron 30 menit)
- **Sector Heatmap** ala Finviz — 17 sektor, 95% emiten terpetakan
- **Top Movers live** — flash hijau/merah tiap perubahan harga

### Analisis Saham (`/analysis/[ticker]`)
- Chart candlestick (lightweight-charts v5) + **sub-panel RSI & MACD**
- **Pola chart terdeteksi & digambar otomatis**: support/resistance, trendline, neckline, zona berwarna + marker label
- **Proyeksi AI** via OpenCode Zen Go (model: `ox-alpha-free` → `mimo-v2.5` fallback)
- Laporan keuangan lengkap (laba rugi, neraca, arus kas, rasio) — Yahoo fundamentalsTimeSeries
- **Broker summary per saham** (Top Buy/Sell) via Index Alpha — cache MySQL, kuota 5 req/hari
- Watchlist (localStorage), alert harga + notifikasi browser, share card OG image

### Broker Summary Pasar (`/` → tab Broker Summary)
- Data asli IDX via **Chromium headless** (Playwright) — menembus Cloudflare
- Cache memori + disk, background refresh cron 30 menit
- Top 10 broker by value, Foreign vs Domestic

## Menjalankan

```bash
npm install
npx playwright install chromium   # untuk broker summary anti-Cloudflare
npm run dev                        # custom server + WebSocket di :3000
```

### Environment (`.env` — jangan di-commit)
```
INDEXALPHA_API_KEY=...   # broksum per saham (gratis: indexalpha.id, 5 req/hari)
OPENCODE_API_KEY=...     # analisis AI (opencode.ai/zen)
OPENCODE_MODEL=ox-alpha-free
```

### Database (MySQL)
`src/lib/db.ts` — dipakai untuk cache broksum per saham (`broker_stock_cache`) & kuota harian (`broker_api_usage`). Tabel dibuat otomatis.

## Scripts
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server + WebSocket |
| `npm run build` / `start` | Production |
| `npx vitest run` | Test suite |
| `node scripts/build-sector-map.cjs` | Regenerasi peta sektor 959 emiten |
| `node scripts/idx-browser-fetch.cjs "<url>"` | Fetch IDX via Chromium |

## Endpoint Kunci
| Route | Sumber |
|---|---|
| `/api/idx/index-chart` | Yahoo chart + pivot |
| `/api/idx/ai-analysis` | OpenCode Zen (AI) |
| `/api/idx/broker-summary` | IDX via browser (cache disk+mem, cron) |
| `/api/idx/broker-stock` | Index Alpha (cache MySQL) |
| `/api/idx/foreign-flow` | IDX Digital Statistic (resmi) |
| `/api/idx/market-scan` | Yahoo 959 saham (cache 10 mnt) |
| `/api/price-batch`, `/ws` | Live prices |

## Arsitektur Singkat
- `src/server/` — WebSocket + price publisher (custom server via `server.ts`)
- `src/lib/idxApiClient.ts` — IDX API client 3-strategi: direct → proxy → Chromium
- `src/lib/price-fetcher.ts` — Yahoo quotes dengan cache TTL 3s
- `src/hooks/useWebSocket.ts` / `useMarketData.ts` — client live data
