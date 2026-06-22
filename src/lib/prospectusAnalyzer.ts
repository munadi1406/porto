// Prospectus Analyzer Service
// Parses PDF prospektus via Firecrawl or fallback, then analyzes via DeepSeek

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

async function callAI(prompt: string): Promise<string> {
    const model = 'deepseek/deepseek-chat';
    const apiKey = OPENROUTER_API_KEY || DEEPSEEK_API_KEY;
    const baseUrl = OPENROUTER_API_KEY
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.deepseek.com/v1/chat/completions';

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };
    if (OPENROUTER_API_KEY) {
        headers['HTTP-Referer'] = 'https://porto.app';
        headers['X-Title'] = 'Porto Prospectus Analyzer';
    }

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a professional IPO prospectus analyst for Indonesia Stock Exchange (IDX). Analyze the prospectus text and provide structured data.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`AI API ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
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
        maxGain: number;
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

export async function analyzeProspectus(text: string, fileName: string): Promise<ProspectusAnalysis> {
    const prompt = `Anda adalah analis prospektus saham Indonesia profesional.
Analisis teks prospektus berikut dan berikan output JSON **TANPA MARKDOWN, TANPA \`\`\`json, hanya JSON murni**:

---

${text.substring(0, 15000)}

---

{
  "emitent": {
    "name": "Nama perusahaan",
    "ticker": "Kode saham (BBCA, BBRI, dll)",
    "sector": "Sektor",
    "business": "Deskripsi bisnis utama",
    "ipoPrice": Harga IPO dalam Rupiah (angka, tanpa Rp),
    "sharesOffered": Jumlah saham ditawarkan,
    "listingDate": "Tanggal listing (DD/MM/YYYY)",
    "board": "Papan pencatatan (Utama/Pengembangan/Akselerasi)"
  },
  "financials": {
    "eps": Laba per saham (angka),
    "per": Price to Earnings Ratio (angka),
    "pbv": Price to Book Value (angka),
    "roe": Return on Equity dalam persen (angka, contoh: 18.5 berarti 18.5%),
    "der": Debt to Equity Ratio (angka),
    "revenueGrowth": Pertumbuhan pendapatan dalam persen,
    "profitGrowth": Pertumbuhan laba dalam persen,
    "totalAssets": Total aset dalam Rupiah,
    "totalEquity": Total ekuitas dalam Rupiah
  },
  "araProjection": {
    "day1": Harga setelah ARA hari 1,
    "day2": Harga setelah ARA hari 2 (jika ARA berturut-turut),
    "day3": Harga setelah ARA hari 3,
    "day4": Harga setelah ARA hari 4,
    "day5": Harga setelah ARA hari 5,
    "maxGain": "Persentase gain maksimum dalam %",
    "description": "Penjelasan proyeksi ARA dalam 1-2 kalimat"
  },
  "fairValue": Harga wajar dalam Rupiah berdasarkan analisis fundamental (angka),
  "upside": Persentase upside/downside dari harga IPO ke fair value (angka),
  "priceTarget": {
    "month1": Target harga 1 bulan,
    "month3": Target harga 3 bulan,
    "year1": Target harga 1 tahun
  },
  "recommendation": "BUY atau HOLD atau SELL",
  "score": Skor numerik 0-100,
  "reasoning": "Penjelasan rekomendasi dalam 3-4 kalimat",
  "strength": ["Kekuatan 1", "Kekuatan 2", "Kekuatan 3"],
  "risk": ["Risiko 1", "Risiko 2", "Risiko 3"]
}`;

    const raw = await callAI(prompt);

    // Clean response: remove markdown code blocks if any
    let clean = raw.trim();
    const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) clean = jsonMatch[1].trim();

    const parsed = JSON.parse(clean);

    // Build ARA projection with IDX rules (35%)
    const ipo = parsed.emitent?.ipoPrice || 0;
    const ara = parsed.araProjection || {};
    const araRate = parsed.emitent?.board === 'Akselerasi' ? 0.20 : 0.35;

    const analysis: ProspectusAnalysis = {
        id: Math.random().toString(36).substr(2, 9),
        fileName,
        timestamp: Date.now(),
        emitent: {
            name: parsed.emitent?.name || '',
            ticker: parsed.emitent?.ticker || '',
            sector: parsed.emitent?.sector || '',
            business: parsed.emitent?.business || '',
            ipoPrice: ipo,
            sharesOffered: parsed.emitent?.sharesOffered || 0,
            listingDate: parsed.emitent?.listingDate || '',
            board: parsed.emitent?.board || 'Utama',
        },
        financials: {
            eps: parsed.financials?.eps || 0,
            per: parsed.financials?.per || 0,
            pbv: parsed.financials?.pbv || 0,
            roe: parsed.financials?.roe || 0,
            der: parsed.financials?.der || 0,
            revenueGrowth: parsed.financials?.revenueGrowth || 0,
            profitGrowth: parsed.financials?.profitGrowth || 0,
            totalAssets: parsed.financials?.totalAssets || 0,
            totalEquity: parsed.financials?.totalEquity || 0,
        },
        araProjection: {
            day1: ara.day1 || Math.round(ipo * (1 + araRate)),
            day2: ara.day2 || Math.round(ipo * (1 + araRate) ** 2),
            day3: ara.day3 || Math.round(ipo * (1 + araRate) ** 3),
            day4: ara.day4 || Math.round(ipo * (1 + araRate) ** 4),
            day5: ara.day5 || Math.round(ipo * (1 + araRate) ** 5),
            maxGain: ara.maxGain || `${(araRate * 5 * 100).toFixed(0)}%`,
            description: ara.description || `Estimasi ${araRate * 100}% ARA per hari (papan ${parsed.emitent?.board || 'Utama'})`,
        },
        fairValue: parsed.fairValue || 0,
        upside: parsed.upside || 0,
        priceTarget: {
            month1: parsed.priceTarget?.month1 || 0,
            month3: parsed.priceTarget?.month3 || 0,
            year1: parsed.priceTarget?.year1 || 0,
        },
        recommendation: parsed.recommendation || 'HOLD',
        score: parsed.score || 50,
        reasoning: parsed.reasoning || '',
        strength: parsed.strength || [],
        risk: parsed.risk || [],
    };

    return analysis;
}
