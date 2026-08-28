"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, BarChart3, TrendingUp, FileText, Building2, Wallet, Scale, History, LayoutDashboard } from "lucide-react";

const STOCKS_FALLBACK = [
  { code: "BBCA", name: "Bank Central Asia" },
  { code: "BBRI", name: "Bank Rakyat Indonesia" },
  { code: "BMRI", name: "Bank Mandiri" },
  { code: "BBNI", name: "Bank Negara Indonesia" },
  { code: "TLKM", name: "Telkom Indonesia" },
  { code: "ASII", name: "Astra International" },
  { code: "UNVR", name: "Unilever Indonesia" },
  { code: "ADRO", name: "Adaro Energy" },
  { code: "PTBA", name: "Bukit Asam" },
  { code: "ANTM", name: "Aneka Tambang" },
  { code: "ICBP", name: "Indofood CBP" },
  { code: "INDF", name: "Indofood Sukses Makmur" },
  { code: "KLBF", name: "Kalbe Farma" },
  { code: "GGRM", name: "Gudang Garam" },
  { code: "HMSP", name: "HMP" },
  { code: "CPIN", name: "Charoen Pokphand" },
  { code: "EXCL", name: "XL Axiata" },
  { code: "ISAT", name: "Indosat" },
  { code: "GOTO", name: "GoTo Gojek Tokopedia" },
  { code: "BUKA", name: "Bukalapak" },
  { code: "BYAN", name: "Bayan Resources" },
  { code: "MEDC", name: "Elang Mahkota Teknologi" },
  { code: "SMGR", name: "Semen Indonesia" },
  { code: "WIKA", name: "Wijaya Karya" },
  { code: "JSMR", name: "Jasa Marga" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stocks, setStocks] = useState(STOCKS_FALLBACK);
  const [loadingStocks, setLoadingStocks] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingStocks(true);
    fetch("/api/idx/market-scan")
      .then(r=>r.json())
      .then(j=> {
        const all = j?.data?.all || j?.all || [];
        if (Array.isArray(all) && all.length) {
          const mapped = all.slice(0,500).map((s:any)=> ({ code: s.code || s.symbol || s.ticker, name: s.name || s.code }));
          if (mapped.length) setStocks(mapped);
        }
      })
      .catch(()=>{})
      .finally(()=> setLoadingStocks(false));
  }, [open]);

  const handleSelect = useCallback((value: string) => {
    onOpenChange(false);
    setSearch("");
    if (value.startsWith("/")) {
      router.push(value);
    } else {
      router.push(`/analysis/${value}.JK`);
    }
  }, [router, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const filteredStocks = search
    ? stocks.filter(
        (s) =>
          s.code.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 50)
    : stocks.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search stocks, pages... (959 stocks indexed)"
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
            {loadingStocks && <span className="ml-2 text-[10px] text-muted-foreground">loading…</span>}
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Pages" className="text-xs font-semibold text-muted-foreground mb-1">
              <Command.Item
                value="/"
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Market Overview</span>
              </Command.Item>
              <Command.Item
                value="/portfolio-dashboard"
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Portfolio Dashboard</span>
              </Command.Item>
              <Command.Item
                value="/analytics"
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </Command.Item>
              <Command.Item
                value="/history"
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
              >
                <History className="h-4 w-4" />
                <span>Transactions</span>
              </Command.Item>
              <Command.Item
                value="/fundamentals"
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
              >
                <Building2 className="h-4 w-4" />
                <span>Fundamentals</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Stocks" className="text-xs font-semibold text-muted-foreground mb-1 mt-2">
              {filteredStocks.map((stock) => (
                <Command.Item
                  key={stock.code}
                  value={`${stock.code} ${stock.name}`}
                  onSelect={() => handleSelect(stock.code)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm"
                >
                  <span className="font-mono font-bold text-xs w-12">{stock.code}</span>
                  <span className="text-muted-foreground">{stock.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
