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
            {/* Tabs Navigation (Modern Capsule Design) */}
            <div className="flex overflow-x-auto scrollbar-hide py-1">
                <div className="flex bg-slate-200/40 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/30 dark:border-white/[0.04] w-full md:w-auto gap-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap flex-1 md:flex-initial",
                                    isActive
                                        ? "bg-white dark:bg-[#161a23] text-blue-600 dark:text-[#3498db] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-slate-200/10 dark:border-white/[0.02]"
                                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                                )}
                            >
                                {tab.icon && <span className={cn("w-4 h-4 flex items-center justify-center transition-transform duration-300", isActive ? "scale-105" : "scale-100")}>{tab.icon}</span>}
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-200">
                {children(activeTab)}
            </div>
        </div>
    );
}
