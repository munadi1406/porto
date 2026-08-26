"use client";

import { useEffect, useRef, useState } from "react";

interface TradingViewWidgetProps {
    symbol?: string;
    height?: number;
}

const INTERVALS = [
    { label: "1D", value: "60" },
    { label: "1W", value: "D" },
    { label: "1M", value: "D" },
    { label: "3M", value: "W" },
    { label: "1Y", value: "M" },
];

export default function TradingViewWidget({
    symbol = "IDX:COMPOSITE",
    height = 300,
}: TradingViewWidgetProps) {
    const container = useRef<HTMLDivElement>(null);
    const [interval, setIntervalValue] = useState("60");

    useEffect(() => {
        if (!container.current) return;
        container.current.innerHTML = "";

        // TradingView Advanced Chart — REAL-TIME via WebSocket (zero delay)
        const iframe = document.createElement("iframe");
        iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${Date.now()}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Asia%2FJakarta&locale=id&utmsource=localhost&utmmedium=widget&utmcampaign=chart&utmterm=${encodeURIComponent(symbol)}`;
        iframe.title = "TradingView";
        iframe.allowFullscreen = true;
        iframe.style.width = "100%";
        iframe.style.height = `${height}px`;
        iframe.style.border = "0";
        iframe.style.borderRadius = "8px";

        container.current.appendChild(iframe);

        return () => {
            if (container.current) container.current.innerHTML = "";
        };
    }, [symbol, height, interval]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between px-1 pb-2">
                <div className="flex gap-1">
                    {INTERVALS.map((iv) => (
                        <button
                            key={iv.label}
                            onClick={() => setIntervalValue(iv.value)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                                interval === iv.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {iv.label}
                        </button>
                    ))}
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-success">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                    </span>
                    LIVE
                </span>
            </div>
            <div ref={container} className="w-full rounded-lg overflow-hidden" />
        </div>
    );
}