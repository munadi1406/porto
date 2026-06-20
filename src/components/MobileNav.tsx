"use client";

import { Home, PieChart, TrendingUp, History, Building2, Layers, Menu, Activity, Moon, Sun, Search, BarChart3, SwitchCamera } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";
import { PortfolioSelector } from "./PortfolioSelector";
import { SidebarPortfolios } from "./SidebarPortfolios";

const portfolioNav = [
    { name: "Ringkasan", href: "/", icon: Layers, desc: "All portfolios consolidated" },
    { name: "Dashboard", href: "/dashboard", icon: Home, desc: "Per-portfolio view" },
    { name: "Portofolio", href: "/portfolio", icon: PieChart, desc: "Asset holdings" },
    { name: "History", href: "/history", icon: History, desc: "Transaction history" },
    { name: "Analytics", href: "/analytics", icon: TrendingUp, desc: "Growth & returns" },
];

const stocksNav = [
    { name: "Market", href: "/stocks", icon: BarChart3, desc: "IDX market overview" },
    { name: "Screener", href: "/screener", icon: Search, desc: "959 stocks scanned" },
    { name: "Teknikal", href: "/analysis/BBCA.JK", icon: Activity, desc: "Chart & indicators" },
    { name: "Fundamental", href: "/fundamentals", icon: Building2, desc: "PER, PBV, ROE" },
];

const isPortfolioPage = (path: string) =>
    path === '/' || path.startsWith('/dashboard') || path.startsWith('/portfolio') || path.startsWith('/history') || path.startsWith('/analytics');

export function MobileNav() {
    const pathname = usePathname();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false);

    const isPortfolioMode = useMemo(() => isPortfolioPage(pathname), [pathname]);
    const currentNav = isPortfolioMode ? portfolioNav : stocksNav;
    const modeTitle = isPortfolioMode ? 'Portfolio' : 'Stocks';
    const modeColor = isPortfolioMode ? 'text-primary' : 'text-warning';
    const otherModeHref = isPortfolioMode ? '/stocks' : '/';

    return (
        <>
            {/* Mobile header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 h-14 flex items-center">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", isPortfolioMode ? 'bg-primary' : 'bg-warning')} />
                        <span className="font-semibold text-sm">{modeTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={otherModeHref}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <SwitchCamera className="w-3.5 h-3.5" />
                            {isPortfolioMode ? 'Stocks' : 'Portfolio'}
                        </Link>
                        <div className="w-28">
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
                        <Link
                            href="/"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                pathname === "/" ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Layers className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Portfolio</span>
                        </Link>
                        <Link
                            href="/stocks"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                pathname === "/stocks" ? "text-warning" : "text-muted-foreground"
                            )}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Stocks</span>
                        </Link>
                        <Link
                            href="/portfolio"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                pathname === "/portfolio" ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <PieChart className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Portofolio</span>
                        </Link>
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
                        {/* Mode indicator + switch */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", isPortfolioMode ? 'bg-primary' : 'bg-warning')} />
                                <span className="text-sm font-bold text-foreground">{modeTitle}</span>
                            </div>
                            <Link
                                href={otherModeHref}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                            >
                                <SwitchCamera className="w-3.5 h-3.5" />
                                Switch to {isPortfolioMode ? 'Stocks' : 'Portfolio'}
                            </Link>
                        </div>

                        {/* Portfolio selector (only in Portfolio mode) */}
                        {isPortfolioMode && (
                            <div className="px-1">
                                <SidebarPortfolios />
                            </div>
                        )}

                        {/* Navigation items for current mode */}
                        <div className={cn("border-t pt-4", isPortfolioMode ? 'border-border' : 'border-border')}>
                            <div className="space-y-1">
                                {currentNav.map((item) => {
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
                                            <item.icon className={cn("w-4 h-4", isActive ? (isPortfolioMode ? "text-primary" : "text-warning") : "")} />
                                            <div>
                                                <span>{item.name}</span>
                                                <p className="text-[10px] text-muted-foreground/60">{item.desc}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-3 w-3 rounded-full", isPortfolioMode ? 'bg-primary' : 'bg-warning')} />
                            <div>
                                <h1 className="font-semibold text-sm text-sidebar-foreground">{modeTitle}</h1>
                                <p className="text-xs text-muted-foreground">Porto</p>
                            </div>
                        </div>
                        <Link
                            href={otherModeHref}
                            className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
                            title={`Switch to ${isPortfolioMode ? 'Stocks' : 'Portfolio'}`}
                        >
                            <SwitchCamera className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-3">
                    {/* Portfolio list only in Portfolio mode */}
                    {isPortfolioMode && <SidebarPortfolios />}

                    {/* Navigation */}
                    <div className={cn(isPortfolioMode ? "mt-2 pt-3 border-t border-border" : "")}>
                        <div className="space-y-0.5">
                            {currentNav.map((item) => {
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
                                        <item.icon className={cn("w-4 h-4", isActive ? (isPortfolioMode ? "text-primary" : "text-warning") : "")} />
                                        <div>
                                            <span>{item.name}</span>
                                            {!isActive && <p className="text-[9px] text-sidebar-foreground/40">{item.desc}</p>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
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
