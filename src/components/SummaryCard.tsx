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

    const accentColor = trend === "up" ? "var(--success)" : trend === "down" ? "var(--danger)" : "var(--accent)";

    return (
        <div className={cn(
            "bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 transition-shadow hover:shadow-[var(--shadow)]",
        )}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[var(--muted)]">{title}</p>
                <div className="p-1.5 rounded-md" style={{ backgroundColor: `${accentColor}15` }}>
                    <Icon className="w-4 h-4" style={{ color: accentColor }} />
                </div>
            </div>
            <div>
                <p className="text-xl font-semibold text-[var(--fg)] tracking-tight truncate">
                    <PrivacyWrapper isPrivate={isPrivacyMode}>{value}</PrivacyWrapper>
                </p>
                {(subValue || subLabel) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {subValue && (
                            <span className="text-xs font-medium" style={{ color: accentColor }}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{subValue}</PrivacyWrapper>
                            </span>
                        )}
                        {subLabel && (
                            <span className="text-xs text-[var(--muted)]">{subLabel}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
