// Prospectus Analyzer Service — Batched AI calls for token efficiency
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

// Load system prompt from skill file (server-side only)
function loadSystemPrompt(): string {
    try {
        const fs = require('fs') as typeof import('fs');
        const path = require('path') as typeof import('path');
        const skillPath = path.join(process.cwd(), '.agents', 'skills', 'prospectus-analysis', 'SKILL.md');
        if (fs.existsSync(skillPath)) {
            return fs.readFileSync(skillPath, 'utf-8');
        }
    } catch { /* fallback */ }
    return 'You are an IPO prospectus analyst for IDX. Extract structured data. Respond ONLY with valid JSON, no markdown, no code blocks.';
}

const SYSTEM_PROMPT = loadSystemPrompt();

async function callAI(prompt: string, maxTokens = 1500): Promise<string> {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.05,
            max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`DeepSeek ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

function extractJSFromResponse(raw: string): any {
    let clean = raw.trim();
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) clean = match[1].trim();
    return JSON.parse(clean);
}

export interface ProspectusAnalysis {
    id: string;
    fileName: string;
    timestamp: number;
    emitent: {
        name: string;
        ticker: string;
        sector: string;
        business: string;
        ipoPrice: number;
        sharesOffered: number;
        listingDate: string;
        board: string;
    };
    financials: {
        eps: number;
        per: number;
        pbv: number;
        roe: number;
        der: number;
        revenueGrowth: number;
        profitGrowth: number;
        totalAssets: number;
        totalEquity: number;
    };
    araProjection: {
        day1: number;
        day2: number;
        day3: number;
        day4: number;
        day5: number;
        maxGain: string;
        description: string;
    };
    fairValue: number;
    upside: number;
    priceTarget: {
        month1: number;
        month3: number;
        year1: number;
    };
    recommendation: 'BUY' | 'HOLD' | 'SELL';
    score: number;
    reasoning: string;
    strength: string[];
    risk: string[];
}

// Extract relevant text chunks from prospectus
function extractChunks(text: string): { summary: string; financial: string; risk: string } {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Find key sections by keywords
    const summaryEnd = Math.min(
        text.length,
        ...['LAPORAN KEUANGAN', 'NERACA', 'LAPORAN LABA RUGI', 'ARUS KAS', 'RISIKO', 'KETENTUAN']
            .map(k => { const i = text.indexOf(k); return i > 0 ? i : text.length; })
    );

    const summary = text.substring(0, Math.min(summaryEnd, 4000));

    // Financial section: find balance sheet / income statement area
    const finStart = Math.max(
        0,
        ...['LAPORAN KEUANGAN', 'NERACA', 'LABA RUGI', 'RASIO KEUANGAN', 'EPS', 'PER']
            .map(k => { const i = text.indexOf(k); return i > 0 ? i : -1; })
    );
    const financial = finStart > 0 ? text.substring(finStart, finStart + 4000) : '';

    // Risk section
    const riskStart = Math.max(
        0,
        ...['RISIKO USAHA', 'RISIKO INVESTASI', 'FAKTOR RISIKO']
            .map(k => { const i = text.indexOf(k); return i > 0 ? i : -1; })
    );
    const risk = riskStart > 0 ? text.substring(riskStart, riskStart + 3000) : '';

    return { summary, financial, risk };
}

export async function analyzeProspectus(
    text: string,
    fileName: string,
    onProgress?: (step: string, progress: number, eta: number) => void
): Promise<ProspectusAnalysis> {
    const startTime = Date.now();
    const reportProgress = (step: string, progress: number) => {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = progress / Math.max(elapsed, 1);
        const remaining = speed > 0 ? (100 - progress) / speed : 30;
        onProgress?.(step, progress, Math.round(remaining));
    };

    const chunks = extractChunks(text);
    reportProgress('Mengekstrak informasi emiten...', 10);

    // Pass 1: Extract company info & IPO details (small prompt)
    const infoPrompt = `Dari teks prospektus berikut, ekstrak data JSON ini (hanya JSON):
{
  "name": "Nama perusahaan",
  "ticker": "Kode saham",
  "sector": "Sektor",
  "business": "Deskripsi bisnis utama (1 kalimat)",
  "ipoPrice": Harga IPO (angka, contoh: 4500),
  "sharesOffered": Jumlah saham ditawarkan (angka),
  "listingDate": "Tanggal listing atau perkiraan",
  "board": "Papan pencatatan (Utama/Pengembangan/Akselerasi)"
}

TEKS:
${chunks.summary}`;

    const infoRaw = await callAI(infoPrompt, 800);
    const info = extractJSFromResponse(infoRaw);
    reportProgress('Data emiten terkumpul. Menganalisis keuangan...', 35);

    const ipoPrice = info.ipoPrice || 0;
    const board = info.board || 'Utama';
    const araRate = board === 'Akselerasi' ? 0.20 : 0.35;

    // Pass 2: Extract financial data (only if financial section exists)
    let financials = { eps: 0, per: 0, pbv: 0, roe: 0, der: 0, revenueGrowth: 0, profitGrowth: 0, totalAssets: 0, totalEquity: 0 };
    if (chunks.financial) {
        try {
            const finPrompt = `Dari data keuangan berikut, ekstrak JSON (hanya angka, tanpa satuan):
{
  "eps": Laba per saham,
  "per": PER (angka),
  "pbv": PBV (angka),
  "roe": ROE dalam persen (contoh: 18.5),
  "der": DER (angka),
  "revenueGrowth": Pertumbuhan pendapatan dalam %,
  "profitGrowth": Pertumbuhan laba dalam %,
  "totalAssets": Total aset,
  "totalEquity": Total ekuitas
}

DATA KEUANGAN:
${chunks.financial}`;
            const finRaw = await callAI(finPrompt, 800);
            financials = extractJSFromResponse(finRaw);
        } catch { /* use defaults */ }
    }
    reportProgress('Data keuangan terkumpul. Menyusun rekomendasi...', 60);

    // Pass 3: Recommendation (compact context)
    const recContext = [
        `Nama: ${info.name || ''}`,
        `Ticker: ${info.ticker || ''}`,
        `Sektor: ${info.sector || ''}`,
        `Bisnis: ${info.business || ''}`,
        `IPO: Rp${ipoPrice}`,
        `Saham ditawarkan: ${info.sharesOffered || 0}`,
        `Papan: ${board}`,
        `EPS: ${financials.eps}, PER: ${financials.per}, PBV: ${financials.pbv}`,
        `ROE: ${financials.roe}%, DER: ${financials.der}`,
        `Revenue Growth: ${financials.revenueGrowth}%`,
        `Risk section: ${chunks.risk.substring(0, 2000)}`,
    ].join('\n');

    const recPrompt = `Berdasarkan data prospektus IPO berikut, berikan rekomendasi dalam JSON:

${recContext}

{
  "fairValue": Harga wajar dalam Rupiah,
  "upside": Persentase upside/downside (angka, contoh: 25.5),
  "priceTarget": { "month1": 0, "month3": 0, "year1": 0 },
  "recommendation": "BUY/HOLD/SELL",
  "score": Skor 0-100,
  "reasoning": "Penjelasan 3-4 kalimat",
  "strength": ["Kekuatan 1", "Kekuatan 2", "Kekuatan 3"],
  "risk": ["Risiko 1", "Risiko 2", "Risiko 3"]
}`;

    let rec = { fairValue: 0, upside: 0, priceTarget: { month1: 0, month3: 0, year1: 0 },
        recommendation: 'HOLD' as const, score: 50, reasoning: '', strength: [] as string[], risk: [] as string[] };

    try {
        const recRaw = await callAI(recPrompt, 1500);
        rec = extractJSFromResponse(recRaw);
    } catch { /* use defaults */ }

    // Calculate ARA locally
    const araProjection = {
        day1: Math.round(ipoPrice * (1 + araRate)),
        day2: Math.round(ipoPrice * (1 + araRate) ** 2),
        day3: Math.round(ipoPrice * (1 + araRate) ** 3),
        day4: Math.round(ipoPrice * (1 + araRate) ** 4),
        day5: Math.round(ipoPrice * (1 + araRate) ** 5),
        maxGain: `${((1 + araRate) ** 5 - 1) * 100 > 100 ? '100+' : (((1 + araRate) ** 5 - 1) * 100).toFixed(0)}%`,
        description: `Papan ${board} — estimasi ${(araRate * 100).toFixed(0)}% ARA per hari. 5 hari ARA berturut-turut: Rp${Math.round(ipoPrice * (1 + araRate) ** 5).toLocaleString()}.`,
    };

    return {
        id: Math.random().toString(36).substr(2, 9),
        fileName,
        timestamp: Date.now(),
        emitent: {
            name: info.name || fileName,
            ticker: info.ticker || '',
            sector: info.sector || '',
            business: info.business || '',
            ipoPrice,
            sharesOffered: info.sharesOffered || 0,
            listingDate: info.listingDate || '',
            board,
        },
        financials: {
            eps: financials.eps || 0,
            per: financials.per || 0,
            pbv: financials.pbv || 0,
            roe: financials.roe || 0,
            der: financials.der || 0,
            revenueGrowth: financials.revenueGrowth || 0,
            profitGrowth: financials.profitGrowth || 0,
            totalAssets: financials.totalAssets || 0,
            totalEquity: financials.totalEquity || 0,
        },
        araProjection,
        fairValue: rec.fairValue || 0,
        upside: rec.upside || 0,
        priceTarget: {
            month1: rec.priceTarget?.month1 || 0,
            month3: rec.priceTarget?.month3 || 0,
            year1: rec.priceTarget?.year1 || 0,
        },
        recommendation: rec.recommendation || 'HOLD',
        score: rec.score || 50,
        reasoning: rec.reasoning || '',
        strength: rec.strength || [],
        risk: rec.risk || [],
    };
}
