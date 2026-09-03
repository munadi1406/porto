import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/axelia-orchestrator';

const BLOCKLIST = new Set(['NAMA','ANDA','SIAPA','KOK','AKU','SAYA','KAMU','HALO','HAI','HELLO','APA','YANG','DAN','UNTUK','DENGAN','MASIH','NGAWUR','GINI','YAK','DAH','SIH','KAH','APA','BAGAIMANA','BISA','TIDAK','JADI','JUGA','TOLONG','BANTU','MOHON','TERIMA','KASIH','YA','TANYA','JAWAB','MINTA','KENAPA','KAPAN','DIMANA','APAKAH','GAK','SIH','AKU','SEHAT','SEkarang','MENDING','ATAU','BUAT','DONG','WORTH','GAK','PORTOFOLIO','SAHAM','ANALISIS','ANALISA']);

function isHelpQuestion(text: string): boolean {
    const l = text.toLowerCase();
    return /bisa bantu|tolong bantu|mohon bantu|butuh bantuan|help me|bisa tidak|bisa nggak|bantu saya/.test(l);
}
function isIdentityQuestion(text: string): boolean {
    const l = text.toLowerCase();
    return /nama anda|siapa (kamu|anda|lo|lu)|kamu siapa|anda siapa|identitas|axelia/i.test(l);
}
function extractTicker(text: string): string | null {
    if (isHelpQuestion(text) || isIdentityQuestion(text)) return null;
    const m = text.toUpperCase().match(/\b([A-Z]{3,4})\b/g);
    if (!m) return null;
    for (const t of m) if (!BLOCKLIST.has(t) && /^[A-Z]{3,4}$/.test(t) && !['AI','API','IHSG','JKSE'].includes(t)) return t;
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const { message, contextTicker, history } = await req.json();
        const userText: string = (message || '').trim();
        if (!userText) return Response.json({ success:false, error:'message required' }, {status:400});

        if (isIdentityQuestion(userText)) {
            return Response.json({ success:true, via:'identity', text: 'Saya **Axelia** — AI agent Porto (mimo-v2.5 chain). Dibuat untuk bantu analisis saham IDX pakai data live Yahoo/IDX + engine `quant.ts` (RSI/MACD/MA, backtest 8 strategi). Tanya “Analisis BBCA” atau “RSI TLKM?” — saya akan tarik chart real-time dulu baru jawab.' });
        }
        if (isHelpQuestion(userText)) {
            return Response.json({ success:true, via:'identity', text: 'Tentu bisa! Saya Axelia siap bantu. Tanya harga (“Harga BBCA”), teknikal (“RSI TLKM 14 hari terakhir”), fundamental (“PER BBCA”), atau ranking strategi (“Strategi terbaik untuk BUMI”). Sebutkan kode saham 4 huruf ya.' });
        }

        // Agent loop — Plan → Act → Observe → Repeat (max 5 tool calls, paralel where possible)
        const ticker = extractTicker(userText) || (contextTicker && /^[A-Z]{3,4}$/.test(contextTicker) ? contextTicker : null);
        const result = await runAgent(userText, ticker || contextTicker || null, history || []);

        // Map orchestrator steps to sparkline/badge if ticker was involved
        let sparkline: number[] | undefined;
        let badge: any = undefined;
        // Try to enrich with quick local badge if agent didn't provide one and we have ticker
        if (result.via === 'agent' || result.via === 'agent-fallback') {
            // steps already contain tool results with closes etc — we can derive badge server-side if needed
            // For now, let client fallback badge handle it; just forward steps for transparansi
        }

        return Response.json({ success:true, via: result.via, text: result.answer, steps: result.steps, ticker: ticker || undefined, meta: `mimo-v2.5 chain • ${result.steps.length} tool(s)` });
    } catch (e:any) {
        return Response.json({ success:false, error: e.message }, { status:500 });
    }
}
