"use client";

import { useState, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="overflow-x-auto w-full justify-start">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                        {tab.icon}{tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-4">
                    {children(tab.id)}
                </TabsContent>
            ))}
        </Tabs>
    );
}
