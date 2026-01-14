# 📊 Real-Time Portfolio Tracking - Enhanced!

## ✅ **Real-Time Snapshot System**

Portfolio value sekarang di-track **real-time** dengan snapshot yang tersimpan di LocalStorage setiap ada perubahan!

---

## 🚀 **How It Works:**

### **Dual Trigger System:**

**1. Value-Based Trigger (Immediate)**
```typescript
// Triggered when:
- Portfolio value changes (price updates)
- Cash changes (transactions)
- Any portfolio modification
```

**2. Time-Based Trigger (Periodic)**
```typescript
// Triggered every:
- 30 seconds (automatic interval)
- Captures gradual changes
- Ensures continuous tracking
```

---

## 📸 **Snapshot Recording Rules:**

### **Smart Recording Logic:**

**Record snapshot IF:**
1. ✅ **First snapshot** - No previous data
2. ✅ **Time passed** - More than 10 seconds since last
3. ✅ **Significant change** - Value changed by >0.1%

**Skip snapshot IF:**
- ❌ Less than 10 seconds passed
- ❌ Value change <0.1%
- ❌ No meaningful change

### **Code:**
```typescript
const timeDiff = now - lastSnapshot.timestamp;
const percentDiff = (valueDiff / lastValue) * 100;

if (timeDiff >= 10000 || percentDiff >= 0.1) {
  // Record snapshot
}
```

---

## ⏱️ **Snapshot Frequency:**

### **Minimum Interval: 10 seconds**
- Prevents spam
- Balances detail vs storage
- Captures real-time changes

### **Maximum Snapshots:**
```
Per Hour: ~360 snapshots (10s interval)
Per Day: ~8,640 snapshots
Per Week: ~60,480 snapshots
Per Year: Capped at reasonable size
```

### **Retention:**
- **Duration:** 365 days
- **Auto-cleanup:** Old data removed
- **Storage:** LocalStorage (`portfolio_history`)

---

## 📊 **Data Captured:**

### **Each Snapshot Contains:**
```typescript
{
  timestamp: 1736835600000,      // Exact time
  totalValue: 12500000,          // Stock + Cash
  stockValue: 10500000,          // Stocks only
  cashValue: 2000000             // Cash only
}
```

### **Example Timeline:**
```
10:00:00 - Rp 10,000,000 (initial)
10:00:30 - Rp 10,050,000 (+0.5% - recorded)
10:01:00 - Rp 10,100,000 (+0.5% - recorded)
10:01:05 - Rp 10,105,000 (+0.05% - skipped, too small)
10:01:30 - Rp 10,150,000 (+0.44% - recorded)
```

---

## 🎯 **Growth Calculation:**

### **Formula:**
```
Period Snapshots = Filter by time range
Start Value = First snapshot in period
End Value = Last snapshot in period

Growth Value = End - Start
Growth % = (Growth Value / Start Value) × 100
```

### **Example (1 Week):**
```
Monday 00:00 - Rp 10,000,000 (start)
Tuesday 12:00 - Rp 10,500,000
Wednesday 18:00 - Rp 10,200,000
Friday 15:00 - Rp 11,000,000
Sunday 23:59 - Rp 11,500,000 (end)

Growth:
- Value: Rp 11,500,000 - Rp 10,000,000 = +Rp 1,500,000
- Percent: (1,500,000 / 10,000,000) × 100 = +15%
```

---

## 🔄 **Automatic Recording:**

### **Triggers:**

**1. Price Updates (Every 30s)**
```
Market data refreshes
→ Portfolio value changes
→ Snapshot recorded (if >10s passed)
```

**2. Transactions**
```
Buy/Sell stock
→ Portfolio changes
→ Snapshot recorded immediately
```

**3. Cash Changes**
```
Add/withdraw cash
→ Total value changes
→ Snapshot recorded immediately
```

**4. Periodic Timer (Every 30s)**
```
Interval fires
→ Check current value
→ Record if changed
```

---

