const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

function loadSystemPrompt(): string {
    try {
        const fs = require('fs') as typeof import('fs');
        const path = require('path') as typeof import('path');
        const skillPath = path.join(process.cwd(), '.agents', 'skills', 'prospectus-analysis', 'SKILL.md');
        if (fs.existsSync(skillPath)) {
            return fs.readFileSync(skillPath, 'utf-8');
        }
    } catch { }
    return 'You are an IPO prospectus analyst for IDX. Extract structured data. Respond ONLY with valid JSON, no markdown, no code blocks.';
}

const SYSTEM_PROMPT = loadSystemPrompt();

const SECTION_KEYWORDS = [
    'PENAWARAN UMUM',
    'KETERANGAN TENTANG PERSEROAN',
    'RIWAYAT SINGKAT PERSEROAN',
    'STRUKTUR PERMODALAN',
    'KEBIJAKAN DIVIDEN',
    'PENGGUNAAN DANA HASIL PENAWARAN UMUM',
    'PENGGUNAAN DANA',
    'IKHTISAR DATA KEUANGAN PENTING',
    'IKHTISAR DATA KEUANGAN',
    'LAPORAN KEUANGAN',
    'NERACA',
    'LAPORAN LABA RUGI',
    'LAPORAN ARUS KAS',
    'RASIO KEUANGAN',
    'FAKTOR RISIKO',
    'RISIKO USAHA',
    'RISIKO INVESTASI',
    'KEBIJAKAN PEMBAGIAN DIVIDEN',
    'KETENTUAN PEMESANAN',
    'PENJAMIN EMISI',
    'LEMBAGA DAN PROFESI PENUNJANG',
    'TATA CARA PEMESANAN',
    'PENYEBARLUASAN PROSPEKTUS',
];

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
        signal: AbortSignal.timeout(60000),
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
        totalRevenue: number;
        netProfit: number;
        totalAssets: number;
        totalEquity: number;
        totalLiabilities: number;
        currentRatio: number;
        grossProfitMargin?: number;
        netProfitMargin?: number;
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

interface Section {
    name: string;
    start: number;
    end: number;
    text: string;
}

function findSection(text: string, keywords: string[]): number {
    for (const k of keywords) {
        const i = text.indexOf(k);
        if (i >= 0) return i;
    }
    return -1;
}

function findAllSectionStarts(text: string): { name: string; start: number }[] {
    const found: { name: string; start: number }[] = [];
    const upper = text.toUpperCase();

    for (const keyword of SECTION_KEYWORDS) {
        let searchFrom = 0;
        while (true) {
            const i = upper.indexOf(keyword, searchFrom);
            if (i < 0) break;
            // Avoid false positives in running text — only match if at line start or preceded by whitespace
            const prev = i > 0 ? text[i - 1] : '\n';
            if (prev === '\n' || prev === ' ' || prev === '\r') {
                found.push({ name: keyword, start: i });
            }
            searchFrom = i + keyword.length;
        }
    }
    return found.sort((a, b) => a.start - b.start);
}

function extractSections(text: string, maxCharsPerSection = 20000): Section[] {
    const headers = findAllSectionStarts(text);
    if (headers.length === 0) {
        // Fallback: send first part of text
        return [{
            name: 'AWAL DOKUMEN',
            start: 0,
            end: Math.min(text.length, 40000),
            text: text.substring(0, Math.min(text.length, 40000)),
        }];
    }

    const sections: Section[] = [];
    for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        const nextH = i + 1 < headers.length ? headers[i + 1] : null;
        const end = nextH ? nextH.start : text.length;
        const sectionText = text.substring(h.start, end);
        sections.push({
            name: h.name,
            start: h.start,
            end,
            text: sectionText.substring(0, maxCharsPerSection),
        });
    }
    return sections;
}

function getSectionText(sections: Section[], nameContains: string, maxChars = 25000): string {
    for (const s of sections) {
        if (s.name.includes(nameContains)) return s.text.substring(0, maxChars);
    }
    return '';
}

