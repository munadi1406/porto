// Bot Activity Log Types
export interface BotActivity {
    id: string;
    botId: string;
    timestamp: number;
    type: 'info' | 'success' | 'warning' | 'error' | 'trade';
    action: string;
    message: string;
    details?: any;
}

export type ActivityType = 'info' | 'success' | 'warning' | 'error' | 'trade';
