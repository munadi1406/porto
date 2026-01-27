"use client";

import { Home, PieChart, TrendingUp, History, Wallet, Building2, Layers } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { PortfolioSelector } from "./PortfolioSelector";

const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Portfolio", href: "/portfolio", icon: PieChart },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Fund", href: "/fundamentals", icon: Building2 },
    { name: "Total View", href: "/aggregate", icon: Layers },
    { name: "History", href: "/history", icon: History },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Top Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-[10px] dark:text-white whitespace-nowrap">Porto IDX</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <div className="w-full max-w-[140px]">
                            <PortfolioSelector />
                        </div>
                        <Link
                            href="/aggregate"
                            className={cn(
                                "p-2.5 rounded-xl transition-all",
                                pathname === "/aggregate"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                            )}
                        >
                            <Layers className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
                <div className="grid grid-cols-5 h-16">
                    {navigation.filter(i => i.name !== "Total View").map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-colors",
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-600 dark:text-gray-400"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                                <span className="text-xs font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6">
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                Portfolio IDX
                            </h1>
                            <p className="text-xs text-gray-500">Investor Dashboard</p>
                        </div>
                    </div>
                </div>

                {/* Portfolio Switcher */}
                <div className="mb-6">
                    <PortfolioSelector />
                </div>

                <div className="flex-1 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-400 text-center">
                        © 2026 Portfolio IDX
                    </p>
                </div>
            </nav>
        </>
    );
}
