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
                    const body: any = { model, messages, temperature: 0.3, max_tokens: 2400 };
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

    const { ticker, technicalData, strategyLabel, ranking } = body;

    if (!ticker) {
        return Response.json({ success: false, error: 'ticker diperlukan' }, { status: 400 });
    }

    const ck = `ai-entry|${ticker}|${ranking?.ranked?.[0]?.strategy ?? 'none'}|${ranking?.ranked?.[0]?.score ?? 0}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.ts < TTL) {
        return Response.json({ ...hit.data, cached: true });
    }

    try {
        const ne = technicalData?.nextEntry || {};
        const indicators = technicalData?.indicators || {};
        const rankingTop3 = ranking?.ranked?.slice(0, 3) || [];
        const rankingBottom3 = ranking?.ranked?.slice(-3) || [];
        const bestStrategy = ranking?.ranked?.[0] || null;

        const rankingSummary = rankingTop3.map((r: any, i: number) =>
            `${i + 1}. ${r.label}: return ${r.stats?.totalReturnPct?.toFixed(1)}%, winrate ${r.stats?.winRatePct?.toFixed(0)}%, Sharpe ${r.stats?.sharpeRatio?.toFixed(2)}, ${r.tradeCount} trade, skor ${r.score?.toFixed(0)}/100`
        ).join('\n');

        const worstSummary = rankingBottom3.length > 0
            ? rankingBottom3.map((r: any) =>
                `- ${r.label}: return ${r.stats?.totalReturnPct?.toFixed(1)}%, winrate ${r.stats?.winRatePct?.toFixed(0)}%`
            ).join('\n')
            : '';

        const system = `Kamu adalah analis teknikal pasar modal Indonesia yang ahli dalam menentukan area entry optimal.
Kamu menganalisis data teknikal DAN hasil backtest semua strategi untuk memberikan rekomendasi entry yang paling profitable.
Kamu tahu strategi mana yang paling cocok untuk saham ini berdasarkan data historis.
Balas HANYA dengan JSON valid (tanpa markdown, tanpa teks di luar JSON).
Gunakan bahasa Indonesia yang profesional.`;

        const user = `Tentukan area entry optimal untuk saham ${ticker} ${strategyLabel ? `(${strategyLabel})` : ''}.

DATA TEKNIKAL SAAT INI:
- Close terakhir: ${ne.lastClose ? `Rp ${Math.round(ne.lastClose).toLocaleString('id-ID')}` : 'tidak diketahui'}
- Level pemicu entry (next entry): ${ne.price ? `Rp ${Math.round(ne.price).toLocaleString('id-ID')}` : 'tidak ada'}
- Tipe sinyal: ${ne.kind || 'tidak diketahui'}
- Kondisi indikator: ${ne.indicatorNow || 'tidak diketahui'}
- Jarak ke level pemicu: ${ne.distancePct ? `${ne.distancePct.toFixed(1)}%` : 'tidak diketahui'}
- Support: ${indicators.support?.length ? indicators.support.join(', ') : 'tidak ada data'}
- Resistance: ${indicators.resistance?.length ? indicators.resistance.join(', ') : 'tidak ada data'}
- RSI(14): ${indicators.rsi14 ?? 'tidak diketahui'}
- SMA20: ${indicators.sma20 ? `Rp ${indicators.sma20.toLocaleString('id-ID')}` : 'tidak diketahui'}
- SMA50: ${indicators.sma50 ? `Rp ${indicators.sma50.toLocaleString('id-ID')}` : 'tidak diketahui'}

HASIL BACKTEST SEMUA STRATEGI (RANKING):
${rankingSummary}
${worstSummary ? `\nStrategi terburuk:\n${worstSummary}` : ''}
${bestStrategy ? `\nStrategi terbaik: ${bestStrategy.label} (skor ${bestStrategy.score?.toFixed(0)}/100)` : ''}

