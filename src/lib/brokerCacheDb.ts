import sequelize from "./db";
import { lastTradingDayWIB } from "./market-hours";

// Cache broksum per-saham ke MySQL — kuota Index Alpha hanya 5 req/hari,
// jadi setiap hasil fetch wajib dipersisten dan dibaca ulang dari DB.
// PENGECUALIAN: hasil KOSONG untuk hari bursa BERJALAN tidak dipercaya
// (laporan harian bisa belum terbit) → diperlakukan sebagai cache-miss
// agar dicoba lagi nanti dan tertimpa data final begitu tersedia.

let tableReady = false;

async function ensureTables() {
    if (tableReady) return;
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS broker_stock_cache (
            id INT AUTO_INCREMENT PRIMARY KEY,
            stock VARCHAR(10) NOT NULL,
            trade_date VARCHAR(10) NOT NULL,
            payload LONGTEXT NOT NULL,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_stock_date (stock, trade_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS broker_api_usage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usage_date DATE NOT NULL,
            calls INT NOT NULL DEFAULT 0,
            UNIQUE KEY uq_usage_date (usage_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS api_cache (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cache_key VARCHAR(120) NOT NULL,
            payload LONGTEXT NOT NULL,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_cache_key (cache_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    tableReady = true;
}

export async function getCachedBrokerStock(stock: string, date: string): Promise<any | null> {
    try {
        await ensureTables();
        const [rows]: any[] = await sequelize.query(
            "SELECT payload FROM broker_stock_cache WHERE stock = :stock AND trade_date = :date LIMIT 1",
            { replacements: { stock, date } }
        );
        if (!rows || rows.length === 0) return null;
        const parsed = JSON.parse(rows[0].payload);
        // Self-heal: empty utk hari bursa berjalan = belum final → anggap miss
        const isEmpty = Array.isArray(parsed?.topBuy) && parsed.topBuy.length === 0;
        if (isEmpty && date === lastTradingDayWIB()) return null;
        return parsed;
    } catch {
        return null; // DB bermasalah → biarkan route lanjut live fetch
    }
}

// Hapus baris kosong (hasil provisional lama) untuk pasangan stock+tanggal
export async function purgeEmptyBrokerStock(stock: string, date: string): Promise<void> {
    try {
        await ensureTables();
        await sequelize.query(
            "DELETE FROM broker_stock_cache WHERE stock = :stock AND trade_date = :date AND payload LIKE '%\"topBuy\":[]%'",
            { replacements: { stock, date } }
        );
    } catch {}
}

export async function saveBrokerStock(stock: string, date: string, payload: any): Promise<boolean> {
    try {
        await ensureTables();
        await sequelize.query(
            `INSERT INTO broker_stock_cache (stock, trade_date, payload)
             VALUES (:stock, :date, :payload)
             ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = CURRENT_TIMESTAMP`,
            { replacements: { stock, date, payload: JSON.stringify(payload) } }
        );
        return true;
    } catch {
        return false;
    }
}

export const DAILY_QUOTA = 5;

export async function getTodayUsage(): Promise<number> {
    try {
        await ensureTables();
        const [rows]: any[] = await sequelize.query(
            "SELECT calls FROM broker_api_usage WHERE usage_date = CURDATE() LIMIT 1"
        );
        if (!rows || rows.length === 0) return 0;
        return Number(rows[0].calls) || 0;
    } catch {
        return 0;
    }
}

export async function incrementUsage(): Promise<void> {
    try {
        await ensureTables();
        await sequelize.query(
            `INSERT INTO broker_api_usage (usage_date, calls) VALUES (CURDATE(), 1)
             ON DUPLICATE KEY UPDATE calls = calls + 1`
        );
    } catch {}
}

// ── Cache generik (key-value) untuk endpoint API berkuota ──
export async function getCachedJson(key: string, maxAgeMs: number): Promise<any | null> {
    try {
        await ensureTables();
        const [rows]: any[] = await sequelize.query(
            "SELECT payload, fetched_at FROM api_cache WHERE cache_key = :key LIMIT 1",
            { replacements: { key } }
        );
        if (!rows || rows.length === 0) return null;
        const age = Date.now() - new Date(rows[0].fetched_at).getTime();
        if (age > maxAgeMs) return null;
        return JSON.parse(rows[0].payload);
    } catch {
        return null;
    }
}

export async function saveCachedJson(key: string, payload: any): Promise<void> {
    try {
        await ensureTables();
        await sequelize.query(
            `INSERT INTO api_cache (cache_key, payload) VALUES (:key, :payload)
             ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = CURRENT_TIMESTAMP`,
            { replacements: { key, payload: JSON.stringify(payload) } }
        );
    } catch {}
}
