"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { usePortfolios } from "@/hooks/usePortfolios"
import { useTheme } from "@/hooks/useTheme"
import { useWatchlist } from "@/hooks/useWatchlist"
import { useWebSocket } from "@/hooks/useWebSocket"
import { getMarketStatus, type MarketSession } from "@/lib/market-hours"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar"

import {
  LayoutDashboard,
  TrendingUp,
  History,
  Search,
  Rocket,
  Building2,
  Wallet,
  Scale,
  FileText,
  CircleDot,
  Plus,
  Moon,
  Sun,
  Command,
  ChevronRight,
  Layers,
  CandlestickChart,
  SlidersHorizontal,
  FlaskConical,
  Columns2,
  Star,
  X,
} from "lucide-react"

const MENU_GROUPS = [
  {
    label: "Pasar",
    items: [
      { title: "Ringkasan Pasar", url: "/", icon: CandlestickChart },
      { title: "Screener", url: "/screener", icon: SlidersHorizontal },
      { title: "Backtest", url: "/backtest", icon: FlaskConical },
      { title: "Bandingkan", url: "/compare", icon: Columns2 },
      { title: "Aksi Korporasi", url: "/corporate-actions", icon: Rocket },
    ],
  },
  {
    label: "Portofolio",
    items: [
      { title: "Dashboard", url: "/portfolio-dashboard", icon: LayoutDashboard },
      { title: "Agregat", url: "/aggregate", icon: Layers },
      { title: "Performa", url: "/analytics", icon: TrendingUp },
      { title: "Transaksi", url: "/history", icon: History },
    ],
  },
  {
    label: "Riset & Data",
    items: [
      { title: "Fundamental", url: "/fundamentals", icon: Building2 },
      { title: "Dividen", url: "/stocks/dividends", icon: Wallet },
      { title: "Saham Syariah", url: "/stocks/sharia", icon: Scale },
      { title: "Prospektus", url: "/stocks/prospectus", icon: FileText },
    ],
  },
]

const SESSION_LABEL: Record<MarketSession, string> = {
  pre_open: "Pre-Opening",
  trading: "Pasar Buka",
  post_close: "Penutupan",
  closed: "Pasar Tutup",
}

function isActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}

// Widget IHSG live via WebSocket — klik untuk ke Ringkasan Pasar
function LiveIhsgChip() {
  const { connected, prices, subscribe, unsubscribe } = useWebSocket({ autoConnect: true })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!connected) return
    subscribe(["^JKSE"])
    return () => unsubscribe(["^JKSE"])
  }, [connected, subscribe, unsubscribe])

  const q = prices["^JKSE"]
  const up = (q?.changePercent ?? 0) >= 0

  return (
    <Link
      href="/"
      className="group/ihsg mx-2 mb-1 flex items-center gap-2.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2 transition-all hover:border-primary/40 hover:bg-sidebar-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "size-1.5 rounded-full",
            connected ? "bg-success animate-pulse" : "bg-muted-foreground/40"
          )} />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">IHSG</span>
        </div>
        <p className="text-sm font-black tabular-nums text-foreground leading-tight truncate">
          {q?.price ? q.price.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "—"}
        </p>
      </div>
      <span className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums",
        mounted && q ? (up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive") : "text-muted-foreground"
      )}>
        {q ? `${up ? "+" : ""}${q.changePercent.toFixed(2)}%` : "—"}
      </span>
    </Link>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { portfolios, selectedPortfolioId, setSelectedPortfolioId } = usePortfolios()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const watchlist = useWatchlist()
  const [session, setSession] = useState<MarketSession>("closed")

  useEffect(() => {
    const tick = () => setSession(getMarketStatus().session)
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const isOpen = session === "trading"

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Header: logo + status pasar ── */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-success text-primary-foreground shrink-0 shadow-sm">
                <Command className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-base font-black leading-tight tracking-tight">Porto</span>
                <span className="flex items-center gap-1 text-[9px] leading-tight uppercase tracking-wider text-sidebar-foreground/50">
                  <span className={cn("size-1 rounded-full shrink-0", isOpen ? "bg-success" : "bg-muted-foreground/50")} />
                  {SESSION_LABEL[session]}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {/* IHSG live */}
        <div className="group-data-[collapsible=icon]:hidden">
          <LiveIhsgChip />
        </div>

        {MENU_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <SidebarSeparator className="mx-2 my-1 opacity-50" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/45 px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.url)
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={active}
                          render={<Link href={item.url} />}
                          tooltip={item.title}
                          className={cn(
                            "group/menu-item relative h-9 transition-all duration-150",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary"
                              : "hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                          )}
                        >
                          {active && (
                            <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                          )}
                          <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary-foreground" : "text-sidebar-foreground/65 group-hover/menu-item:text-foreground")} />
                          <span className={cn("text-[13px]", active ? "font-bold" : "font-medium")}>{item.title}</span>
                          {active && <ChevronRight className="ml-auto size-3.5 opacity-70" />}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}

        {/* ── Watchlist ── */}
        {watchlist.items.length > 0 && (
          <>
            <SidebarSeparator className="mx-2 my-1 opacity-50" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/45 px-3 mb-1">
                <Star className="size-3 mr-1 fill-amber-500 text-amber-500" /> Watchlist
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {watchlist.items.map((code) => {
                    const url = `/analysis/${code}.JK`
                    const active = pathname === url
                    return (
                      <SidebarMenuItem key={code}>
                        <SidebarMenuButton
                          isActive={active}
                          render={<Link href={url} />}
                          tooltip={code}
                          className="h-8 group/witem"
                        >
                          <Star className={cn("size-3.5 shrink-0 fill-amber-500 text-amber-500")} />
                          <span className="text-[13px] font-bold truncate">{code}</span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); watchlist.remove(code) }}
                            className="ml-auto opacity-0 group-hover/witem:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                            title="Hapus"
                          >
                            <X className="size-3.5" />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* ── Portofolio saya ── */}
        {portfolios.length > 0 && (
          <>
            <SidebarSeparator className="mx-2 my-1 opacity-50" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/45 px-3 mb-1">
                Portofolio Saya
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {portfolios.map((p) => (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton
                        isActive={selectedPortfolioId === p.id && pathname.startsWith("/portfolio-dashboard")}
                        onClick={() => setSelectedPortfolioId(p.id)}
                        render={<Link href="/portfolio-dashboard" />}
                        tooltip={p.name}
                        className="h-9 hover:translate-x-0.5 transition-transform"
                      >
                        <CircleDot className="size-4 shrink-0" style={{ color: p.color || "#3b82f6" }} />
                        <span className="text-[13px] truncate">{p.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle} tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"} className="h-9 hover:translate-x-0.5 transition-transform">
              {theme === "dark" ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
              <span className="text-[13px]">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isOpen && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                IDX · WIB
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
