import { NextRequest } from 'next/server';

const BASE = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1';
const KEY = process.env.OPENCODE_API_KEY;
const MODEL_CHAIN = [
    ...new Set([
        ...(process.env.OPENCODE_MODEL || '').split(',').map(s => s.trim()).filter(Boolean),
        'mimo-v2.5',
        'ox-alpha-free',
        'deepseek-v4-flash-free',
    ]),
];

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

async function callModel(messages: any[]): Promise<{ text: string; model: string }> {
    const errors: string[] = [];
    for (const model of MODEL_CHAIN) {
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

function extractFieldsLoose(text: string): any | null {
    if (!text) return null;
    const g = (k: string): string | undefined => {
        const m = text.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i'));
        return m ? m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\t/g, ' ').trim() : undefined;
    };
    const out: Record<string, unknown> = {};
    for (const k of ['ringkasan', 'risiko_utama', 'risk_reward', 'saran_posisi', 'catatan']) {
        const v = g(k);
        if (v) out[k] = v;
    }
    const r = g('rekomendasi');
    if (r) out.rekomendasi = r;
    const c = text.match(/"confidence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (c) out.confidence = +c[1];
    return (out.ringkasan || out.rekomendasi) ? out : null;
}

export async function POST(req: NextRequest) {
    if (!KEY) {
        return Response.json({ success: false, error: 'OPENCODE_API_KEY belum diset di .env' }, { status: 502 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return Response.json({ success: false, error: 'Body JSON tidak valid' }, { status: 400 });
    }

    const { backtestResult, positionCalc, ticker, strategyLabel } = body;

    if (!backtestResult) {
        return Response.json({ success: false, error: 'backtestResult diperlukan' }, { status: 400 });
    }

    const ck = `ai-summary|${ticker}|${backtestResult.strategy}|${backtestResult.years}|${positionCalc?.modal ?? 0}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.ts < TTL) {
        return Response.json({ ...hit.data, cached: true });
    }

    try {
        const s = backtestResult.stats;
        const tradesSummary = backtestResult.trades?.slice(-10).map((t: any) =>
            `${t.entryDate}→${t.exitDate}: ${t.returnPct >= 0 ? '+' : ''}${t.returnPct.toFixed(1)}% (${t.days}hari)`
        ).join('\n') || 'tidak ada trade';

        const posInfo = positionCalc ? `
KALKULATOR POSISI:
- Modal: Rp ${positionCalc.modal?.toLocaleString('id-ID') || '-'}
- Total Lot: ${positionCalc.totalLots || 0}
- Total Saham: ${positionCalc.totalShares?.toLocaleString('id-ID') || '-'}
- Total Investasi: Rp ${positionCalc.totalInvestment?.toLocaleString('id-ID') || '-'}
- Entry Price Dasar: Rp ${positionCalc.entryPrice?.toLocaleString('id-ID') || '-'}
- Stop Loss: ${positionCalc.stopLossPct}%
- Rata-rata Entry: Rp ${positionCalc.avgEntryPrice ? Math.round(positionCalc.avgEntryPrice).toLocaleString('id-ID') : '-'}
- Risiko Maksimal: ${positionCalc.totalRiskPct?.toFixed(1)}% dari modal
- Porsi: ${positionCalc.portions?.length || 0} tranche
` : 'Kalkulator posisi tidak diisi.';

        const system = `Kamu adalah analis investasi pasar modal Indonesia yang berpengalaman.
Khusus menganalisis hasil backtest strategi teknikal saham IDX.
Balas HANYA dengan JSON valid (tanpa markdown, tanpa teks di luar JSON).
Gunakan bahasa Indonesia yang profesional dan objektif.`;

        const user = `Analisis hasil backtest saham ${ticker} (${strategyLabel || backtestResult.strategy}).

STATISTIK BACKTEST:
- Return Strategi: ${s.totalReturnPct?.toFixed(1)}% (vs Buy & Hold: ${s.buyHoldReturnPct?.toFixed(1)}%)
- CAGR: ${s.annualizedReturnPct?.toFixed(1)}%
- Win Rate: ${s.winRatePct?.toFixed(1)}% (${s.tradeCount} trade)
- Sharpe Ratio: ${s.sharpeRatio?.toFixed(2)}
- Profit Factor: ${s.profitFactor ?? '-'}
- Max Drawdown: ${s.maxDrawdownPct?.toFixed(1)}%
- Exposure: ${s.exposurePct?.toFixed(1)}%
- Rata-rata holding: ${s.avgDaysHeld?.toFixed(0)} hari
${posInfo}

10 TRADE TERAKHIR:
${tradesSummary}

Format jawaban (JSON ketat). Keluarkan objek JSON LANGSUNG sebagai teks biasa:
{
  "ringkasan": "2-3 kalimat interpretasi performa strategi vs buy & hold",
  "risiko_utama": "risiko terbesar dari strategi ini berdasarkan data",
  "risk_reward": "apakah risk/reward masuk akal untuk posisi yang dihitung",
  "saran_posisi": "saran jumlah lot dan manajemen risiko",
  "rekomendasi": "LAKUKAN|PERTIMBANGAN|HINDARI",
  "confidence": <angka 0-100>,
  "catatan": "catatan tambahan atau hal yang perlu diwaspadai"
}

Rekomendasi LAKUKAN jika: return > B&H, win rate > 50%, Sharpe > 0.5, DD terkendali.
Rekomendasi HINDARI jika: return < B&H, win rate < 40%, Sharpe < 0, DD > 30%.
Pertimbangan untuk kasus di antaranya.`;

        const { text, model } = await callModel([
            { role: 'system', content: system },
            { role: 'user', content: user },
        ]);

        let parsed = parseJsonLoose(text);
        let hasCore = parsed && typeof parsed === 'object' && (parsed.ringkasan || parsed.rekomendasi);
        if (!hasCore) {
            const loose = extractFieldsLoose(text);
            if (loose) { parsed = loose; hasCore = true; }
        }

        const payload = hasCore
            ? {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                analysis: {
                    ringkasan: parsed.ringkasan || '',
                    risiko_utama: parsed.risiko_utama || parsed.risiko || '',
                    risk_reward: parsed.risk_reward || parsed.riskReward || '',
                    saran_posisi: parsed.saran_posisi || parsed.saran || '',
                    rekomendasi: parsed.rekomendasi || 'PERTIMBANGAN',
                    confidence: parsed.confidence ?? 50,
                    catatan: parsed.catatan || '',
                },
            }
            : {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                analysis: { ringkasan: text.slice(0, 2000) },
                unstructured: true,
            };

        if (hasCore) cache.set(ck, { data: payload, ts: Date.now() });
        return Response.json(payload);
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
