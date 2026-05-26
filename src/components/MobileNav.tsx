"use client";

import { Home, PieChart, TrendingUp, History, Wallet, Building2, Layers, Menu, X, Activity, Bot, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

import { PortfolioSelector } from "./PortfolioSelector";
import { SidebarPortfolios } from "./SidebarPortfolios";

const primaryNav = [
    { name: "Beranda", href: "/", icon: Layers },
    { name: "Dash", href: "/dashboard", icon: Home },
    { name: "Aset", href: "/portfolio", icon: PieChart },
];

const secondaryNav = [
    {
        title: "Analisis",
        items: [
            { name: "Analytics", href: "/analytics", icon: TrendingUp },
            { name: "Chart", href: "/analysis/BBCA.JK", icon: Activity },
            { name: "Fundamental", href: "/fundamentals", icon: Building2 },
        ]
    },
    {
        title: "Bot",
        items: [
            { name: "Crypto Bot", href: "/crypto-bot", icon: Bot },
            { name: "Stock Bot", href: "/stock-bot", icon: Bot },
        ]
    },
    {
        title: "Riwayat",
        items: [
            { name: "History", href: "/history", icon: History },
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
    const { theme, toggle } = useTheme();

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isMenuOpen]);

    return (
        <>
            {/* Mobile header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-[var(--nav-bg)] border-b border-[var(--nav-border)] px-4 h-14 flex items-center">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                        <span className="font-semibold text-sm text-[var(--fg)]">Porto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-32">
                            <PortfolioSelector />
                        </div>
                        <button
                            onClick={toggle}
                            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted-fg)] transition-colors"
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile drawer overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-black/30 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <div className={cn(
                "fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-[var(--surface)] rounded-t-2xl border-t border-[var(--border)] transition-transform duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
                isMenuOpen ? "translate-y-0" : "translate-y-full"
            )}>
                <div className="p-5 pb-10 max-h-[80vh] overflow-y-auto">
                    <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />

                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-[var(--fg)]">Menu</h2>
                        <button onClick={() => setIsMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted-fg)] transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {secondaryNav.map((group, idx) => (
                            <div key={idx}>
                                <p className="text-xs font-medium text-[var(--muted)] mb-2 px-1">{group.title}</p>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                                    isActive
                                                        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                                                        : "text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                                                )}
                                            >
                                                <item.icon className="w-4 h-4" />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between px-1">
                            <button
                                onClick={toggle}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] transition-colors"
                            >
                                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                <span>{theme === "dark" ? "Terang" : "Gelap"}</span>
                            </button>
                            <span className="text-xs text-[var(--muted)]">v2.0.4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile bottom nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--nav-bg)] border-t border-[var(--nav-border)] safe-area-bottom">
                <div className="grid grid-cols-4 h-14">
                    {primaryNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                    isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-0.5 transition-colors",
                            isMenuOpen ? "text-[var(--accent)]" : "text-[var(--muted)]"
                        )}
                    >
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </div>
            </nav>

            {/* Desktop sidebar */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)] z-50">
                <div className="p-5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-[var(--accent)]" />
                        <div>
                            <h1 className="font-semibold text-sm text-[var(--fg)]">Portfolio IDX</h1>
                            <p className="text-xs text-[var(--muted)]">Porto</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-3">
                    <SidebarPortfolios />
                </div>

                <div className="px-3 pb-2">
                    <p className="text-xs font-medium text-[var(--muted)] mb-2 px-1">Navigasi</p>
                    <div className="space-y-0.5">
                        {allNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                        isActive
                                            ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                                            : "text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggle}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--muted-fg)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            <span>{theme === "dark" ? "Terang" : "Gelap"}</span>
                        </button>
                        <span className="text-xs text-[var(--muted)]">2026</span>
                    </div>
                </div>
            </nav>
        </>
    );
}
