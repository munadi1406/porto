"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Kartu seksi kanonik — samakan tampilan dengan dashboard:
// header strip (ikon + judul uppercase + aksi) + body.
// flush=true untuk kartu tabel (tanpa padding body, radius lg).

interface SectionCardProps {
    title: string;
    icon?: LucideIcon;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    flush?: boolean;
    className?: string;
}

export function SectionCard({ title, icon: Icon, subtitle, action, children, flush = false, className }: SectionCardProps) {
    return (
        <section className={cn(flush ? "card-flush" : "card !p-0 overflow-hidden", className)}>
            <div className="card-hd">
                {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
                <h3 className="card-title">{title}</h3>
                {subtitle && (
                    <span className="hidden sm:inline text-[10px] font-medium text-muted-foreground/60 normal-case tracking-normal">
                        {subtitle}
                    </span>
                )}
                {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
            </div>
            <div className={cn(!flush && "p-4")}>{children}</div>
        </section>
    );
}
