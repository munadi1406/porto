# PORTO — UX/UI Upgrade Recommendations

> Berdasarkan analisis `BLUEPRINT.md` | Fokus: **layout, navigasi, konsistensi, aksesibilitas** — tanpa mengubah/menghapus fitur, data flow, API, atau arsitektur WebSocket yang sudah ada.
>
> Setiap item ditandai **Effort** (S/M/L) dan **Impact** (Rendah/Menengah/Tinggi) untuk membantu prioritisasi sprint.

---

## Daftar Isi

1. [Prinsip Umum](#1-prinsip-umum)
2. [Navigasi & Information Architecture](#2-navigasi--information-architecture)
3. [Konsistensi Layout & Komponen](#3-konsistensi-layout--komponen)
4. [Loading, Error & Perceived Performance](#4-loading-error--perceived-performance)
5. [Empty States & Onboarding](#5-empty-states--onboarding)
6. [Aksesibilitas & Visual Consistency](#6-aksesibilitas--visual-consistency)
7. [Mobile & Responsive](#7-mobile--responsive)
8. [Performa Teknis yang Berdampak ke UX](#8-performa-teknis-yang-berdampak-ke-ux)
9. [Kebersihan Kode/Route (Housekeeping)](#9-kebersihan-koderoute-housekeeping)
10. [Roadmap Bertahap](#10-roadmap-bertahap)
11. [Checklist QA Sebelum Rilis](#11-checklist-qa-sebelum-rilis)

---

## 1. Prinsip Umum

Panduan yang dipakai di seluruh rekomendasi ini:

| Prinsip | Penjelasan |
|---|---|
| **Non-destructive** | Semua perubahan bersifat aditif/refactor lapisan UI. Tidak ada endpoint, hook, atau state management yang dihapus. |
| **Progressive disclosure** | Info kompleks (8 tab, 959 saham, 8 strategi) ditampilkan bertahap, bukan sekaligus. |
| **Konsistensi > kreativitas lokal** | Satu pola tab/card/badge dipakai di semua halaman, bukan tiap halaman punya gaya sendiri. |
| **Jangan biarkan user menebak** | Setiap state (loading, kosong, error, delay lama) harus dikomunikasikan secara eksplisit. |
| **Warna bukan satu-satunya sinyal** | Semua indikator naik/turun/status juga punya ikon/teks. |

---

## 2. Navigasi & Information Architecture

### 2.1 Menu "Agregat" yang mengarah ke tempat salah
- **Masalah:** Sidebar → Portofolio → Agregat → `redirect('/')`. User mengira fitur ada, ternyata dilempar ke beranda tanpa pesan apa pun.
- **Rekomendasi:**
  - Opsi A (cepat): sembunyikan item menu ini dari `MENU_GROUPS` sampai UI-nya siap.
  - Opsi B (lengkap): bangun halaman ringkas menggunakan `GET /api/portfolios/aggregate` yang sudah matang — cukup: total value gabungan, breakdown per portofolio, cash gabungan.
- **Effort:** S (opsi A) / M (opsi B) — **Impact:** Tinggi

### 2.2 Orphan route `/analysis/[ticker]` tanpa pintu masuk resmi
- **Masalah:** Halaman terkaya (8 tab, chart, financials) hanya bisa diakses lewat klik tidak langsung (tabel, watchlist, search internal per-halaman). Tidak ada global search.
- **Rekomendasi:**
  - Tambahkan **global search / command palette** di header (`Cmd/Ctrl+K` di desktop, ikon search di mobile) yang query ke data `market-scan` yang sudah di-fetch, filter by kode/nama saham, navigasi ke `/analysis/[ticker]`.
  - Alternatif ringan: tambahkan search box kecil permanen di `SiteHeader`, tidak perlu modal command palette dulu.
- **Effort:** M — **Impact:** Tinggi

### 2.3 Ketidaksesuaian label vs isi
- **Masalah:** Sidebar "Performa" → URL `/analytics` → Header halaman "Portfolio Analytics" (EN). Tiga nama berbeda untuk satu halaman.
- **Rekomendasi:** Samakan judul `<h1>` di `analytics/page.tsx` menjadi "Performa Portofolio" agar match dengan label sidebar. URL boleh tetap `/analytics` (tidak perlu rename route, cukup ubah teks tampilan).
- **Effort:** S — **Impact:** Menengah

### 2.4 `MENU_GROUPS` hard-coded
- **Masalah:** Menambah halaman baru = edit manual `app-sidebar.tsx` + `page.tsx`, rawan lupa sinkron (seperti kasus Agregat).
- **Rekomendasi:** Buat satu file konfigurasi terpusat `src/config/navigation.ts` berisi `{title, url, icon, group, status: 'active'|'dead'|'wip'}`. Sidebar dan breadcrumb sama-sama baca dari sini. Status `dead`/`wip` otomatis disembunyikan dari render tanpa perlu comment-out kode.
- **Effort:** M — **Impact:** Menengah (mencegah bug serupa di masa depan)

### 2.5 Breadcrumb untuk halaman dalam (dynamic/nested)
- **Masalah:** `/analysis/[ticker]` dan halaman dengan banyak tab tidak punya jejak "sedang di mana" selain judul halaman.
- **Rekomendasi:** Tambahkan breadcrumb tipis di atas header halaman: `Pasar › Analisis Saham › BBCA`. Membantu terutama saat user datang dari deep-link (share link, watchlist).
- **Effort:** S — **Impact:** Rendah–Menengah

---

## 3. Konsistensi Layout & Komponen

### 3.1 Pola tab tidak seragam antar halaman

| Halaman | Struktur Tab Saat Ini |
|---|---|
| Screener | `technical \| fundamental \| position` |
| Backtest | `Statistik \| Entry AI \| Kalkulator \| Banding` |
| Portfolio Dashboard | `overview \| holdings \| analytics \| target` |
| Analysis `[ticker]` | `Overview, Chart, Summary, Financials, Company, News, Ownership, Technical` (8 tab) |

- **Masalah:** Posisi, styling, dan perilaku tab kemungkinan besar tidak seragam karena dikembangkan di file terpisah — user harus "belajar ulang" pola UI tiap pindah halaman.
- **Rekomendasi:** Bangun 1 komponen `<PageTabs>` reusable (bisa dari `shadcn/ui Tabs` yang sudah dipakai project) dengan:
  - Sticky di bawah page header saat scroll
  - Underline indicator konsisten untuk tab aktif
  - Badge count opsional (misal jumlah trade di Backtest)
  - Overflow scroll horizontal otomatis di layar sempit
- Pasang ulang ke 4 halaman di atas **tanpa mengubah isi/logic per-tab**, hanya wadah komponennya.
- **Effort:** M — **Impact:** Tinggi (paling terasa karena dipakai di 4+ halaman utama)

### 3.2 Card/Stat tile styling
- **Masalah:** Hero stat tiles (`/`), StatCard (`/backtest`), SummaryCard (`/portfolio-dashboard`), KPI cards (`/analytics`) kemungkinan punya padding/shadow/border-radius berbeda karena ditulis terpisah.
- **Rekomendasi:** Satukan ke 1 komponen `<StatCard>` dengan props `{label, value, delta?, icon?, tone?: 'success'|'danger'|'neutral'}`. Semua halaman pakai komponen yang sama.
- **Effort:** M — **Impact:** Menengah

### 3.3 Tabel data (TableCard, DataTable, PortfolioTable, RankTable)
- **Masalah:** Banyak varian tabel dengan kemungkinan header style, sort icon, dan hover state berbeda-beda.
- **Rekomendasi:** Standarisasi 1 `<DataTable>` generik (bisa pakai TanStack Table karena TanStack Query sudah dipakai) dengan sort/search/pagination bawaan, dipakai ulang di Screener, Corporate Actions, Dividends, dan Backtest ranking.
- **Effort:** L — **Impact:** Menengah–Tinggi (jangka panjang menghemat banyak duplikasi kode)

### 3.4 Warna chart hardcoded
- **Masalah:** Chart Analytics pakai hex hardcoded (`#10b981` portofolio, `#a855f7` IHSG) alih-alih token tema.
- **Rekomendasi:** Ganti ke CSS variable tema (`--chart-1`, `--chart-2`, dst mengikuti konvensi shadcn) agar otomatis menyesuaikan dark/light mode seperti komponen lain.
- **Effort:** S — **Impact:** Menengah

### 3.5 Penamaan bahasa campur di sidebar
- **Masalah:** "Ringkasan Pasar", "Bandingkan" (Indonesia) berdampingan dengan "Screener", "Backtest" (Inggris dipertahankan).
- **Rekomendasi:** Bukan berarti harus 100% satu bahasa — istilah teknis pasar modal (Screener, Backtest) memang lazim tetap Inggris. Tapi dokumentasikan aturan ini secara eksplisit (mis. di `navigation.ts` sebagai comment) supaya konsisten saat menu baru ditambahkan, bukan keputusan ad-hoc per developer.
- **Effort:** S — **Impact:** Rendah

---

## 4. Loading, Error & Perceived Performance

### 4.1 Error boundary tidak merata
- **Masalah:** Hanya 3 dari 11+ halaman aktif punya `error.tsx` (`global`, `analysis`, `portfolio-dashboard`). Halaman lain berisiko crash blank saat API gagal.
- **Rekomendasi:** Tambahkan `error.tsx` seragam (pesan + tombol "Coba lagi" + link kembali ke beranda) ke semua folder route yang belum punya:
  - `screener/`, `backtest/`, `compare/`, `corporate-actions/`, `analytics/`, `history/`, `fundamentals/`, `stocks/dividends/`, `stocks/sharia/`, `stocks/prospectus/`
- **Effort:** S per halaman (total M) — **Impact:** Tinggi

### 4.2 `loading.tsx` untuk skeleton state
- **Masalah:** Tidak disebutkan adanya `loading.tsx` di route manapun — kemungkinan besar transisi antar halaman terasa "blank sesaat" sebelum data tampil.
- **Rekomendasi:** Tambahkan `loading.tsx` per route dengan skeleton yang meniru layout final (skeleton card, skeleton table row) — bukan spinner generik. Next.js App Router streaming akan otomatis menampilkan ini saat data di-fetch.
- **Effort:** M — **Impact:** Tinggi

### 4.3 Delay panjang tanpa komunikasi (Broker Summary 15–60 detik)
- **Masalah:** `GET /api/idx/broker-summary` butuh browser warmup + proxy Cloudflare bypass, bisa 15–60 detik. Tanpa indikator jelas, user mengira aplikasi hang.
- **Rekomendasi:**
  - Progress text eksplisit: *"Mengambil data broker dari IDX... (bisa sampai 60 detik)"*
  - Progress bar indeterminate atau step indicator ("Membuka sesi → Mengambil data → Selesai")
  - Tombol "Batalkan" opsional jika UX memungkinkan
- **Effort:** S — **Impact:** Tinggi (mencegah user mengira aplikasi rusak)

### 4.4 AI features dengan timeout panjang (60–90 detik)
- **Masalah:** `screener/ai-analysis` (90s), `backtest/ai-summary`, `backtest/ai-entry`, `analyze/prospectus` (SSE 3-pass) — semua proses lama tanpa pattern loading yang konsisten disebutkan.
- **Rekomendasi:** Buat 1 komponen `<AiLoadingState>` reusable dengan:
  - Pesan bertahap sesuai step SSE yang sudah ada di backend (`event: step/progress/data/error`) — backend sudah kirim data ini, tinggal di-render di UI secara visual (step 1/3, 2/3, 3/3)
  - Skeleton untuk hasil AI (bukan spinner kosong)
- **Effort:** M — **Impact:** Tinggi (AI adalah fitur andalan, pengalaman tunggu harus premium)

### 4.5 Screener 959-saham scan progress
- **Masalah:** Batch scan `BATCH_SIZE=10`, `BATCH_DELAY=1200ms` untuk 959 saham — total bisa >2 menit. Sudah ada progress bar menurut blueprint, pastikan juga menampilkan estimasi waktu tersisa dan `errorSummary` secara jelas (bukan hanya angka mentah).
- **Rekomendasi:** Tampilkan "Memindai 342/959 saham (~45 detik tersisa)" + ringkasan error dalam bahasa manusia ("12 saham dilewati karena data tidak cukup") bukan `only X bars: N, no quote: M` mentah.
- **Effort:** S — **Impact:** Menengah

---

## 5. Empty States & Onboarding

### 5.1 Watchlist & Portofolio tersembunyi total saat kosong
- **Masalah:** Section "Watchlist" dan "Portofolio Saya" di sidebar hanya render jika `length > 0`. User baru tidak tahu fitur ini ada.
- **Rekomendasi:** Tetap tampilkan section dengan state kosong + CTA: *"⭐ Belum ada watchlist — tambah saham pertama"* / *"+ Buat portofolio pertama"*. Klik langsung membuka flow terkait (add ticker / create portfolio modal).
- **Effort:** S — **Impact:** Menengah–Tinggi (penemuan fitur untuk user baru)

### 5.2 Tidak ada onboarding untuk fitur kompleks
- **Masalah:** Screener (technical+fundamental+position), Backtest (8 strategi), Fundamentals Terminal (smart money, Graham fair value) — semua fitur canggih tanpa penjelasan singkat untuk user baru.
- **Rekomendasi:** Tambahkan tooltip info (ikon `?`) di judul tiap section kompleks berisi 1-2 kalimat penjelasan istilah (mis. "Golden Cross: sinyal beli saat MA50 memotong ke atas MA200"). Tidak perlu tur onboarding penuh dulu — cukup contextual help.
- **Effort:** M — **Impact:** Menengah

### 5.3 Halaman kosong pertama kali dibuka (Portfolio Dashboard tanpa data)
- **Masalah:** Jika user belum punya portofolio/transaksi, kemungkinan besar dashboard tampil kosong tanpa arahan.
- **Rekomendasi:** Empty state dengan ilustrasi ringan + CTA jelas: *"Mulai lacak portofolio Anda"* → tombol "Tambah Saham Pertama".
- **Effort:** S — **Impact:** Menengah

---

## 6. Aksesibilitas & Visual Consistency

### 6.1 Indikator warna-saja (color-only signaling)
- **Masalah:** Naik/Turun, breadth, yield badge, health score, sharia status — banyak mengandalkan warna hijau/merah/kuning saja.
- **Rekomendasi:** Tambahkan ikon kecil di samping warna:
  - Naik/Turun → ▲/▼
  - Yield badge → gunakan label teks tetap terlihat ("Rendah/Sedang/Tinggi") bukan hanya warna
  - Sharia status → sudah pakai `Check/XCircle` ikon (bagus, pertahankan pola ini di tempat lain)
- **Effort:** S — **Impact:** Menengah (aksesibilitas + kecepatan baca)

### 6.2 Kontras warna dark chart
- **Masalah:** Chart cumulative return Analytics disebut "dark" — perlu dicek kontras warna terhadap background di mode light vs dark agar tetap terbaca (WCAG AA minimum 4.5:1 untuk teks, 3:1 untuk elemen grafis penting).
- **Rekomendasi:** Audit kontras dengan tool (Chrome DevTools contrast checker) setelah migrasi ke token tema (lihat 3.4).
- **Effort:** S — **Impact:** Rendah–Menengah

### 6.3 Keyboard navigation
- **Masalah:** Tidak disebutkan dukungan keyboard untuk tab switching, table row navigation, atau command palette (jika 2.2 diimplementasikan).
- **Rekomendasi:** Pastikan semua interaktif elemen (tab, tombol filter, row tabel yang clickable) bisa diakses via `Tab` + `Enter`/`Space`, dan command palette (2.2) mendukung arrow key + enter.
- **Effort:** M — **Impact:** Rendah (niche tapi penting untuk power user & compliance)

### 6.4 Skala font & touch target
- **Masalah:** Belum ada info eksplisit soal minimum touch target size untuk elemen mobile (tombol, badge yang clickable).
- **Rekomendasi:** Pastikan semua elemen tap minimal 44×44px sesuai guideline umum (Apple HIG / Material Design), terutama di kartu saham mobile (`stocks/sharia` grid cards, `stocks/dividends` mobile cards).
- **Effort:** S — **Impact:** Menengah

---

## 7. Mobile & Responsive

### 7.1 8-tab di halaman Analysis berpotensi overflow di mobile
- **Masalah:** 8 tab horizontal (`Overview, Chart, Summary, Financials, Company, News, Ownership, Technical`) sulit muat di layar <400px.
- **Rekomendasi:** Di breakpoint mobile, ganti jadi:
  - Dropdown/select untuk pilih tab, ATAU
  - Scroll horizontal dengan gradient fade + panah indikator "lebih banyak →"
  Tidak menghapus tab manapun, hanya adaptasi kontainer.
- **Effort:** M — **Impact:** Tinggi (halaman detail saham = halaman paling sering dibuka)

### 7.2 Tabel besar (Screener 959 baris, All-Stocks 100 baris)
- **Masalah:** Tabel lebar dengan banyak kolom (Ticker/Name/Price/Signal/Score/Strategy/Win%/Sharpe/Action) sulit dibaca di mobile bila hanya di-scroll horizontal begitu saja.
- **Rekomendasi:** Terapkan pola yang sudah dipakai di `stocks/dividends` (desktop table + mobile card) secara konsisten ke Screener dan All-Stocks tab juga. Card mobile tampilkan kolom prioritas saja (Ticker, Price, Signal, Score) + expand untuk detail.
- **Effort:** M — **Impact:** Tinggi

### 7.3 Sidebar collapsed menyembunyikan IHSG Live Chip
- **Masalah:** IHSG chip (indikator pasar real-time) hilang saat sidebar di-collapse — padahal ini info yang paling sering ingin dilihat sekilas.
- **Rekomendasi:** Saat collapsed, tampilkan versi mini (dot warna + persen saja, tanpa label penuh) alih-alih disembunyikan total.
- **Effort:** S — **Impact:** Menengah

### 7.4 Form input di halaman Backtest & Compare (touch-friendly)
- **Masalah:** Input ticker + select strategy + years — pastikan dropdown native-friendly di mobile (bukan custom dropdown yang sulit di-tap).
- **Rekomendasi:** Gunakan native `<select>` atau shadcn Select yang sudah mobile-tested, pastikan area tap cukup besar.
- **Effort:** S — **Impact:** Rendah–Menengah

---

## 8. Performa Teknis yang Berdampak ke UX

### 8.1 Dual WebSocket connection per tab
- **Masalah:** Halaman `/` membangun WS sendiri (~40 ticker) dan `LiveIhsgChip` di sidebar membangun WS terpisah untuk `^JKSE`. Artinya 2 koneksi WS aktif bersamaan per tab browser — boros resource, terutama di mobile/koneksi lambat.
- **Rekomendasi:** Satukan lewat 1 `WsProvider` context di root layout (`layout.tsx`), semua konsumen (`LiveIhsgChip`, `useMarketData`, dll) subscribe ke context yang sama alih-alih membuat instance `useWebSocket` baru masing-masing.
- **Effort:** M — **Impact:** Tinggi (device dengan baterai/data terbatas akan sangat terasa)

### 8.2 Publisher tetap jalan 3 detik meski market tutup
- **Masalah:** `price-publisher.ts` tetap polling tiap 3 detik walau sesi market `closed` — buang kuota Yahoo API dan resource server tanpa manfaat UX (harga toh tidak berubah).
- **Rekomendasi:** Turunkan interval jadi 10-30 detik (atau pause total) saat `session === 'closed'`. Efek UX: tidak ada perubahan yang user rasakan (data tetap statis saat market tutup), tapi mengurangi beban server yang bisa berimbas ke response time fitur lain.
- **Effort:** S — **Impact:** Menengah (tidak langsung terlihat user, tapi memperbaiki stabilitas keseluruhan)

### 8.3 Cache/memoization untuk data yang jarang berubah
- **Masalah:** Beberapa endpoint (`stock-screener`, `sharia-list`, `corporate-actions`) kemungkinan bisa di-cache lebih agresif di sisi client (TanStack Query sudah tersedia) karena data ini tidak berubah tiap detik.
- **Rekomendasi:** Set `staleTime` yang lebih panjang (mis. 5-15 menit) untuk query jenis ini di TanStack Query config, supaya navigasi bolak-balik antar halaman terasa instan (data dari cache, tidak fetch ulang).
- **Effort:** S — **Impact:** Menengah–Tinggi (navigasi terasa jauh lebih cepat)

---

## 9. Kebersihan Kode/Route (Housekeeping)

> Item ini tidak berdampak langsung ke user, tapi mencegah bug UX di masa depan (seperti kasus menu Agregat).

| Item | Tindakan | Effort |
|---|---|---|
| `/dashboard`, `/portfolio`, `/stocks`, `/stock-analysis` — redirect routes | Pertahankan sebagai redirect (baik untuk backward-compat link lama), tapi pastikan **tidak ada link internal** yang mengarah ke sini — semua link baru langsung ke tujuan akhir | S |
| `src/app/dashboard/layout.tsx` — passthrough `return children` | Hapus file, tidak berguna | S |
| 16 folder API scaffold kosong (`api/analyze/ai-analysis`, `api/idx/announcements`, dll) | Audit dulu: apakah ada tombol/UI yang diam-diam memanggil endpoint ini? Kalau tidak dipakai, hapus foldernya. Kalau direncanakan, tambahkan minimal `501 Not Implemented` supaya error jelas, bukan 404 membingungkan | M |
| `MENU_GROUPS` hard-coded | Lihat 2.4 — pindahkan ke config terpusat | M |

---

## 10. Roadmap Bertahap

### Sprint 1 — Quick Wins (tidak sentuh arsitektur, langsung terasa)
- [ ] 2.1 Sembunyikan menu "Agregat" yang mati
- [ ] 2.3 Samakan judul halaman `/analytics` → "Performa Portofolio"
- [ ] 3.4 Ganti warna chart hardcoded → token tema
- [ ] 4.3 Progress text eksplisit untuk Broker Summary
- [ ] 5.1 Empty state Watchlist/Portofolio di sidebar
- [ ] 6.1 Tambah ikon ▲/▼ di indikator naik/turun
- [ ] 7.3 Mini IHSG chip saat sidebar collapsed

### Sprint 2 — Konsistensi Komponen
- [ ] 3.1 Bangun `<PageTabs>` reusable, pasang ke 4 halaman utama
- [ ] 3.2 Bangun `<StatCard>` reusable
- [ ] 4.1 & 4.2 Tambah `error.tsx` + `loading.tsx` ke semua route
- [ ] 8.3 Tuning `staleTime` TanStack Query untuk data statis

### Sprint 3 — Navigasi & Discoverability
- [ ] 2.2 Global search / command palette
- [ ] 2.5 Breadcrumb halaman dalam
- [ ] 5.2 Tooltip kontekstual untuk istilah teknis
- [ ] 7.1 Adaptasi 8-tab Analysis untuk mobile
- [ ] 7.2 Pola desktop-table/mobile-card ke Screener & All-Stocks

### Sprint 4 — Performa & Infrastruktur
- [ ] 8.1 Unifikasi WebSocket ke satu `WsProvider`
- [ ] 8.2 Throttle publisher saat market closed
- [ ] 2.4 & 9 Config navigasi terpusat + housekeeping route/API kosong
- [ ] 3.3 `<DataTable>` generik (opsional, effort besar — bisa jadi proyek terpisah)

---

## 11. Checklist QA Sebelum Rilis

Setelah tiap sprint di atas dikerjakan, verifikasi hal berikut belum rusak (karena ini murni perubahan UI, risiko regresi fitur harus tetap dicek):

- [ ] Semua 61 API endpoint masih dipanggil dengan parameter yang sama (tidak ada perubahan contract)
- [ ] WebSocket subscribe/unsubscribe masih berfungsi normal di semua halaman konsumen (`/`, `LiveIhsgChip`, `portfolio-dashboard`, `analytics`, `analysis/[ticker]`)
- [ ] Dark/light mode tetap konsisten di semua chart yang diubah warnanya
- [ ] Semua redirect lama (`/dashboard`, `/portfolio`, dst) masih berfungsi untuk bookmark/link eksternal yang sudah ada
- [ ] Mobile breakpoint ditest di minimal 2 ukuran layar (360px, 414px)
- [ ] Screen reader dasar (VoiceOver/TalkBack) bisa navigasi tab utama tanpa nyasar
- [ ] Tidak ada fitur AI (screener ai-analysis, backtest ai-summary/ai-entry, prospectus analyzer) yang timeout lebih cepat dari sebelumnya akibat perubahan loading state

---

*Dokumen ini adalah lapisan rekomendasi UX di atas `BLUEPRINT.md` — tidak mengubah spesifikasi API, WebSocket, atau data model yang sudah didokumentasikan di sana.*
