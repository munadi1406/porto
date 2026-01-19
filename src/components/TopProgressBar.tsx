"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setVisible(true);
        setProgress(30);

        const timer1 = setTimeout(() => setProgress(60), 100);
        const timer2 = setTimeout(() => setProgress(90), 400);
        const timer3 = setTimeout(() => {
            setProgress(100);
        }, 600);
        const timer4 = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 1000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [pathname, searchParams]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
            <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{
                    width: `${progress}%`,
                    opacity: progress >= 100 ? 0 : 1,
                    transition: progress >= 100 ? 'opacity 0.4s ease-out, width 0.3s ease-out' : 'width 0.3s ease-out'
                }}
            />
        </div>
    );
}

export function TopProgressBar() {
    return (
        <Suspense fallback={null}>
            <ProgressContent />
        </Suspense>
    );
}
