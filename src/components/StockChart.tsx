"use client";

import { useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";

interface StockChartProps {
    data: any[];
    markers: any[];
    prediction: any[];
    buyPrice?: number;
    maLines?: {
        ma20: any[];
        ma50: any[];
    };
}

export default function StockChart({ data, markers, prediction, buyPrice, maLines }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!chartContainerRef.current || !data || data.length === 0) return;

        const container = chartContainerRef.current;
        container.innerHTML = "";

        // Helper to sanitize data
        const sanitize = (raw: any[]) => {
            if (!raw || raw.length === 0) return [];
            return [...raw]
                .map(item => ({
                    ...item,
                    time: typeof item.time === 'string' ? Math.floor(new Date(item.time).getTime() / 1000) : item.time
                }))
                .filter(item => item.time && !isNaN(item.time as number))
                .sort((a, b) => (a.time as number) - (b.time as number))
                .filter((item, index, self) =>
                    index === self.findIndex((t) => t.time === item.time)
                );
        };

        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: "#0d1117" },
                textColor: "#d1d5db",
            },
            grid: {
                vertLines: { color: "#1f2937" },
                horzLines: { color: "#1f2937" },
            },
            width: container.clientWidth,
            height: 480,
            timeScale: {
                borderColor: "#374151",
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        try {
            const cleanData = sanitize(data);
            if (cleanData.length === 0) return;

            // ULTRA-DEFENSIVE SERIES CREATION
            const createSeries = (type: 'Candlestick' | 'Line', options: any) => {
                const c: any = chart;
                // Try direct method
                const methodName = `add${type}Series`;
                if (typeof c[methodName] === 'function') {
                    return c[methodName](options);
                }
                // Try generic addSeries method
                if (typeof c.addSeries === 'function') {
                    // Try to get type from library exports, otherwise use string
                    const seriesType = (LightweightCharts as any)[`${type}Series`] || type;
                    return c.addSeries(seriesType, options);
                }
                return null;
            };

            const candlestickSeries = createSeries('Candlestick', {
                upColor: "#22c55e",
                downColor: "#ef4444",
                borderVisible: false,
                wickUpColor: "#22c55e",
                wickDownColor: "#ef4444",
            });

            if (candlestickSeries) {
                candlestickSeries.setData(cleanData);

                // Safe Markers
                if (markers && markers.length > 0 && typeof candlestickSeries.setMarkers === 'function') {
                    const cleanMarkers = markers
                        .map(m => ({
                            ...m,
                            time: typeof m.time === 'string' ? Math.floor(new Date(m.time).getTime() / 1000) : m.time
                        }))
                        .filter(m => cleanData.some(d => d.time === m.time))
                        .sort((a, b) => (a.time as number) - (b.time as number));

                    candlestickSeries.setMarkers(cleanMarkers);
                }

                // Safe Price Line
                if (buyPrice && buyPrice > 0 && typeof candlestickSeries.createPriceLine === 'function') {
                    candlestickSeries.createPriceLine({
                        price: buyPrice,
                        color: "#f59e0b",
                        lineWidth: 2,
                        lineStyle: LightweightCharts.LineStyle.Dotted,
                        axisLabelVisible: true,
                        title: "BUY AREA",
                    });
                }
            }

            // Draw MA Lines
            if (maLines) {
                const ma20Series = createSeries('Line', { color: "#3498db", lineWidth: 1, title: "MA20", priceLineVisible: false });
                if (ma20Series) ma20Series.setData(sanitize(maLines.ma20));

                const ma50Series = createSeries('Line', { color: "#e84393", lineWidth: 1, title: "MA50", priceLineVisible: false });
                if (ma50Series) ma50Series.setData(sanitize(maLines.ma50));
            }

            // Forecast Line
            if (prediction && prediction.length > 0) {
                const forecastSeries = createSeries('Line', {
                    color: "#00d2d3",
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dashed,
                    title: "Forecast",
                    priceLineVisible: false
                });

                if (forecastSeries) {
                    const lastPoint = cleanData[cleanData.length - 1];
                    const forecastData = sanitize([
                        { time: lastPoint.time, value: lastPoint.close },
                        ...prediction
                    ]);
                    forecastSeries.setData(forecastData);
                }
            }

            chart.timeScale().fitContent();
        } catch (err: any) {
            console.error("[Chart Error] Failed to assemble:", err);
        }

        const handleResize = () => {
            if (chartRef.current && container) {
                chartRef.current.applyOptions({ width: container.clientWidth });
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                try { chartRef.current.remove(); } catch (e) { }
                chartRef.current = null;
            }
        };
    }, [data, markers, prediction, buyPrice, maLines]);

    return <div ref={chartContainerRef} className="w-full h-[480px]" />;
}
