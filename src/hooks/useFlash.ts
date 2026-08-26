"use client";

import { useEffect, useRef, useState } from "react";

// Arah perubahan terakhir sebuah nilai — untuk animasi flash harga
export function useFlash(value: number | null | undefined, ms = 800): "up" | "down" | null {
    const [flash, setFlash] = useState<"up" | "down" | null>(null);
    const prev = useRef<number | null | undefined>(value);

    useEffect(() => {
        const p = prev.current;
        prev.current = value;
        if (value == null || p == null || value === p) return;
        setFlash(value > p ? "up" : "down");
        const t = setTimeout(() => setFlash(null), ms);
        return () => clearTimeout(t);
    }, [value, ms]);

    return flash;
}
