// Test API to check database connection
import { NextResponse } from 'next/server';
import sequelize from '@/lib/db';

export async function GET() {
    try {
        // Test connection
        await sequelize.authenticate();

        // Get tables
        const [results] = await sequelize.query('SHOW TABLES');

        return NextResponse.json({
            success: true,
            message: 'Database connected successfully!',
            tables: results,
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
