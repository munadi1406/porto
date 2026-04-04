# Wahana Otomatis - Crypto Trading Bot Simulator

## 📋 Deskripsi

**Wahana Otomatis** adalah fitur simulator trading bot cryptocurrency yang berjalan secara otomatis. Fitur ini **terpisah sepenuhnya** dari portfolio saham Anda dan dirancang khusus untuk simulasi trading crypto dengan berbagai strategi otomatis.

## ✨ Fitur Utama

### 1. **Multiple Trading Bots**
- Buat dan kelola beberapa bot trading sekaligus
- Setiap bot memiliki modal dan strategi independen
- Bot dapat diaktifkan/dinonaktifkan kapan saja

### 2. **Strategi Trading**
Bot mendukung 4 strategi trading:

- **Scalping**: Trading cepat untuk profit kecil tapi sering
- **Swing Trading**: Hold beberapa jam/hari untuk profit lebih besar
- **DCA (Dollar Cost Averaging)**: Beli secara berkala dengan jumlah tetap
- **Grid Trading**: Beli dan jual di level harga yang berbeda

### 3. **Auto Trading Logic**
Bot akan **otomatis** melakukan:
- ✅ **Buy** saat harga turun mencapai threshold
- ✅ **Sell** saat profit mencapai target atau stop loss triggered
- ✅ **Risk Management** dengan max position size
- ✅ **Take Profit & Stop Loss** otomatis

### 4. **Real-time Simulation**
- Harga crypto berubah real-time (simulasi)
- Bot trading berjalan otomatis di background
- Update performance secara live

### 5. **Cryptocurrency Support**
Bot mendukung trading untuk:
- Bitcoin (BTC)
- Ethereum (ETH)
- Binance Coin (BNB)
- Solana (SOL)
- Cardano (ADA)
- Ripple (XRP)
- Dogecoin (DOGE)
- Polygon (MATIC)
- Polkadot (DOT)
- Avalanche (AVAX)

## 🎯 Cara Menggunakan

### 1. Buat Bot Baru
1. Klik tombol **"Buat Bot Baru"**
2. Isi konfigurasi bot:
   - **Nama Bot** (opsional)
   - **Strategi Trading** (pilih salah satu)
   - **Modal Awal** (minimum 1 juta IDR)
   - **Target Crypto** (pilih cryptocurrency)
   - **Trading Parameters**:
     - Buy Threshold: % penurunan untuk trigger buy
     - Sell Threshold: % kenaikan untuk trigger sell
     - Max Position: % maksimal modal per trade
     - Stop Loss: % kerugian untuk cut loss
3. Klik **"Buat Bot"**

### 2. Aktifkan Bot
- Klik tombol **Play** (▶️) pada bot card
- Bot akan mulai trading otomatis
- Status berubah menjadi **"AKTIF"**

### 3. Monitor Performance
- Lihat profit/loss real-time di bot card
- Klik bot untuk melihat **Trade History** detail
- Monitor:
  - Total trades
  - Win rate
  - Profit/loss
  - Harga crypto saat ini

### 4. Nonaktifkan Bot
- Klik tombol **Pause** (⏸️) untuk menghentikan trading
- Bot akan berhenti melakukan transaksi baru
- Position yang sudah open tetap akan di-manage

### 5. Hapus Bot
- Klik tombol **Trash** (🗑️) untuk menghapus bot
- Semua data trading dan history akan dihapus

## 🔧 Parameter Trading

### Buy Threshold (%)
Persentase penurunan harga yang akan trigger pembelian.
- Contoh: 2% → Bot akan buy saat harga turun 2%

### Sell Threshold (%)
Persentase kenaikan harga yang akan trigger penjualan.
- Contoh: 3% → Bot akan sell saat harga naik 3%

### Max Position Size (%)
Maksimal persentase modal yang digunakan per trade.
- Contoh: 20% → Maksimal 20% dari modal per transaksi

### Stop Loss (%)
Persentase kerugian yang akan trigger cut loss otomatis.
- Contoh: 5% → Bot akan sell saat rugi 5%

### Take Profit (%)
Persentase profit yang akan trigger sell otomatis.
- Contoh: 10% → Bot akan sell saat profit 10%

### Scalping Interval (detik)
Interval waktu antara pengecekan trading (khusus scalping).
- Contoh: 5 detik → Bot cek harga setiap 5 detik

### Min Profit (%)
Minimum profit yang harus dicapai sebelum sell (khusus scalping).
- Contoh: 0.5% → Minimal profit 0.5% untuk sell

## 📊 Dashboard Features

### Summary Stats
- **Total Modal**: Total modal dari semua bot
- **Total Profit**: Total profit/loss gabungan
- **Bot Aktif**: Jumlah bot yang sedang aktif
- **Total Trades**: Total transaksi dari semua bot

### Bot Cards
Setiap bot menampilkan:
- Nama dan status (Aktif/Nonaktif)
- Target crypto dan strategi
- Modal saat ini
- Profit/Loss (IDR dan %)
- Total trades dan win rate
- Harga crypto real-time

### Trade History
Detail transaksi meliputi:
- Waktu transaksi
- Tipe (Buy/Sell)
- Cryptocurrency
- Jumlah crypto
- Harga saat transaksi
- Total nilai transaksi
- Profit/Loss (untuk sell)
- Alasan transaksi

