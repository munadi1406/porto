"use client";

import { useState } from "react";
import { CalendarClock, Mail, Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Freq = "weekly" | "monthly";
type Channel = "email" | "inapp";

// D14 Laporan Berkala Otomatis — UI placeholder (no real cron), reuses ExportPDFButton+AI summary infra via prompt reuse.
export function ScheduledReportButton({
  className,
  dashboardRef,
  onExport,
}: {
  className?: string;
  dashboardRef?: React.RefObject<HTMLElement | null>;
  onExport?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<Freq>("weekly");
  const [channel, setChannel] = useState<Channel>("inapp");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [includeAI, setIncludeAI] = useState(true);

  const handleSchedule = async () => {
    setLoading(true);
    // Placeholder: reuse AI summary infra prompt (mock fetch — no contract break, swallow errors)
    if (includeAI) {
      try {
        // reuse existing endpoint if available; ignore failures
        await fetch("/api/backtest/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            backtestResult: { summary: "Portfolio scheduled report — ringkasan AI placeholder" },
            positionCalc: null,
            ticker: "PORTFOLIO",
            strategyLabel: freq === "weekly" ? "Laporan Mingguan" : "Laporan Bulanan",
          }),
        });
      } catch {}
    }
    // same channel as Alert = toast in-app + optional email placeholder
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
      const ch = channel === "email" ? `Email ${email || "(belum diisi)"}` : "Notifikasi in-app (sama seperti Alert)";
      // localStorage schedule snapshot (mock cron)
      try {
        const KEY = "porto_scheduled_reports";
        const raw = localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ id: Date.now(), freq, channel: ch, includeAI, createdAt: Date.now() });
        localStorage.setItem(KEY, JSON.stringify(arr.slice(-20)));
      } catch {}
      toast.success(
        `Laporan ${freq === "weekly" ? "mingguan" : "bulanan"} dijadwalkan · ${ch}`,
        { description: includeAI ? "Akan sertakan ringkasan AI + PDF (reuse ExportPDFButton)" : "PDF saja" }
      );
      // Optionally trigger existing PDF export immediately as preview
      if (dashboardRef?.current && onExport) {
        try { onExport(); } catch {}
      }
    }, 650);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted transition-colors",
          className
        )}
        title="Jadwalkan Laporan Berkala"
      >
        <CalendarClock className="w-3.5 h-3.5" />
        Jadwalkan Laporan
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" /> Jadwalkan Laporan
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Otomatis kirim PDF + ringkasan AI (reuse ExportPDFButton & prompt AI). Cron placeholder — UI only.
                </p>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">D14</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFreq("weekly")}
                className={cn("rounded-lg border px-3 py-2.5 text-xs font-bold text-left", freq === "weekly" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30")}
              >
                Mingguan
                <span className="block text-[10px] font-normal text-muted-foreground">Setiap Senin 08:00 WIB</span>
              </button>
              <button
                onClick={() => setFreq("monthly")}
                className={cn("rounded-lg border px-3 py-2.5 text-xs font-bold text-left", freq === "monthly" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30")}
              >
                Bulanan
                <span className="block text-[10px] font-normal text-muted-foreground">Tgl 1, 08:00 WIB</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Channel (sama seperti Alert)</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setChannel("inapp")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold", channel === "inapp" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}
                >
                  <Send className="w-3.5 h-3.5" /> In-App
                </button>
                <button
                  onClick={() => setChannel("email")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold", channel === "email" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>
              {channel === "email" && (
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com (placeholder, belum kirim nyata)"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} className="rounded" />
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Sertakan ringkasan AI (reuse prompt AI summary)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Batal</button>
              <button
                onClick={handleSchedule}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
                {loading ? "Menjadwalkan…" : "Jadwalkan"}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
              Placeholder: belum ada cron server. Jadwal tersimpan di localStorage & toast konfirmasi. Kirim via channel yang sama dengan Alert (in-app).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
