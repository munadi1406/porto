"use client";

import { Home, PieChart, TrendingUp, History, Wallet, Building2, Layers, Menu, X, ChevronRight, Activity, Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

import { PortfolioSelector } from "./PortfolioSelector";
import { SidebarPortfolios } from "./SidebarPortfolios";

const primaryNav = [
    { name: "Main", href: "/", icon: Layers, desc: "Global Overview" },
    { name: "Dash", href: "/dashboard", icon: Home, desc: "Portfolio Home" },
    { name: "Assets", href: "/portfolio", icon: PieChart, desc: "Stock Holdings" },
];

const secondaryNav = [
    {
        title: "Analysis & Reports",
        items: [
            { name: "Analytics", href: "/analytics", icon: TrendingUp, desc: "Performance & growth metrics" },
            { name: "Stock Chart", href: "/analysis/BBCA.JK", icon: Activity, desc: "Technical chart & patterns" },
            { name: "Fundamentals", href: "/fundamentals", icon: Building2, desc: "Stock data & valuation" },
        ]
    },
    {
        title: "Trading Tools",
        items: [
            { name: "Crypto Bot", href: "/crypto-bot", icon: Bot, desc: "Auto trading simulator" },
            { name: "Stock Bot", href: "/stock-bot", icon: Bot, desc: "IDX auto trading bot" },
        ]
    },
    {
        title: "Activity Logs",
        items: [
            { name: "History", href: "/history", icon: History, desc: "Transaction and cash logs" },
        ]
    }
];

const allNavItems = [
    ...primaryNav,
    ...secondaryNav.flatMap(g => g.items)
];

export function MobileNav() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when path changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isMenuOpen]);

    return (
        <>
            {/* Mobile Top Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 dark:bg-[#0f131a]/85 backdrop-blur-xl border-b border-slate-200/40 dark:border-white/[0.04] px-4 h-16 flex items-center shadow-sm">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-[#2980b9] to-[#3498db] rounded-xl shadow-md shadow-blue-500/10">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                            <span className="font-black text-[11px] text-slate-900 dark:text-white uppercase tracking-wider">Porto IDX</span>
                            <span className="text-[8px] font-black text-[#3498db] uppercase tracking-[0.15em] opacity-95">Pro Investor</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-[140px]">
                            <PortfolioSelector />
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer Menu Overly */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Drawer Menu */}
            <div className={cn(
                "fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-white/95 dark:bg-[#0f131a]/98 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-slate-200/40 dark:border-white/[0.05] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.4)]",
                isMenuOpen ? "translate-y-0" : "translate-y-full"
            )}>
                <div className="p-6 pb-12 max-h-[85vh] overflow-y-auto">
                    {/* Handle */}
                    <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" onClick={() => setIsMenuOpen(false)} />

                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Main Menu</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Explore features</p>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {secondaryNav.map((group, idx) => (
                            <div key={idx} className="space-y-3">
                                <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15rem] px-2">{group.title}</h3>
                                <div className="grid gap-2">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3.5 p-3 rounded-xl transition-all border",
                                                    isActive
                                                        ? "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 dark:border-blue-500/30"
                                                        : "bg-slate-50 dark:bg-white/[0.01] border-transparent hover:border-slate-200 dark:hover:border-white/5"
                                                )}
                                            >
                                                <div className={cn("p-2 rounded-lg", isActive ? "bg-blue-500/15 dark:bg-blue-500/20 shadow-sm" : "bg-white dark:bg-slate-800")}>
                                                    <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-blue-500" : "text-slate-400")} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn("text-xs font-bold tracking-tight", isActive ? "text-blue-500" : "text-slate-900 dark:text-white uppercase")}>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{item.desc}</p>
                                                </div>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/10 dark:border-blue-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                                <Activity className="w-4 h-4 text-blue-500" />
                            </div>
                            <p className="text-[9px] font-bold text-blue-500/80 uppercase tracking-widest">Version 2.0.4 Premium</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation (Floating glass dock) */}
            <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 bg-white/80 dark:bg-[#0f131a]/85 backdrop-blur-xl border border-slate-200/40 dark:border-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] rounded-[2rem] safe-area-bottom overflow-hidden">
                <div className="grid grid-cols-4 h-16">
                    {primaryNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative py-2",
                                    isActive
                                        ? "text-blue-500 dark:text-[#3498db]"
                                        : "text-slate-400 dark:text-slate-500"
                                )}
                            >
                                <item.icon className={cn("w-4.5 h-4.5 transition-all duration-300", isActive ? "scale-110 translate-y-[-2px]" : "scale-100")} />
                                <span className={cn("text-[9px] uppercase font-bold tracking-wider transition-all duration-300", isActive ? "opacity-100 font-extrabold" : "opacity-75")}>
                                    {item.name}
                                </span>
                                {isActive && (
                                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-blue-500 dark:bg-[#3498db] rounded-full shadow-[0_0_8px_rgba(52,152,219,0.6)]" />
                                )}
                            </Link>
                        );
                    })}

                    {/* More Menu Trigger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative py-2",
                            isMenuOpen
                                ? "text-blue-500 dark:text-[#3498db]"
                                : "text-slate-400 dark:text-slate-500"
                        )}
                    >
                        {isMenuOpen ? <X className="w-4.5 h-4.5 scale-110 transition-transform" /> : <Menu className="w-4.5 h-4.5 transition-transform" />}
                        <span className={cn("text-[9px] uppercase font-bold tracking-wider", isMenuOpen ? "opacity-100 font-extrabold" : "opacity-75")}>
                            Menu
                        </span>
                        {isMenuOpen && (
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-blue-500 dark:bg-[#3498db] rounded-full shadow-[0_0_8px_rgba(52,152,219,0.6)]" />
                        )}
                    </button>
                </div>
            </nav>

            {/* Desktop Sidebar (Floating premium glass panel) */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-4 md:top-4 md:bottom-4 md:w-64 bg-white/70 dark:bg-[#0f131a]/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.06] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] rounded-[2rem] z-50">
                <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-[#1b202c]/50 dark:to-[#0f131a]/50 rounded-[1.8rem] border border-slate-200/40 dark:border-white/[0.03] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-[#2980b9] to-[#3498db] rounded-xl shadow-md shadow-blue-500/10">
                            <Wallet className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                Portfolio IDX
                            </h1>
                            <p className="text-[8px] font-black text-[#3498db] uppercase tracking-[0.2em] leading-none mt-1">Pro Investor</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6 flex-1 overflow-y-auto scrollbar-hide">
                    <SidebarPortfolios />
                </div>

                <div className="space-y-0.5 mb-4">
                    <div className="px-3 mb-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.25em]">Navigation</span>
                    </div>
                    {allNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                                    isActive
                                        ? "bg-blue-500/10 dark:bg-[#3498db]/10 text-blue-600 dark:text-[#3498db] font-black shadow-sm"
                                        : "text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:text-slate-900 dark:hover:text-slate-300"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-blue-600 dark:text-[#3498db]" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-400")} />
                                <span className="text-[10px] uppercase font-bold tracking-widest">{item.name}</span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 dark:bg-[#3498db] rounded-r-full shadow-[0_0_8px_rgba(52,152,219,0.5)]" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-200/50 dark:border-white/[0.05]">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                            © 2026 Porto IDX
                        </p>
                        <div className="w-1.5 h-1.5 bg-[#3498db] rounded-full animate-pulse shadow-[0_0_8px_#3498db]" />
                    </div>
                </div>
            </nav>
        </>
    );
}
