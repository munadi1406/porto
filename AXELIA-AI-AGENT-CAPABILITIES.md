# Axelia — AI Agent Capabilities Blueprint

> Dokumen pendamping untuk fitur **Axelia** (lihat `UPGRADE-RECOMMENDATIONS.md` §11.D12 untuk desain widget UI). Fokus dokumen ini: **kemampuan agentic** — bagaimana Axelia berpikir bertahap, memanggil banyak tool berurutan, dan (dengan izin) melakukan aksi nyata di aplikasi, bukan cuma menjawab pertanyaan satu langkah.
>
> Perbedaan mendasar dengan chatbot biasa: chatbot menjawab 1 pertanyaan → 1 jawaban. **Agent** menyusun rencana, memanggil beberapa tool secara berurutan (kadang bergantung hasil tool sebelumnya), mengevaluasi hasilnya, lalu memutuskan langkah berikutnya — sampai tugas selesai atau butuh konfirmasi user.

---

## Daftar Isi

1. [Prinsip Dasar Agent](#1-prinsip-dasar-agent)
2. [Arsitektur Agent Loop](#2-arsitektur-agent-loop)
3. [Tool Registry — Daftar Lengkap Kemampuan](#3-tool-registry--daftar-lengkap-kemampuan)
4. [Kategori Kemampuan: Read-Only vs Actionable](#4-kategori-kemampuan-read-only-vs-actionable)
5. [Model Izin & Konfirmasi (Guardrails)](#5-model-izin--konfirmasi-guardrails)
6. [Memory & Context Management](#6-memory--context-management)
7. [Skenario Multi-Step — Contoh Percakapan](#7-skenario-multi-step--contoh-percakapan)
8. [Proaktivitas — Axelia Bicara Duluan](#8-proaktivitas--axelia-bicara-duluan)
9. [Transparansi Proses (Menunjukkan Cara Berpikir)](#9-transparansi-proses-menunjukkan-cara-berpikir)
10. [Batasan & Safety Rails](#10-batasan--safety-rails)
11. [Arsitektur Teknis Ringkas](#11-arsitektur-teknis-ringkas)
12. [Roadmap Bertahap](#12-roadmap-bertahap)

---

## 1. Prinsip Dasar Agent

| Prinsip | Penjelasan |
|---|---|
| **Plan → Act → Observe → Repeat** | Axelia tidak langsung menjawab dari ingatan model. Untuk pertanyaan yang butuh data, ia menyusun langkah (tool apa saja yang perlu dipanggil), eksekusi satu-satu, lihat hasilnya, baru simpulkan jawaban — bisa berulang beberapa kali kalau hasil tool pertama memicu kebutuhan data lain. |
| **Grounded, bukan halusinasi** | Setiap angka/rekomendasi yang keluar dari Axelia harus bisa ditelusuri ke hasil tool call nyata (data API/engine yang sudah ada), bukan dikarang oleh model. |
| **Read-only dulu, aksi belakangan** | Kemampuan "melihat/menganalisis" dibangun & distabilkan lebih dulu sebelum kemampuan "mengubah data" (tambah watchlist, buat alert, dll) diaktifkan — karena aksi punya risiko lebih tinggi kalau agent salah interpretasi. |
| **Selalu bisa diverifikasi manusia** | Setiap rekomendasi/aksi penting selalu disertai cara user memverifikasi sendiri (link ke halaman terkait, angka mentah yang dipakai) — Axelia adalah asisten riset, bukan black-box yang harus dipercaya buta. |
| **Reuse total infrastruktur existing** | Semua "tool" yang bisa dipanggil Axelia adalah pembungkus tipis di atas API/engine yang **sudah ada** (`quant.ts`, `/api/screener`, `/api/backtest`, dll) — Axelia tidak butuh logic analisis baru, hanya lapisan orkestrasi + bahasa. |

---

## 2. Arsitektur Agent Loop

Pola dasar yang dipakai (mirip ReAct / tool-use loop yang umum di agentic LLM):

```
User bertanya
   │
   ▼
[1] Axelia menyusun rencana (internal, tidak selalu ditampilkan penuh ke user)
   │   "Untuk jawab ini saya perlu: (a) harga+indikator BBCA, (b) fundamental BBCA"
   ▼
[2] Panggil Tool #1 → dapat hasil → evaluasi: cukup? perlu tool lain?
   │
   ▼
[3] Panggil Tool #2 (kalau perlu) → dapat hasil → evaluasi lagi
   │
   ▼
[4] (Opsional) Panggil Tool #3, dst — loop berlanjut sampai data cukup
   │
   ▼
[5] Susun jawaban akhir dari SELURUH hasil tool, kirim ke chain AI existing
   │   (mimo-v2.5 → ox-alpha → deepseek) untuk narasi bahasa manusia
   ▼
[6] Tampilkan jawaban + rich content (mini chart/badge) + opsi aksi lanjutan
```

**Batas loop:** maksimal N tool call per pertanyaan (mis. 5-6) untuk mencegah loop tak berujung atau biaya API membengkak — kalau melebihi batas, Axelia berhenti dan jawab dengan data yang sudah terkumpul sambil bilang jujur "informasi ini mungkin belum lengkap."

**Paralel vs sekuensial:** tool yang tidak saling bergantung (mis. ambil harga BBCA + ambil fundamental BBCA) dipanggil paralel untuk mempercepat; tool yang butuh hasil tool lain (mis. "bandingkan strategi terbaik BBCA vs TLKM" → perlu tahu dulu strategi terbaik masing-masing sebelum membandingkan) dipanggil sekuensial.

---

## 3. Tool Registry — Daftar Lengkap Kemampuan

> Setiap tool di bawah ini adalah **pembungkus** di atas endpoint/engine yang sudah ada di codebase — Axelia tidak menciptakan logic baru, hanya "tahu kapan dan bagaimana memanggilnya".

### 3.1 Tools Data Pasar & Harga

| Tool Name (internal) | Fungsi | Reuse Dari |
|---|---|---|
| `getPriceRealtime(ticker)` | Harga terkini + perubahan % | WS `price_update` (kalau ticker sedang di-subscribe tab aktif) atau `GET /api/price` |
| `getPriceHistory(ticker, period, interval)` | Candle OHLCV historis | `GET /api/stocks/history` |
| `getIndexOverview()` | Kondisi IHSG & indeks lain hari ini | `GET /api/idx/market-index`, `GET /api/idx/market-scan` |
| `getMarketBreadth()` | Advance/decline, top gainers/losers/most active | `GET /api/idx/market-scan` |
| `getSectorPerformance()` | Performa per sektor | `GET /api/idx/market-scan` (`sectorPerformance`) |

### 3.2 Tools Analisis Teknikal

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `getTechnicalIndicators(ticker)` | MA20/50, RSI14, MACD, golden/death cross, volume surge, OBV, MFI | `src/lib/quant.ts` (`calculateIndicators`) |
| `detectChartPatterns(ticker)` | Deteksi pola candlestick/chart | `src/lib/patternDetection.ts` |
| `getSupportResistance(ticker)` | Level support/resistance | Data yang sudah dipakai tab Summary Analysis |
| `checkGoldenCross(tickers[])` | Cek banyak ticker sekaligus mana yang golden cross | `src/lib/quant.ts` batch, dipakai Screener |

### 3.3 Tools Fundamental & Risiko

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `getFundamentals(ticker)` | EPS, PER, PBV, ROE, DER, market cap, smart money, status syariah | `GET /api/fundamentals` |
| `getRiskProfile(ticker, period)` | Beta, korelasi vs IHSG, volatilitas, max drawdown | `GET /api/risk` |
| `getFairValue(ticker)` | Graham fair value, intrinsic value | Logic di `src/app/fundamentals/page.tsx` |
| `getHealthScore(ticker)` | Skor kesehatan keuangan /100 | Fundamentals Terminal |
| `compareTickers(tickers[])` | Bandingkan multi-ticker 14 metrik | Logic `/compare` |

### 3.4 Tools Strategi & Backtest

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `runBacktest(ticker, strategy, years)` | Jalankan 1 strategi spesifik | `GET /api/backtest` |
| `rankStrategies(ticker, years)` | Ranking 8 strategi mana yang terbaik untuk ticker ini | `GET /api/backtest/rank` |
| `getNextEntryLevel(ticker, strategy)` | Level harga entry berikutnya | `nextEntryLevel` di hasil backtest |
| `calculatePosition(params)` | Kalkulasi lot, risk budget, stop loss | `src/lib/positionCalc.ts` |

### 3.5 Tools Screener

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `runScreener(filters)` | Scan seluruh/sebagian 959 saham dengan kriteria (mis. `RSI<30`, `signal=BUY`, `sharia=true`) | `GET /api/screener` |
| `getTopPicks(n)` | Ambil N saham dengan skor tertinggi hasil scan terakhir | Logic Screener Top Picks |
| `getSavedScreens()` | Lihat screener yang pernah disimpan user | `GET /api/screener/history` |

### 3.6 Tools Data Referensi

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `getDividendCalendar()` | Kalender dividen & yield | `GET /api/idx/corporate-actions` |
| `getCorporateActions(ticker)` | IPO/split/rights/delisting untuk ticker tertentu | `GET /api/idx/*` (corporate actions family) |
| `getShariaStatus(ticker)` | Cek status syariah | `GET /api/idx/sharia-list` |
| `getBrokerSummary(ticker?)` | Top buy/sell broker (per saham atau makro) | `GET /api/idx/broker-summary`, `GET /api/idx/broker-stock` |
| `getForeignFlow()` | Net foreign flow resmi | `GET /api/idx/foreign-flow` |
| `getCompanyProfile(ticker)` | Profil perusahaan, direksi, shareholder | `GET /api/idx/company-detail` |
| `getStockNews(ticker)` | Berita terkait ticker | `GET /api/news` |

### 3.7 Tools Portofolio (Personal Data)

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `getMyPortfolio(portfolioId?)` | Holdings, P/L, allocation user | `usePortfolios()`, `GET /api/portfolio` |
| `getMyCash(portfolioId)` | Saldo kas | `GET /api/cash` |
| `getMyTransactionHistory(portfolioId)` | Riwayat transaksi | `GET /api/transactions` |
| `getMyWatchlist()` | Isi watchlist user | `useWatchlist()` |
| `getPortfolioRisk(portfolioId)` | Beta, correlation, stress test portofolio | `GET /api/risk` per holding + `StressTestCard` logic |
| `getRebalanceSuggestion(portfolioId)` | Selisih alokasi target vs aktual | `RebalancingAdvisor` logic |
| `getTaxEstimate(portfolioId, period)` | Estimasi pajak transaksi 0.1% | Tax card logic di `/history` |

### 3.8 Tools Aksi (Actionable — Butuh Konfirmasi, lihat Section 5)

| Tool Name | Fungsi | Reuse Dari |
|---|---|---|
| `addToWatchlist(ticker, group?)` | Tambah ticker ke watchlist | `useWatchlist()` write |
| `removeFromWatchlist(ticker)` | Hapus dari watchlist | `useWatchlist()` write |
| `saveScreenerResult(name, results)` | Simpan hasil screener | `POST /api/screener/save` |
| `createAlert(ticker, condition)` | Buat alert kondisi tertentu (butuh fitur 11.A1/11.A3 dari `UPGRADE-RECOMMENDATIONS.md`) | Alert infra (fitur terkait) |
| `recordTransaction(params)` | Catat transaksi baru | `POST /api/transactions` — **paling sensitif**, selalu butuh konfirmasi eksplisit |
| `navigateToPage(path)` | Arahkan user ke halaman tertentu di UI | Client-side navigation, bukan API |

---

## 4. Kategori Kemampuan: Read-Only vs Actionable

Pembagian ini penting untuk desain izin (Section 5):

### 🟢 Read-Only (aman, bisa langsung dieksekusi tanpa konfirmasi)
Semua tool di 3.1 – 3.7 di atas. Ini hanya membaca data, tidak mengubah apa pun — Axelia bebas memanggil sebanyak yang perlu untuk menjawab pertanyaan.

### 🟡 Actionable — Reversible (butuh konfirmasi ringan, 1 klik)
- `addToWatchlist` / `removeFromWatchlist` — mudah dibatalkan, risiko rendah
- `saveScreenerResult` — tidak mengubah data lain, mudah dihapus lagi
- `navigateToPage` — bukan perubahan data sama sekali, aman

### 🔴 Actionable — Sensitif (butuh konfirmasi eksplisit + preview jelas)
- `createAlert` — akan mengirim notifikasi berulang, user harus lihat persis kondisi apa yang diset
- `recordTransaction` — **mengubah data finansial nyata** (portofolio, cash, transaksi) — ini kategori paling hati-hati, wajib preview lengkap sebelum eksekusi (lihat Section 5)

---

## 5. Model Izin & Konfirmasi (Guardrails)

### 5.1 Prinsip umum
Semakin besar dampak/risiko sebuah aksi, semakin eksplisit konfirmasi yang diminta — pola ini konsisten dengan cara aplikasi lain menangani aksi finansial (mis. bank app selalu minta konfirmasi sebelum transfer, tapi tidak untuk sekadar cek saldo).

### 5.2 Alur konfirmasi bertingkat

**Level 1 — Tanpa konfirmasi (read-only):**
```
User: "Gimana chart BBCA minggu ini?"
Axelia: [langsung panggil getPriceHistory + getTechnicalIndicators, jawab]
```

**Level 2 — Konfirmasi ringan, inline button (actionable reversible):**
```
User: "Tambahin BBCA ke watchlist dong"
Axelia: "Oke, saya tambahkan BBCA ke watchlist kamu."
        [BBCA ditambahkan] [Tombol: Batalkan]
```
Aksi langsung dieksekusi tapi ada tombol undo langsung di bubble chat selama beberapa detik/menit — pola "optimistic action with undo", bukan "ask first".

**Level 3 — Konfirmasi eksplisit sebelum eksekusi (actionable sensitif):**
```
User: "Catat aku beli BBCA 10 lot di harga 9500"
Axelia: "Saya akan mencatat transaksi ini:
         📝 BELI BBCA — 10 lot (1.000 lembar) @ Rp9.500
         💰 Total: Rp9.500.000
         💼 Portofolio: [nama portofolio aktif]

         Konfirmasi untuk menyimpan?"
        [✅ Ya, catat]  [❌ Batal]
```
Tidak ada eksekusi sebelum user menekan tombol konfirmasi eksplisit — tidak ada "optimistic action" untuk kategori ini.

### 5.3 Batasan yang tidak bisa dilewati Axelia
- Axelia **tidak pernah** bisa menghapus akun/portofolio secara keseluruhan lewat chat — aksi destruktif besar tetap harus lewat UI biasa dengan konfirmasi berlapis yang sudah ada.
- Axelia **tidak pernah** mengeksekusi `recordTransaction` berdasarkan asumsi/tebakan — kalau ada info yang ambigu (mis. user cuma bilang "beli BBCA" tanpa jumlah/harga), Axelia wajib bertanya balik dulu, tidak boleh mengisi asumsi sendiri untuk data finansial.
- Semua aksi yang berhasil dieksekusi dicatat di log aktivitas (siapa/apa/kapan) yang bisa dilihat user — transparansi penuh, tidak ada aksi "diam-diam".

---

## 6. Memory & Context Management

| Jenis Memory | Cakupan | Implementasi |
|---|---|---|
| **Context percakapan aktif** | Semua pesan dalam 1 sesi chat saat ini | In-memory state React, dikirim sebagai history ke tiap API call chain AI |
| **Context halaman aktif** | Ticker yang sedang dilihat, tab yang aktif | Diambil otomatis dari state halaman saat widget dibuka, jadi system prompt tambahan |
| **Riwayat sesi (opsional lanjutan)** | Percakapan tersimpan lintas sesi/hari | Butuh tabel DB baru kalau mau dipersist — di luar cakupan fase awal, lihat roadmap |
| **Preferensi user (opsional lanjutan)** | Gaya rekomendasi yang disukai (mis. "selalu tunjukkan versi syariah dulu"), sering ditanyakan hal apa | Butuh profil preferensi tersimpan — fase lanjutan |

**Catatan penting:** context window untuk chain AI (`mimo-v2.5 → ox-alpha → deepseek`) terbatas — untuk sesi chat panjang, Axelia perlu strategi ringkas riwayat lama (summarize pesan-pesan awal jadi ringkasan singkat) supaya tidak melebihi limit token, mirip pola yang sudah dipakai di fitur AI lain (`10-min mem-cache` di Backtest sebagai referensi pola caching yang sudah ada).

---

## 7. Skenario Multi-Step — Contoh Percakapan

### Skenario A — Analisis 1 saham (2 tool call, paralel)
```
User: "Analisis BBCA dong, worth it gak buat dibeli sekarang?"

Axelia (internal):
  → panggil getPriceHistory(BBCA) + getTechnicalIndicators(BBCA) + getFundamentals(BBCA) [paralel]
  → evaluasi: RSI 45 (netral), golden cross belum terjadi, PER masih wajar
  → panggil rankStrategies(BBCA, 2) untuk saran strategi
  → susun jawaban naratif

Axelia (jawab): "BBCA saat ini di level netral secara teknikal (RSI 45,
belum ada golden cross). Dari fundamental, PER-nya masih di kisaran wajar
dibanding rata-rata sektor perbankan. Kalau lihat backtest 2 tahun terakhir,
strategi Golden Cross punya win rate tertinggi untuk BBCA (62%).
Belum ada sinyal beli kuat saat ini — mungkin worth ditunggu sampai RSI
turun ke area oversold atau muncul golden cross baru."
[📈 mini chart 30 hari] [Lihat chart lengkap →] [+ Tambah ke Watchlist]
```

### Skenario B — Screening + aksi lanjutan (3+ tool call, sekuensial)
```
User: "Carikan saham yang lagi oversold dan masih syariah, terus
       masukin top 3 ke watchlist aku"

Axelia (internal):
  → panggil runScreener({rsi: "<30", sharia: true})
  → dapat hasil, urutkan by score, ambil top 3
  → untuk masing-masing 3 ticker, siapkan aksi addToWatchlist (Level 2 confirm)

Axelia (jawab): "Ketemu 7 saham oversold + syariah. Top 3 berdasarkan skor:
1. [TICKER1] — RSI 24, score 78
2. [TICKER2] — RSI 27, score 74
3. [TICKER3] — RSI 29, score 71

Saya tambahkan ketiganya ke watchlist ya?"
[✅ Ya, tambahkan semua]  [Pilih manual]  [❌ Tidak usah]
```

### Skenario C — Perbandingan lintas-data (4 tool call, campuran paralel+sekuensial)
```
User: "Mending BBCA atau BBRI buat dividend play?"

Axelia (internal):
  → panggil getFundamentals(BBCA) + getFundamentals(BBRI) [paralel]
  → panggil getDividendCalendar() → filter untuk kedua ticker
  → panggil getRiskProfile(BBCA) + getRiskProfile(BBRI) [paralel]
  → bandingkan yield, konsistensi historis, risiko

Axelia (jawab): [tabel mini perbandingan yield/payout ratio/beta] + narasi
kesimpulan mana yang lebih cocok untuk profil "dividend play" (yield tinggi,
volatilitas rendah)
```

### Skenario D — Pertanyaan tentang portofolio pribadi (data sensitif, read-only)
```
User: "Portofolio aku sehat gak sih sekarang?"

Axelia (internal):
  → panggil getMyPortfolio() + getPortfolioRisk() + getRebalanceSuggestion()
  → evaluasi: konsentrasi sektor, drawdown, deviasi dari target allocation

Axelia (jawab): "Portofolio kamu saat ini didominasi sektor perbankan (65%),
agak terkonsentrasi. Beta keseluruhan 1.15 (sedikit lebih volatil dari IHSG).
Alokasi BBCA sudah 35%, sementara target kamu 25% — mungkin worth
dipertimbangkan rebalancing."
[Lihat detail Stress Test →] [Lihat saran rebalancing →]
```

---

## 8. Proaktivitas — Axelia Bicara Duluan

Selain menjawab pertanyaan, versi lanjutan Axelia bisa memulai percakapan sendiri (dengan batasan supaya tidak mengganggu):

- **Insight harian ringkas** — sekali per hari (opsional, bisa dimatikan), badge notifikasi muncul di FAB dengan 1 insight singkat berbasis data yang sudah dipantau (mis. "3 saham di watchlist kamu golden cross hari ini")
- **Follow-up dari alert** — kalau user sudah pasang alert (fitur 11.A1/11.A3) dan kondisinya terpenuhi, Axelia bisa jadi "juru bicara" yang menjelaskan alert itu dengan bahasa natural + konteks tambahan, bukan cuma notifikasi angka mentah
- **TIDAK proaktif untuk hal sensitif** — Axelia tidak pernah memulai percakapan yang menyarankan aksi finansial tanpa diminta (mis. tidak tiba-tiba bilang "sepertinya kamu harus jual BBCA sekarang" tanpa user bertanya) — proaktivitas dibatasi ke *informasi*, bukan *dorongan aksi*, untuk menjaga produk tetap sebagai alat bantu bukan yang mendikte keputusan finansial user.

---

## 9. Transparansi Proses (Menunjukkan Cara Berpikir)

Karena Axelia memanggil banyak tool untuk 1 jawaban, penting supaya user bisa melihat "apa yang sedang dikerjakan", bukan cuma menunggu loading kosong:

- Status bertahap yang sudah disebut di desain widget sebelumnya (`UPGRADE-RECOMMENDATIONS.md` §11.D12) — "🔍 Mengecek chart..." dst — diperluas jadi menunjukkan **tool spesifik yang sedang dipanggil**, bukan cuma pesan generik:
  ```
  🔧 Menjalankan screener (RSI < 30, syariah)...
  🔧 Menghitung skor 7 saham hasil scan...
  ✍️ Menyusun rekomendasi top 3...
  ```
- **Expandable "Lihat detail proses"** di bawah tiap jawaban Axelia (opsional, collapsed by default) — power user yang penasaran bisa klik untuk lihat tool apa saja yang dipanggil dan data mentah apa yang dipakai, tanpa membebani tampilan default untuk user biasa yang cuma mau jawaban singkat.
- Ini juga berfungsi sebagai **alat debug** buat developer selama fase awal — memudahkan verifikasi apakah Axelia benar-benar mengambil data yang tepat, bukan berasumsi.

---

## 10. Batasan & Safety Rails

| Batasan | Alasan |
|---|---|
| Tidak bisa mengeksekusi `recordTransaction` tanpa konfirmasi eksplisit | Data finansial nyata, kesalahan sulit dibatalkan begitu saja secara psikologis (walau technically bisa dihapus) |
| Tidak bisa menghapus portofolio/akun lewat chat | Aksi destruktif besar harus selalu lewat UI dengan friction yang disengaja |
| Tidak memberi jaminan/kepastian hasil investasi | Setiap rekomendasi disertai disclaimer, bahasa "kemungkinan/indikasi" bukan "pasti/jaminan" |
| Tidak mengakses data user lain | Semua tool portofolio (3.7) terikat ke `portfolioId` milik user yang sedang login/aktif di sesi itu — **catatan:** ini bergantung pada perbaikan isu auth yang sudah diangkat di evaluasi sebelumnya (`UPGRADE-RECOMMENDATIONS.md`, temuan keamanan API tanpa auth) — sebaiknya isu itu dituntaskan dulu sebelum Axelia diberi akses tool actionable ke data portofolio |
| Rate limit tool call per sesi/menit | Mencegah biaya API AI membengkak dari 1 user yang chat sangat intensif atau bug infinite loop |
| Tidak menjalankan tool di luar registry (Section 3) | Axelia tidak bisa "mengarang" kemampuan baru di luar yang sudah didaftarkan — mencegah eksekusi hal tak terduga |

---

## 11. Arsitektur Teknis Ringkas

```
┌─────────────────────────────────────────────────────────┐
│  Axelia Chat Widget (React, floating FAB + panel)        │
└───────────────────────┬───────────────────────────────────┘
                         │ user message + page context
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Agent Orchestrator (baru — lapisan tipis)                │
│  - Terima pesan + context halaman aktif                   │
│  - Kirim ke chain AI dengan daftar tool (function schema)  │
│  - Chain AI balas: "perlu panggil tool X dengan param Y"   │
│  - Orchestrator eksekusi tool X → hasil dikirim balik ke AI │
│  - Loop sampai AI bilang "cukup, ini jawaban final"         │
└───────────────────────┬───────────────────────────────────┘
                         │ tool calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Tool Registry (Section 3) — pembungkus tipis              │
│  di atas API/lib yang SUDAH ADA:                           │
│  quant.ts, backtestService.ts, positionCalc.ts,             │
│  /api/screener, /api/backtest, /api/fundamentals,           │
│  /api/risk, /api/idx/*, /api/portfolio*, useWatchlist       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Chain AI existing: mimo-v2.5 → ox-alpha → deepseek         │
│  (OpenCode Zen Go, MODEL_CHAIN yang sudah dipakai            │
│  di ai-analysis, ai-summary, ai-entry, prospectus)           │
└─────────────────────────────────────────────────────────┘
```

**Yang perlu dibangun baru:** hanya **Agent Orchestrator** (lapisan yang mengelola loop tool-calling) dan **Tool Registry** (pembungkus/adapter API existing jadi format function-calling yang dipahami chain AI). Semua data layer di bawahnya 100% reuse.

**Catatan model:** perlu dicek apakah model dalam `MODEL_CHAIN` (`mimo-v2.5`, `ox-alpha`, `deepseek`) mendukung native function-calling/tool-use di API `opencode.ai/zen/go`. Kalau tidak semua mendukung, orchestrator perlu pola fallback (mis. prompt model untuk output JSON terstruktur berisi "tool yang ingin dipanggil", diparsing manual oleh orchestrator) — pola serupa `json_object fallback → raw` yang disebutkan sudah dipakai di beberapa endpoint AI existing.

---

## 12. Roadmap Bertahap

### Fase 1 — Read-Only Agent (fondasi)
- [ ] Bangun Agent Orchestrator dasar (loop tool-call sederhana, maks 3-4 tool per pertanyaan)
- [ ] Implementasi Tool Registry untuk kategori 3.1–3.6 (data pasar, teknikal, fundamental, strategi, screener, referensi) — semua read-only, tanpa risiko
- [ ] Transparansi proses dasar (status bertahap "🔍 Mengecek...")
- [ ] Widget UI dasar (FAB pojok kanan bawah, sesuai desain di `UPGRADE-RECOMMENDATIONS.md` §11.D12)

### Fase 2 — Personal Read-Only + Actionable Ringan
- [ ] Tool Registry kategori 3.7 (portofolio personal, read-only) — **setelah isu auth API dituntaskan**
- [ ] Actionable Level 2: `addToWatchlist`, `removeFromWatchlist`, `saveScreenerResult`, `navigateToPage`
- [ ] Expandable "Lihat detail proses" untuk power user
- [ ] Feedback thumbs-up/down per jawaban

### Fase 3 — Actionable Sensitif + Proaktivitas
- [ ] `createAlert` (bergantung fitur alert dari `UPGRADE-RECOMMENDATIONS.md` §11.A1/11.A3 sudah ada)
- [ ] `recordTransaction` dengan alur konfirmasi Level 3 penuh + log aktivitas
- [ ] Insight harian proaktif (opsional, toggle on/off)
- [ ] Riwayat sesi lintas hari (butuh tabel DB baru)

### Fase 4 — Penyempurnaan
- [ ] Voice-to-text input
- [ ] Slash command pintas
- [ ] Preferensi user tersimpan (gaya rekomendasi)
- [ ] Integrasi ke AI Track Record Dashboard (`UPGRADE-RECOMMENDATIONS.md` §11.D13) — semua rekomendasi Axelia ikut dilacak akurasinya

---

*Dokumen ini melengkapi `UPGRADE-RECOMMENDATIONS.md` §11.D12 — fokus khusus pada kemampuan agentic (tool-use, multi-step reasoning, aksi terkontrol), bukan desain visual widget yang sudah dibahas di dokumen tersebut.*
