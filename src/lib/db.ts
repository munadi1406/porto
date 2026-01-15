// Database configuration using Sequelize
import { Sequelize } from 'sequelize';

import mysql2 from 'mysql2';

// Database credentials (plaintext as requested)
const sequelize = new Sequelize('dcryptmy_porto', 'dcryptmy_porto', 'I9jR^hLdjMa*I=2h', {
    host: '195.88.211.226',
    dialect: 'mysql',
    dialectModule: mysql2, // Explicitly pass mysql2 to avoid dynamic require issues on Vercel
    logging: false, // Set to console.log to see SQL queries
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        connectTimeout: 60000,
        decimalNumbers: true,
    },
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
    },
});

// Test connection
export async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
        return false;
    }
}

export default sequelize;
