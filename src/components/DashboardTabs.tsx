"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
    id: string;
    label: string;
    icon?: ReactNode;
}

interface DashboardTabsProps {
    tabs: Tab[];
    children: (activeTab: string) => ReactNode;
}

export function DashboardTabs({ tabs, children }: DashboardTabsProps) {
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || "");

    return (
        <div className="space-y-4">
            <div className="flex overflow-x-auto scrollbar-hide border-b border-[var(--border)]">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
                                isActive
                                    ? "border-[var(--accent)] text-[var(--accent)]"
                                    : "border-transparent text-[var(--muted-fg)] hover:text-[var(--fg)] hover:border-[var(--border)]"
                            )}
                        >
                            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
            <div>
                {children(activeTab)}
            </div>
        </div>
    );
}
