export const CHART_SERIES = {
    up: "#16803c",
    down: "#d92d20",
    ma20: "#f59e0b",
    ma50: "#8b5cf6",
    rsi: "#8b5cf6",
    macd: "#14b8a6",
    signal: "#f59e0b",
    volume: "#64748b",
    forecast: "#14b8a6",
    buy: "#eaa82e",
} as const;

export function getLightweightChartPalette(isDark: boolean) {
    return isDark
        ? {
            background: "#14171c",
            text: "#8b919c",
            grid: "#252932",
            border: "#252932",
            up: "#1ed98b",
            down: "#ef5c70",
            ma20: CHART_SERIES.ma20,
            ma50: "#a78bfa",
            buy: CHART_SERIES.buy,
            forecast: CHART_SERIES.forecast,
        }
        : {
            background: "#ffffff",
            text: "#6b7280",
            grid: "#e5e7eb",
            border: "#e5e7eb",
            up: CHART_SERIES.up,
            down: CHART_SERIES.down,
            ma20: CHART_SERIES.ma20,
            ma50: CHART_SERIES.ma50,
            buy: CHART_SERIES.buy,
            forecast: CHART_SERIES.forecast,
        };
}
