import { NextRequest } from 'next/server';

// Analisis & proyeksi IHSG via AI (OpenCode Zen Go).
// Server mengumpulkan data teknikal (candle, RSI, SMA, pivot) lalu meminta
// model menyusun proyeksi terstruktur. Hasil di-cache 10 menit per timeframe.

const BASE = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1';
const KEY = process.env.OPENCODE_API_KEY;
// Rantai model: preferensi dari .env TETAP digabung fallback bawaan agar tidak pernah single-point-of-failure
const MODEL_CHAIN = [
    ...new Set([
        ...(process.env.OPENCODE_MODEL || '').split(',').map(s => s.trim()).filter(Boolean),
        'ox-alpha-free',
        'mimo-v2.5',
        'deepseek-v4-flash-free',
    ]),
];

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

function sma(values: number[], period: number): number | null {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(2);
}

function rsi(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gain += d; else loss -= d;
    }
    let ag = gain / period, al = loss / period;
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        ag = (ag * (period - 1) + Math.max(d, 0)) / period;
        al = (al * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (al === 0) return 100;
    return +((100 - 100 / (1 + ag / al)).toFixed(1));
}

async function callModel(messages: any[]): Promise<{ text: string; model: string }> {
    const errors: string[] = [];
    for (const model of MODEL_CHAIN) {
        // Coba dulu dengan response_format json_object; jika provider menolak, ulang tanpa itu
        for (const useJsonMode of [true, false]) {
            let aborted = false;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const body: any = { model, messages, temperature: 0.4, max_tokens: 2400 };
                    if (useJsonMode) body.response_format = { type: 'json_object' };
                    const r = await fetch(`${BASE}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${KEY}`,
                        },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(90_000),
                    });
                    if (!r.ok) {
                        // Provider tidak mendukung response_format → coba tanpa
                        if (useJsonMode && r.status === 400) { aborted = true; break; }
                        if ((r.status === 503 || r.status === 429) && attempt === 0) {
                            await new Promise(res => setTimeout(res, 2000));
                            continue;
                        }
                        errors.push(`${model}${useJsonMode ? '/json' : ''}: HTTP ${r.status}`);
                        break;
                    }
                    const j: any = await r.json();
                    const text = j?.choices?.[0]?.message?.content;
                    if (typeof text === 'string' && text.trim()) return { text: text.trim(), model };
                    errors.push(`${model}${useJsonMode ? '/json' : ''}: kosong`);
                    break;
                } catch (e: any) {
                    if (attempt === 1) { errors.push(`${model}${useJsonMode ? '/json' : ''}: ${e.message}`); aborted = true; }
                }
                if (aborted) break;
            }
        }
    }
    throw new Error(`Semua model gagal — ${errors.join(' | ')}`);
}

// Perbaiki JSON yang terpotong (truncated): tutup string & kurung yang menggantung
function repairJson(input: string): string | null {
    const start = input.indexOf('{');
    if (start < 0) return null;
    const body = input.slice(start);
    let inStr = false, esc = false;
    const closers: string[] = [];
    for (const ch of body) {
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') closers.push('}');
        else if (ch === '[') closers.push(']');
        else if (ch === '}') { if (closers[closers.length - 1] === '}') closers.pop(); }
        else if (ch === ']') { if (closers[closers.length - 1] === ']') closers.pop(); }
    }
    let out = body.replace(/[\r\n\t]+/g, ' ').replace(/,\s*$/, '').trimEnd();
    if (out.endsWith(',')) out = out.slice(0, -1);
    if (inStr) out += '"';
    out = out.replace(/,(\s*[}\]])/g, '$1');
    while (closers.length) out += closers.pop();
    return out;
}

