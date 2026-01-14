# 📊 Advanced Analytics - Fitur Baru!

## ✅ **3 Analitik Profesional Telah Ditambahkan!**

### **1. 📊 Performance Metrics Dashboard**

**Lokasi:** Analytics Page (Full Width)

**Metrics yang Ditampilkan:**

#### **Win Rate** (Blue Card)
- Persentase saham yang profit
- Jumlah winning stocks vs total
- **Formula:** `(Winning Stocks / Total Stocks) × 100`
- **Contoh:** 5 of 7 stocks = 71.4%

#### **Profit Factor** (Green Card)
- Rasio total gain vs total loss
- Indikator profitabilitas
- **Formula:** `Total Gain / Total Loss`
- **Interpretasi:**
  - > 2.0 = Excellent
  - 1.5-2.0 = Good
  - 1.0-1.5 = Average
  - < 1.0 = Poor

#### **Max Drawdown** (Red Card)
- Penurunan terbesar dari peak
- Mengukur worst-case scenario
- **Formula:** Worst stock return %
- **Contoh:** -15.2% = worst decline

#### **Average Gain** (Emerald Card)
- Rata-rata profit per winning stock
- **Formula:** `Total Gain / Winning Stocks`
- **Contoh:** Rp 2.5M per stock

#### **Average Loss** (Orange Card)
- Rata-rata loss per losing stock
- **Formula:** `Total Loss / Losing Stocks`
- **Contoh:** Rp 800K per stock

#### **Best Performer** (Violet Card)
- Saham dengan return tertinggi
- Ticker + percentage return
- **Contoh:** BBCA +25.3%

---

### **2. 🛡️ Diversification Score**

**Lokasi:** Analytics Page (Left Bottom)

**Fitur Utama:**

#### **Score Display (0-100)**
- **70-100** = LOW RISK (Green) ✅
  - "Portfolio well diversified"
  - Distribusi merata
  
- **40-69** = MEDIUM RISK (Yellow) ⚠️
  - "Consider adding more stocks"
  - Perlu diversifikasi lebih
  
- **0-39** = HIGH RISK (Red) 🚨
  - "High concentration risk - diversify!"
  - Terlalu concentrated

#### **Calculation Method**
- Menggunakan **Herfindahl-Hirschman Index (HHI)**
- Formula: `Σ(percentage²)` untuk setiap saham
- Score dinormalisasi 0-100

#### **Concentration Metrics**
- **Top 1:** % dari saham terbesar
- **Top 3:** % dari 3 saham terbesar
- **Total Stocks:** Jumlah saham

#### **Top Holdings Visualization**
- Top 5 holdings dengan progress bar
- Ranked 1-5
- Percentage allocation per stock

**Contoh:**
```
Score: 65/100 (MEDIUM RISK)
Top 1: 35%
Top 3: 75%
Stocks: 7

Top Holdings:
1. BBCA - 35%
2. TLKM - 25%
3. ASII - 15%
4. BMRI - 12%
5. UNVR - 8%
```

---

### **3. 💰 Cost Basis Analysis**

**Lokasi:** Analytics Page (Right Bottom)

**Fitur Utama:**

#### **Horizontal Bar Chart**
- **Gray Bar:** Cost Basis (harga beli)
- **Green Bar:** Current Price (profit)
- **Red Bar:** Current Price (loss)
- Sorted by performance (best to worst)

#### **Interactive Tooltip**
- Cost Basis
- Current Price
- Difference (% & Rp)

#### **Summary Stats (4 Cards)**

**Above Cost** (Green)
- Jumlah saham di atas harga beli
- Contoh: 5 stocks

**Below Cost** (Red)
- Jumlah saham di bawah harga beli
- Contoh: 2 stocks

**Best** (Blue)
- Saham dengan gain tertinggi
- Contoh: BBCA +25%

**Worst** (Orange)
- Saham dengan loss terbesar
- Contoh: ASII -10%

**Kegunaan:**
- Identifikasi break-even points
- Lihat gap antara cost vs current
- Decision making untuk averaging down/up
- Tax loss harvesting planning

---

## 📊 **Layout Analytics Page Baru:**

```
┌─────────────────────────────────────────┐
│  Growth Chart (Area Chart)              │
├─────────────────────────────────────────┤
│  Performance Metrics (6 cards)          │
├──────────────────┬──────────────────────┤
│  Allocation      │  Gain/Loss Chart     │
│  (Pie Chart)     │  (Donut Chart)       │
├──────────────────┼──────────────────────┤
│  Diversification │  Cost Basis Analysis │
│  Score           │  (Bar Chart)         │
└──────────────────┴──────────────────────┘
```

---

## 🎯 **Cara Menggunakan:**

### **1. Performance Metrics**
- **Monitor Win Rate** - Target > 60%
- **Check Profit Factor** - Target > 1.5
- **Watch Max Drawdown** - Limit < -20%
- **Compare Avg Gain vs Loss** - Gain should be > Loss

### **2. Diversification Score**
- **Target Score:** > 70 (Low Risk)
- **If Medium/High Risk:**
  - Add more stocks
  - Reduce top holdings
  - Rebalance portfolio

### **3. Cost Basis Analysis**
- **Green bars** - Consider take profit
- **Red bars** - Consider averaging down or cut loss
- **Near cost basis** - Monitor closely

---

## 💡 **Insights & Actions:**

### **Scenario 1: High Win Rate + Low Profit Factor**
- Banyak winning stocks tapi profit kecil
- **Action:** Let winners run longer

### **Scenario 2: Low Win Rate + High Profit Factor**
- Sedikit winners tapi profit besar
- **Action:** Cut losses faster

### **Scenario 3: High Concentration (Low Div Score)**
- Portfolio terlalu fokus di 1-2 saham
- **Action:** Add more stocks, reduce top holdings

### **Scenario 4: Many Stocks Below Cost**
- Banyak saham merah
- **Action:** Review strategy, consider rebalancing

---

## 📈 **Best Practices:**

✅ **Win Rate:** Aim for 60-70%  
✅ **Profit Factor:** Target > 2.0  
✅ **Max Drawdown:** Keep < -15%  
✅ **Diversification:** Maintain > 70 score  
✅ **Top 1 Holding:** Keep < 30%  
✅ **Top 3 Holdings:** Keep < 60%  

---

**Refresh browser Anda** dan buka halaman **Analytics** untuk melihat semua analitik baru! 

Aplikasi portfolio Anda sekarang setara dengan platform profesional! 🚀📊✨
