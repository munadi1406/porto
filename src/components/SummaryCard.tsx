import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrivacyWrapper } from "./PrivacyWrapper";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface SummaryCardProps {
    title: string;
    value: string;
    subValue?: string;
    subLabel?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
}

export function SummaryCard({ title, value, subValue, subLabel, icon: Icon, trend = "neutral" }: SummaryCardProps) {
    const { isPrivacyMode } = usePrivacyMode();

    const glowColorClass = trend === "up" ? "glow-emerald" : trend === "down" ? "glow-rose" : "glow-blue";
    const accentGlowBg = trend === "up" ? "bg-emerald-500/20" : trend === "down" ? "bg-rose-500/20" : "bg-blue-500/20";

    return (
        <div className={cn(
            "group relative glass-panel p-4.5 rounded-2xl glass-hover overflow-hidden flex flex-col justify-between min-h-[115px] transition-all duration-300",
            glowColorClass
        )}>
            {/* Soft background glow */}
            <div className={cn("absolute -right-6 -bottom-6 w-16 h-16 rounded-full blur-[24px] transition-all duration-500 group-hover:scale-125", accentGlowBg)} />

            <div className="relative w-full z-10">
                <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate flex-1 pr-2">
                        {title}
                    </h3>
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all duration-300 flex-shrink-0",
                        trend === "up" ? "bg-emerald-500/10 text-emerald-600 dark:text-[#19d57a]" :
                            trend === "down" ? "bg-rose-500/10 text-rose-600 dark:text-[#ff5d5d]" :
                                "bg-blue-500/10 text-[#3498db]"
                    )}>
                        <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        <PrivacyWrapper isPrivate={isPrivacyMode}>
                            {value}
                        </PrivacyWrapper>
                    </p>
                    {(subValue || subLabel) && (
                        <div className="flex items-center gap-1.5 overflow-hidden pt-0.5">
                            {subValue && (
                                <span className={cn(
                                    "text-xs font-bold whitespace-nowrap",
                                    trend === "up" ? "text-emerald-500 dark:text-[#19d57a]" :
                                        trend === "down" ? "text-rose-500 dark:text-[#ff5d5d]" :
                                            "text-blue-500 dark:text-[#3498db]"
                                )}>
                                    <PrivacyWrapper isPrivate={isPrivacyMode}>
                                        {subValue}
                                    </PrivacyWrapper>
                                </span>
                            )}
                            {subLabel && (
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
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
