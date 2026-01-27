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

export function SummaryCard({ title, value, subValue, subLabel, icon: Icon, trend = "neutral" }: SummaryCardProps) {
    return (
        <div className="group relative bg-white dark:bg-[#12151c] p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-[#1e232d] hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[110px] sm:min-h-[130px]">
            <div className="relative w-full">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate flex-1 pr-2">
                        {title}
                    </h3>
                    <div className={cn(
                        "p-1.5 rounded-lg transition-all duration-300 flex-shrink-0",
                        trend === "up" ? "bg-emerald-50 dark:bg-[#19d57a]/10 text-emerald-600 dark:text-[#19d57a]" :
                            trend === "down" ? "bg-rose-50 dark:bg-[#ff5d5d]/10 text-rose-600 dark:text-[#ff5d5d]" :
                                "bg-blue-50 dark:bg-[#3498db]/10 text-[#3498db]"
                    )}>
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                        {value}
                    </p>
                    {(subValue || subLabel) && (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {subValue && (
                                <span className={cn(
                                    "text-xs font-semibold whitespace-nowrap",
                                    trend === "up" ? "text-[#19d57a]" :
                                        trend === "down" ? "text-[#ff5d5d]" :
                                            "text-[#3498db]"
                                )}>
                                    {subValue}
                                </span>
                            )}
                            {subLabel && (
                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
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
