"use client";

import { PieChart, TrendingUp, History, Building2, Menu, Moon, Sun, Search, BarChart3, FileText, Layers, SwitchCamera } from "lucide-react";
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
    { name: "Dashboard", href: "/portfolio-dashboard", icon: PieChart, desc: "Portfolio dashboard" },
    { name: "Performance", href: "/analytics", icon: TrendingUp, desc: "Growth & returns" },
    { name: "History", href: "/history", icon: History, desc: "Transaction history" },
];

const stocksNav = [
    { name: "Market", href: "/", icon: BarChart3, desc: "Market overview" },
    { name: "Screener", href: "/screener", icon: Search, desc: "Stock screener" },
    { name: "Fundamental", href: "/fundamentals", icon: Building2, desc: "Fundamental analysis" },
];

const researchNav = [
    { name: "Fundamentals", href: "/fundamentals", icon: Building2, desc: "Fundamental analysis" },
    { name: "Dividends", href: "/stocks/dividends", icon: FileText, desc: "Dividend calendar" },
    { name: "Sharia", href: "/stocks/sharia", icon: Layers, desc: "Sharia stocks" },
    { name: "Prospectus", href: "/stocks/prospectus", icon: FileText, desc: "IPO analysis" },
];

const isPortfolioPage = (path: string) =>
    path.startsWith('/portfolio') || path.startsWith('/history') || path.startsWith('/analytics');

export function MobileNav() {
    const pathname = usePathname();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false);

    const isPortfolioMode = useMemo(() => isPortfolioPage(pathname), [pathname]);
    const currentNav = isPortfolioMode ? portfolioNav : stocksNav;
    const modeTitle = isPortfolioMode ? 'Portfolio' : 'Stocks';
    const modeColor = isPortfolioMode ? 'text-primary' : 'text-warning';
    const otherModeHref = isPortfolioMode ? '/' : '/';

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
                            href="/portfolio-dashboard"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                isPortfolioMode ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <PieChart className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Portfolio</span>
                        </Link>
                        <Link
                            href="/"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                !isPortfolioMode ? "text-warning" : "text-muted-foreground"
                            )}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Stocks</span>
                        </Link>
                        <Link
                            href="/fundamentals"
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                pathname.startsWith("/fundamentals") || pathname.startsWith("/stocks/") ? "text-success" : "text-muted-foreground"
                            )}
                        >
                            <Building2 className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Research</span>
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
            <nav className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-[238px] bg-sidebar border-r border-sidebar-border z-50">
                <div className="p-5 border-b border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-[#8b1a00] flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-[17px] leading-tight text-sidebar-foreground tracking-tight">Porto</h1>
                                <p className="text-[11px] text-muted-foreground">Analyze. Invest. Grow.</p>
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
                    <div className={cn(isPortfolioMode ? "mt-2 pt-3 border-t border-sidebar-border" : "")}>
                        <div className="space-y-1">
                            {currentNav.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                            isActive
                                                ? "text-white font-medium shadow-[0_7px_18px_rgba(64,80,190,.16)]"
                                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                        )}
                                        style={isActive ? { background: "linear-gradient(90deg,#c8300a,#8b1a00)" } : undefined}
                                    >
                                        <item.icon className={cn("w-4 h-4", isActive ? "" : "")} />
                                        <div>
                                            <span>{item.name}</span>
                                            {!isActive && <p className="text-[9px] text-sidebar-foreground/40">{item.desc}</p>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Premium upgrade card */}
                    <div className="mt-5 mx-1 p-4 rounded-xl border border-primary/15 bg-primary/5">
                        <h4 className="text-sm font-semibold text-foreground mb-1.5">Upgrade ke Premium</h4>
                        <p className="text-[11px] leading-snug text-muted-foreground mb-3">Dapatkan data real-time, AI insight, dan fitur premium lainnya.</p>
                        <Button className="w-full h-9 text-[12px] bg-primary hover:bg-primary/90">Upgrade Sekarang ›</Button>
                    </div>

                    {/* IHSG mini */}
                    <div className="mt-4 mx-1 p-4 rounded-xl border border-border bg-card">
                        <span className="text-[12px] text-muted-foreground">IHSG</span>
                        <span className="block text-2xl font-semibold text-foreground mt-1">7.845,23</span>
                        <span className="text-[11px] text-success">+96,45 (+1,24%)</span>
                    </div>
                </div>

                <div className="p-4 border-t border-sidebar-border">
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
