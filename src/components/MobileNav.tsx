"use client";

import { Home, PieChart, TrendingUp, History, Building2, Layers, Menu, Activity, Moon, Sun, Search, BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";
import { PortfolioSelector } from "./PortfolioSelector";
import { SidebarPortfolios } from "./SidebarPortfolios";

const primaryNav = [
    { name: "Portfolio", href: "/", icon: Layers },
    { name: "Stocks", href: "/stocks", icon: BarChart3 },
    { name: "Portofolio", href: "/portfolio", icon: PieChart },
];

const navGroups = [
    {
        title: "Portfolio",
        items: [
            { name: "Ringkasan", href: "/", icon: Layers },
            { name: "Dashboard", href: "/dashboard", icon: Home },
            { name: "Portofolio", href: "/portfolio", icon: PieChart },
            { name: "History", href: "/history", icon: History },
            { name: "Analytics", href: "/analytics", icon: TrendingUp },
        ]
    },
    {
        title: "Stocks",
        items: [
            { name: "Market", href: "/stocks", icon: BarChart3 },
            { name: "Screener", href: "/screener", icon: Search },
            { name: "Teknikal", href: "/analysis/BBCA.JK", icon: Activity },
            { name: "Fundamental", href: "/fundamentals", icon: Building2 },
        ]
    },
];

export function MobileNav() {
    const pathname = usePathname();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Mobile header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 h-14 flex items-center">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-semibold text-sm">Porto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-32">
                            <PortfolioSelector />
                        </div>
                        <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
                            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile bottom nav + Sheet drawer */}
            <Sheet open={open} onOpenChange={setOpen}>
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
                    <div className="grid grid-cols-4 h-14">
                        {primaryNav.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-[10px] font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                        <SheetTrigger
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer",
                                open ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Menu className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Menu</span>
                        </SheetTrigger>
                    </div>
                </nav>

                <SheetContent side="bottom" className="rounded-t-xl max-h-[80vh] overflow-y-auto pb-8">
                    <div className="space-y-6 pt-2">
                        {/* Portfolio selector for mobile */}
                        <div className="px-1">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Portfolio</p>
                            <SidebarPortfolios />
                        </div>

                        <div className="border-t border-border pt-4">
                            {navGroups.map((group, idx) => (
                                <div key={idx} className="mb-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{group.title}</p>
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                                                        isActive
                                                            ? "bg-accent text-accent-foreground font-medium"
                                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                    </div>

                    <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={toggle} className="gap-2">
                                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                {theme === "dark" ? "Terang" : "Gelap"}
                            </Button>
                            <span className="text-xs text-muted-foreground">v2.0.4</span>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop sidebar */}
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 bg-sidebar border-r z-50">
                <div className="p-5 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <div>
                            <h1 className="font-semibold text-sm text-sidebar-foreground">Portfolio IDX</h1>
                            <p className="text-xs text-muted-foreground">Porto</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-3">
                    <SidebarPortfolios />
                </div>

                <div className="px-3 pb-2 space-y-4">
                    {navGroups.map((group) => (
                        <div key={group.title}>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1 uppercase tracking-wider">{group.title}</p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                                isActive
                                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

                <div className="p-4 border-t">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={toggle} className="gap-2 text-sidebar-foreground/70">
                            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            {theme === "dark" ? "Terang" : "Gelap"}
                        </Button>
                        <span className="text-xs text-muted-foreground">2026</span>
                    </div>
                </div>
            </nav>
        </>
    );
}