## 📈 **Benefits:**

### **Accurate Growth Tracking:**
✅ **Real-time data** - Every change captured  
✅ **Detailed history** - See exact progression  
✅ **Multiple periods** - 1H, 1M, 1T, All  
✅ **Percentage accurate** - Based on actual changes  

### **Performance Optimized:**
✅ **Smart filtering** - Skip insignificant changes  
✅ **Time throttling** - Max 1 per 10 seconds  
✅ **Auto-cleanup** - Old data removed  
✅ **Efficient storage** - Only essential data  

---

## 🔍 **Debug & Monitoring:**

### **Console Logs:**

**First Snapshot:**
```
[Snapshot] First snapshot recorded: 10000000
```

**Regular Snapshots:**
```
[Snapshot] Recorded: {
  value: 10500000,
  timeDiff: "30s",
  valueDiff: 500000,
  percentDiff: "5.00%"
}
```

**Growth Calculation:**
```
[Growth week] {
  periodSnapshots: 145,
  startValue: 10000000,
  currentValue: 11500000,
  growthValue: 1500000,
  growthPercent: 15,
  startDate: "13/01/2026, 00:00:00",
  endDate: "14/01/2026, 10:44:00"
}
```

---

## 🧪 **Testing:**

### **Test Real-Time Tracking:**

1. **Open Analytics page**
2. **Open Console (F12)**
3. **Watch for snapshots:**
   ```
   [Snapshot] Recorded: { ... }
   ```
4. **Wait 30 seconds** - Should see new snapshot
5. **Check growth** - Should update

### **Test Growth Calculation:**

1. **Add stocks** - Initial snapshot
2. **Wait 1 minute** - Multiple snapshots
3. **Check different periods:**
   - 1H - Last 24 hours
   - 1M - Last 7 days
   - All - Full history
4. **Verify percentage** - Should match value change

---

## 💾 **LocalStorage Structure:**

### **Key:** `portfolio_history`

### **Format:**
```json
[
  {
    "timestamp": 1736835600000,
    "totalValue": 10000000,
    "stockValue": 8000000,
    "cashValue": 2000000
  },
  {
    "timestamp": 1736835630000,
    "totalValue": 10050000,
    "stockValue": 8050000,
    "cashValue": 2000000
  },
  ...
]
```

### **Check Data:**
```javascript
// In browser console
const history = JSON.parse(localStorage.getItem('portfolio_history'));
console.log('Total snapshots:', history.length);
console.log('First:', history[0]);
console.log('Last:', history[history.length - 1]);
```

---

## 🎨 **Visual Updates:**

### **Growth Chart:**
- ✅ Updates every 30 seconds
- ✅ Shows real-time progression
- ✅ Smooth transitions
- ✅ Accurate percentages

### **Period Selector:**
- ✅ 1H - Hourly changes
- ✅ 1M - Weekly trend
- ✅ 1T - Yearly performance
- ✅ All - Full journey

---

## 🚀 **Summary:**

**Real-Time Tracking:**
- 📸 Snapshot every **10+ seconds** (if changed)
- ⏱️ Periodic check every **30 seconds**
- 💾 Stored in **LocalStorage**
- 📊 **365 days** retention

**Growth Calculation:**
- 🎯 Compare **first & last** in period
- 📈 Accurate **percentage** calculation
- 🔄 Updates **automatically**
- 📊 Multiple **time periods**

**Benefits:**
- ✅ **Real-time** portfolio tracking
- ✅ **Accurate** growth metrics
- ✅ **Detailed** history
- ✅ **Optimized** performance

**Refresh browser** dan biarkan Analytics page terbuka. Snapshots akan ter-record otomatis setiap 30 detik! 

Check console untuk melihat:
```
[Snapshot] Recorded: { value: ..., timeDiff: "30s", ... }
[Growth week] { growthPercent: 15.5, ... }
```

🎊 Portfolio growth tracking sekarang **real-time** dan **akurat**! 📊✨