function parseJsonLoose(text: string): any | null {
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const first = cleaned.indexOf('{');
    if (first > 0) cleaned = cleaned.slice(first);
    // Newline/tab/BOM/non-breaking space di dalam string membuat JSON rapuh — bersihkan
    cleaned = cleaned
        .replace(/\uFEFF/g, '')
        .replace(/[\u00A0\u2007\u202F]/g, ' ')
        .replace(/[\r\n\t]+/g, ' ');
    try { return JSON.parse(cleaned); } catch {}
    const s = cleaned.indexOf('{');
    if (s >= 0) {
        let e = cleaned.lastIndexOf('}');
        while (e > s) {
            try { return JSON.parse(cleaned.slice(s, e + 1)); } catch {}
            e = cleaned.lastIndexOf('}', e - 1);
        }
    }
    const repaired = repairJson(cleaned);
    if (repaired) {
        try {
            cleaned = repaired.replace(/,(\s*[}\]])/g, '$1');
            return JSON.parse(cleaned);
        } catch {}
    }
    return null;
}

// Beberapa model membalut JSON di dalam string — buka berlapis sampai ketemu objek asli
function deepUnwrap(obj: any, depth = 0): any | null {
    if (!obj || typeof obj !== 'object' || depth > 4) return obj;
    for (const key of Object.keys(obj)) {
        const v = obj[key];
        if (typeof v === 'string' && v.trim().startsWith('{')) {
            const inner = parseJsonLoose(v);
            if (inner && typeof inner === 'object') {
                return deepUnwrap({ ...inner }, depth + 1);
            }
        }
        if (v && typeof v === 'object') return deepUnwrap(v, depth + 1);
    }
    return obj;
}

