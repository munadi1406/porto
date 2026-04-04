# Fitur Export & Share Portfolio

## Overview
Aplikasi ini memiliki 2 fitur berbeda untuk membagikan informasi portfolio:
1. **Export Dashboard** - Export seluruh dashboard ke gambar
2. **Share Portfolio** - Share card khusus dengan desain menarik untuk media sosial

---

## 1. Export Dashboard

### Deskripsi
Mengekspor **seluruh Main Dashboard** ke dalam format gambar PNG dengan semua detail yang terlihat di layar.

### Fitur
- Export full dashboard dengan semua tab dan data
- Privacy mode: Blur **semua data sensitif** (nilai uang, persentase, lot, harga)
- Output: Screenshot dashboard lengkap
- Format: PNG dengan kualitas tinggi (2x scale)

### Cara Penggunaan
1. Klik tombol "Export" di header dashboard
2. Toggle "Privacy Mode" jika ingin menyembunyikan data sensitif
3. Klik "Export" untuk download gambar

### Privacy Mode Behavior
Saat Privacy Mode **AKTIF**, yang di-blur:
- ✅ Semua nilai uang (IDR)
- ✅ Semua persentase (%)
- ✅ Jumlah lot
- ✅ Harga saham
- ✅ Market value

---

## 2. Share Portfolio (BARU!)

### Deskripsi
Membuat **card khusus** dengan desain menarik untuk share di media sosial, mirip dengan fitur share di aplikasi sekuritas seperti Stockbit, Ajaib, dll.

### Fitur Utama
- ✨ Desain card yang **premium dan menarik**
- 📊 Menampilkan **Top 10 Holdings** berdasarkan performance
- 🎯 **Ticker tanpa .JK** (contoh: BBRI bukan BBRI.JK)
- 🔒 Privacy mode yang **smart**: hanya hide nilai uang, **persentase tetap terlihat**
- 🎨 Background gradient yang eye-catching
- 📱 Optimized untuk share di social media

### Tampilan Card
Card yang di-generate menampilkan:
1. **Header**
   - Badge "My Portfolio Performance"
   - Judul "Konsolidasi Saham"
   - Total jumlah saham

2. **Total Stats** (2 cards)
   - Total Value (dengan privacy option)
   - Total Return % (selalu terlihat) + nilai rupiah (dengan privacy option)

3. **Top Holdings** (Top 10)
   - Ranking (1-10)
   - Ticker (tanpa .JK)
   - Nama saham
   - Return % (selalu terlihat, warna hijau/merah)
   - Market Value (dengan privacy option)

4. **Footer**
   - Timestamp generated

### Privacy Mode Behavior (BERBEDA!)
Saat Privacy Mode **AKTIF**, yang di-blur:
- ✅ Nilai uang (Total Value, Market Value, Profit/Loss dalam IDR)
- ❌ **TIDAK** blur persentase return (tetap terlihat untuk flex 💪)

### Cara Penggunaan
1. Klik tombol **"Share Portfolio"** (hijau) di header dashboard
2. Modal akan terbuka dengan preview card
3. Toggle **Privacy Mode** jika ingin hide nilai uang (persentase tetap terlihat)
4. Klik **"Download & Share"** untuk download gambar
5. Share ke Instagram, Twitter, atau platform lainnya! 🚀

### Kenapa Persentase Tidak Di-hide?
Sesuai request user, persentase return adalah "flex point" yang ingin ditampilkan untuk menunjukkan performa portfolio tanpa mengungkapkan nilai uang sebenarnya. Ini mirip dengan fitur di aplikasi sekuritas lain.

---

## Perbandingan Fitur

| Fitur | Export Dashboard | Share Portfolio |
|-------|-----------------|-----------------|
| **Tujuan** | Backup/dokumentasi lengkap | Share ke social media |
| **Output** | Full dashboard screenshot | Card khusus dengan desain menarik |
| **Ticker Format** | BBRI.JK | BBRI (tanpa .JK) |
| **Privacy: Nilai Uang** | ✅ Di-blur | ✅ Di-blur |
| **Privacy: Persentase** | ✅ Di-blur | ❌ Tetap terlihat |
| **Desain** | Sesuai dashboard | Premium gradient card |
| **Holdings** | Semua | Top 10 performers |
| **Best For** | Personal backup | Social media flex 💪 |

---

## Komponen & File

### Share Portfolio
- `/src/components/SharePortfolio.tsx` - Komponen utama
- Integrated di `/src/app/page.tsx`

### Export Dashboard
- `/src/components/ExportDashboard.tsx` - Komponen export
- `/src/components/PrivacyWrapper.tsx` - Wrapper untuk blur
- `/src/hooks/usePrivacyMode.ts` - State management

---

## Technical Details

### Share Card Styling
```tsx
// Background gradient
bg-gradient-to-br from-[#0f1419] to-[#1a1f2e]

// Stats cards
bg-white/5 backdrop-blur-sm border border-white/10

// Holdings cards
bg-white/5 hover:bg-white/10 transition-colors
```

### Ticker Cleaning
```tsx
const cleanTicker = (ticker: string) => ticker.replace('.JK', '');
// Input: "BBRI.JK"
// Output: "BBRI"
```

### Top Holdings Logic
```tsx
// Sort by return percentage (best performers first)
const sortedItems = [...consolidatedItems].sort((a, b) => 
  b.returnPercent - a.returnPercent
);

// Take top 10
const topHoldings = sortedItems.slice(0, 10);
```

---

## Future Improvements

### Share Portfolio
- [ ] Pilihan template design (dark/light/colorful)
- [ ] Custom watermark/branding
- [ ] Share langsung ke social media (API integration)
- [ ] Pilih jumlah holdings yang ditampilkan (5/10/15)
- [ ] Add chart/graph visualization
- [ ] Comparison dengan index (IHSG)

### Export Dashboard
- [ ] Export format lain (PDF, JPG)
- [ ] Export specific tab only
- [ ] Scheduled export (daily/weekly)
- [ ] Email export hasil

---

## Tips Penggunaan

### Untuk Share di Social Media
1. Gunakan **Share Portfolio** (bukan Export Dashboard)
2. Aktifkan **Privacy Mode** untuk hide nilai uang
3. Persentase return akan tetap terlihat untuk "flex" 💪
4. Card sudah optimized untuk Instagram Story/Feed

### Untuk Dokumentasi Personal
1. Gunakan **Export Dashboard**
2. Bisa dengan atau tanpa Privacy Mode
3. Capture full dashboard dengan semua detail

### Best Practices
- Share Portfolio: Untuk public sharing (social media)
- Export Dashboard: Untuk private documentation
- Selalu review preview sebelum download
- Gunakan Privacy Mode saat share public
