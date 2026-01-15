# 🗄️ Database Migration Guide

## 📋 **Prerequisites**

Pastikan sudah install semua dependencies:

```bash
npm install sequelize mysql2 pg-hstore @fingerprintjs/fingerprintjs
npm install -D tsx
```

---

## 🚀 **Running Migration**

### **Step 1: Run Migration Script**

```bash
npm run db:migrate
```

### **Expected Output:**

```
🚀 Starting database migration...

1️⃣ Testing database connection...
✅ Database connection successful!

2️⃣ Creating database tables...
✅ All tables created/updated successfully!

📋 Database tables:
   - cash_holdings
   - portfolio_items
   - portfolio_snapshots
   - transactions

3️⃣ Initializing default data...
✅ Initial cash record created

🎉 Migration completed successfully!

📊 Database is ready to use!
```

---

## 📊 **Tables Created**

### **1. portfolio_items**
```sql
CREATE TABLE portfolio_items (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL DEFAULT 'default',
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  lots INT NOT NULL DEFAULT 0,
  averagePrice DECIMAL(15,2) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY unique_user_ticker (userId, ticker)
);
```

### **2. transactions**
```sql
CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL DEFAULT 'default',
  type ENUM('buy','sell') NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  lots INT NOT NULL,
  pricePerShare DECIMAL(15,2) NOT NULL,
  totalAmount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  timestamp DATETIME NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_ticker (ticker),
  INDEX idx_timestamp (timestamp)
);
```

### **3. portfolio_snapshots**
```sql
CREATE TABLE portfolio_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL DEFAULT 'default',
  timestamp DATETIME NOT NULL,
  totalValue DECIMAL(15,2) NOT NULL,
  stockValue DECIMAL(15,2) NOT NULL,
  cashValue DECIMAL(15,2) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_timestamp (timestamp)
);
```

### **4. cash_holdings**
```sql
CREATE TABLE cash_holdings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(50) NOT NULL DEFAULT 'default' UNIQUE,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  lastUpdated DATETIME NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

---

## 🔧 **User ID System**

### **Current Setup: Single User (No Auth)**

- All data uses `userId = 'default'`
- No login/register required
- Perfect for personal use

### **Future: Multi-User Support**

If you want to add multi-user support later:

1. Install fingerprint library (already installed):
   ```bash
   npm install @fingerprintjs/fingerprintjs
   ```

2. Generate unique user ID based on browser fingerprint
3. Update API routes to use fingerprint ID instead of 'default'

---

## ✅ **Verify Migration**

### **Option 1: MySQL Client**

```sql
-- Connect to database
mysql -h 195.88.211.226 -u dcryptmy_porto -p dcryptmy_porto

-- Show tables
SHOW TABLES;

-- Check structure
DESCRIBE portfolio_items;
DESCRIBE transactions;
DESCRIBE portfolio_snapshots;
DESCRIBE cash_holdings;

-- Check initial data
SELECT * FROM cash_holdings;
```

### **Option 2: Browser Console**

After starting the app:

```javascript
// Test API
fetch('/api/portfolio').then(r => r.json()).then(console.log);
```

---

## 🔄 **Re-run Migration**

If you need to update table structure:

```bash
npm run db:migrate
```

The migration uses `{ alter: true }` which:
- ✅ Updates existing tables to match new schema
- ✅ Preserves existing data
- ✅ Adds new columns if needed

---

## ⚠️ **Reset Database (CAUTION!)**

To completely reset and recreate all tables:

### **Option 1: SQL**

```sql
DROP TABLE portfolio_items;
DROP TABLE transactions;
DROP TABLE portfolio_snapshots;
DROP TABLE cash_holdings;
```

Then run migration again:
```bash
npm run db:migrate
```

### **Option 2: Update migrate.ts**

Change in `src/lib/migrate.ts`:
```typescript
await sequelize.sync({ force: true }); // ⚠️ This will DROP all tables!
```

---

## 📝 **Migration Script Details**

### **Location:**
`src/lib/migrate.ts`

### **What it does:**
1. Tests database connection
2. Creates/updates all tables
3. Creates initial cash record for default user
4. Shows created tables

### **Safe to run multiple times:**
- ✅ Won't duplicate data
- ✅ Won't delete existing data
- ✅ Only updates schema if needed

---

## 🎯 **Next Steps**

After successful migration:

1. ✅ **Start dev server:**
   ```bash
   npm run dev
   ```

2. ✅ **Test the app:**
   - Add a stock
   - Check database to verify data saved

3. ✅ **Verify in MySQL:**
   ```sql
   SELECT * FROM portfolio_items;
   ```

---

## 🆘 **Troubleshooting**

### **Error: Connection refused**
- Check database credentials in `src/lib/db.ts`
- Verify MySQL server is running
- Check firewall settings

### **Error: Table already exists**
- Normal! Migration will update existing tables
- Use `{ alter: true }` to preserve data

### **Error: Access denied**
- Verify username/password
- Check database permissions

### **Error: Unknown database**
- Database 'dcryptmy_porto' must exist
- Create it manually if needed:
  ```sql
  CREATE DATABASE dcryptmy_porto;
  ```

---

## 🎉 **Success!**

After migration, your database is ready to use!

**Tables created:** ✅  
**Initial data:** ✅  
**App ready:** ✅  

Start the app and enjoy your database-powered portfolio tracker! 🚀📊✨
