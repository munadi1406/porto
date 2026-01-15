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
