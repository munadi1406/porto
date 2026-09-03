"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Bell } from "lucide-react"
import { useState, useEffect } from "react"
import { CommandPalette } from "@/components/CommandPalette"

function useMarketStatus() {
  const [time, setTime] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      setTime(timeStr)

      const day = now.getDay()
      const isWeekday = day >= 1 && day <= 5
      const totalMinutes = hours * 60 + minutes
      const marketOpen = totalMinutes >= 540 && totalMinutes <= 960
      setIsOpen(isWeekday && marketOpen)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return { time, isOpen }
}

export function SiteHeader() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const { time, isOpen } = useMarketStatus()

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-3 px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />

          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Search className="size-4" />
            <span className="text-sm hidden sm:inline">Search stocks...</span>
            <kbd className="pointer-events-none ml-4 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className={`size-2 rounded-full ${isOpen ? "bg-success" : "bg-muted-foreground"}`} />
              <span className="text-muted-foreground">
                {isOpen ? "Market Open" : "Market Closed"}
              </span>
              <span className="hidden font-mono text-foreground font-medium sm:inline">{time}</span>
            </div>

            <button
              className="relative flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Notifikasi"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
            </button>
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  )
}
