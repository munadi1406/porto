# 📊 Allocation Tabs - Combined View

## ✅ **AllocationChart & SectorAllocation Digabung dengan Tabs!**

### **Perubahan:**

**Before:**
```
┌─────────────────┬─────────────────┐
│ Allocation      │ Gain/Loss       │
│ (By Stock)      │ Chart           │
└─────────────────┴─────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│ Portfolio Allocation                │
│ [By Stock] [By Sector]  ← Tabs      │
├─────────────────────────────────────┤
│ Chart Content (switchable)          │
└─────────────────────────────────────┘
```

---

## 🎯 **Fitur AllocationTabs:**

### **Tab 1: By Stock**
- Pie chart alokasi per saham
- Percentage allocation
- Stock value
- Color-coded visualization

### **Tab 2: By Sector** (Stockbit Style!)
- Pie chart alokasi per sector
- **Collapsible sectors** - Click to expand/collapse
- **Stock details per sector:**
  - Ticker & company name
  - Lots owned
  - Current price
  - Total value
  - Gain/Loss % with icon
- **Risk assessment:**
  - LOW RISK: < 40% top sector, 4+ sectors
  - MEDIUM RISK: 40-60% top sector, 3+ sectors
  - HIGH RISK: > 60% top sector
- **Automatic sector detection** from Yahoo Finance API

---

## 📊 **Layout Analytics Page (Updated):**

```
┌─────────────────────────────────────────┐
│  Growth Chart (Area Chart)              │
├─────────────────────────────────────────┤
│  Performance Metrics (6 cards)          │
├─────────────────────────────────────────┤
│  Portfolio Allocation (Tabs)            │
│  ├─ By Stock                            │
│  └─ By Sector (Collapsible)             │
├─────────────────────────────────────────┤
│  Gain/Loss Chart (Donut)                │
├──────────────────┬──────────────────────┤
│  Diversification │  Cost Basis Analysis │
├──────────────────┼──────────────────────┤
│  Holding Period  │  (Future component)  │
└──────────────────┴──────────────────────┘
```

---

## 🔧 **Technical Implementation:**

### **1. AllocationTabs Component**
```typescript
<AllocationTabs 
  portfolio={portfolio}
  prices={prices}
  allocationData={chartData}
/>
```

**Props:**
- `portfolio`: Array of PortfolioItem
- `prices`: Price data from useMarketData
- `allocationData`: Chart data with percentage & gainLoss

### **2. Sector API** (`/api/sector`)
- Fetch sector from Yahoo Finance `quoteSummary`
- Modules: `assetProfile`, `summaryProfile`
- Cache: 24 hours (sector rarely changes)
- Returns: `{ sector, industry }`

### **3. useSectorData Hook**
- Fetch sectors for all tickers in parallel
- Auto-refresh when tickers change
- Loading state management
- Error handling with fallback to "Others"

---

## 💡 **Cara Menggunakan:**

### **By Stock Tab:**
1. Lihat pie chart alokasi per saham
2. Hover untuk detail (value, percentage)
3. Legend menunjukkan semua saham

### **By Sector Tab:**
1. Lihat pie chart alokasi per sector
2. **Click sector** untuk expand (contoh: "Industrials")
3. **Lihat detail stocks** dalam sector tersebut:
   - GTSI.JK • 10 lot • Rp 1,500
   - Rp 15,000,000 • +25.3% ↗
4. **Click lagi** untuk collapse
5. **Risk alert** menunjukkan diversification status

---

## 🎨 **Visual Features:**

### **Tabs:**
- Active tab: Indigo color dengan underline
- Inactive tab: Gray dengan hover effect
- Smooth transition

### **Sector Expansion:**
- Chevron icon (▶ collapsed, ▼ expanded)
- Smooth animation
- Hover effect on sector header
- Color-coded badges

### **Stock Details:**
- Ticker & name
- Lots & price
- Total value (bold)
- Gain/Loss with icon:
  - ↗ Green for profit
  - ↘ Red for loss

---

## 📈 **Data Flow:**

```
Portfolio + Prices
    ↓
AllocationTabs
    ↓
┌─────────────┬──────────────────┐
│ By Stock    │ By Sector        │
│ (Static)    │ (API Call)       │
│             │      ↓           │
│             │ useSectorData    │
│             │      ↓           │
│             │ /api/sector      │
│             │      ↓           │
│             │ Yahoo Finance    │
└─────────────┴──────────────────┘
```

---

## 🚀 **Benefits:**

✅ **Space Efficient** - 2 charts dalam 1 card  
✅ **Better UX** - Tab switching lebih intuitive  
✅ **Stockbit-like** - Familiar interface  
✅ **Auto Sector** - No manual mapping  
✅ **Detailed View** - Drill-down per sector  
✅ **Risk Assessment** - Automatic diversification check  

---

**Refresh browser Anda** dan buka **Analytics page**!

Sekarang Anda punya:
- ✅ Tab "By Stock" untuk allocation per saham
- ✅ Tab "By Sector" dengan collapsible sectors (Stockbit style!)
- ✅ Automatic sector detection dari Yahoo Finance
- ✅ Full stock details per sector

🎊 Portfolio analytics Anda sekarang lebih powerful dan space-efficient! 📊✨
