"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gray-200 dark:bg-gray-800",
                className
            )}
        />
    );
}

// Portfolio Table Skeleton
export function PortfolioTableSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

// Card Skeleton
export function CardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-24" />
        </div>
    );
}

// Chart Skeleton
export function ChartSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-[300px] w-full" />
        </div>
    );
}

// Summary Cards Skeleton
export function SummaryCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>

                {/* Summary Cards */}
                <SummaryCardsSkeleton />

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>

                {/* Portfolio Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <PortfolioTableSkeleton />
                </div>
            </div>
        </div>
    );
}

// Transaction History Skeleton
export function TransactionHistorySkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-6 rounded-lg" />
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-40" />
                            </div>
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Equity Growth Chart Skeleton (Pro Version)
export function EquityGrowthChartSkeleton() {
    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-2xl p-6 space-y-6 border border-gray-800/50">
            <div className="space-y-2">
                <Skeleton className="h-3 w-20 bg-gray-800" />
                <Skeleton className="h-10 w-56 bg-gray-800" />
            </div>
            <Skeleton className="h-[280px] w-full bg-gray-800" />
            <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-12 rounded-xl bg-gray-800" />
                ))}
            </div>
        </div>
    );
}

// Cash Manager Skeleton
export function CashManagerSkeleton() {
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 p-6 rounded-2xl shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl bg-white/20" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 bg-white/20" />
                            <Skeleton className="h-3 w-24 bg-white/20" />
                        </div>
                    </div>
                </div>
                <Skeleton className="h-10 w-48 bg-white/20 mb-1" />
                <Skeleton className="h-3 w-40 bg-white/20" />
            </div>
        </div>
    );
}
