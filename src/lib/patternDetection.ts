// Chart Pattern Detection — deteksi pola chart (trendline, support/resistance,
// reversal, continuation) dari data OHLC. Berdasarkan panduan pola-chart-saham.md

export interface OHLCBar {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export type PatternDirection = 'bullish' | 'bearish' | 'neutral';

export interface DetectedPattern {
    id: string;
    name: string;
    category: 'trend' | 'reversal' | 'continuation' | 'level';
    direction: PatternDirection;
    description: string;
    confidence: number; // 0-100
    price?: number; // level harga kunci (neckline/support/resistance)
}

interface Pivot {
    index: number;
    price: number;
    type: 'high' | 'low';
}

// Cari pivot points (local highs/lows)
function findPivots(data: OHLCBar[], lookback = 2): Pivot[] {
    const pivots: Pivot[] = [];
    for (let i = lookback; i < data.length - lookback; i++) {
        const high = data[i].high;
        const low = data[i].low;
        let isHigh = true;
        let isLow = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i) continue;
            if (data[j].high >= high) isHigh = false;
            if (data[j].low <= low) isLow = false;
        }
        if (isHigh) pivots.push({ index: i, price: high, type: 'high' });
        if (isLow) pivots.push({ index: i, price: low, type: 'low' });
    }
    pivots.sort((a, b) => a.index - b.index);
    return pivots;
}

function nearEqual(a: number, b: number, tolerancePct = 1.5): boolean {
    if (a === 0 || b === 0) return false;
    return Math.abs(a - b) / Math.abs(a) * 100 <= tolerancePct;
}

// Deteksi support/resistance (level horizontal dari pivot)
function detectLevels(data: OHLCBar[]): { support: number | null; resistance: number | null } {
    const pivots = findPivots(data, 2);
    if (pivots.length < 4) return { support: null, resistance: null };

    const highs = pivots.filter(p => p.type === 'high').map(p => p.price);
    const lows = pivots.filter(p => p.type === 'low').map(p => p.price);

    // Resistance = cluster dari 2+ high yang hampir sama
    let resistance: number | null = null;
    for (let i = 0; i < highs.length; i++) {
        const cluster = highs.filter(h => nearEqual(h, highs[i]));
        if (cluster.length >= 2) { resistance = cluster[0]; break; }
    }

    // Support = cluster dari 2+ low yang hampir sama
    let support: number | null = null;
    for (let i = 0; i < lows.length; i++) {
        const cluster = lows.filter(l => nearEqual(l, lows[i]));
        if (cluster.length >= 2) { support = cluster[0]; break; }
    }

    return { support, resistance };
}

