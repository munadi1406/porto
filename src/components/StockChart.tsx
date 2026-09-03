"use client";

import { useEffect, useRef, useState } from "react";
import * as LightweightCharts from "lightweight-charts";
import { useTheme } from "@/hooks/useTheme";
import { Activity, AreaChart, BarChart3, CandlestickChart, ChartNoAxesCombined, Maximize2, Minimize2, PencilRuler, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_SERIES, getLightweightChartPalette } from "@/lib/chart-theme";

// ── Kalkulasi indikator ──
function emaArr(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

function computeRsi(closes: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gain += d; else loss -= d;
    }
    let ag = gain / period, al = loss / period;
    out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        ag = (ag * (period - 1) + Math.max(d, 0)) / period;
        al = (al * (period - 1) + Math.max(-d, 0)) / period;
        out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return out;
}

function computeMacd(closes: number[]) {
    const e12 = emaArr(closes, 12);
    const e26 = emaArr(closes, 26);
    const macd: (number | null)[] = closes.map((_, i) => (e12[i] != null && e26[i] != null ? +(e12[i]! - e26[i]!).toFixed(4) : null));
    const valid = macd.filter((v): v is number => v != null);
    const sigValid = emaArr(valid, 9);
    const signal: (number | null)[] = new Array(closes.length).fill(null);
    let vi = 0;
    for (let i = 0; i < macd.length; i++) {
        if (macd[i] != null) { signal[i] = sigValid[vi]; vi++; }
    }
    const hist: (number | null)[] = macd.map((m, i) => (m != null && signal[i] != null ? +(m - signal[i]!).toFixed(4) : null));
    return { macd, signal, hist };
}

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
    indicators?: boolean;
    ticker?: string;
    compact?: boolean;
    patternMarkers?: {
        time: number;
        position: 'aboveBar' | 'belowBar';
        color: string;
        shape: string;
        text: string;
        size?: number;
    }[];
}

type ChartType = "candlestick" | "line" | "area";
type HoverOhlc = { open: number; high: number; low: number; close: number; volume?: number } | null;

