import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
    const color = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-primary";

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <p className="text-xl font-semibold tracking-tight truncate">
                    <PrivacyWrapper isPrivate={isPrivacyMode}>{value}</PrivacyWrapper>
                </p>
                {(subValue || subLabel) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {subValue && (
                            <span className={cn("text-sm font-medium", color)}>
                                <PrivacyWrapper isPrivate={isPrivacyMode}>{subValue}</PrivacyWrapper>
                            </span>
                        )}
                        {subLabel && <span className="text-sm text-muted-foreground">{subLabel}</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
