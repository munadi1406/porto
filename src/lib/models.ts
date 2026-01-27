// Sequelize Models for Portfolio Application (Single User - No Auth)
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './db';

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
// Portfolio Model (The Parent Model)
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
interface PortfolioAttributes {
    id: string;
    name: string;
    description?: string;
    color?: string;
    targetValue?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PortfolioCreationAttributes extends Optional<PortfolioAttributes, 'id' | 'description' | 'color' | 'createdAt' | 'updatedAt'> { }

export class Portfolio extends Model<PortfolioAttributes, PortfolioCreationAttributes> implements PortfolioAttributes {
    declare id: string;
    declare name: string;
    declare description?: string;
    declare color?: string;
    declare targetValue?: number;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Portfolio.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '#3b82f6', // blue-500
        },
        targetValue: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: true,
            defaultValue: 0,
            get() {
                const raw = this.getDataValue('targetValue');
                return raw ? Number(raw) : 0;
            }
        },
    },
    {
        sequelize,
        tableName: 'portfolios',
        timestamps: true,
    }
);

// ============================================
// Portfolio Item Model
// ============================================
interface PortfolioItemAttributes {
    id: string;
    portfolioId: string;
    ticker: string;
    name: string;
    lots: number;
    averagePrice: number;
    targetPercentage?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PortfolioItemCreationAttributes extends Optional<PortfolioItemAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class PortfolioItem extends Model<PortfolioItemAttributes, PortfolioItemCreationAttributes> implements PortfolioItemAttributes {
    declare id: string;
    declare portfolioId: string;
    declare ticker: string;
    declare name: string;
    declare lots: number;
    declare averagePrice: number;
    declare targetPercentage?: number;
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
        portfolioId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'portfolios',
                key: 'id'
            }
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
        targetPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
            get() {
                const rawLevel = this.getDataValue('targetPercentage');
                return rawLevel ? Number(rawLevel) : 0;
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
                fields: ['portfolioId', 'ticker'],
                name: 'portfolio_item_port_ticker_unique'
            },
        ],
    }
);

// ============================================
// Transaction Model
// ============================================
interface TransactionAttributes {
    id: string;
    portfolioId: string;
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

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'notes' | 'createdAt' | 'updatedAt'> { }

export class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
    declare id: string;
    declare portfolioId: string;
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
        portfolioId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'portfolios',
                key: 'id'
            }
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
                fields: ['portfolioId'],
                name: 'transaction_portfolio_id_idx'
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
    portfolioId: string;
    timestamp: number;
    totalValue: number;
    stockValue: number;
    cashValue: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SnapshotCreationAttributes extends Optional<SnapshotAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class PortfolioSnapshot extends Model<SnapshotAttributes, SnapshotCreationAttributes> implements SnapshotAttributes {
    declare id: string;
    declare portfolioId: string;
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
        portfolioId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'portfolios',
                key: 'id'
            }
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
                fields: ['portfolioId'],
                name: 'snapshot_portfolio_id_idx'
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
    portfolioId: string;
    amount: number;
    lastUpdated: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CashHoldingCreationAttributes extends Optional<CashHoldingAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class CashHolding extends Model<CashHoldingAttributes, CashHoldingCreationAttributes> implements CashHoldingAttributes {
    declare id: number;
    declare portfolioId: string;
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
        portfolioId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'portfolios',
                key: 'id'
            }
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
                fields: ['portfolioId'],
                name: 'cash_holding_portfolio_id_unique'
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
            return true;
        } catch (error) {
            console.error('❌ Error syncing database:', error);
            syncPromise = null; // Allow retry on failure
            return false;
        }
    })();

    return syncPromise;
}

// ============================================
// Get Aggregate Portfolio History
// ============================================
export async function getAggregateHistory() {
    try {
        // Get all portfolios
        const portfolios = await Portfolio.findAll();

        if (portfolios.length === 0) {
            return [];
        }

        // Get all snapshots from all portfolios, ordered by time
        const allSnapshots = await PortfolioSnapshot.findAll({
            where: {
                portfolioId: portfolios.map(p => p.id)
            },
            order: [['timestamp', 'ASC']]
        });

        if (allSnapshots.length === 0) {
            return [];
        }

        // Create a map to track the latest totalValue for each portfolio
        const latestValues = new Map<string, number>();
        const aggregatedHistory: { timestamp: string, totalValue: number }[] = [];

        // Iterate through all snapshots in chronological order
        allSnapshots.forEach(snapshot => {
            // Update the latest value for this specific portfolio
            latestValues.set(snapshot.portfolioId, Number(snapshot.totalValue || 0));

            // Calculate current aggregate total by summing all known portfolio values
            let aggregateTotal = 0;
            latestValues.forEach(val => aggregateTotal += val);

            aggregatedHistory.push({
                timestamp: new Date(snapshot.timestamp).toISOString(),
                totalValue: aggregateTotal
            });
        });

        return aggregatedHistory;
    } catch (error) {
        console.error('Error fetching aggregate history:', error);
        return [];
    }
}

export { sequelize };
