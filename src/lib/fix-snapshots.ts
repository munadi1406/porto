// Fix Portfolio Snapshots Table Schema
import sequelize from './db';
import { PortfolioSnapshot } from './models';

async function fixSnapshotsTable() {
    try {
        console.log('🔧 Fixing portfolio_snapshots table...');

        // Drop and recreate table
        await sequelize.query('DROP TABLE IF EXISTS portfolio_snapshots');
        console.log('✅ Dropped old table');

        // Sync model to create new table
        await PortfolioSnapshot.sync({ force: true });
        console.log('✅ Created new table with correct schema');

        // Verify columns
        const [columns] = await sequelize.query(`
            SHOW COLUMNS FROM portfolio_snapshots
        `);

        console.log('\n📋 Table columns:');
        console.table(columns);

        console.log('\n✅ Table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixSnapshotsTable();
