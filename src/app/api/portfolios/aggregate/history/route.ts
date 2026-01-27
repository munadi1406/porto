import { NextRequest, NextResponse } from 'next/server';
import { getAggregateHistory } from '@/lib/models';

export async function GET(request: NextRequest) {
    try {
        const history = await getAggregateHistory();

        return NextResponse.json({
            success: true,
            data: history
        });
    } catch (error: any) {
        console.error('Error fetching aggregate history:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch aggregate history' },
            { status: 500 }
        );
    }
}
