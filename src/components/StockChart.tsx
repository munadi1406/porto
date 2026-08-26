"use client";

import { useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";
import { useTheme } from "@/hooks/useTheme";

interface StockChartProps {
    data: any[];
    markers: any[];
    prediction: any[];
    buyPrice?: number;
    maLines?: {
        ma20: any[];
        ma50: any[];
    };
    drawings?: {
        id: string;
        type: 'horizontal' | 'trendline' | 'zone';
        color: string;
        colorBottom?: string;
        title: string;
        price?: number;
        price2?: number;
        points?: { time: number; price: number }[];
        fillTo?: number;
        fillDir?: 'above' | 'below';
    }[];
    patternMarkers?: {
        time: number;
        position: 'aboveBar' | 'belowBar';
        color: string;
        shape: string;
        text: string;
        size?: number;
    }[];
}

export default function StockChart({ data, markers, prediction, buyPrice, maLines, drawings, patternMarkers }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const palette = isDark
        ? {
              background: "#0d1726",
              text: "#8a93a6",
              grid: "#1c2b42",
              border: "#1c2b42",
              up: "#1ed98b",
              down: "#ef5c70",
              ma20: "#6d7dff",
              ma50: "#a967ff",
              buy: "#eaa82e",
              forecast: "#14b8a6",
          }
        : {
              background: "#ffffff",
              text: "#64748b",
              grid: "#e5e9f0",
              border: "#e5e9f0",
              up: "#0eaa68",
              down: "#df4d61",
              ma20: "#5366ea",
              ma50: "#a967ff",
              buy: "#eaa82e",
              forecast: "#14b8a6",
          };

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

        // Helper: hex (#rrggbb) -> rgba dengan alpha
        const withAlpha = (hexColor: string, alpha: number) => {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
            if (!m) return hexColor;
            return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
        };

        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: palette.background },
                textColor: palette.text,
            },
            grid: {
                vertLines: { color: palette.grid },
                horzLines: { color: palette.grid },
            },
            width: container.clientWidth,
            height: container.clientHeight || 420,
            timeScale: {
                borderColor: palette.border,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        try {
            const cleanData = sanitize(data);
            if (cleanData.length === 0) return;

            // ULTRA-DEFENSIVE SERIES CREATION
            const createSeries = (type: 'Candlestick' | 'Line' | 'Area' | 'Baseline' | 'Histogram', options: any) => {
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
                upColor: palette.up,
                downColor: palette.down,
                borderVisible: false,
                wickUpColor: palette.up,
                wickDownColor: palette.down,
            });

            if (candlestickSeries) {
                candlestickSeries.setData(cleanData);

                // Safe Markers (gabungan marker sinyal + marker pola chart)
                if (((markers?.length ?? 0) > 0 || (patternMarkers?.length ?? 0) > 0) && typeof candlestickSeries.setMarkers === 'function') {
                    const cleanMarkers = [...(markers || []), ...(patternMarkers || [])]
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
                        color: palette.buy,
                        lineWidth: 2,
                        lineStyle: LightweightCharts.LineStyle.Dotted,
                        axisLabelVisible: true,
                        title: "BUY AREA",
                    });
                }
            }

            // Draw MA Lines
            if (maLines) {
                const ma20Series = createSeries('Line', { color: palette.ma20, lineWidth: 1, title: "MA20", priceLineVisible: false });
                if (ma20Series) ma20Series.setData(sanitize(maLines.ma20));

                const ma50Series = createSeries('Line', { color: palette.ma50, lineWidth: 1, title: "MA50", priceLineVisible: false });
                if (ma50Series) ma50Series.setData(sanitize(maLines.ma50));
            }

            // Forecast Line
            if (prediction && prediction.length > 0) {
                const forecastSeries = createSeries('Line', {
                    color: palette.forecast,
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

            // Draw chart patterns (zona, support/resistance + trendline berwarna)
            if (drawings && drawings.length > 0) {
                const t0 = cleanData[0].time as number;
                const t1 = cleanData[cleanData.length - 1].time as number;

                drawings.forEach((d) => {
                    // Zona berwarna (band antara dua level harga, gradasi vertikal)
                    if (d.type === 'zone' && d.price != null && d.price2 != null && d.price2 < d.price) {
                        const zoneSeries = createSeries('Area', {
                            lineVisible: false,
                            crosshairMarkerVisible: false,
                            lastValueVisible: false,
                            priceLineVisible: false,
                            title: '',
                            color: 'rgba(0,0,0,0)',
                            topColor: d.color,
                            bottomColor: d.colorBottom ?? d.color,
                            baseValue: { type: 'price', price: d.price2 },
                        });
                        if (zoneSeries) {
                            zoneSeries.setData([{ time: t0, value: d.price }, { time: t1, value: d.price }]);
                        }
                        return;
                    }

                    if (d.type === 'horizontal' && d.price != null && candlestickSeries && typeof candlestickSeries.createPriceLine === 'function') {
                        // Glow layer (tebal transparan tanpa label)
                        candlestickSeries.createPriceLine({
                            price: d.price,
                            color: withAlpha(d.color, 0.22),
                            lineWidth: 6,
                            lineStyle: LightweightCharts.LineStyle.Solid,
                            axisLabelVisible: false,
                            title: '',
                        });
                        // Core line
                        candlestickSeries.createPriceLine({
                            price: d.price,
                            color: d.color,
                            lineWidth: 2,
                            lineStyle: LightweightCharts.LineStyle.Solid,
                            axisLabelVisible: true,
                            title: d.title,
                        });
                    } else if (d.type === 'trendline' && d.points && d.points.length >= 2) {
                        const pts = d.points
                            .map(p => ({ time: p.time as number, value: p.price }))
                            .sort((a, b) => a.time - b.time);

                        // Neon glow underlay (garis lebar transparan solid)
                        const glowSeries = createSeries('Line', {
                            color: withAlpha(d.color, 0.20),
                            lineWidth: 7,
                            lineStyle: LightweightCharts.LineStyle.Solid,
                            title: '',
                            priceLineVisible: false,
                            lastValueVisible: false,
                            crosshairMarkerVisible: false,
                        });
                        if (glowSeries) glowSeries.setData(pts);

                        // Downtrend: area DI ATAS garis diisi gradasi (BaselineSeries)
                        if (d.fillTo != null && d.fillDir === 'above') {
                            const s = createSeries('Baseline', {
                                baseValue: { type: 'price', price: d.fillTo },
                                lineColor: d.color,
                                color: d.color,
                                lineWidth: 2,
                                lineStyle: LightweightCharts.LineStyle.Dashed,
                                topLineColor: 'rgba(0,0,0,0)',
                                topFillColor1: 'rgba(0,0,0,0)',
                                topFillColor2: 'rgba(0,0,0,0)',
                                bottomLineColor: d.color,
                                bottomFillColor1: withAlpha(d.color, 0.16),
                                bottomFillColor2: withAlpha(d.color, 0.02),
                                title: d.title,
                                priceLineVisible: false,
                                lastValueVisible: false,
                                crosshairMarkerVisible: false,
                            });
                            if (s) s.setData(pts);
                            return;
                        }

                        // Uptrend: area DI BAWAH garis diisi gradasi (AreaSeries)
                        if (d.fillTo != null) {
                            const s = createSeries('Area', {
                                lineColor: d.color,
                                color: d.color,
                                lineWidth: 2,
                                lineStyle: LightweightCharts.LineStyle.Dashed,
                                topColor: withAlpha(d.color, 0.20),
                                bottomColor: withAlpha(d.color, 0.02),
                                baseValue: { type: 'price', price: d.fillTo },
                                title: d.title,
                                priceLineVisible: false,
                                lastValueVisible: false,
                                crosshairMarkerVisible: false,
                            });
                            if (s) s.setData(pts);
                            return;
                        }

                        // Tanpa fill: garis biasa
                        const trendSeries = createSeries('Line', {
                            color: d.color,
                            lineWidth: 2,
                            lineStyle: LightweightCharts.LineStyle.Dashed,
                            title: d.title,
                            priceLineVisible: false,
                            lastValueVisible: false,
                        });
                        if (trendSeries) trendSeries.setData(pts);
                    }
                });
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
    }, [data, markers, prediction, buyPrice, maLines, drawings, patternMarkers, palette.background, palette.text, palette.grid, palette.border, palette.up, palette.down, palette.ma20, palette.ma50, palette.buy, palette.forecast, theme]);

    return <div ref={chartContainerRef} className="w-full h-[480px]" />;
}
