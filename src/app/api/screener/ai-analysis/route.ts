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

async function callModel(messages: any[]): Promise<{ text: string; model: string }> {
    const errors: string[] = [];
    for (const model of MODEL_CHAIN) {
        for (const useJsonMode of [true, false]) {
            let aborted = false;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const body: any = { model, messages, temperature: 0.4, max_tokens: 2000 };
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
    cleaned = cleaned.replace(/\uFEFF/g, '').replace(/[\u00A0\u2007\u202F]/g, ' ').replace(/[\r\n\t]+/g, ' ');
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

    const { picks, totalScanned } = body;

    if (!picks || !Array.isArray(picks) || picks.length === 0) {
        return Response.json({ success: false, error: 'Picks array diperlukan' }, { status: 400 });
    }

    try {
        const picksText = picks.map((p: any, i: number) =>
            `${i + 1}. ${p.ticker} (score: ${p.score}, RSI: ${p.rsi}, entry: Rp${p.entry?.toLocaleString()}, SL: Rp${p.sl?.toLocaleString()}, TP: Rp${p.tp?.toLocaleString()}, signal: ${p.signal}, div: ${p.divergence})`
        ).join('\n');

        const system = `Kamu adalah analis saham pasar modal Indonesia yang ahli.
Kamu menganalisis hasil screener teknikal dan memberikan rekomendasi yang actionable.
Balas HANYA dengan JSON valid (tanpa markdown, tanpa teks di luar JSON).
Gunakan bahasa Indonesia yang profesional.`;

        const user = `Analisis ${picks.length} top picks dari screener (dari ${totalScanned} saham yang di-scan):

${picksText}

Berikan analisis dalam format JSON:
{
  "ringkasan": "2-3 kondisi teknikal keseluruhan",
  "top_pick": "Saham paling direkomendasikan dan alasannya",
  "risiko": "Risiko utama yang perlu diwaspadai",
  "saran_alokasi": "Saran distribusi modal (misal 40% konservatif, 35% moderat, 25% agresif)"
}

Aturan:
- Pilih 1-2 saham terbaik berdasarkan score, RSI, dan divergence
- Saran alokasi harus total 100%
- Risk/reward harus masuk akal
- Harga dalam Rupiah`;

        const { text, model } = await callModel([
            { role: 'system', content: system },
            { role: 'user', content: user },
        ]);

        let parsed = parseJsonLoose(text);
        const hasCore = parsed && typeof parsed === 'object' && (parsed.ringkasan || parsed.top_pick);

        const payload = hasCore
            ? {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                analysis: {
                    ringkasan: parsed.ringkasan || '',
                    top_pick: parsed.top_pick || '',
                    risiko: parsed.risiko || '',
                    saran_alokasi: parsed.saran_alokasi || '',
                },
            }
            : {
                success: true,
                source: 'ai',
                model,
                generatedAt: new Date().toISOString(),
                analysis: { ringkasan: text.slice(0, 1000) },
                unstructured: true,
            };

        return Response.json(payload);
    } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 502 });
    }
}
