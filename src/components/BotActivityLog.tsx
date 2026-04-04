"use client";

import { useState, useEffect } from "react";
import { BotActivity } from "@/lib/activityTypes";
import { getBotActivities } from "@/lib/cryptoStorage";
import { Activity, TrendingUp, TrendingDown, Info, AlertTriangle, CheckCircle, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BotActivityLogProps {
    botId?: string;
    maxHeight?: string;
}

export function BotActivityLog({ botId, maxHeight = "400px" }: BotActivityLogProps) {
    const [activities, setActivities] = useState<BotActivity[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        loadActivities();

        // Refresh activities every 2 seconds
        const interval = setInterval(loadActivities, 2000);
        return () => clearInterval(interval);
    }, [botId]);

    function loadActivities() {
        const allActivities = getBotActivities(botId, 50);
        setActivities(allActivities);
    }

    function getActivityIcon(type: string) {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-4 h-4" />;
            case 'error':
                return <XCircle className="w-4 h-4" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4" />;
            case 'trade':
                return <Zap className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    }

    function getActivityColor(type: string) {
        switch (type) {
            case 'success':
                return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
            case 'error':
                return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
            case 'trade':
                return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
            default:
                return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
        }
    }

    function formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    if (activities.length === 0) {
        return (
            <div className="bg-white dark:bg-[#12151c] rounded-xl border border-gray-200 dark:border-[#1e232d] p-8 text-center">
                <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada aktivitas</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Aktivitas bot akan muncul di sini
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#12151c] rounded-xl border border-gray-200 dark:border-[#1e232d] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#1e232d] bg-gray-50/50 dark:bg-[#1a1d23]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                        Live
                    </span>
                </div>
                <div className="text-xs text-gray-500">
                    {activities.length} aktivitas
                </div>
            </div>

            <div
                className="overflow-y-auto custom-scrollbar"
                style={{ maxHeight }}
            >
                <div className="p-3 space-y-2">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                        >
                            <div className={cn(
                                "p-1.5 rounded-lg flex-shrink-0 mt-0.5",
                                getActivityColor(activity.type)
                            )}>
                                {getActivityIcon(activity.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                        {activity.action}
                                    </p>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                        {formatTime(activity.timestamp)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {activity.message}
                                </p>
                                {activity.details && (
                                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800/50 rounded text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                        {typeof activity.details === 'string'
                                            ? activity.details
                                            : JSON.stringify(activity.details, null, 2)
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