## 🎮 Strategi Trading Detail

### 1. Scalping
**Karakteristik:**
- Trading sangat cepat (detik/menit)
- Target profit kecil (0.5% - 2%)
- Frekuensi trading tinggi
- Cocok untuk: Volatilitas tinggi

**Best Practice:**
- Set interval rendah (3-5 detik)
- Min profit kecil (0.3% - 0.5%)
- Buy/sell threshold kecil (1% - 2%)

### 2. Swing Trading
**Karakteristik:**
- Hold posisi beberapa jam/hari
- Target profit lebih besar (5% - 15%)
- Frekuensi trading sedang
- Cocok untuk: Trend yang jelas

**Best Practice:**
- Set threshold lebih besar (3% - 5%)
- Take profit lebih tinggi (10% - 20%)
- Stop loss moderat (5% - 7%)

### 3. DCA (Dollar Cost Averaging)
**Karakteristik:**
- Beli berkala dengan jumlah tetap
- Tidak peduli harga naik/turun
- Risk rendah, return stabil
- Cocok untuk: Long-term investment

**Best Practice:**
- Buy threshold konsisten
- Max position kecil (10% - 20%)
- Jarang sell, hold untuk long-term

### 4. Grid Trading
**Karakteristik:**
- Beli dan jual di level harga berbeda
- Profit dari volatilitas
- Multiple position
- Cocok untuk: Sideways market

**Best Practice:**
- Set multiple buy/sell levels
- Profit kecil per trade
- Volume trading tinggi

## ⚠️ Penting untuk Diketahui

### ✅ Keunggulan
- **Terpisah dari Saham**: Tidak akan mempengaruhi portfolio saham Anda
- **Simulasi Aman**: Menggunakan data simulasi, bukan uang real
- **Belajar Trading**: Cocok untuk belajar strategi trading
- **Multiple Bots**: Bisa test berbagai strategi sekaligus
- **Auto Trading**: Bot bekerja otomatis 24/7

### ⚠️ Catatan
- **Ini adalah SIMULATOR**: Bukan trading real dengan uang sungguhan
- **Harga Simulasi**: Harga crypto adalah simulasi, bukan harga real
- **Untuk Edukasi**: Gunakan untuk belajar dan test strategi
- **Data di LocalStorage**: Data disimpan di browser Anda

## 🔐 Data & Privacy

### Penyimpanan Data
- Semua data bot disimpan di **localStorage** browser
- Data **tidak dikirim** ke server manapun
- Data **terpisah** dari data portfolio saham

### Data yang Disimpan
- Konfigurasi bot
- Trading history
- Position history
- Performance metrics

### Menghapus Data
- Hapus bot individual: Klik tombol trash pada bot
- Clear semua data: Clear browser localStorage

## 🚀 Tips & Tricks

### 1. Start Small
- Mulai dengan modal kecil untuk test
- Coba berbagai strategi
- Pelajari pattern trading

### 2. Monitor Performance
- Cek win rate secara berkala
- Analisis trade history
- Adjust parameter jika perlu

### 3. Risk Management
- Jangan set max position terlalu besar
- Selalu gunakan stop loss
- Diversifikasi dengan multiple bots

### 4. Test Strategies
- Buat beberapa bot dengan strategi berbeda
- Compare performance
- Fokus pada strategi yang profitable

### 5. Learn from Trades
- Review trade history
- Understand why bot buy/sell
- Improve parameter settings

## 📈 Performance Metrics

### Win Rate
Persentase trade yang profitable.
- Formula: (Winning Trades / Total Trades) × 100%
- Good: > 60%
- Excellent: > 75%

### Total Profit/Loss
Total keuntungan/kerugian dalam IDR dan %.
- Positif = Profitable
- Negatif = Loss

### Average Profit
Rata-rata profit per trade.
- Semakin tinggi semakin baik
- Harus > 0 untuk profitable

### Max Drawdown
Penurunan maksimal dari peak capital.
- Semakin rendah semakin baik
- Indikator risk management

## 🎓 Learning Resources

### Recommended Learning Path
1. **Pahami Dasar Trading**
   - Buy low, sell high
   - Support & resistance
   - Trend analysis

2. **Test Strategi Sederhana**
   - Mulai dengan scalping
   - Parameter konservatif
   - Monitor hasil

3. **Optimize Parameters**
   - Adjust berdasarkan hasil
   - Test berbagai threshold
   - Find sweet spot

4. **Advanced Strategies**
   - Combine multiple indicators
   - Grid trading
   - DCA for long-term

## 🔄 Update & Maintenance

### Auto Updates
- Harga crypto update setiap 2-3 detik
- Trade history refresh setiap 5 detik
- Performance metrics real-time

### Manual Refresh
- Reload page untuk reset simulasi
- Clear localStorage untuk fresh start

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Review dokumentasi ini
2. Check trade history untuk debug
3. Test dengan modal kecil dulu
4. Adjust parameter secara bertahap

---

**Selamat Trading! 🚀**

*Disclaimer: Ini adalah simulator untuk edukasi. Bukan trading real dengan uang sungguhan.*