// Deteksi Double Top / Double Bottom
function detectDoubleTopBottom(data: OHLCBar[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const pivots = findPivots(data, 3);
    const highs = pivots.filter(p => p.type === 'high');
    const lows = pivots.filter(p => p.type === 'low');

    // Double Top: 2 high yang hampir sama dengan lembah di antara
    for (let i = 0; i < highs.length - 1; i++) {
        for (let j = i + 1; j < highs.length; j++) {
            if (nearEqual(highs[i].price, highs[j].price, 2) && j - i >= 3) {
                // Cek ada lembah signifikan di antara
                const between = pivots.filter(p => p.index > highs[i].index && p.index < highs[j].index && p.type === 'low');
                if (between.length > 0) {
                    const neckline = Math.min(...between.map(b => b.price));
                    patterns.push({
                        id: `dt-${i}`,
                        name: 'Double Top',
                        category: 'reversal',
                        direction: 'bearish',
                        description: 'Dua puncak setinggi hampir sama, sinyal reversal turun. Neckline di support antar puncak.',
                        confidence: 70,
                        price: neckline,
                    });
                }
            }
        }
    }

    // Double Bottom: 2 low yang hampir sama dengan puncak di antara
    for (let i = 0; i < lows.length - 1; i++) {
        for (let j = i + 1; j < lows.length; j++) {
            if (nearEqual(lows[i].price, lows[j].price, 2) && j - i >= 3) {
                const between = pivots.filter(p => p.index > lows[i].index && p.index < lows[j].index && p.type === 'high');
                if (between.length > 0) {
                    const neckline = Math.max(...between.map(b => b.price));
                    patterns.push({
                        id: `db-${i}`,
                        name: 'Double Bottom',
                        category: 'reversal',
                        direction: 'bullish',
                        description: 'Dua lembah setinggi hampir sama, sinyal reversal naik. Neckline di resistance antar lembah.',
                        confidence: 70,
                        price: neckline,
                    });
                }
            }
        }
    }

    return patterns.slice(0, 2);
}

// Deteksi Head and Shoulders / Inverse H&S
function detectHeadShoulders(data: OHLCBar[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const pivots = findPivots(data, 3);
    const highs = pivots.filter(p => p.type === 'high');
    const lows = pivots.filter(p => p.type === 'low');

    // Head & Shoulders: 3 puncak, tengah tertinggi, kiri-kanan setinggi sama
    for (let i = 1; i < highs.length - 1; i++) {
        const left = highs[i - 1];
        const head = highs[i];
        const right = highs[i + 1];
        if (head.price > left.price && head.price > right.price && nearEqual(left.price, right.price, 2.5)) {
            const necklinePivots = lows.filter(l => l.index > left.index && l.index < right.index);
            if (necklinePivots.length >= 1) {
                const neckline = Math.min(...necklinePivots.map(l => l.price));
                patterns.push({
                    id: `hs-${i}`,
                    name: 'Head and Shoulders',
                    category: 'reversal',
                    direction: 'bearish',
                    description: 'Tiga puncak: bahu kiri, kepala (tertinggi), bahu kanan. Sinyal reversal turun saat neckline tembus.',
                    confidence: 75,
                    price: neckline,
                });
            }
        }
    }

    // Inverse H&S: 3 lembah, tengah terendah, kiri-kanan setinggi sama
    for (let i = 1; i < lows.length - 1; i++) {
        const left = lows[i - 1];
        const head = lows[i];
        const right = lows[i + 1];
        if (head.price < left.price && head.price < right.price && nearEqual(left.price, right.price, 2.5)) {
            const necklinePivots = highs.filter(h => h.index > left.index && h.index < right.index);
            if (necklinePivots.length >= 1) {
                const neckline = Math.max(...necklinePivots.map(h => h.price));
                patterns.push({
                    id: `ihs-${i}`,
                    name: 'Inverse Head and Shoulders',
                    category: 'reversal',
                    direction: 'bullish',
                    description: 'Tiga lembah: bahu kiri, kepala (terendah), bahu kanan. Sinyal reversal naik saat neckline tembus.',
                    confidence: 75,
                    price: neckline,
                });
            }
        }
    }

    return patterns.slice(0, 2);
}

// Deteksi Triple Top / Bottom
function detectTripleTopBottom(data: OHLCBar[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const pivots = findPivots(data, 3);
    const highs = pivots.filter(p => p.type === 'high');
    const lows = pivots.filter(p => p.type === 'low');

    for (let i = 0; i < highs.length - 2; i++) {
        if (nearEqual(highs[i].price, highs[i + 1].price, 2) && nearEqual(highs[i].price, highs[i + 2].price, 2)) {
            patterns.push({
                id: `tt-${i}`,
                name: 'Triple Top',
                category: 'reversal',
                direction: 'bearish',
                description: 'Tiga puncak sejajar, sinyal turun lebih kuat dari double top.',
                confidence: 80,
                price: highs[i].price,
            });
            break;
        }
    }

    for (let i = 0; i < lows.length - 2; i++) {
        if (nearEqual(lows[i].price, lows[i + 1].price, 2) && nearEqual(lows[i].price, lows[i + 2].price, 2)) {
            patterns.push({
                id: `tb-${i}`,
                name: 'Triple Bottom',
                category: 'reversal',
                direction: 'bullish',
                description: 'Tiga lembah sejajar, sinyal naik lebih kuat dari double bottom.',
                confidence: 80,
                price: lows[i].price,
            });
            break;
        }
    }

    return patterns;
}

// Deteksi trend (uptrend/downtrend) via regresi linear pada close
function detectTrend(data: OHLCBar[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const lookback = Math.min(50, data.length);
    const slice = data.slice(-lookback);
    const n = slice.length;
    if (n < 10) return patterns;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += slice[i].close;
        sumXY += i * slice[i].close;
        sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    const slopePct = avgPrice > 0 ? (slope * n / avgPrice) * 100 : 0;

    if (slopePct > 5) {
        patterns.push({
            id: 'trend-up',
            name: 'Uptrend',
            category: 'trend',
            direction: 'bullish',
            description: `Harga dalam tren naik (kecenderungan +${slopePct.toFixed(1)}% selama ${lookback} bar). Tarik trendline dari low terendah yang makin naik.`,
            confidence: Math.min(90, Math.round(Math.abs(slopePct) * 4)),
        });
    } else if (slopePct < -5) {
        patterns.push({
            id: 'trend-down',
            name: 'Downtrend',
            category: 'trend',
            direction: 'bearish',
            description: `Harga dalam tren turun (kecenderungan ${slopePct.toFixed(1)}% selama ${lookback} bar). Tarik trendline dari high tertinggi yang makin turun.`,
            confidence: Math.min(90, Math.round(Math.abs(slopePct) * 4)),
        });
    } else {
        patterns.push({
            id: 'trend-side',
            name: 'Sideways',
            category: 'trend',
            direction: 'neutral',
            description: 'Harga bergerak mendatar tanpa arah jelas (konsolidasi).',
            confidence: 60,
        });
    }

    return patterns;
}

// Deteksi triangle (ascending/descending/symmetrical) & channel
function detectTriangleChannel(data: OHLCBar[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const pivots = findPivots(data, 2);
    if (pivots.length < 6) return patterns;

    const lookback = Math.min(40, data.length);
    const slice = data.slice(-lookback);
    const highs = slice.map(d => d.high);
    const lows = slice.map(d => d.low);

    // Cek resistance datar + support naik = Ascending Triangle
    const lastHighs = highs.slice(-10);
    const lastLows = lows.slice(-10);
    const highRange = Math.max(...lastHighs) - Math.min(...lastHighs);
    const lowRange = Math.max(...lastLows) - Math.min(...lastLows);
    const avgHigh = lastHighs.reduce((a, b) => a + b, 0) / lastHighs.length;
    const avgLow = lastLows.reduce((a, b) => a + b, 0) / lastLows.length;

    if (highRange / avgHigh * 100 < 1.5 && (lows[lows.length - 1] > lows[0])) {
        patterns.push({
            id: 'asc-tri',
            name: 'Ascending Triangle',
            category: 'continuation',
            direction: 'bullish',
            description: 'Resistance datar + support naik. Biasanya breakout ke atas.',
            confidence: 65,
            price: avgHigh,
        });
    } else if (lowRange / avgLow * 100 < 1.5 && (highs[highs.length - 1] < highs[0])) {
        patterns.push({
            id: 'desc-tri',
            name: 'Descending Triangle',
            category: 'continuation',
            direction: 'bearish',
            description: 'Support datar + resistance turun. Biasanya breakdown ke bawah.',
            confidence: 65,
            price: avgLow,
        });
    } else if (highRange / avgHigh * 100 < 2 && lowRange / avgLow * 100 < 2) {
        patterns.push({
            id: 'rect',
            name: 'Rectangle / Sideways Channel',
            category: 'continuation',
            direction: 'neutral',
            description: 'Harga sideways di antara support-resistance horizontal sebelum lanjut tren.',
            confidence: 60,
            price: avgHigh,
        });
    }

    return patterns;
}

// Deteksi semua pola
export function detectChartPatterns(data: OHLCBar[]): DetectedPattern[] {
    if (data.length < 20) return [];

    const all: DetectedPattern[] = [
        ...detectTrend(data),
        ...detectDoubleTopBottom(data),
        ...detectHeadShoulders(data),
        ...detectTripleTopBottom(data),
        ...detectTriangleChannel(data),
    ];

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = all.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
    });

    // Sort by confidence desc
    return unique.sort((a, b) => b.confidence - a.confidence);
}

// Deteksi support & resistance levels
export function detectSupportResistance(data: OHLCBar[]): { support: number | null; resistance: number | null } {
    return detectLevels(data);
}

// ─── Drawing primitives untuk digambar langsung di chart ───────────
export type DrawingType = 'horizontal' | 'trendline' | 'zone';

export interface ChartDrawing {
    id: string;
    type: DrawingType;
    color: string;
    title: string;
    // horizontal line
    price?: number;
    // batas kedua untuk zona berwarna (price = batas atas, price2 = batas bawah)
    price2?: number;
    // warna bawah zona (gradasi vertikal, opsional)
    colorBottom?: string;
    // trendline (2 titik)
    points?: { time: number; price: number }[];
    // arah pengisian warna trendline
    fillTo?: number;
    fillDir?: 'above' | 'below';
}

// Marker pola untuk ditampilkan langsung di candle
export interface PatternMarker {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
    text: string;
    size?: number;
}

function toUnix(t: string | number): number {
    return typeof t === 'number' ? t : Math.floor(new Date(t).getTime() / 1000);
}

function linearRegression(values: { x: number; y: number }[]) {
    const n = values.length;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (const v of values) {
        sx += v.x; sy += v.y; sxy += v.x * v.y; sx2 += v.x * v.x;
    }
    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    const intercept = (sy - slope * sx) / n;
    return { slope, intercept };
}

// Hasilkan data gambar (garis) untuk chart
export function detectChartDrawings(data: OHLCBar[]): ChartDrawing[] {
    const drawings: ChartDrawing[] = [];
    if (data.length < 20) return drawings;

    const pivots = findPivots(data, 2);
    const levels = detectLevels(data);
    const lookback = Math.min(50, data.length);
    const slice = data.slice(-lookback);
    const startIdx = data.length - slice.length;

    // 0. Zona berwarna di antara support & resistance (trading range, gradasi vertikal)
    if (levels.support != null && levels.resistance != null && levels.support < levels.resistance) {
        drawings.push({
            id: 'sr-zone',
            type: 'zone',
            color: 'rgba(99, 102, 241, 0.18)',
            colorBottom: 'rgba(99, 102, 241, 0.04)',
            title: '',
            price: levels.resistance,
            price2: levels.support,
        });
    }

    // 1. Support horizontal
    if (levels.support != null) {
        drawings.push({
            id: 'support',
            type: 'horizontal',
            color: '#0eaa68',
            title: 'SUPPORT',
            price: levels.support,
        });
    }

    // 2. Resistance horizontal
    if (levels.resistance != null) {
        drawings.push({
            id: 'resistance',
            type: 'horizontal',
            color: '#df4d61',
            title: 'RESISTANCE',
            price: levels.resistance,
        });
    }

    // 3. Trendline via regresi linear pada lows (support trendline) & highs (resistance trendline)
    const lows = slice.map((d, i) => ({ x: i, y: d.low }));
    const highs = slice.map((d, i) => ({ x: i, y: d.high }));

    const lowReg = linearRegression(lows);
    const highReg = linearRegression(highs);

    const firstTime = toUnix(slice[0].time);
    const lastTime = toUnix(slice[slice.length - 1].time);

    const avgPrice = slice.reduce((a, b) => a + b.close, 0) / slice.length;
    const lowSlopePct = avgPrice > 0 ? (lowReg.slope * slice.length / avgPrice) * 100 : 0;
    const highSlopePct = avgPrice > 0 ? (highReg.slope * slice.length / avgPrice) * 100 : 0;

    const floor = Math.min(...slice.map(d => d.low));
    const ceil = Math.max(...slice.map(d => d.high));

    // Uptrend support line (lows naik) — area di bawah garis diberi gradasi teal
    if (lowSlopePct > 5) {
        drawings.push({
            id: 'trendline-up',
            type: 'trendline',
            color: '#14b8a6',
            title: 'UPTREND',
            points: [
                { time: firstTime, price: lowReg.intercept },
                { time: lastTime, price: lowReg.intercept + lowReg.slope * (slice.length - 1) },
            ],
            fillTo: floor,
            fillDir: 'below',
        });
    }

    // Downtrend resistance line (highs turun) — area di atas garis diberi gradasi oranye
    if (highSlopePct < -5) {
        drawings.push({
            id: 'trendline-down',
            type: 'trendline',
            color: '#eaa82e',
            title: 'DOWNTREND',
            points: [
                { time: firstTime, price: highReg.intercept },
                { time: lastTime, price: highReg.intercept + highReg.slope * (slice.length - 1) },
            ],
            fillTo: ceil,
            fillDir: 'above',
        });
    }

    // 4. Neckline untuk Double Top/Bottom dan H&S
    const highPivots = pivots.filter(p => p.type === 'high');
    const lowPivots = pivots.filter(p => p.type === 'low');

    // Double Top neckline
    for (let i = 0; i < highPivots.length - 1; i++) {
        for (let j = i + 1; j < highPivots.length; j++) {
            if (nearEqual(highPivots[i].price, highPivots[j].price, 2) && j - i >= 3) {
                const between = lowPivots.filter(p => p.index > highPivots[i].index && p.index < highPivots[j].index);
                if (between.length > 0) {
                    const neckline = Math.min(...between.map(b => b.price));
                    drawings.push({
                        id: 'neckline-dt',
                        type: 'horizontal',
                        color: '#a967ff',
                        title: 'NECKLINE',
                        price: neckline,
                    });
                    drawings.push({
                        id: 'neckline-dt-band',
                        type: 'zone',
                        color: 'rgba(169, 103, 255, 0.08)',
                        title: '',
                        price: neckline * 1.008,
                        price2: neckline * 0.992,
                    });
                    // Target measured move: neckline - (tinggi pola)
                    const avgPeak = (highPivots[i].price + highPivots[j].price) / 2;
                    const target = neckline - (avgPeak - neckline);
                    if (target > 0) {
                        drawings.push({
                            id: 'target-dt',
                            type: 'horizontal',
                            color: '#10b981',
                            title: 'TARGET',
                            price: target,
                        });
                    }
                }
                break;
            }
        }
    }

    // Double Bottom neckline
    for (let i = 0; i < lowPivots.length - 1; i++) {
        for (let j = i + 1; j < lowPivots.length; j++) {
            if (nearEqual(lowPivots[i].price, lowPivots[j].price, 2) && j - i >= 3) {
                const between = highPivots.filter(p => p.index > lowPivots[i].index && p.index < lowPivots[j].index);
                if (between.length > 0) {
                    const neckline = Math.max(...between.map(b => b.price));
                    drawings.push({
                        id: 'neckline-db',
                        type: 'horizontal',
                        color: '#a967ff',
                        title: 'NECKLINE',
                        price: neckline,
                    });
                    drawings.push({
                        id: 'neckline-db-band',
                        type: 'zone',
                        color: 'rgba(169, 103, 255, 0.08)',
                        title: '',
                        price: neckline * 1.008,
                        price2: neckline * 0.992,
                    });
                    // Target measured move: neckline + (tinggi pola)
                    const avgTrough = (lowPivots[i].price + lowPivots[j].price) / 2;
                    const target = neckline + (neckline - avgTrough);
                    if (target > 0) {
                        drawings.push({
                            id: 'target-db',
                            type: 'horizontal',
                            color: '#10b981',
                            title: 'TARGET',
                            price: target,
                        });
                    }
                }
                break;
            }
        }
    }

    // Deduplicate horizontal lines dengan harga yang mirip
    const seenPrices = new Map<string, number>();
    const unique = drawings.filter(d => {
        if (d.type === 'horizontal' && d.price != null) {
            const key = Math.round(d.price);
            if (seenPrices.has(String(key))) return false;
            seenPrices.set(String(key), d.price);
        }
        return true;
    });

    return unique;
}

// Marker pola langsung di candle: label puncak/lembah pola + breakout level kunci
export function detectChartMarkers(data: OHLCBar[]): PatternMarker[] {
    const markers: PatternMarker[] = [];
    if (data.length < 20) return markers;

    const pivots = findPivots(data, 2);
    const highPivots = pivots.filter(p => p.type === 'high');
    const lowPivots = pivots.filter(p => p.type === 'low');
    const drawings = detectChartDrawings(data);

    // Label pola pada ekstreem KEDUA (konfirmasi)
    for (let i = 0; i < highPivots.length - 1; i++) {
        for (let j = i + 1; j < highPivots.length; j++) {
            if (nearEqual(highPivots[i].price, highPivots[j].price, 2) && j - i >= 3) {
                markers.push({
                    time: toUnix(data[highPivots[j].index].time),
                    position: 'aboveBar',
                    color: '#df4b61',
                    shape: 'square',
                    text: 'DOUBLE TOP',
                    size: 1,
                });
                break;
            }
        }
        if (markers.length >= 2) break;
    }

    for (let i = 0; i < lowPivots.length - 1; i++) {
        for (let j = i + 1; j < lowPivots.length; j++) {
            if (nearEqual(lowPivots[i].price, lowPivots[j].price, 2) && j - i >= 3) {
                markers.push({
                    time: toUnix(data[lowPivots[j].index].time),
                    position: 'belowBar',
                    color: '#0eaa68',
                    shape: 'square',
                    text: 'DOUBLE BOTTOM',
                    size: 1,
                });
                break;
            }
        }
        if (markers.length >= 4) break;
    }

    // Breakout/breakdown level kunci dalam N bar terakhir
    const lookbackN = Math.min(15, data.length - 1);
    const levelChecks: { price: number | undefined; dir: 'up' | 'down'; text: string; color: string }[] = [
        { price: drawings.find(d => d.id === 'resistance')?.price, dir: 'up', text: 'BREAKOUT', color: '#0eaa68' },
        { price: drawings.find(d => d.id === 'support')?.price, dir: 'down', text: 'BREAKDOWN', color: '#df4b61' },
        { price: drawings.find(d => d.id === 'neckline-db')?.price, dir: 'up', text: 'BUY SIGNAL', color: '#10b981' },
        { price: drawings.find(d => d.id === 'neckline-dt')?.price, dir: 'down', text: 'SELL SIGNAL', color: '#ef4444' },
    ];

    for (const lc of levelChecks) {
        if (lc.price == null) continue;
        for (let idx = data.length - lookbackN; idx < data.length; idx++) {
            const prev = data[idx - 1];
            const cur = data[idx];
            if (!prev || !cur) continue;
            if (lc.dir === 'up' && prev.close <= lc.price && cur.close > lc.price) {
                markers.push({
                    time: toUnix(cur.time),
                    position: 'belowBar',
                    color: lc.color,
                    shape: 'arrowUp',
                    text: lc.text,
                    size: 2,
                });
                break;
            }
            if (lc.dir === 'down' && prev.close >= lc.price && cur.close < lc.price) {
                markers.push({
                    time: toUnix(cur.time),
                    position: 'aboveBar',
                    color: lc.color,
                    shape: 'arrowDown',
                    text: lc.text,
                    size: 2,
                });
                break;
            }
        }
    }

    return markers.sort((a, b) => a.time - b.time).slice(-8);
}
