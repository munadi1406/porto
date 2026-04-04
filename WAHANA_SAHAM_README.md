# 🤖 Wahana Saham Indonesia - Stock Trading Bot

## ✅ Fitur Berhasil Dibuat!

Fitur **Wahana Saham Indonesia** telah berhasil dibuat dan siap digunakan! Ini adalah auto trading bot untuk saham Indonesia (IDX) yang menggunakan **harga real-time dari Yahoo Finance** dan **terpisah sepenuhnya** dari portfolio saham dan crypto bot Anda.

## 📁 File yang Dibuat

### 1. **Types & Data Models**
- `src/lib/stockBotTypes.ts` - Type definitions untuk bot, trades, positions, dan performance
- `src/lib/stockBotStorage.ts` - LocalStorage management untuk data bot
- `src/lib/stockBotApi.ts` - Simulator harga saham IDX real-time

### 2. **Pages**
- `src/app/stock-bot/page.tsx` - Halaman utama Wahana Saham Indonesia

### 3. **Components**
- `src/components/CreateStockBotModal.tsx` - Modal untuk membuat bot baru
- `src/components/StockBotCard.tsx` - Card untuk menampilkan bot dengan auto-trading logic
- `src/components/StockBotTradeHistory.tsx` - Tabel history transaksi bot

### 4. **Navigation**
- Updated `src/components/MobileNav.tsx` - Menambahkan menu "Stock Bot"

## 🚀 Cara Mengakses

1. **Desktop**: Klik menu **"Stock Bot"** di sidebar kiri (bagian Trading Tools)
2. **Mobile**: Klik tombol **"Menu"** di bottom navigation, lalu pilih **"Stock Bot"** di bagian "Trading Tools"

## 🎯 Fitur Utama

### ✨ Auto Trading
- Bot trading berjalan **otomatis** saat diaktifkan
- Buy/Sell otomatis berdasarkan strategi
- **Real-time price updates** dari Yahoo Finance
- Trading logic berjalan di background
- **Support semua saham IDX** - tidak terbatas pada daftar tertentu
- **Auto-pause saat bursa tutup** - Bot otomatis berhenti trading di luar jam bursa

### ⏰ Jam Bursa IDX
- **Senin - Jumat**: 09:00 - 16:00 WIB
- **Sesi 1**: 09:00 - 11:30 WIB (Semua hari kerja)
- **Istirahat**: 11:30 - 13:30/14:00 WIB
- **Sesi 2 (Senin-Kamis)**: 13:30 - 16:00 WIB
- **Sesi 2 (Jumat)**: 14:00 - 16:00 WIB
- **Akhir Pekan**: Bursa tutup
- Bot akan otomatis **pause trading** di luar jam bursa
- Harga tetap diupdate untuk monitoring

### 📊 4 Strategi Trading
1. **Scalping** - Trading cepat, profit kecil tapi sering
2. **Swing Trading** - Hold beberapa hari untuk profit lebih besar
3. **DCA** - Dollar Cost Averaging, beli berkala
4. **Breakout** - Momentum trading saat harga breakout

### 💰 Support Semua Saham Indonesia (IDX)

Bot mendukung **SEMUA saham yang terdaftar di Bursa Efek Indonesia (IDX)**. Anda bisa memasukkan kode saham apapun!

**Contoh saham populer:**
- BBCA.JK - Bank BCA
- BBRI.JK - Bank BRI
- BMRI.JK - Bank Mandiri
- TLKM.JK - Telkom Indonesia
- ASII.JK - Astra International
- UNVR.JK - Unilever Indonesia
- BBNI.JK - Bank BNI
- GOTO.JK - GoTo Gojek Tokopedia
- EMTK.JK - Elang Mahkota Teknologi
- ICBP.JK - Indofood CBP
- INDF.JK - Indofood Sukses Makmur
- KLBF.JK - Kalbe Farma
- ADRO.JK - Adaro Energy
- PTBA.JK - Bukit Asam
- ANTM.JK - Aneka Tambang
- Dan **semua saham IDX lainnya**!

**Cara input:**
- Masukkan kode saham dengan format: `KODE.JK` (contoh: `BBCA.JK`)
- Atau tanpa .JK (contoh: `BBCA`) - akan otomatis ditambahkan
- Gunakan autocomplete untuk melihat saran saham populer

### 🎮 Trading Parameters
- **Buy Threshold** - % penurunan untuk trigger buy
- **Sell Threshold** - % kenaikan untuk trigger sell
- **Max Position Size** - % maksimal modal per trade
- **Stop Loss** - % kerugian untuk cut loss
- **Take Profit** - % profit untuk sell otomatis
- **Scalping Interval** - Interval pengecekan (detik)
- **Min Profit** - Minimum profit untuk scalping

### 📈 Performance Metrics
- Total Trades
- Win Rate (%)
- Loss Rate (%)
- Total Profit/Loss
- Average Profit
- Average Loss

## 🔥 Cara Menggunakan

### Step 1: Buat Bot
```
1. Klik "Buat Bot Baru"
2. Isi nama bot (opsional)
3. Pilih strategi (Scalping/Swing/DCA/Breakout)
4. Set modal awal (min 1 juta IDR)
5. Pilih saham target (contoh: BBCA - Bank BCA)
6. Atur trading parameters
7. Klik "Buat Bot"
```

### Step 2: Aktifkan Bot
```
1. Klik tombol Play (▶️) pada bot card
2. Bot akan mulai trading otomatis
3. Status berubah jadi "AKTIF"
```

### Step 3: Monitor
```
1. Lihat profit/loss real-time
2. Klik bot untuk lihat trade history
3. Monitor win rate dan total trades
```

