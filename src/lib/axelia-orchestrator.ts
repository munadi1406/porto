// Agent Orchestrator — Plan → Act → Observe → Repeat, max 5 tool calls, paralel where independent
import * as Tools from './axelia-tools';

const MODEL_CHAIN = ['mimo-v2.5', 'ox-alpha-free'] as const;
const BASE = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1';
const KEY = process.env.OPENCODE_API_KEY;

const MAX_TURNS = 5;

const TOOL_MAP: Record<string, Function> = {
    getPriceHistory: Tools.getPriceHistory,
    getTechnicalIndicators: Tools.getTechnicalIndicators,
    getFundamentals: Tools.getFundamentals,
    getRiskProfile: Tools.getRiskProfile,
    rankStrategies: Tools.rankStrategies,
    runScreener: Tools.runScreener,
    getMyPortfolio: Tools.getMyPortfolio,
    getStockNews: Tools.getStockNews,
    getBrokerSummary: Tools.getBrokerSummary,
    getIndexOverview: Tools.getIndexOverview,
    getMarketBreadth: Tools.getMarketBreadth,
};

function buildToolPrompt(): string {
    return `Kamu Axelia — AI agent Porto. Kamu punya TOOLS berikut (JSON function-calling). Untuk jawab pertanyaan yang butuh data, kamu HARUS panggil tool dulu, jangan halusinasi.

TOOLS (pilih 1-3 sekaligus jika paralel, max ${MAX_TURNS} turn):
- getPriceHistory(ticker, period="3mo") 
- getTechnicalIndicators(ticker)
- getFundamentals(ticker)
- getRiskProfile(ticker)
- rankStrategies(ticker, years=2)
- runScreener(filters) — filters: {rsi:"<30", sharia:true}
- getMyPortfolio() — holdings user (personal)
- getStockNews(ticker)
- getBrokerSummary(ticker?)
- getIndexOverview / getMarketBreadth

Aturan:
- Jawab dengan JSON: {"tool_calls": [{"tool":"nama","args":{}}]} ATAU {"answer":"jawaban final"}
- Jika butuh data, panggil tool dulu. Jika data sudah cukup, langsung answer.
- Paralel jika tidak dependen, sekuensial jika butuh hasil sebelumnya.
- Bahasa Indonesia, ringkas, sertakan disclaimer bukan saran keuangan.`;
}

