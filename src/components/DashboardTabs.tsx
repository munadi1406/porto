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
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="border-b border-gray-100 dark:border-[#1e232d]">
                <div className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-[#19d57a] text-[#19d57a]"
                                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-200">
                {children(activeTab)}
            </div>
        </div>
    );
}
