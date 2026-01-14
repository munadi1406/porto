# 📈 Portfolio Growth Chart - Tracking Explained

## ✅ **How It Works**

Portfolio Growth Chart menampilkan **pertumbuhan nilai total portfolio** dari waktu ke waktu berdasarkan data yang tersimpan di **LocalStorage**.

---

## 📊 **Data yang Ditampilkan:**

### **Total Portfolio Value = Stock Value + Cash**

**Stock Value:**
```
Stock Value = Σ (Lots × 100 × Live Price)
```

**Total Value:**
```
Total Value = Stock Value + Cash
```

### **Contoh:**
```
Portfolio:
- BBCA.JK: 10 lot @ Rp 10,500 (live) = Rp 1,050,000
- TLKM.JK: 20 lot @ Rp 3,200 (live) = Rp 640,000
- Cash: Rp 500,000

Total Value = Rp 1,050,000 + Rp 640,000 + Rp 500,000 = Rp 2,190,000
```

---

## 💾 **Data Storage (LocalStorage):**

### **Snapshot Structure:**
```typescript
interface PortfolioSnapshot {
  timestamp: number;        // When snapshot was taken
  totalValue: number;       // Stock Value + Cash
  stockValue: number;       // Value of all stocks
  cashValue: number;        // Available cash
}
```

### **Storage Key:**
```
portfolio_history
```

### **Retention:**
- **Max:** 365 days
- **Deduplication:** Snapshots within 1 minute are merged

---

## 🔄 **When Snapshots are Recorded:**

### **Auto-Record Triggers:**

1. **Portfolio value changes** (price updates)
2. **Cash changes** (transactions)
3. **Page load** (Analytics page)

### **Code:**
```typescript
useEffect(() => {
  if (isLoaded && cashLoaded && !pricesLoading) {
    recordSnapshot(summary.totalMarketValue, cash);
  }
}, [summary.totalMarketValue, cash, isLoaded, cashLoaded, pricesLoading]);
```

### **Deduplication Logic:**
```typescript
// Avoid duplicate snapshots within 1 minute
const lastSnapshot = filtered[filtered.length - 1];
if (lastSnapshot && (snapshot.timestamp - lastSnapshot.timestamp < 60000)) {
  return prev; // Skip
}
```

---

## 📅 **Time Periods:**

### **Available Periods:**

| Period | Label | Duration |
|--------|-------|----------|
| **1H** | 1 Hari | Last 24 hours |
| **1M** | 1 Minggu | Last 7 days |
| **1T** | 1 Tahun | Last 365 days |
| **All** | Semua | All time |

### **Growth Calculation:**
```typescript
Growth Value = Current Value - Start Value
Growth Percent = (Growth Value / Start Value) × 100
```

---

## 🎨 **Chart Features:**

### **Visual Elements:**

1. **Area Chart** - Smooth gradient fill
2. **Color Coding:**
   - 🟢 **Green** - Positive growth
   - 🔴 **Red** - Negative growth
3. **Interactive Tooltip** - Shows exact value & date
4. **Period Selector** - Switch between time ranges

### **Stats Display:**
- **Percentage Change** - Large, prominent
- **Absolute Change** - In Rupiah
- **Trend Icon** - Up/Down arrow

---

## 🚀 **How to Build History:**

### **Method 1: Natural Accumulation (Recommended)**

**Just use the app normally:**
1. ✅ Add stocks to portfolio
2. ✅ Prices update automatically
3. ✅ Snapshots recorded every minute (if value changes)
4. ✅ History builds over time

**Timeline:**
- **1 Day:** ~1440 potential snapshots (1 per minute)
- **1 Week:** ~10,080 potential snapshots
- **1 Year:** ~525,600 potential snapshots (capped at reasonable intervals)

### **Method 2: Manual Trigger (For Testing)**

**Simulate history by:**
1. Adding stocks
2. Waiting a bit
3. Changing prices (market updates)
4. Refreshing Analytics page

