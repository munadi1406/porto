// Sequelize Models for Portfolio Application (Single User - No Auth)
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './db';

// ============================================
// Portfolio Item Model
// ============================================
interface PortfolioItemAttributes {
    id: string;
    userId: string;
    ticker: string;
    name: string;
    lots: number;
    averagePrice: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PortfolioItemCreationAttributes extends Optional<PortfolioItemAttributes, 'id' | 'userId' | 'createdAt' | 'updatedAt'> { }

export class PortfolioItem extends Model<PortfolioItemAttributes, PortfolioItemCreationAttributes> implements PortfolioItemAttributes {
    declare id: string;
    declare userId: string;
    declare ticker: string;
    declare name: string;
    declare lots: number;
    declare averagePrice: number;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

PortfolioItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'default',
        },
        ticker: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        lots: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        averagePrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('averagePrice');
                return rawValue ? Number(rawValue) : 0;
            }
        },
    },
    {
        sequelize,
        tableName: 'portfolio_items',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId', 'ticker'],
                name: 'portfolio_item_user_ticker_unique'
            },
        ],
    }
);

// ============================================
// Transaction Model
// ============================================
interface TransactionAttributes {
    id: string;
    userId: string;
    type: 'buy' | 'sell';
    ticker: string;
    name: string;
    lots: number;
    pricePerShare: number;
    totalAmount: number;
    notes?: string;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'userId' | 'notes' | 'createdAt' | 'updatedAt'> { }

export class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
    declare id: string;
    declare userId: string;
    declare type: 'buy' | 'sell';
    declare ticker: string;
    declare name: string;
    declare lots: number;
    declare pricePerShare: number;
    declare totalAmount: number;
    declare notes?: string;
    declare timestamp: Date;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Transaction.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'default',
        },
        type: {
            type: DataTypes.ENUM('buy', 'sell'),
            allowNull: false,
        },
        ticker: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        lots: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        pricePerShare: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'transactions',
        timestamps: true,
        indexes: [
            {
                fields: ['userId'],
                name: 'transaction_user_id_idx'
            },
            {
                fields: ['ticker'],
                name: 'transaction_ticker_idx'
            },
            {
                fields: ['timestamp'],
                name: 'transaction_timestamp_idx'
            },
        ],
    }
);

// ============================================
// Portfolio Snapshot Model (for growth tracking)
// ============================================
interface SnapshotAttributes {
    id: string;
    userId: string;
    timestamp: number; // Changed to number (milliseconds)
    totalValue: number; // Will be stored as BIGINT
    stockValue: number;
    cashValue: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SnapshotCreationAttributes extends Optional<SnapshotAttributes, 'id' | 'userId' | 'createdAt' | 'updatedAt'> { }

export class PortfolioSnapshot extends Model<SnapshotAttributes, SnapshotCreationAttributes> implements SnapshotAttributes {
    declare id: string;
    declare userId: string;
    declare timestamp: number;
    declare totalValue: number;
    declare stockValue: number;
    declare cashValue: number;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

PortfolioSnapshot.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'default',
        },
        timestamp: {
            type: DataTypes.BIGINT,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('timestamp');
                return rawValue ? Number(rawValue) : Date.now();
            }
        },
        totalValue: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            get() {
                const rawValue = this.getDataValue('totalValue');
                return rawValue ? Number(rawValue) : 0;
            }
        },
        stockValue: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            get() {
                const rawValue = this.getDataValue('stockValue');
                return rawValue ? Number(rawValue) : 0;
            }
        },
        cashValue: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            get() {
                const rawValue = this.getDataValue('cashValue');
                return rawValue ? Number(rawValue) : 0;
            }
        },
    },
    {
        sequelize,
        tableName: 'portfolio_snapshots',
        timestamps: true,
        indexes: [
            {
                fields: ['userId'],
                name: 'snapshot_user_id_idx'
            },
            {
                fields: ['timestamp'],
                name: 'snapshot_timestamp_idx'
            },
        ],
    }
);

// ============================================
// Cash Holding Model
// ============================================
interface CashHoldingAttributes {
    id: number;
    userId: string;
    amount: number;
    lastUpdated: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CashHoldingCreationAttributes extends Optional<CashHoldingAttributes, 'id' | 'userId' | 'createdAt' | 'updatedAt'> { }

export class CashHolding extends Model<CashHoldingAttributes, CashHoldingCreationAttributes> implements CashHoldingAttributes {
    declare id: number;
    declare userId: string;
    declare amount: number;
    declare lastUpdated: Date;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

CashHolding.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'default',
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        lastUpdated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'cash_holdings',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId'],
                name: 'cash_holding_user_id_unique'
            }
        ]
    }
);

// ============================================
// Sync all models with database
// ============================================
let syncPromise: Promise<boolean> | null = null;

export async function syncDatabase() {
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
        try {
            await sequelize.sync({ alter: true });
            console.log('✅ All models synchronized successfully.');

            // Ensure there's at least one cash holding record for default user
            const cashCount = await CashHolding.count({ where: { userId: 'default' } });
            if (cashCount === 0) {
                await CashHolding.create({
                    userId: 'default',
                    amount: 0,
                    lastUpdated: new Date(),
                });
                console.log('✅ Initial cash holding created for default user.');
            }

            return true;
        } catch (error) {
            console.error('❌ Error syncing database:', error);
            syncPromise = null; // Allow retry on failure
            return false;
        }
    })();

    return syncPromise;
}

export { sequelize };
