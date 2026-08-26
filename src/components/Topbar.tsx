"use client";

import { Search, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { usePathname } from "next/navigation";

export function Topbar() {
    const { theme, toggle } = useTheme();
    const pathname = usePathname();
    if (pathname?.startsWith("/analysis")) return null;
    return (
        <header className="hidden md:flex items-center gap-4 h-[42px] mb-4">
            <div className="h-10 w-[380px] rounded-md border border-input bg-card flex items-center gap-2 px-3 text-muted-foreground">
                <Search className="w-[18px] h-[18px]" />
                <input
                    placeholder="Cari saham, indeks, atau berita..."
                    className="w-full bg-transparent border-0 outline-0 text-[12px] text-foreground placeholder:text-muted-foreground"
                />
            </div>
            <div className="ml-auto flex items-center gap-4">
                <div className="text-right leading-tight">
                    <div className="text-[11px] font-medium text-foreground">
                        Pasar Terbuka <span className="inline-block w-1.5 h-1.5 rounded-full bg-success align-middle ml-1" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">24 Mei 2024 10:15 WIB</div>
                </div>
                <button className="w-9 h-9 rounded-full grid place-items-center text-muted-foreground hover:bg-muted transition-colors" aria-label="notifications">
                    <Bell className="w-[18px] h-[18px]" />
                </button>
                <button
                    onClick={toggle}
                    className="w-9 h-9 rounded-full grid place-items-center text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="toggle theme"
                >
                    {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5a69a7] to-[#2a344f] grid place-items-center font-semibold text-white text-[13px]">
                    AG
                </div>
                <div className="leading-tight">
                    <div className="text-[12px] font-medium text-foreground">Halo, Andika 👋</div>
                    <div className="text-[11px] text-muted-foreground">Premium</div>
                </div>
            </div>
        </header>
    );
}