### Step 4: Kelola Bot
```
- Pause (⏸️): Stop trading sementara
- Play (▶️): Resume trading
- Trash (🗑️): Hapus bot dan semua data
```

## ⚡ Auto Trading Logic

Bot akan otomatis:

### 📉 BUY Signal
- Saat harga turun >= Buy Threshold
- Menggunakan max position size dari modal
- Membeli dalam satuan lot (1 lot = 100 saham)
- Create buy trade dan open position

### 📈 SELL Signal
- Saat profit >= Take Profit → Jual untuk ambil untung
- Saat loss >= Stop Loss → Jual untuk cut loss
- Saat profit >= Min Profit + harga naik >= Sell Threshold (scalping)

### 🔄 Continuous Trading
- Bot cek harga setiap X detik (sesuai interval)
- Otomatis buy/sell berdasarkan kondisi
- Update capital setelah setiap trade
- Maksimal 3 posisi terbuka per bot

## 🎨 Dashboard Features

### Summary Cards
- **Total Modal** - Total modal dari semua bot
- **Total Profit** - Profit/loss gabungan
- **Bot Aktif** - Jumlah bot yang running
- **Total Trades** - Total transaksi semua bot

### Bot Cards
Setiap bot menampilkan:
- Nama & status (Aktif/Nonaktif)
- Target saham & strategi
- Modal saat ini
- Profit/Loss (IDR & %)
- Harga saham real-time
- Perubahan harga (%)
- Control buttons (Play/Pause/Delete)

### Trade History
Detail lengkap:
- Waktu transaksi
- Tipe (Buy/Sell)
- Saham
- Jumlah lot & lembar
- Harga per saham
- Total nilai transaksi
- Profit/Loss (untuk sell)
- Alasan transaksi

### Performance Metrics
- Win Rate - Persentase trade yang profit
- Loss Rate - Persentase trade yang rugi
- Average Profit - Rata-rata profit per trade
- Average Loss - Rata-rata loss per trade

## 🔐 Data & Privacy

### ✅ Keamanan
- **Terpisah dari Portfolio**: Data bot tidak akan mempengaruhi portfolio saham utama
- **LocalStorage**: Semua data disimpan di browser Anda
- **No Server**: Data tidak dikirim ke server manapun
- **Simulator**: Bukan trading real, hanya simulasi

### 📦 Data yang Disimpan
- Konfigurasi bot (settings, strategy, capital)
- Trading history (buy/sell transactions)
- Position history (open/closed positions)
- Performance metrics (calculated on-the-fly)

## ⚠️ Penting!

### ✅ Bot dengan Harga Real
- **Menggunakan harga real** dari Yahoo Finance API
- **Bukan trading real** - tidak ada transaksi sungguhan di bursa
- **Untuk edukasi** dan belajar strategi trading
- **Aman untuk eksperimen** tanpa risiko kehilangan uang
- Data harga update secara real-time dari pasar

### 🎓 Gunakan Untuk
- Belajar strategi trading saham Indonesia
- Test berbagai parameter trading
- Understand buy/sell signals
- Practice risk management
- Experiment dengan auto trading

## 🐛 Troubleshooting

### Bot Tidak Trading
- Pastikan bot sudah **diaktifkan** (status AKTIF)
- Check modal masih cukup untuk buy (min 1 lot)
- Lihat trade history untuk debug
- Pastikan threshold tidak terlalu tinggi

### Error di Console
- Refresh page untuk reset
- Clear localStorage jika perlu
- Check browser console untuk detail error

### Harga Tidak Update
- Harga update setiap beberapa detik
- Refresh page jika stuck
- Check internet connection

## 📚 Tips & Best Practices

### 1. Start Small
- Mulai dengan modal kecil (1-10 juta)
- Test satu strategi dulu
- Pelajari pattern trading

### 2. Adjust Parameters
- Monitor win rate
- Adjust threshold jika perlu
- Test berbagai kombinasi
- Perhatikan volatilitas saham

### 3. Risk Management
- Jangan set max position terlalu besar (20-30% max)
- Selalu gunakan stop loss
- Diversifikasi dengan multiple bots
- Maksimal 3 posisi terbuka per bot

### 4. Learn & Improve
- Review trade history
- Understand why bot buy/sell
- Optimize based on results
- Bandingkan strategi berbeda

### 5. Pilih Saham yang Tepat
- Saham liquid (volume tinggi)
- Volatilitas sedang untuk scalping
- Blue chip untuk swing trading
- Hindari saham yang terlalu volatile

## 🎉 Selamat Mencoba!

Fitur Wahana Saham Indonesia siap digunakan! Mulai buat bot pertama Anda dan lihat bagaimana auto trading untuk saham IDX bekerja.

**Akses**: Menu → Trading Tools → Stock Bot

---

## 📊 Perbedaan dengan Crypto Bot

| Feature | Crypto Bot | Stock Bot |
|---------|-----------|-----------|
| Asset | Cryptocurrency | Saham Indonesia (IDX) |
| Unit | Amount (decimal) | Lot (1 lot = 100 saham) |
| Volatilitas | Tinggi (2-5%) | Sedang (0.5-3%) |
| Strategi | Scalping, Swing, DCA, Grid | Scalping, Swing, DCA, Breakout |
| Jumlah Asset | 10 crypto | 15 saham IDX |
| Harga | USD equivalent | Rupiah |
| Trading Hours | 24/7 | Simulasi 24/7 |

---

**Note**: Bot ini menggunakan harga real-time dari Yahoo Finance untuk memberikan pengalaman trading yang realistis. Namun, semua transaksi adalah simulasi - tidak ada uang sungguhan yang digunakan atau transaksi real di bursa. Gunakan untuk belajar dan berlatih strategi trading tanpa risiko.
