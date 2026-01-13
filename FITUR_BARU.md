# Fitur Baru - Portfolio Growth & Cash Holdings

## 1. Cash Holdings (Uang Tunai)
- **Lokasi**: Panel hijau di sebelah kanan dashboard
- **Fungsi**: Mencatat jumlah uang cash yang Anda pegang
- **Cara Pakai**:
  1. Klik tombol "Edit" pada panel Cash Holdings
  2. Masukkan jumlah uang cash Anda
  3. Klik "Save"
- **Data**: Tersimpan otomatis di LocalStorage browser

## 2. Portfolio Growth Tracking
- **Lokasi**: Panel ungu di bawah Cash Holdings
- **Fungsi**: Melacak pertumbuhan total portfolio (saham + cash) dalam berbagai periode
- **Periode yang Tersedia**:
  - **1D** (1 Day): Pertumbuhan dalam 24 jam terakhir
  - **1W** (1 Week): Pertumbuhan dalam 7 hari terakhir
  - **1Y** (1 Year): Pertumbuhan dalam 365 hari terakhir
  - **All**: Pertumbuhan sejak awal tracking

## 3. Cara Kerja Growth Tracking
- Aplikasi otomatis mencatat "snapshot" portfolio Anda setiap kali harga saham diupdate
- Snapshot mencatat:
  - Total nilai saham
  - Total cash
  - Total portfolio value
  - Timestamp
- Data snapshot disimpan maksimal 365 hari terakhir
- Pertumbuhan dihitung dengan membandingkan nilai portfolio saat ini dengan nilai di awal periode

## 4. Summary Cards (Updated)
- **Total Modal**: Total uang yang diinvestasikan di saham (berdasarkan harga beli rata-rata)
- **Total Portfolio**: Nilai total portfolio (nilai pasar saham + cash)
- **Unrealized P/L**: Profit/Loss yang belum direalisasi dari saham
- **Return Portfolio**: Persentase return dari investasi saham

## 5. Fitur Tambahan
- Auto-refresh harga saham setiap **10 detik**
- Cache API hanya **5 detik** untuk data yang lebih fresh
- Semua data tersimpan di LocalStorage (tidak hilang saat refresh)

## Tips Penggunaan
1. **Pertama kali**: Masukkan jumlah cash Anda terlebih dahulu
2. **Tracking Growth**: Biarkan aplikasi berjalan beberapa hari untuk melihat growth yang akurat
3. **Update Cash**: Jangan lupa update cash saat Anda deposit atau withdraw
4. **Snapshot**: Snapshot direkam otomatis, tidak perlu action manual
