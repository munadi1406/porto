# 🤖 Wahana Otomatis - Crypto Trading Bot

## ✅ Fitur Berhasil Dibuat!

Fitur **Wahana Otomatis** telah berhasil dibuat dan siap digunakan! Ini adalah simulator trading bot cryptocurrency yang **terpisah sepenuhnya** dari portfolio saham Anda.

## 📁 File yang Dibuat

### 1. **Types & Data Models**
- `src/lib/cryptoTypes.ts` - Type definitions untuk bot, trades, positions, dan performance
- `src/lib/cryptoStorage.ts` - LocalStorage management untuk data bot
- `src/lib/cryptoApi.ts` - Simulator harga crypto real-time

### 2. **Pages**
- `src/app/crypto-bot/page.tsx` - Halaman utama Wahana Otomatis

### 3. **Components**
- `src/components/CreateBotModal.tsx` - Modal untuk membuat bot baru
- `src/components/BotCard.tsx` - Card untuk menampilkan bot dengan auto-trading logic
- `src/components/BotTradeHistory.tsx` - Tabel history transaksi bot

### 4. **Navigation**
- Updated `src/components/MobileNav.tsx` - Menambahkan menu "Crypto Bot"

### 5. **Documentation**
- `CRYPTO_BOT_GUIDE.md` - Panduan lengkap penggunaan

## 🚀 Cara Mengakses

1. **Desktop**: Klik menu **"Crypto Bot"** di sidebar kiri
2. **Mobile**: Klik tombol **"Menu"** di bottom navigation, lalu pilih **"Crypto Bot"** di bagian "Trading Tools"

## 🎯 Fitur Utama

### ✨ Auto Trading
- Bot trading berjalan **otomatis** saat diaktifkan
- Buy/Sell otomatis berdasarkan strategi
- Real-time price updates setiap 2-3 detik
- Trading logic berjalan di background

### 📊 4 Strategi Trading
1. **Scalping** - Trading cepat, profit kecil tapi sering
2. **Swing Trading** - Hold beberapa jam/hari untuk profit lebih besar
3. **DCA** - Dollar Cost Averaging, beli berkala
4. **Grid Trading** - Beli/jual di level harga berbeda

### 💰 10 Cryptocurrency
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
- Total Profit/Loss
- Average Profit
- Max Drawdown

## 🔥 Cara Menggunakan

### Step 1: Buat Bot
```
1. Klik "Buat Bot Baru"
2. Isi nama bot (opsional)
3. Pilih strategi (Scalping/Swing/DCA/Grid)
4. Set modal awal (min 1 juta IDR)
5. Pilih cryptocurrency target
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
- Create buy trade dan open position

### 📈 SELL Signal
- Saat profit >= Take Profit → Jual untuk ambil untung
- Saat loss >= Stop Loss → Jual untuk cut loss
- Saat profit >= Min Profit + harga naik >= Sell Threshold

### 🔄 Continuous Trading
- Bot cek harga setiap X detik (sesuai interval)
- Otomatis buy/sell berdasarkan kondisi
- Update capital setelah setiap trade

## 🎨 Dashboard Features

### Summary Cards
- **Total Modal** - Total modal dari semua bot
- **Total Profit** - Profit/loss gabungan
- **Bot Aktif** - Jumlah bot yang running
- **Total Trades** - Total transaksi semua bot

### Bot Cards
Setiap bot menampilkan:
- Nama & status (Aktif/Nonaktif)
- Target crypto & strategi
- Modal saat ini
- Profit/Loss (IDR & %)
- Total trades & win rate
- Harga crypto real-time
- Control buttons (Play/Pause/Delete)

### Trade History
Detail lengkap:
- Waktu transaksi
- Tipe (Buy/Sell)
- Cryptocurrency
- Jumlah & harga
- Total nilai
- Profit/Loss (untuk sell)
- Alasan transaksi

## 🔐 Data & Privacy

### ✅ Keamanan
- **Terpisah dari Saham**: Data bot tidak akan mempengaruhi portfolio saham
- **LocalStorage**: Semua data disimpan di browser Anda
- **No Server**: Data tidak dikirim ke server manapun
- **Simulator**: Bukan trading real, hanya simulasi

### 📦 Data yang Disimpan
- Konfigurasi bot (settings, strategy, capital)
- Trading history (buy/sell transactions)
- Position history (open/closed positions)
- Performance metrics (calculated on-the-fly)

## ⚠️ Penting!

### ✅ Ini Adalah SIMULATOR
- **Bukan trading real** dengan uang sungguhan
- **Harga simulasi**, bukan harga real crypto
- **Untuk edukasi** dan belajar strategi trading
- **Aman untuk eksperimen** tanpa risiko kehilangan uang

### 🎓 Gunakan Untuk
- Belajar strategi trading
- Test berbagai parameter
- Understand buy/sell signals
- Practice risk management
- Experiment dengan crypto trading

## 🐛 Troubleshooting

### Bot Tidak Trading
- Pastikan bot sudah **diaktifkan** (status AKTIF)
- Check modal masih cukup untuk buy
- Lihat trade history untuk debug

### Error di Console
- Refresh page untuk reset
- Clear localStorage jika perlu
- Check browser console untuk detail error

### Harga Tidak Update
- Harga update setiap 2-3 detik
- Refresh page jika stuck
- Check internet connection

## 📚 Tips & Best Practices

### 1. Start Small
- Mulai dengan modal kecil (1-5 juta)
- Test satu strategi dulu
- Pelajari pattern trading

### 2. Adjust Parameters
- Monitor win rate
- Adjust threshold jika perlu
- Test berbagai kombinasi

### 3. Risk Management
- Jangan set max position terlalu besar (20-30% max)
- Selalu gunakan stop loss
- Diversifikasi dengan multiple bots

### 4. Learn & Improve
- Review trade history
- Understand why bot buy/sell
- Optimize based on results

## 🎉 Selamat Mencoba!

Fitur Wahana Otomatis siap digunakan! Mulai buat bot pertama Anda dan lihat bagaimana auto trading bekerja.

**Akses**: Menu → Trading Tools → Crypto Bot

---

**Note**: Ini adalah simulator untuk edukasi. Semua trading adalah simulasi, bukan trading real dengan uang sungguhan.
