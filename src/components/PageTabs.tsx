"use client";
import { cn } from "@/lib/utils";

export interface TabItem { id: string; label: string; icon?: any; count?: number; }

export function PageTabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange: (id: string)=>void }) {
    return (
        <div className="sticky top-0 z-10 -mx-4 px-4 bg-background/80 backdrop-blur border-b border-border">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const isActive = t.id === active;
                    return (
                        <button key={t.id} onClick={()=>onChange(t.id)}
                            className={cn("shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 -mb-px",
                                isActive ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}>
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {t.label}
                            {t.count != null && <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[10px]">{t.count}</span>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