async function callLLM(messages: any[]): Promise<string> {
    for (const model of MODEL_CHAIN) {
        try {
            const r = await fetch(`${BASE}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
                body: JSON.stringify({ model, messages, temperature: 0.35, max_tokens: 1200 }),
                signal: AbortSignal.timeout(15000),
            });
            if (!r.ok) continue;
            const j: any = await r.json();
            const txt = j?.choices?.[0]?.message?.content?.trim();
            if (txt) return txt;
        } catch {}
    }
    return '';
}

function parseToolCalls(text: string): { tool: string; args: any }[] | null {
    // Support XML <tool_call> with tool_name/tool_input or function_name/arguments, and <invoke name=>
    let xmlMatches = [...text.matchAll(/<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<tool_input>([\s\S]*?)<\/tool_input>\s*<\/tool_call>/g)];
    if (!xmlMatches.length) xmlMatches = [...text.matchAll(/<tool_call>\s*<function_name>(.*?)<\/function_name>\s*<arguments>([\s\S]*?)<\/arguments>\s*<\/tool_call>/g)] as any;
    if (xmlMatches.length) {
        return xmlMatches.map(m => {
            let args: any = {};
            try { args = JSON.parse(m[2].trim()); } catch { try { args = JSON.parse(m[2].replace(/'/g,'"')); } catch {} }
            return { tool: m[1].trim(), args };
        });
    }
    // Anthropic style: <invoke name="tool"><parameter name="x">y</parameter></invoke> or <arg name="x">
    const invokeMatches = [...text.matchAll(/<invoke name="([^"]+)">([\s\S]*?)<\/invoke>/g)];
    if (invokeMatches.length) {
        return invokeMatches.map(m => {
            const tool = m[1].trim();
            const inner = m[2];
            const args: any = {};
            for (const pm of inner.matchAll(/<(?:parameter|arg) name="([^"]+)">([\s\S]*?)<\/(?:parameter|arg)>/g)) {
                const k = pm[1].trim();
                let v: any = pm[2].trim();
                try { v = JSON.parse(v); } catch {}
                // Remove surrounding quotes if JSON parse failed
                if (typeof v === 'string' && v.startsWith('"') && v.endsWith('"')) try { v = JSON.parse(v); } catch {}
                args[k] = typeof v === 'string' ? v.replace(/^"|"$/g, '') : v;
            }
            if (!Object.keys(args).length) {
                const argTag = inner.match(/<arguments>([\s\S]*?)<\/arguments>/);
                if (argTag) try { Object.assign(args, JSON.parse(argTag[1].trim())); } catch {}
            }
            return { tool, args };
        });
    }
    try {
        const m = text.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
        const jsonStr = m ? m[0] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const obj = JSON.parse(jsonStr);
        if (Array.isArray(obj.tool_calls)) return obj.tool_calls;
        if (obj.tool) return [obj];
    } catch {}
    const t = text.match(/"tool"\s*:\s*"(\w+)"/);
    if (t) {
        const argsMatch = text.match(/"args"\s*:\s*(\{[^}]+\})/);
        let args = {};
        try { args = argsMatch ? JSON.parse(argsMatch[1]) : {}; } catch {}
        return [{ tool: t[1], args }];
    }
    return null;
}

export interface AgentStep { tool: string; args: any; result: any; }

export async function runAgent(userMessage: string, contextTicker: string | null, history: { role: string; text: string }[]): Promise<{ answer: string; steps: AgentStep[]; via: string }> {
    const steps: AgentStep[] = [];
    let messages: any[] = [
        { role: 'system', content: buildToolPrompt() },
        ...history.slice(-6).map(h => ({ role: h.role, content: h.text })),
        { role: 'user', content: `Context ticker: ${contextTicker || '-'} | Pertanyaan: ${userMessage}` },
    ];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        const llmText = await callLLM(messages);
        if (!llmText) break;

        // Check if LLM wants to answer directly
        if (llmText.includes('"answer"') || (!llmText.includes('tool_calls') && !llmText.includes('"tool"'))) {
            try {
                const obj = JSON.parse(llmText.slice(llmText.indexOf('{'), llmText.lastIndexOf('}') + 1));
                if (obj.answer) return { answer: obj.answer, steps, via: 'agent' };
            } catch {}
            // If not JSON, treat as final answer
            if (!llmText.includes('tool_calls')) return { answer: llmText, steps, via: 'agent' };
        }

        const calls = parseToolCalls(llmText);
        if (!calls || !calls.length) {
            // LLM returned answer without tool_calls wrapper
            return { answer: llmText, steps, via: 'agent' };
        }

        // Execute tools (paralel)
        const results = await Promise.all(calls.map(async c => {
            const fn = TOOL_MAP[c.tool];
            if (!fn) return { tool: c.tool, args: c.args, result: { ok: false, error: 'unknown tool' } };
            const res = await (fn as any)(...(Object.values(c.args || {}) as any[]));
            return { tool: c.tool, args: c.args, result: res };
        }));
        steps.push(...results.map(r => ({ tool: r.tool, args: r.args, result: r.result })));

        // Feed back to LLM
        messages.push({ role: 'assistant', content: llmText });
        messages.push({ role: 'user', content: `TOOL RESULTS:\n${JSON.stringify(results.map(r => ({ tool: r.tool, result: r.result })), null, 2)}\n\nJika data cukup, jawab dengan {"answer":"..."} . Jika masih butuh data lain, panggil tool lagi.` });

        // If last tool was getMyPortfolio and user asked portfolio health, we may have enough
        if (results.every(r => r.result?.ok === false)) break;
    }

    // Final synthesis if loop exhausted — use available data, don't claim no data if at least one tool succeeded
    const hasAnySuccess = steps.some(s => s.result?.ok);
    const fallbackPrompt = hasAnySuccess
        ? `Buat jawaban akhir Bahasa Indonesia dari tool results di atas untuk pertanyaan: "${userMessage}". Gunakan data yang tersedia (abaikan tool yang gagal). Beri insight teknikal/fundamental dari data yang ada, jangan katakan tidak dapat mengambil data. Akhiri dengan disclaimer bukan saran keuangan.`
        : `Buat jawaban akhir Bahasa Indonesia dari tool results di atas untuk pertanyaan: "${userMessage}". Jika data tidak cukup, jujur katakan dan sarankan ticker spesifik.`;
    messages.push({ role: 'user', content: fallbackPrompt });
    const finalText = await callLLM(messages);
    if (finalText) return { answer: finalText, steps, via: 'agent-fallback' };
    // Local synthesis fallback if LLM still fails — build from tool results directly
    const okSteps = steps.filter(s => s.result?.ok);
    if (okSteps.length) {
        let local = `**Ringkasan dari ${okSteps.length} tool:**\n`;
        for (const s of okSteps) {
            local += `- **${s.tool}** (${JSON.stringify(s.args)}): ${JSON.stringify(s.result.data).slice(0, 400)}\n`;
        }
        return { answer: local + `\n\n_Disintesis lokal (mimo-v2.5 timeout) — data live di atas._`, steps, via: 'local-fallback' };
    }
    return { answer: 'Maaf, saya belum dapat data cukup untuk menjawab. Coba tanyakan dengan ticker spesifik (mis. Analisis BBCA).', steps, via: 'agent-fallback' };
}