---

## 🔍 **Troubleshooting:**

### **"Belum ada data history"**

**Possible Causes:**
1. ❌ **First time using** - No snapshots yet
2. ❌ **LocalStorage cleared** - History lost
3. ❌ **No portfolio** - Nothing to track

**Solutions:**
1. ✅ **Wait a few minutes** - Let system record snapshots
2. ✅ **Add stocks** - Portfolio needs content
3. ✅ **Refresh page** - Trigger snapshot recording
4. ✅ **Make transactions** - Changes trigger snapshots

### **"Grafik tidak berubah"**

**Possible Causes:**
1. ❌ **Prices not updating** - Market closed or API issue
2. ❌ **No transactions** - Portfolio static
3. ❌ **Same period** - Looking at wrong timeframe

**Solutions:**
1. ✅ **Switch periods** - Try "All" to see full history
2. ✅ **Wait for price updates** - Auto-refresh every 30s
3. ✅ **Make transactions** - Buy/sell to create changes

---

## 📊 **Example Growth Scenarios:**

### **Scenario 1: Positive Growth**
```
Day 1: Portfolio = Rp 10,000,000
Day 7: Portfolio = Rp 11,000,000

Growth:
- Value: +Rp 1,000,000
- Percent: +10%
- Chart: Green upward trend
```

### **Scenario 2: Negative Growth**
```
Day 1: Portfolio = Rp 10,000,000
Day 7: Portfolio = Rp 9,500,000

Growth:
- Value: -Rp 500,000
- Percent: -5%
- Chart: Red downward trend
```

### **Scenario 3: Volatile Growth**
```
Day 1: Rp 10,000,000
Day 2: Rp 10,500,000 (+5%)
Day 3: Rp 10,200,000 (-2.8%)
Day 4: Rp 10,800,000 (+5.9%)
Day 7: Rp 11,000,000 (+2%)

Chart: Zigzag pattern showing volatility
```

---

## 💡 **Best Practices:**

### **For Accurate Tracking:**

1. ✅ **Keep app open** - Let snapshots accumulate
2. ✅ **Regular usage** - Daily checks build history
3. ✅ **Don't clear LocalStorage** - Preserves history
4. ✅ **Monitor Analytics page** - Triggers snapshots

### **For Better Visualization:**

1. ✅ **Use appropriate period** - Match your timeframe
2. ✅ **Check "All" period** - See full journey
3. ✅ **Compare periods** - Understand trends
4. ✅ **Track transactions** - Correlate with changes

---

## 🎯 **Summary:**

**Growth Chart shows:**
- 📊 **Total portfolio value** over time
- 💰 **Stock + Cash** combined
- 📈 **Percentage & absolute** growth
- 🕐 **Multiple time periods**

**Data is:**
- 💾 **Stored in LocalStorage**
- 🔄 **Auto-recorded** on changes
- ⏱️ **Deduplicated** (1 min interval)
- 📅 **Retained** for 365 days

**To see growth:**
1. ✅ Use app normally
2. ✅ Wait for snapshots to accumulate
3. ✅ Check Analytics page
4. ✅ Switch between periods

**Current snapshot will be recorded automatically!** Just keep using the app and history will build naturally. 📊✨

---

## 🔧 **Technical Details:**

### **Snapshot Recording:**
- **Trigger:** Value or cash changes
- **Frequency:** Max 1 per minute
- **Storage:** LocalStorage (`portfolio_history`)
- **Format:** JSON array of snapshots

### **Growth Calculation:**
- **Method:** Compare first & last snapshot in period
- **Formula:** `(current - start) / start × 100`
- **Display:** Percentage + absolute value

### **Chart Rendering:**
- **Library:** Recharts (AreaChart)
- **Type:** Time series
- **Interaction:** Hover for details
- **Responsive:** Adapts to screen size

**Refresh browser** dan biarkan app berjalan. Snapshots akan ter-record otomatis! 🚀
