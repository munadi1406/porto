"use client";

import { Home, PieChart, TrendingUp, History, Wallet, Building2, Layers } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { PortfolioSelector } from "./PortfolioSelector";
import { SidebarPortfolios } from "./SidebarPortfolios";

const navigation = [
    { name: "Main", href: "/", icon: Layers },
    { name: "Dash", href: "/dashboard", icon: Home },
    { name: "Assets", href: "/portfolio", icon: PieChart },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Fund", href: "/fundamentals", icon: Building2 },
    { name: "History", href: "/history", icon: History },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Top Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#1a1d23]/90 backdrop-blur-xl border-b border-gray-100 dark:border-[#2d3139] px-4 h-16 flex items-center shadow-sm">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-xl shadow-lg shadow-blue-500/20">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                            <span className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tighter">Porto IDX</span>
                            <span className="text-[9px] font-bold text-[#3498db] dark:text-[#3498db] uppercase tracking-widest opacity-80">Pro Investor</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-[130px]">
                            <PortfolioSelector />
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1a1d23]/95 backdrop-blur-xl border-t border-gray-100 dark:border-[#2d3139] safe-area-bottom">
                <div className="grid grid-cols-6 h-16 max-w-lg mx-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-all relative",
                                    isActive
                                        ? "text-[#3498db] dark:text-[#3498db]"
                                        : "text-gray-400 dark:text-gray-600 hover:text-gray-600"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#3498db] dark:bg-[#3498db] rounded-b-full shadow-[0_4px_12px_rgba(52,152,219,0.4)]" />
                                )}
                                <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "scale-100")} />
                                <span className={cn("text-[10px] uppercase font-black tracking-tighter", isActive ? "opacity-100" : "opacity-60")}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-72 bg-white dark:bg-[#23272f] border-r border-gray-200 dark:border-[#2d3139] p-6">
                <div className="mb-8 p-4 bg-gray-50 dark:bg-[#1a1d23]/50 rounded-[2rem] border border-gray-100 dark:border-[#2d3139]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-2xl shadow-lg shadow-blue-500/10">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                Portfolio IDX
                            </h1>
                            <p className="text-[10px] font-bold text-[#3498db] uppercase tracking-widest leading-none mt-0.5">Investor Dashboard</p>
                        </div>
                    </div>
                </div>

                {/* Portfolio Switcher - Yahoo Finance Style */}
                <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar scrollbar-hide">
                    <SidebarPortfolios />
                </div>

                <div className="space-y-1 mb-6">
                    <div className="px-4 mb-3">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">Navigation</span>
                    </div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                                    isActive
                                        ? "bg-blue-50 dark:bg-[#3498db]/10 text-[#3498db] font-black"
                                        : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-gray-300"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-[#3498db]" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-400")} />
                                <span className="text-xs uppercase font-black tracking-widest">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-[#2d3139]">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 text-center uppercase tracking-widest">
                        © 2026 Portfolio IDX
                    </p>
                </div>
            </nav>
        </>
    );
}