Berikan 3 area entry yang optimal berdasarkan data di atas, DAN rekomendasi alokasi modal per entry. Format jawaban (JSON ketat):
{
  "ringkasan": "1-2 kondisi teknikal saat ini",
  "entries": [
    {
      "label": "Entry Konservatif",
      "price": <harga dalam angka>,
      "alasan": "alasan singkat kenapa area ini bagus",
      "tipe": "konservatif"
    },
    {
      "label": "Entry Moderat",
      "price": <harga dalam angka>,
      "alasan": "alasan singkat kenapa area ini bagus",
      "tipe": "moderat"
    },
    {
      "label": "Entry Agresif",
      "price": <harga dalam angka>,
      "alasan": "alasan singkat kenapa area ini bagus",
      "tipe": "agresif"
    }
  ],
  "alokasi": [
    {"porsi": 1, "persentase": 40, "harga": <harga entry>, "label": "konservatif"},
    {"porsi": 2, "persentase": 35, "harga": <harga entry>, "label": "moderat"},
    {"porsi": 3, "persentase": 25, "harga": <harga entry>, "label": "agresif"}
  ],
  "stop_loss_saran": <harga stop loss yang disarankan>,
  "skema": "avg_down" | "avg_up" | "pyramid",
  "catatan": "catatan tambahan tentang risiko atau kondisi yang perlu diperhatikan"
}

Aturan:
- Gunakan data ranking strategi untuk menentukan entry paling optimal:
  * Jika strategi trend-following (SMA/EMA/Donchian) ranking atas → entry agresif dekat momentum
  * Jika strategi mean-reversion (RSI/Bollinger reversion) ranking atas → entry konservatif dekat oversold
  * Jika strategi breakout ranking atas → entry saat breakout confirmed
- Entry Konservatif: harga paling aman (dekat support / level pemicu), risiko paling rendah
- Entry Moderat: harga balance antara risiko dan peluang
- Entry Agresif: harga paling dekat dengan harga sekarang (breakout / momentum)
- Stop loss harus di bawah entry terendah, gunakan ATR atau support terdekat
- Semua harga harus positif dan masuk akal (tidak lebih dari 20% dari harga sekarang)
- Harga dibulatkan ke rupiah terdekat
- Alokasi: total persentase harus 100%, distribusi masuk akal:
  * Jika win rate strategi tinggi (>60%) → alokasi lebih besar di entry moderat
  * Jika win rate rendah (<45%) → alokasi lebih besar di entry konservatif
- Skema: avg_down jika harga entry menurun, avg_up jika entry naik, pyramid jika entry sama/bertahap
- Rekomendasi entry harus selaras dengan karakteristik strategi terbaik`;

        const { text, model } = await callModel([
            { role: 'system', content: system },
            { role: 'user', content: user },
        ]);

        let parsed = parseJsonLoose(text);
        const hasCore = parsed && typeof parsed === 'object' && Array.isArray(parsed.entries) && parsed.entries.length > 0;

        const payload = hasCore
            ? {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                bestStrategy: bestStrategy ? {
                    label: bestStrategy.label,
                    score: bestStrategy.score,
                    returnPct: bestStrategy.stats?.totalReturnPct,
                    winRatePct: bestStrategy.stats?.winRatePct,
                    sharpe: bestStrategy.stats?.sharpeRatio,
                } : null,
                recommendation: {
                    ringkasan: parsed.ringkasan || '',
                    entries: parsed.entries.map((e: any) => ({
                        label: e.label || '',
                        price: Math.round(e.price) || 0,
                        alasan: e.alasan || '',
                        tipe: e.tipe || 'moderat',
                    })),
                    alokasi: Array.isArray(parsed.alokasi)
                        ? parsed.alokasi.map((a: any) => ({
                            porsi: a.porsi || 1,
                            persentase: Math.round(a.persentase) || 33,
                            harga: Math.round(a.harga) || 0,
                            label: a.label || '',
                        }))
                        : [],
                    skema: parsed.skema || 'avg_down',
                    stop_loss_saran: Math.round(parsed.stop_loss_saran) || 0,
                    catatan: parsed.catatan || '',
                },
            }
            : {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                recommendation: { ringkasan: text.slice(0, 1000), entries: [] },
                unstructured: true,
            };

        if (hasCore) cache.set(ck, { data: payload, ts: Date.now() });
        return Response.json(payload);
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
