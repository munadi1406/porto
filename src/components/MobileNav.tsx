"use client";

import { Home, PieChart, TrendingUp, History, Wallet, Building2, Layers, Menu, X, ChevronRight, Activity } from "lucide-react";
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
            { name: "Fundamentals", href: "/fundamentals", icon: Building2, desc: "Stock data & valuation" },
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
            <header className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white/95 dark:bg-[#1a1d23]/95 backdrop-blur-xl border-b border-gray-100 dark:border-[#2d3139] px-4 h-16 flex items-center shadow-sm">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-xl shadow-lg shadow-blue-500/20">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                            <span className="font-black text-[11px] text-gray-900 dark:text-white uppercase tracking-tighter">Porto IDX</span>
                            <span className="text-[8px] font-bold text-[#3498db] dark:text-[#3498db] uppercase tracking-[0.2em] opacity-80">Pro Investor</span>
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
                "fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-white dark:bg-[#1a1d23] rounded-t-[2.5rem] border-t border-gray-100 dark:border-[#2d3139] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.25)]",
                isMenuOpen ? "translate-y-0" : "translate-y-full"
            )}>
                <div className="p-6 pb-12">
                    {/* Handle */}
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" onClick={() => setIsMenuOpen(false)} />

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Main Menu</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Explore features</p>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {secondaryNav.map((group, idx) => (
                            <div key={idx} className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2rem] px-2">{group.title}</h3>
                                <div className="grid gap-2">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-2xl transition-all border",
                                                    isActive
                                                        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                                        : "bg-gray-50 dark:bg-white/[0.02] border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                                )}
                                            >
                                                <div className={cn("p-2.5 rounded-xl", isActive ? "bg-white dark:bg-blue-900/30 shadow-sm" : "bg-white dark:bg-gray-800")}>
                                                    <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn("text-sm font-black tracking-tight", isActive ? "text-blue-600" : "text-gray-900 dark:text-white uppercase")}>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-medium">{item.desc}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-900/5 rounded-2xl border border-blue-100/50 dark:border-blue-900/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-[10px] font-bold text-blue-600/80 uppercase tracking-widest">Version 2.0.4 Premium</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 bg-white/95 dark:bg-[#1a1d23]/95 backdrop-blur-xl border border-gray-100 dark:border-[#2d3139] shadow-2xl rounded-3xl safe-area-bottom overflow-hidden">
                <div className="grid grid-cols-4 h-18">
                    {primaryNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1.5 transition-all relative py-3",
                                    isActive
                                        ? "text-[#3498db] dark:text-[#3498db]"
                                        : "text-gray-400 dark:text-gray-600"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "scale-100")} />
                                <span className={cn("text-[10px] uppercase font-black tracking-tighter transition-all duration-300", isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5")}>
                                    {item.name}
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#3498db] rounded-full shadow-[0_-2px_10px_rgba(52,152,219,0.5)]" />
                                )}
                            </Link>
                        );
                    })}

                    {/* More Menu Trigger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1.5 transition-all relative py-3",
                            isMenuOpen
                                ? "text-[#3498db] dark:text-[#3498db]"
                                : "text-gray-400 dark:text-gray-600"
                        )}
                    >
                        {isMenuOpen ? <X className="w-5 h-5 scale-110 transition-transform" /> : <Menu className="w-5 h-5 transition-transform" />}
                        <span className={cn("text-[10px] uppercase font-black tracking-tighter", isMenuOpen ? "opacity-100" : "opacity-60")}>
                            Menu
                        </span>
                        {isMenuOpen && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#3498db] rounded-full shadow-[0_-2px_10px_rgba(52,152,219,0.5)]" />
                        )}
                    </button>
                </div>
            </nav>

            {/* Desktop Sidebar (Remains mostly same but improved slightly) */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-72 bg-white dark:bg-[#1a1d23] border-r border-gray-200 dark:border-[#2d3139] p-6 shadow-sm">
                <div className="mb-10 p-5 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#23272f] dark:to-[#1a1d23] rounded-[2.5rem] border border-gray-100 dark:border-[#2d3139] shadow-inner">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-2xl shadow-lg shadow-blue-500/20">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                Portfolio IDX
                            </h1>
                            <p className="text-[10px] font-bold text-[#3498db] uppercase tracking-widest leading-none mt-1 opacity-80">Pro Investor</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 flex-1 overflow-y-auto custom-scrollbar scrollbar-hide">
                    <SidebarPortfolios />
                </div>

                <div className="space-y-1 mb-6">
                    <div className="px-4 mb-4">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.25em]">Navigation</span>
                    </div>
                    {allNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group mb-1",
                                    isActive
                                        ? "bg-[#3498db]/10 text-[#3498db] font-black shadow-sm"
                                        : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-gray-300"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-[#3498db]" : "text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-400")} />
                                <span className="text-[11px] uppercase font-black tracking-widest">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-[#2d3139]">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                            © 2026 Porto IDX
                        </p>
                        <div className="w-2 h-2 bg-[#3498db] rounded-full animate-pulse" />
                    </div>
                </div>
            </nav>
        </>
    );
}
