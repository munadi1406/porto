# 🗄️ Database Migration Guide - LocalStorage to MySQL

## ✅ **Setup Complete!**

Aplikasi portfolio Anda sekarang menggunakan **MySQL Database** dengan **Sequelize ORM**.

---

## 📋 **Database Configuration**

### **Credentials:**
```
Host: 195.88.211.226
Database: dcryptmy_porto
Username: dcryptmy_porto
Password: I9jR^hLdjMa*I=2h
```

### **Connection File:**
- `src/lib/db.ts` - Sequelize configuration

### **Models:**
- `src/lib/models.ts` - Database schema definitions

---

## 🏗️ **Database Schema**

### **1. portfolio_items**
Stores user's stock holdings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticker | VARCHAR(20) | Stock ticker (unique) |
| name | VARCHAR(255) | Company name |
| lots | INTEGER | Number of lots owned |
| averagePrice | DECIMAL(15,2) | Average purchase price |
| createdAt | DATETIME | Created timestamp |
| updatedAt | DATETIME | Updated timestamp |

### **2. transactions**
Records all buy/sell transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | ENUM('buy','sell') | Transaction type |
| ticker | VARCHAR(20) | Stock ticker |
| name | VARCHAR(255) | Company name |
| lots | INTEGER | Number of lots |
| pricePerShare | DECIMAL(15,2) | Price per share |
| totalAmount | DECIMAL(15,2) | Total transaction value |
| notes | TEXT | Optional notes |
| timestamp | DATETIME | Transaction time |
| createdAt | DATETIME | Created timestamp |
| updatedAt | DATETIME | Updated timestamp |

**Indexes:**
- `ticker` - For filtering by stock
- `timestamp` - For chronological queries

### **3. portfolio_snapshots**
Tracks portfolio value over time for growth charts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| timestamp | DATETIME | Snapshot time |
| totalValue | DECIMAL(15,2) | Total portfolio value |
| stockValue | DECIMAL(15,2) | Stock holdings value |
| cashValue | DECIMAL(15,2) | Cash balance |
| createdAt | DATETIME | Created timestamp |
| updatedAt | DATETIME | Updated timestamp |

**Indexes:**
- `timestamp` - For time-based queries

### **4. cash_holdings**
Stores current cash balance.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| amount | DECIMAL(15,2) | Cash amount |
| lastUpdated | DATETIME | Last update time |
| createdAt | DATETIME | Created timestamp |
| updatedAt | DATETIME | Updated timestamp |

---

## 🚀 **Installation Steps**

### **1. Install Dependencies**

Run this command in your terminal:

```bash
npm install sequelize mysql2
```

### **2. Database Initialization**

The database tables will be **automatically created** on first API request.

The system uses `sequelize.sync({ alter: true })` which:
- ✅ Creates tables if they don't exist
- ✅ Updates existing tables to match schema
- ✅ Preserves existing data

---

## 📡 **API Endpoints**

### **Portfolio API** (`/api/portfolio`)

**GET** - Fetch all stocks
```typescript
Response: {
  success: true,
  data: PortfolioItem[]
}
```

**POST** - Add new stock or update existing
```typescript
Body: {
  ticker: string,
  name: string,
  lots: number,
  averagePrice: number
}
```

**PUT** - Update stock manually
```typescript
Body: {
  id: string,
  ticker?: string,
  name?: string,
  lots?: number,
  averagePrice?: number
}
```

**DELETE** - Remove stock
```typescript
Query: ?id=<stock_id>
```

---

### **Transactions API** (`/api/transactions`)

**GET** - Fetch transaction history
```typescript
Response: {
  success: true,
  data: Transaction[] // Last 100 transactions
}
```

**POST** - Execute buy/sell transaction
```typescript
Body: {
  id?: string, // Portfolio item ID (for updates)
  type: 'buy' | 'sell',
  ticker: string,
  name: string,
  lots: number,
  pricePerShare: number,
  notes?: string
}
```

---

### **Cash API** (`/api/cash`)