function combineSections(sections: Section[], nameFilters: string[], maxChars = 30000): string {
    let combined = '';
    for (const s of sections) {
        if (nameFilters.some(f => s.name.includes(f))) {
            combined += `\n=== ${s.name} ===\n${s.text}`;
            if (combined.length >= maxChars) break;
        }
    }
    return combined.substring(0, maxChars);
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

    const sections = extractSections(text);
    console.log(`[Prospectus] Mulai analisis: ${fileName}, teks ${text.length} chars, ${sections.length} section ditemukan`);
    sections.forEach(s => console.log(`  Section: ${s.name} (${s.text.length} chars)`));
    reportProgress(`📄 Prospektus: ${sections.length} section terdeteksi`, 5);

    // Pass 1: Company overview + IPO details + business description
    reportProgress('🔍 Pass 1/3: Menganalisis data emiten & IPO...', 10);
    const infoText = combineSections(sections, [
        'PENAWARAN UMUM', 'KETERANGAN TENTANG PERSEROAN',
        'RIWAYAT SINGKAT', 'STRUKTUR PERMODALAN',
        'PENGGUNAAN DANA', 'KEBIJAKAN DIVIDEN',
        'KEBIJAKAN PEMBAGIAN DIVIDEN',
    ], 25000);

    const infoPrompt = `Ekstrak data perusahaan dari teks prospektus IPO berikut. Berikan JSON SAJA:

{
  "name": "Nama lengkap perusahaan",
  "ticker": "Kode saham IDX (4 huruf, contoh: BBCA)",
  "sector": "Sektor industri",
  "business": "Deskripsi bisnis utama (1 kalimat)",
  "ipoPrice": Harga penawaran IPO per saham (angka rupiah, contoh: 4500),
  "sharesOffered": Jumlah saham yang ditawarkan (angka),
  "listingDate": "Tanggal pencatatan di BEI (format: YYYY-MM-DD atau teks)",
  "board": "Papan pencatatan (Utama/Pengembangan/Akselerasi)",
  "useOfFunds": "Penjelasan singkat penggunaan dana IPO (1 kalimat)",
  "totalSharesPostIPO": "Jumlah saham beredar setelah IPO",
  "underwriter": "Nama penjamin emisi"
}

TEKS PROSPEKTUS:
${infoText}`;

    console.log(`[Prospectus] Pass 1: DeepSeek (${infoText.length} chars)...`);
    const infoRaw = await callAI(infoPrompt, 1000);
    let info: any = {};
    try { info = extractJSFromResponse(infoRaw); } catch { info = { name: '', ticker: '' }; }
    console.log(`[Prospectus] Pass 1 selesai: ${info.name || '(?)'} (${info.ticker || '?'})`);
    reportProgress(`✅ Emiten: ${info.name || info.ticker || 'terkumpul'}`, 30);

    const ipoPrice = info.ipoPrice || 0;
    const board = info.board || 'Utama';
    const araRate = board === 'Akselerasi' ? 0.20 : 0.35;

    // Pass 2: Financial analysis — send financial sections
    let financials: Record<string, any> = { eps: 0, per: 0, pbv: 0, roe: 0, der: 0, revenueGrowth: 0, profitGrowth: 0, totalAssets: 0, totalEquity: 0, totalRevenue: 0, netProfit: 0, totalLiabilities: 0, currentRatio: 0, grossProfitMargin: undefined, netProfitMargin: undefined };
    const finText = combineSections(sections, [
        'IKHTISAR DATA KEUANGAN', 'LAPORAN KEUANGAN',
        'NERACA', 'LAPORAN LABA RUGI',
        'LAPORAN ARUS KAS', 'RASIO KEUANGAN',
    ], 25000);

    if (finText.trim().length > 100) {
        reportProgress('📊 Pass 2/3: Menganalisis laporan keuangan...', 40);
        console.log(`[Prospectus] Pass 2: DeepSeek (${finText.length} chars)...`);

        const finPrompt = `Ekstrak data keuangan dari teks prospektus berikut. Berikan JSON SAJA (hanya angka, tanpa satuan):

{
  "totalRevenue": Pendapatan usaha tahun terakhir (dalam Rupiah),
  "netProfit": Laba bersih tahun terakhir (dalam Rupiah),
  "totalAssets": Total aset (dalam Rupiah),
  "totalLiabilities": Total liabilitas (dalam Rupiah),
  "totalEquity": Total ekuitas (dalam Rupiah),
  "eps": Laba per saham (dalam Rupiah),
  "per": PER (Price to Earnings Ratio),
  "pbv": PBV (Price to Book Value),
  "roe": ROE dalam persen (contoh: 18.5 artinya 18.5%),
  "der": DER (Debt to Equity Ratio),
  "currentRatio": Rasio lancar (Current Ratio),
  "revenueGrowth": Pertumbuhan pendapatan YoY dalam %,
  "profitGrowth": Pertumbuhan laba YoY dalam %,
  "grossProfitMargin": Margin laba kotor dalam %,
  "netProfitMargin": Margin laba bersih dalam %
}

DATA KEUANGAN:
${finText}`;

        try {
            const finRaw = await callAI(finPrompt, 1200);
            const finData = extractJSFromResponse(finRaw);
            financials = { ...financials, ...finData };
            console.log(`[Prospectus] Pass 2: EPS=${financials.eps}, PER=${financials.per}, ROE=${financials.roe}%, Revenue=${financials.totalRevenue}`);
        } catch (e: any) {
            console.warn(`[Prospectus] Pass 2 gagal: ${e.message}`);
        }
        reportProgress('✅ Data keuangan terkumpul', 55);
    } else {
        console.log('[Prospectus] Pass 2: Skip (tidak ada data keuangan terdeteksi)');
        reportProgress('⚠️ Data keuangan tidak ditemukan', 55);
    }

    // Pass 3: Risk analysis + final recommendation
    reportProgress('🧠 Pass 3/3: Analisis risiko & rekomendasi final...', 60);
    const riskText = getSectionText(sections, 'RISIKO', 15000);

    const recContext = [
        `Nama: ${info.name || ''}`,
        `Ticker: ${info.ticker || ''}`,
        `Sektor: ${info.sector || ''}`,
        `Bisnis: ${info.business || ''}`,
        `IPO Price: Rp${ipoPrice.toLocaleString()}`,
        `Saham Ditawarkan: ${(info.sharesOffered || 0).toLocaleString()}`,
        `Total Saham setelah IPO: ${(info.totalSharesPostIPO || 0).toLocaleString()}`,
        `Papan: ${board}`,
        `Penjamin Emisi: ${info.underwriter || '-'}`,
        `Penggunaan Dana: ${info.useOfFunds || '-'}`,
        ``,
        `Pendapatan: Rp${(financials.totalRevenue || 0).toLocaleString()}`,
        `Laba Bersih: Rp${(financials.netProfit || 0).toLocaleString()}`,
        `Total Aset: Rp${(financials.totalAssets || 0).toLocaleString()}`,
        `Total Ekuitas: Rp${(financials.totalEquity || 0).toLocaleString()}`,
        `EPS: ${financials.eps}`,
        `PER: ${financials.per}`,
        `PBV: ${financials.pbv}`,
        `ROE: ${financials.roe}%`,
        `DER: ${financials.der}`,
        `Current Ratio: ${financials.currentRatio}`,
        `Revenue Growth: ${financials.revenueGrowth}%`,
        `Profit Growth: ${financials.profitGrowth}%`,
        `Gross Margin: ${(financials as any).grossProfitMargin || '-'}%`,
        `Net Margin: ${(financials as any).netProfitMargin || '-'}%`,
    ].join('\n');

    const riskSection = riskText
        ? `\n\nFAKTOR RISIKO (dari prospektus):\n${riskText.substring(0, 15000)}`
        : '\n\n(Tidak ada section risiko terpisah — gunakan analisis sendiri)';

    const fullContext = recContext + riskSection;

    const recPrompt = `Analisis prospektus IPO berikut dan berikan rekomendasi investasi. Output JSON SAJA:

DATA EMITEN & KEUANGAN:
${fullContext}

{
  "fairValue": Harga wajar dalam Rupiah (0 jika tidak bisa dihitung),
  "upside": ((fairValue - ipoPrice) / ipoPrice * 100), 0 jika tidak bisa,
  "priceTarget": { "month1": 0, "month3": 0, "year1": 0 },
  "recommendation": "BUY/HOLD/SELL",
  "score": Skor 0-100 berdasarkan scoring matrix,
  "reasoning": "Analisis 4-5 kalimat dalam Bahasa Indonesia: jelaskan valuation, prospek bisnis, kondisi keuangan, dan risiko utama",
  "strength": ["1-3 keunggulan kompetitif atau faktor positif", "Gunakan [] jika tidak ada data"],
  "risk": ["1-3 risiko investasi utama", "Gunakan [] jika tidak ada data"]
}

Gunakan scoring matrix:
- PER: < 15x = bagus, 15-25x = wajar, > 25x = mahal
- ROE: > 15% = sangat baik, 10-15% = baik, < 10% = kurang
- DER: < 1x = aman, 1-2x = wajar, > 2x = berisiko
- Growth: > 10% = baik, 5-10% = cukup, < 5% = rendah

JANGAN gunakan placeholder seperti "Tidak ada data". Jika tidak ada data, gunakan [].`;

    let rec = {
        fairValue: 0, upside: 0,
        priceTarget: { month1: 0, month3: 0, year1: 0 },
        recommendation: 'HOLD' as const, score: 50,
        reasoning: '', strength: [] as string[], risk: [] as string[],
    };

    console.log(`[Prospectus] Pass 3: DeepSeek (${fullContext.length} chars)...`);
    try {
        const recRaw = await callAI(recPrompt, 2000);
        rec = extractJSFromResponse(recRaw);
        console.log(`[Prospectus] Pass 3: ${rec.recommendation} (score=${rec.score})`);
    } catch (e: any) {
        console.warn(`[Prospectus] Pass 3 gagal: ${e.message}`);
    }
    reportProgress('✅ Analisis selesai. Menghitung proyeksi...', 80);

    reportProgress('📈 Proyeksi ARA & fair value...', 90);

    const araProjection = {
        day1: Math.round(ipoPrice * (1 + araRate)),
        day2: Math.round(ipoPrice * (1 + araRate) ** 2),
        day3: Math.round(ipoPrice * (1 + araRate) ** 3),
        day4: Math.round(ipoPrice * (1 + araRate) ** 4),
        day5: Math.round(ipoPrice * (1 + araRate) ** 5),
        maxGain: `${((1 + araRate) ** 5 - 1) * 100 > 100 ? '100+' : (((1 + araRate) ** 5 - 1) * 100).toFixed(0)}%`,
        description: `Papan ${board} — ${(araRate * 100).toFixed(0)}% ARA/hari. 5 hari: Rp${Math.round(ipoPrice * (1 + araRate) ** 5).toLocaleString()}.`,
    };

    reportProgress('✅ Selesai!', 100);
    console.log(`[Prospectus] ✅ ${info.name || fileName} | ${rec.recommendation} score=${rec.score} | ${Math.round((Date.now() - startTime) / 1000)}s`);

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
            totalRevenue: financials.totalRevenue || 0,
            netProfit: financials.netProfit || 0,
            totalAssets: financials.totalAssets || 0,
            totalEquity: financials.totalEquity || 0,
            totalLiabilities: financials.totalLiabilities || 0,
            currentRatio: financials.currentRatio || 0,
            grossProfitMargin: financials.grossProfitMargin,
            netProfitMargin: financials.netProfitMargin,
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
