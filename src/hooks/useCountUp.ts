"use client";

import { useEffect, useRef, useState } from "react";

// Animasi angka ber-transisi halus (eased) setiap nilai target berubah
export function useCountUp(target: number | null | undefined, duration = 600): number {
    const [val, setVal] = useState<number>(typeof target === "number" && isFinite(target) ? target : 0);
    const displayRef = useRef<number>(typeof target === "number" && isFinite(target) ? target : 0);

    useEffect(() => {
        if (target == null || !isFinite(target)) return;
        const from = displayRef.current;
        if (from === target) {
            setVal(target);
            return;
        }
        let raf = 0;
        const start = performance.now();
        const step = (t: number) => {
            const k = Math.min(1, (t - start) / duration);
            const eased = 1 - Math.pow(1 - k, 3);
            const v = from + (target - from) * eased;
            displayRef.current = v;
            setVal(v);
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return val;
}