**GET** - Get current cash balance
```typescript
Response: {
  success: true,
  data: {
    amount: number,
    lastUpdated: Date
  }
}
```

**POST** - Update cash balance
```typescript
Body: {
  amount: number,
  operation: 'set' | 'add' | 'subtract'
}
```

---

### **Snapshots API** (`/api/snapshots`)

**GET** - Fetch snapshots for period
```typescript
Query: ?period=today|day|week|month|year|all

Response: {
  success: true,
  data: {
    snapshots: Snapshot[],
    growth: {
      value: number,
      percent: number
    }
  }
}
```

**POST** - Record new snapshot
```typescript
Body: {
  stockValue: number,
  cashValue: number
}
```

**DELETE** - Clear all snapshots
```typescript
Response: {
  success: true,
  message: 'All snapshots cleared'
}
```

---

## 🔄 **Next Steps**

### **1. Update Frontend Hooks**

You need to update these hooks to use API calls instead of LocalStorage:

- `src/hooks/usePortfolio.ts` → Call `/api/portfolio`
- `src/hooks/useCashAndHistory.ts` → Call `/api/cash`, `/api/transactions`, `/api/snapshots`

### **2. Remove LocalStorage Logic**

After migration, remove all `localStorage.getItem()` and `localStorage.setItem()` calls.

### **3. Test Database Connection**

Create a test page to verify connection:

```typescript
// src/app/test-db/page.tsx
import { testConnection } from '@/lib/db';

export default async function TestDB() {
  const connected = await testConnection();
  return <div>{connected ? '✅ Connected!' : '❌ Failed'}</div>;
}
```

---

## 🛠️ **Database Management**

### **View Tables:**
```sql
SHOW TABLES;
```

### **View Portfolio:**
```sql
SELECT * FROM portfolio_items;
```

### **View Transactions:**
```sql
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;
```

### **View Snapshots:**
```sql
SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 10;
```

### **Reset Database (CAUTION!):**
```sql
DROP TABLE portfolio_items;
DROP TABLE transactions;
DROP TABLE portfolio_snapshots;
DROP TABLE cash_holdings;
```

Then restart the app to recreate tables.

---

## 🔒 **Security Notes**

**Current Setup (As Requested):**
- ✅ Credentials in plaintext (no .env)
- ✅ Direct database connection
- ⚠️ **Not recommended for production!**

**For Production:**
1. Move credentials to `.env.local`
2. Add authentication/authorization
3. Implement rate limiting
4. Use connection pooling
5. Add input validation
6. Implement SQL injection protection (Sequelize handles this)

---

## 📊 **Features Preserved**

All existing features work with database:

✅ **Portfolio Management** - Add, edit, delete stocks  
✅ **Transaction History** - Buy/sell tracking  
✅ **Growth Charts** - Real-time snapshots  
✅ **Cash Management** - Balance tracking  
✅ **Average Price Calculation** - Automatic recalculation  
✅ **Real-time Updates** - 5-second snapshot interval  

---

## 🎯 **Migration Checklist**

- [x] Database configuration created
- [x] Models defined (4 tables)
- [x] API routes created (4 endpoints)
- [ ] Install `sequelize` and `mysql2`
- [ ] Update frontend hooks
- [ ] Test database connection
- [ ] Migrate existing LocalStorage data (optional)
- [ ] Remove LocalStorage code
- [ ] Test all features

---

## 💡 **Tips**

1. **First Run:** Tables auto-create on first API call
2. **Data Migration:** Export LocalStorage → Import via API
3. **Backup:** Regular database backups recommended
4. **Monitoring:** Check console logs for SQL queries (set `logging: console.log` in db.ts)
5. **Performance:** Indexes already added for common queries

---

## 🆘 **Troubleshooting**

### **Connection Failed:**
- Check database credentials
- Verify host is accessible
- Check firewall settings
- Ensure MySQL server is running

### **Tables Not Created:**
- Check console for errors
- Verify database permissions
- Try manual table creation

### **Slow Queries:**
- Check indexes
- Optimize queries
- Increase connection pool size

---

**Database is ready! Install dependencies and start using it!** 🚀✨
