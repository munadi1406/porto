"use client";

import { cn } from "@/lib/utils";
import { useFlash } from "@/hooks/useFlash";

interface LivePriceProps {
    value: number | null;
    className?: string;
    format?: (v: number) => string;
}

// Teks harga yang berkedip hijau/merah setiap nilainya berubah
export default function LivePrice({ value, className, format }: LivePriceProps) {
    const flash = useFlash(value);
    return (
        <span
            className={cn(
                "inline-block rounded px-1 -mx-1 tabular-nums",
                flash === "up" && "flash-up",
                flash === "down" && "flash-down",
                className
            )}
        >
            {value == null ? "-" : format ? format(value) : value.toLocaleString("id-ID")}
        </span>
    );
}