// Penyelamat terakhir: ekstrak field satu per satu via regex.
// Tahan terhadap kutip ganda tak-ter-escape di tengah nilai string.
function extractFieldsLoose(text: string): any | null {
    if (!text) return null;
    const g = (k: string): string | undefined => {
        const m = text.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i'));
        return m ? m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\t/g, ' ').trim() : undefined;
    };
    const num = (k: string): number | undefined => {
        const m = text.match(new RegExp(`"${k}"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'));
        return m ? +m[1] : undefined;
    };
    const arr = (k: string): number[] | undefined => {
        const m = text.match(new RegExp(`"${k}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i'));
        if (!m) return undefined;
        return m[1].split(',').map(s => parseFloat(s)).filter(v => !isNaN(v));
    };
    const out: Record<string, unknown> = {};
    for (const k of ['ringkasan', 'tren', 'skenario_bullish', 'skenario_bearish', 'proyeksi_berikutnya', 'catatan']) {
        const v = g(k);
        if (v) out[k] = v;
    }
    const p = num('probabilitas_bullish');
    if (p != null) out.probabilitas_bullish = p;
    for (const k of ['support', 'resistance']) {
        const v = arr(k);
        if (v && v.length > 0) out[k] = v;
    }
    // Minimal punya ringkasan ATAU tren agar dianggap layak
    return (out.ringkasan || out.tren) ? out : null;
}

export async function GET(req: NextRequest) {
    if (!KEY) {
        return Response.json({ success: false, error: 'OPENCODE_API_KEY belum diset di .env' }, { status: 502 });
    }

    const sp = req.nextUrl.searchParams;
    const period = sp.get('period') || '5d';
    const interval = sp.get('interval') || '5m';
    const ckey = `${period}:${interval}`;

    const hit = cache.get(ckey);
    if (hit && Date.now() - hit.ts < TTL) {
        return Response.json({ ...hit.data, cached: true });
    }

    try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

        const daysMap: Record<string, number> = { "1d": 2, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365 };
        const days = daysMap[period] || 5;
        const p2 = Math.floor(Date.now() / 1000);
        const result = await yf.chart('^JKSE', { period1: p2 - days * 86400, period2: p2, interval } as any);
        const quotes: any[] = ((result as any)?.quotes || []).filter((q: any) => q.close != null);

        if (quotes.length < 15) {
            return Response.json({ success: false, error: 'Data candle tidak cukup untuk analisis' }, { status: 422 });
        }

        const closes = quotes.map(q => q.close);
        const tail = quotes.slice(-30).map((q: any) => ({
            t: new Date(q.date).toISOString().slice(11, 16).replace('T', ' ') || '',
            o: +q.open?.toFixed(1), h: +q.high?.toFixed(1), l: +q.low?.toFixed(1), c: +q.close.toFixed(1), v: q.volume ?? 0,
        }));

        // Pivot dari sesi harian sebelumnya
        let pivots: any = null;
        try {
            const daily = await yf.chart('^JKSE', { period1: p2 - 12 * 86400, period2: p2, interval: '1d' });
            const dq: any[] = ((daily as any)?.quotes || []).filter((q: any) => q.close != null);
            if (dq.length >= 1) {
                const last = dq[dq.length - 1];
                const lastIsToday = new Date(last.date).toISOString().slice(0, 10) === new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
                const prev = lastIsToday && dq.length >= 2 ? dq[dq.length - 2] : last;
                const pp = (prev.high + prev.low + prev.close) / 3;
                const range = prev.high - prev.low;
                pivots = {
                    pp: +pp.toFixed(1), r1: +(2 * pp - prev.low).toFixed(1), s1: +(2 * pp - prev.high).toFixed(1),
                    r2: +(pp + range).toFixed(1), s2: +(pp - range).toFixed(1),
                };
            }
        } catch {}

        const quote: any = await yf.quote('^JKSE').catch(() => null);
        const tech = {
            harga_terakhir: +closes[closes.length - 1].toFixed(1),
            perubahan_persen: quote ? +(quote.regularMarketChangePercent ?? 0).toFixed(2) : null,
            sma20: sma(closes, 20),
            sma50: sma(closes, 50),
            rsi14: rsi(closes),
            volume_terakhir: quotes[quotes.length - 1]?.volume ?? 0,
            pivots,
        };

        const system = `Kamu adalah analis teknikal pasar modal Indonesia senior yang berspesialisasi indeks IHSG.
Balas HANYA dengan JSON valid (tanpa markdown, tanpa teks di luar JSON).
Gunakan bahasa Indonesia yang ringkas dan profesional.`;

        const user = `Analisis IHSG berikut dan buat PROYEKSI pergerakan.

TIMEFRAME: ${interval} (${period})
DATA TEKNIKAL: ${JSON.stringify(tech)}
30 CANDLE TERAKHIR (o,h,l,c,v): ${JSON.stringify(tail)}

Format jawaban (JSON ketat). PENTING: keluarkan objek JSON LANGSUNG sebagai teks biasa — JANGAN dibungkus string, jangan pakai code fence.
{
  "ringkasan": "2-3 kalimat kondisi terkini",
  "tren": "bullish" | "bearish" | "netral",
  "probabilitas_bullish": <angka 0-100>,
  "skenario_bullish": "kondisi & level pemicu naik",
  "skenario_bearish": "kondisi & level pemicu turun",
  "support": [<maks 3 angka>],
  "resistance": [<maks 3 angka>],
  "proyeksi_berikutnya": "proyeksi arah & kisaran untuk beberapa candle ke depan",
  "catatan": "risiko/hal yang perlu diwaspadai"
}
Angka level dibulatkan 1 desimal. Probabilitas harus konsisten dengan tren.`;

        const { text, model } = await callModel([
            { role: 'system', content: system },
            { role: 'user', content: user },
        ]);

        const parsedRaw = parseJsonLoose(text);
        let parsed = deepUnwrap(parsedRaw) ?? parsedRaw;
        let hasCore = parsed && typeof parsed === 'object' && (parsed.tren || parsed.probabilitas_bullish != null || (typeof parsed.ringkasan === 'string' && !parsed.ringkasan.trim().startsWith('{')));
        if (!hasCore) {
            const loose = extractFieldsLoose(text);
            if (loose) { parsed = loose; hasCore = true; }
        }
        const payload = hasCore
            ? { success: true, source: 'ai', model, period, interval, generatedAt: new Date().toISOString(), analysis: parsed }
            : { success: true, source: 'ai', model, period, interval, generatedAt: new Date().toISOString(), analysis: { ringkasan: text.slice(0, 2000) }, unstructured: true, debugHead: text.slice(0, 150), debugTail: text.slice(-200) };

        // Jangan cache payload rusak — biarkan panggilan berikutnya mencoba ulang
        if (hasCore) cache.set(ckey, { data: payload, ts: Date.now() });
        return Response.json(payload);
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
