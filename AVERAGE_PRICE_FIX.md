# 📊 Average Price Recalculation - Fixed!

## ✅ **Problem Fixed!**

### **Masalah Sebelumnya:**
Ketika menambah saham yang **sudah ada** di portfolio via "Tambah Saham" form, average price **tidak di-recalculate**. Sistem membuat entry baru instead of updating yang existing.

### **Solusi:**
Updated `addStock` function di `usePortfolio.ts` untuk:
1. **Check** apakah ticker sudah ada
2. Jika **sudah ada** → Recalculate average price (weighted average)
3. Jika **belum ada** → Add as new stock

---

## 🧮 **Weighted Average Calculation:**

### **Formula:**
```
New Average = (Existing Cost + New Cost) / (Existing Lots + New Lots)

Where:
- Existing Cost = Existing Lots × Existing Average Price
- New Cost = New Lots × New Price
```

### **Contoh:**

**Scenario 1: Saham Belum Ada**
```
Input: BBCA.JK, 10 lot @ Rp 10,000
Result: Add new stock
- Lots: 10
- Average: Rp 10,000
```

**Scenario 2: Saham Sudah Ada (Average Down)**
```
Existing: BBCA.JK, 10 lot @ Rp 10,000
Input: BBCA.JK, 5 lot @ Rp 9,000

Calculation:
- Existing Cost = 10 × 10,000 = Rp 100,000
- New Cost = 5 × 9,000 = Rp 45,000
- Total Cost = Rp 145,000
- Total Lots = 10 + 5 = 15
- New Average = 145,000 / 15 = Rp 9,667

Result: Update existing stock
- Lots: 15 (was 10)
- Average: Rp 9,667 (was Rp 10,000)
```

**Scenario 3: Saham Sudah Ada (Average Up)**
```
Existing: TLKM.JK, 20 lot @ Rp 3,000
Input: TLKM.JK, 10 lot @ Rp 3,500

Calculation:
- Existing Cost = 20 × 3,000 = Rp 60,000
- New Cost = 10 × 3,500 = Rp 35,000
- Total Cost = Rp 95,000
- Total Lots = 20 + 10 = 30
- New Average = 95,000 / 30 = Rp 3,167

Result: Update existing stock
- Lots: 30 (was 20)
- Average: Rp 3,167 (was Rp 3,000)
```

---

## 🔧 **Code Changes:**

### **Before (❌ Bug):**
```typescript
const addStock = (item: Omit<PortfolioItem, "id">) => {
    const newItem: PortfolioItem = {
        ...item,
        id: crypto.randomUUID(),
    };
    setPortfolio((prev) => [...prev, newItem]);
};
```

**Problem:** Always creates new entry, even if ticker exists!

### **After (✅ Fixed):**
```typescript
const addStock = (item: Omit<PortfolioItem, "id">) => {
    // Check if ticker already exists
    const existingStock = portfolio.find(p => p.ticker === item.ticker);
    
    if (existingStock) {
        // If ticker exists, recalculate average price
        const totalCost = (existingStock.lots * existingStock.averagePrice) + 
                         (item.lots * item.averagePrice);
        const totalLots = existingStock.lots + item.lots;
        const newAverage = totalCost / totalLots;

        setPortfolio((prev) =>
            prev.map((p) =>
                p.ticker === item.ticker
                    ? {
                        ...p,
                        lots: totalLots,
                        averagePrice: Math.round(newAverage)
                    }
                    : p
            )
        );
    } else {
        // If ticker doesn't exist, add as new stock
        const newItem: PortfolioItem = {
            ...item,
            id: crypto.randomUUID(),
        };
        setPortfolio((prev) => [...prev, newItem]);
    }
};
```

---

## 📝 **Cara Menggunakan:**

### **Test Case 1: Add New Stock**
1. Buka Portfolio page
2. Isi form "Tambah Saham":
   - Ticker: `BBCA.JK`
   - Name: `Bank Central Asia`
   - Lots: `10`
   - Average Price: `10000`
3. Click "Tambah"
4. **Result:** New stock added dengan 10 lot @ Rp 10,000

### **Test Case 2: Add More of Existing Stock (Average Down)**
1. Isi form lagi dengan **ticker yang sama**:
   - Ticker: `BBCA.JK`
   - Lots: `5`
   - Average Price: `9000`
2. Click "Tambah"
3. **Result:** 
   - ✅ Lots bertambah: 10 → 15
   - ✅ Average turun: Rp 10,000 → Rp 9,667
   - ✅ **TIDAK** create duplicate entry

### **Test Case 3: Add More of Existing Stock (Average Up)**
1. Isi form lagi:
   - Ticker: `BBCA.JK`
   - Lots: `10`
   - Average Price: `11000`
2. Click "Tambah"
3. **Result:**
   - ✅ Lots bertambah: 15 → 25
   - ✅ Average naik: Rp 9,667 → Rp 10,133
   - ✅ **TIDAK** create duplicate entry

---

## 🎯 **Benefits:**

✅ **No Duplicate Entries** - Same ticker = update existing  
✅ **Accurate Average** - Weighted average calculation  
✅ **Consistent Logic** - Same as "Buy More" transaction  
✅ **Transaction History** - Still recorded properly  
✅ **Portfolio Integrity** - One entry per ticker  

---

## 🔄 **Comparison with Buy Transaction:**

### **Via "Tambah Saham" Form:**
```typescript
addStock({ ticker, name, lots, averagePrice })
→ Checks if exists
→ Recalculates average
→ Updates lots & average
```

### **Via "Buy More" Button:**
```typescript
executeTransaction(id, 'buy', lots, price)
→ Same calculation
→ Same result
```

**Both methods now produce identical results!** ✅

---

## 🚀 **Summary:**

**Fixed:** Average price sekarang **automatically recalculated** ketika menambah saham yang sudah ada!

**Test it:**
1. Add stock pertama kali
2. Add lagi dengan ticker yang sama tapi harga berbeda
3. Lihat average price **automatically updated**!

🎊 Portfolio management sekarang lebih akurat! 📊✨
