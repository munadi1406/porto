// Database Migration Script
// Run this to create all tables in the database

import sequelize from './db';
import { PortfolioItem, Transaction, PortfolioSnapshot, CashHolding } from './models';

async function runMigration() {
    try {
        console.log('🚀 Starting database migration...\n');

        // Test connection
        console.log('1️⃣ Testing database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connection successful!\n');

        // Sync all models (create tables)
        console.log('2️⃣ Creating database tables...');
        await sequelize.sync({ force: false, alter: true });
        console.log('✅ All tables created/updated successfully!\n');

        // Show created tables
        const [results] = await sequelize.query('SHOW TABLES');
        console.log('📋 Database tables:');
        results.forEach((row: any) => {
            const tableName = Object.values(row)[0];
            console.log(`   - ${tableName}`);
        });
        console.log('');

        // Create initial cash record if not exists
        console.log('3️⃣ Initializing default data...');
        const cashCount = await CashHolding.count();
        if (cashCount === 0) {
            await CashHolding.create({
                userId: 'default',
                amount: 0,
                lastUpdated: new Date(),
            });
            console.log('✅ Initial cash record created\n');
        } else {
            console.log('ℹ️  Cash records already exist\n');
        }

        console.log('🎉 Migration completed successfully!');
        console.log('\n📊 Database is ready to use!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
runMigration();
