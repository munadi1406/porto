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
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-1 py-3 md:py-4 text-xs md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
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
