"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            {items.map((it,i)=> (
                <span key={i} className="flex items-center gap-1">
                    {i>0 && <ChevronRight className="w-3 h-3" />}
                    {it.href ? <Link href={it.href} className="hover:text-foreground hover:underline">{it.label}</Link> : <span className="font-medium text-foreground">{it.label}</span>}
                </span>
            ))}
        </nav>
    );
}
