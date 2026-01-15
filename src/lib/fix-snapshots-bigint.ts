// Fix Portfolio Snapshots - Change to BIGINT
import sequelize from './db';

async function fixSnapshotsTableSchema() {
    try {
        console.log('🔧 Fixing portfolio_snapshots table schema...');

        // Drop old table
        await sequelize.query('DROP TABLE IF EXISTS portfolio_snapshots');
        console.log('✅ Dropped old table');

        // Create new table with BIGINT instead of DECIMAL
        await sequelize.query(`
            CREATE TABLE portfolio_snapshots (
                id CHAR(36) PRIMARY KEY,
                userId VARCHAR(50) NOT NULL DEFAULT 'default',
                timestamp BIGINT NOT NULL,
                totalValue BIGINT NOT NULL DEFAULT 0,
                stockValue BIGINT NOT NULL DEFAULT 0,
                cashValue BIGINT NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId),
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Created new table with BIGINT');

        // Verify
        const [columns] = await sequelize.query('SHOW COLUMNS FROM portfolio_snapshots');
        console.log('\n📋 New table structure:');
        console.table(columns);

        console.log('\n✅ Table fixed successfully!');
        console.log('💡 Now values will be stored as integers (in rupiah)');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixSnapshotsTableSchema();
