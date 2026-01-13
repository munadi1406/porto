# Portfolio Saham IDX (Next.js 14+)

Aplikasi manajemen portofolio saham sederhana untuk investor ritel Indonesia, menggunakan Next.js App Router, Tailwind CSS, dan Yahoo Finance API (GRATIS).

## Fitur Utama
- **CRUD Portofolio**: Simpan data saham (Kode, Lot, Harga Avg) di LocalStorage browser (Data tidak hilang saat refresh).
- **Harga Live**: Auto-refresh harga saham setiap 60 detik dari Yahoo Finance.
- **Ringkasan Real-time**: Total Aset, Profit/Loss Floating, dan % Return.
- **Visualisasi**: Pie chart alokasi aset.
- **Tanpa Backend**: Menggunakan Next.js API Routes sebagai proxy ke Yahoo Finance.

## Cara Menjalankan Project

### Prasyarat
- Node.js 18+ terinstall

### Langkah-langkah
1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Jalankan Development Server**
    ```bash
    npm run dev
    ```

3.  **Buka Aplikasi**
    Buka [http://localhost:3000](http://localhost:3000) di browser.

## Struktur Project
- `src/app/api/price`: Endpoint server-side untuk fetch harga saham (bypass CORS & caching).
- `src/hooks`: Logic state management (LocalStorage & Data Fetching).
- `src/components`: UI Components (Dashboard, Table, Chart).

## Deployment (Vercel)
Aplikasi ini "Vercel Ready".
1. Push ke GitHub.
2. Import project di Vercel.
3. Deploy (Tidak perlu config khusus).

## Catatan
- Gunakan suffix `.JK` untuk saham Indonesia (contoh: `BBCA.JK`, `TLKM.JK`).
- Jika harga saham `0`, berarti sedang gagal fetch atau market tutup/delay (fallback mechanism).