export default function StockChart({ data, markers, prediction, buyPrice, maLines, drawings, patternMarkers, indicators = true, ticker, compact = false }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const palette = getLightweightChartPalette(isDark);
    const [chartType, setChartType] = useState<ChartType>(() => {
        if (typeof window === "undefined") return "candlestick";
        const saved = localStorage.getItem("porto-chart-type");
        return saved === "line" || saved === "area" ? saved : "candlestick";
    });
    const [showIndicators, setShowIndicators] = useState(indicators);
    const [showMa, setShowMa] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [showDrawings, setShowDrawings] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoverOhlc, setHoverOhlc] = useState<HoverOhlc>(null);

    useEffect(() => { localStorage.setItem("porto-chart-type", chartType); }, [chartType]);
    useEffect(() => {
        const onFullscreen = () => setIsFullscreen(document.fullscreenElement === terminalRef.current);
        document.addEventListener("fullscreenchange", onFullscreen);
        return () => document.removeEventListener("fullscreenchange", onFullscreen);
    }, []);

    const toggleFullscreen = async () => {
        if (!terminalRef.current) return;
        if (document.fullscreenElement) await document.exitFullscreen();
        else await terminalRef.current.requestFullscreen();
    };

    const applyTemplate = (template: "clean" | "technical" | "momentum") => {
        if (template === "clean") {
            setShowMa(true); setShowVolume(true); setShowIndicators(false); setShowDrawings(false);
        } else if (template === "momentum") {
            setShowMa(false); setShowVolume(true); setShowIndicators(true); setShowDrawings(false);
        } else {
            setShowMa(true); setShowVolume(true); setShowIndicators(true); setShowDrawings(true);
        }
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
            const createSeries = (type: 'Candlestick' | 'Line' | 'Area' | 'Baseline' | 'Histogram', options: any, paneIndex?: number) => {
                const c: any = chart;
                // Try direct method (v4)
                const methodName = `add${type}Series`;
                if (typeof c[methodName] === 'function') {
                    return paneIndex != null ? c[methodName](options, paneIndex) : c[methodName](options);
                }
                // v5 generic addSeries(type, options, paneIndex?)
                if (typeof c.addSeries === 'function') {
                    const seriesType = (LightweightCharts as any)[`${type}Series`] || type;
                    return paneIndex != null ? c.addSeries(seriesType, options, paneIndex) : c.addSeries(seriesType, options);
                }
                return null;
            };

            const candlestickSeries = chartType === 'candlestick'
                ? createSeries('Candlestick', {
                    upColor: palette.up,
                    downColor: palette.down,
                    borderVisible: false,
                    wickUpColor: palette.up,
                    wickDownColor: palette.down,
                })
                : chartType === 'area'
                    ? createSeries('Area', {
                        lineColor: palette.up,
                        topColor: isDark ? 'rgba(30,217,139,0.26)' : 'rgba(22,128,60,0.20)',
                        bottomColor: 'rgba(22,128,60,0.01)',
                        lineWidth: 2,
                        priceLineVisible: false,
                    })
                    : createSeries('Line', { color: palette.up, lineWidth: 2, priceLineVisible: false });

            if (candlestickSeries) {
                candlestickSeries.setData(chartType === 'candlestick'
                    ? cleanData
                    : cleanData.map(d => ({ time: d.time, value: Number(d.close) })));

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

            // Volume follows the same palette and sits in a compact pane, similar to a trading terminal.
            if (showVolume && cleanData.some(d => Number(d.volume ?? d.Volume ?? 0) > 0)) {
                const volumePane = 1;
                const volumeSeries = createSeries('Histogram', {
                    priceFormat: { type: 'volume' },
                    priceLineVisible: false,
                    lastValueVisible: false,
                }, volumePane);
                volumeSeries?.setData(cleanData.map(d => ({
                    time: d.time,
                    value: Number(d.volume ?? d.Volume ?? 0),
                    color: Number(d.close) >= Number(d.open) ? `${palette.up}66` : `${palette.down}66`,
                })));
            }

            // Draw MA Lines
            if (showMa && maLines) {
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
            if (showDrawings && drawings && drawings.length > 0) {
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

            // ── Pane indikator: RSI (pane 1) + MACD (pane 2) — lightweight-charts v5 ──
            if (showIndicators && cleanData.length > 30) {
                try {
                    const closes = cleanData.map(d => Number(d.close));
                    const timeAt = (i: number) => cleanData[i].time;

                    // RSI pane
                    const rsiVals = computeRsi(closes, 14);
                    const rsiData = rsiVals.map((v, i) => (v == null ? null : { time: timeAt(i), value: +v.toFixed(2) })).filter(Boolean) as any[];
                    const indicatorPaneStart = showVolume ? 2 : 1;
                    const rsiSeries = createSeries('Line', {
                        color: CHART_SERIES.rsi, lineWidth: 1, lastValueVisible: false, priceLineVisible: false,
                    }, indicatorPaneStart);
                    if (rsiSeries) {
                        rsiSeries.setData(rsiData);
                        if (typeof rsiSeries.createPriceLine === 'function') {
                            rsiSeries.createPriceLine({ price: 70, color: 'rgba(239,92,112,0.45)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: false, title: '' });
                            rsiSeries.createPriceLine({ price: 30, color: 'rgba(30,217,139,0.45)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: false, title: '' });
                        }
                    }

                    // MACD pane (histogram + macd + signal)
                    const { macd, signal, hist } = computeMacd(closes);
                    const toSeries = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? null : { time: timeAt(i), value: v })).filter(Boolean) as any[];
                    const hSeries = createSeries('Histogram', { color: 'rgba(100,116,139,0.45)', lastValueVisible: false, priceLineVisible: false }, indicatorPaneStart + 1);
                    hSeries?.setData(toSeries(hist));
                    const mSeries = createSeries('Line', { color: CHART_SERIES.macd, lineWidth: 1, lastValueVisible: false, priceLineVisible: false }, indicatorPaneStart + 1);
                    mSeries?.setData(toSeries(macd));
                    const sSeries = createSeries('Line', { color: CHART_SERIES.signal, lineWidth: 1, lastValueVisible: false, priceLineVisible: false }, indicatorPaneStart + 1);
                    sSeries?.setData(toSeries(signal));

                    // Tinggi pane
                    const panes = (chart as any).panes?.();
                    if (Array.isArray(panes)) {
                        if (showVolume) panes[1]?.setHeight?.(72);
                        panes[indicatorPaneStart]?.setHeight?.(90);
                        panes[indicatorPaneStart + 1]?.setHeight?.(80);
                    }
                } catch (e) {
                    console.warn('[StockChart] indikator gagal:', e);
                }
            }

            chart.subscribeCrosshairMove?.((param: any) => {
                if (!param?.time) { setHoverOhlc(null); return; }
                const row = cleanData.find(d => d.time === param.time);
                if (!row) return;
                setHoverOhlc({
                    open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close),
                    volume: Number(row.volume ?? row.Volume ?? 0),
                });
            });
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
    }, [data, markers, prediction, buyPrice, maLines, drawings, patternMarkers, chartType, showIndicators, showMa, showVolume, showDrawings, palette.background, palette.text, palette.grid, palette.border, palette.up, palette.down, palette.ma20, palette.ma50, palette.buy, palette.forecast, theme, isDark]);

    const latest = data[data.length - 1];
    const ohlc = hoverOhlc ?? (latest ? {
        open: Number(latest.open), high: Number(latest.high), low: Number(latest.low), close: Number(latest.close),
        volume: Number(latest.volume ?? latest.Volume ?? 0),
    } : null);
    const fmt = (value: number | undefined) => Number.isFinite(value) ? Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "—";
    const toolClass = (active?: boolean) => cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-bold transition-colors",
        active ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
    );

    return (
        <div ref={terminalRef} className="w-full bg-card text-card-foreground">
            {!compact ? (
                <>
                    <div className="flex items-center gap-1.5 overflow-x-auto border-b bg-muted/20 px-2 py-2 scrollbar-none sm:px-3">
                        <select aria-label="Template chart" defaultValue={showDrawings ? "technical" : "clean"} onChange={event => applyTemplate(event.target.value as "clean" | "technical" | "momentum")} className="min-h-9 shrink-0 rounded-md border bg-card px-2 text-[11px] font-bold text-foreground outline-none">
                            <option value="clean">Template: Clean</option>
                            <option value="technical">Template: Technical</option>
                            <option value="momentum">Template: Momentum</option>
                        </select>
                        {([
                            ["candlestick", CandlestickChart, "Candle"],
                            ["line", ChartNoAxesCombined, "Line"],
                            ["area", AreaChart, "Area"],
                        ] as const).map(([type, Icon, label]) => (
                            <button key={type} onClick={() => setChartType(type)} className={toolClass(chartType === type)} aria-pressed={chartType === type}>
                                <Icon className="size-3.5" />{label}
                            </button>
                        ))}
                        <span className="mx-0.5 h-6 w-px shrink-0 bg-border" />
                        <button onClick={() => setShowMa(v => !v)} className={toolClass(showMa)} aria-pressed={showMa}>MA 20/50</button>
                        <button onClick={() => setShowVolume(v => !v)} className={toolClass(showVolume)} aria-pressed={showVolume}><BarChart3 className="size-3.5" />Volume</button>
                        <button onClick={() => setShowIndicators(v => !v)} className={toolClass(showIndicators)} aria-pressed={showIndicators}><Activity className="size-3.5" />RSI & MACD</button>
                        <button onClick={() => setShowDrawings(v => !v)} className={toolClass(showDrawings)} aria-pressed={showDrawings}><PencilRuler className="size-3.5" />Drawing</button>
                        <span className="flex-1" />
                        <button onClick={() => chartRef.current?.timeScale?.().fitContent?.()} className={toolClass()} title="Reset tampilan"><RotateCcw className="size-3.5" /></button>
                        <button onClick={() => void toggleFullscreen()} className={toolClass(isFullscreen)} title="Layar penuh">
                            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </button>
                    </div>
                    <div className="flex min-h-9 items-center gap-x-3 overflow-x-auto border-b px-3 text-[11px] tabular-nums text-muted-foreground scrollbar-none">
                        {ticker ? <b className="text-foreground">{ticker.replace(".JK", "")}</b> : null}
                        <span>O <b className="text-foreground">{fmt(ohlc?.open)}</b></span>
                        <span>H <b className="text-success">{fmt(ohlc?.high)}</b></span>
                        <span>L <b className="text-destructive">{fmt(ohlc?.low)}</b></span>
                        <span>C <b className="text-foreground">{fmt(ohlc?.close)}</b></span>
                        <span>Vol <b className="text-foreground">{fmt(ohlc?.volume)}</b></span>
                        <span className="ml-auto hidden whitespace-nowrap text-[10px] sm:inline">Scroll untuk zoom · drag untuk geser · crosshair untuk detail</span>
                    </div>
                </>
            ) : null}
            <div ref={chartContainerRef} className={cn("w-full", isFullscreen ? "h-[calc(100vh-92px)]" : compact ? "h-[300px]" : "h-[480px]")} />
        </div>
    );
}
