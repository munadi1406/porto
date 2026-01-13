import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
    title: string;
    value: string;
    subValue?: string;
    subLabel?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
}

export function SummaryCard({ title, value, subValue, subLabel, icon: Icon, trend }: SummaryCardProps) {
    return (
        <div className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/5 dark:to-purple-900/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {title}
                    </h3>
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300",
                        "bg-gradient-to-br shadow-sm",
                        trend === "up" && "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 group-hover:shadow-green-200/50",
                        trend === "down" && "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 group-hover:shadow-red-200/50",
                        (!trend || trend === "neutral") && "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 group-hover:shadow-blue-200/50"
                    )}>
                        <Icon className={cn(
                            "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                            trend === "up" && "text-green-600 dark:text-green-400",
                            trend === "down" && "text-red-600 dark:text-red-400",
                            (!trend || trend === "neutral") && "text-blue-600 dark:text-blue-400"
                        )} />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {value}
                    </p>
                    {(subValue || subLabel) && (
                        <div className="flex items-center gap-2 text-sm">
                            {subValue && (
                                <span
                                    className={cn(
                                        "font-semibold px-2 py-0.5 rounded-md",
                                        trend === "up" && "text-green-700 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20",
                                        trend === "down" && "text-red-700 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20",
                                        (!trend || trend === "neutral") && "text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/50"
                                    )}
                                >
                                    {subValue}
                                </span>
                            )}
                            {subLabel && (
                                <span className="text-gray-500 dark:text-gray-500 text-xs">
                                    {subLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
