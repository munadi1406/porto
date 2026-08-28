import { NextResponse } from 'next/server';
import { getStockNews } from '@/lib/news';

// Enriched IHSG news with Serper + Firecrawl + AI impact
// - Hemat kredit: cache 30 menit, 1x Serper/search per request, max 3x Firecrawl scrape per 30 menit, 1x AI batch untuk semua artikel
const SERPER_KEY = process.env.SERPER_API_KEY || process.env.SERP_API_KEY || '';
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || '';
const OPENCODE_KEY = process.env.OPENCODE_API_KEY;
const OPENCODE_BASE = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1';
const MODEL = 'mimo-v2.5'; // strict per request: hanya mimo-v2.5

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const scrapeCache = new Map<string, { text: string; ts: number }>();
const TTL = 30 * 60 * 1000; // 30 menit hemat kredit Serper/Firecrawl/AI
const SCRAPE_TTL = 30 * 60 * 1000;

type Impact = 'bullish' | 'bearish' | 'neutral';

function heuristicImpact(title: string, summary: string): { impact: Impact; confidence: number; reason: string } {
    const text = (title + ' ' + summary).toLowerCase();
    const bullish = ['naik', 'menguat', 'rally', 'bullish', 'positif', 'optimis', 'rekor', 'hijau', 'untung', 'laba naik', 'pertumbuhan', 'stimulus', 'suku bunga turun', 'the fed dovish', 'net buy', 'asing borong', 'geopolitik mereda', 'gencatan senjata', 'harga emas stabil', 'rupiah menguat', 'bi rate turun', 'ekspor naik', 'surplus'];
    const bearish = ['turun', 'anjlok', 'melemah', 'bearish', 'negatif', 'pesimis', 'merah', 'rugi', 'koreksi', 'krisis', 'inflasi', 'suku bunga naik', 'the fed hawkish', 'net sell', 'asing jual', 'resesi', 'perang', 'konflik', 'geopolitik memanas', 'harga emas anjlok', 'harga minyak anjlok', 'rupiah melemah', 'bi rate naik', 'phk', 'defisit'];
    let b = 0, be = 0;
    for (const w of bullish) if (text.includes(w)) b++;
    for (const w of bearish) if (text.includes(w)) be++;
    if (b > be && b >= 1) return { impact: 'bullish', confidence: Math.min(65 + b * 10, 85), reason: `Kata kunci positif (${b})` };
    if (be > b && be >= 1) return { impact: 'bearish', confidence: Math.min(65 + be * 10, 85), reason: `Kata kunci negatif (${be})` };
    return { impact: 'neutral', confidence: 55, reason: 'Tidak ada sinyal arah jelas' };
}

async function serperSearch(query: string): Promise<{ title: string; link: string; snippet: string; source?: string }[]> {
    if (!SERPER_KEY) return [];
    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, gl: 'id', hl: 'id', num: 8 }),
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const j: any = await res.json();
    const org = (j.organic || []) as any[];
    const news = (j.news || []) as any[];
    const all = [...news, ...org];
    return all.slice(0, 8).map((r: any) => ({
        title: r.title || '',
        link: r.link || r.url || '',
        snippet: r.snippet || r.description || '',
        source: r.source || r.site || 'Serper',
    })).filter(r => r.title && r.link);
}

async function firecrawlScrape(url: string): Promise<string> {
    if (!FIRECRAWL_KEY) return '';
    const cached = scrapeCache.get(url);
    if (cached && Date.now() - cached.ts < SCRAPE_TTL) return cached.text;
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FIRECRAWL_KEY}` },
        body: JSON.stringify({ url, onlyMainContent: true, maxLength: 3000, formats: ['markdown'] }),
        signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return '';
    const j: any = await res.json();
    const text = j.data?.markdown || j.data?.content || j.markdown || '';
    const sliced = String(text).slice(0, 3000);
    if (sliced) scrapeCache.set(url, { text: sliced, ts: Date.now() });
    return sliced;
}

async function aiBatchImpactAndSummary(items: { title: string; snippet: string }[]): Promise<{ impact: Impact; confidence: number; reason: string; tickers: string[]; category: string; summary: string }[]> {
    if (!OPENCODE_KEY || !items.length) return items.map((it) => ({ impact: 'neutral', confidence: 50, reason: 'AI skip', tickers: [], category: 'IHSG', summary: it.snippet.slice(0, 140) } as any));
    // Hemat AI: 1 call untuk impact + summary per artikel (pakai mimo-v2.5 saja, per request user)
    // PENTING: summary WAJIB beda dari title, harus parafrase & tambah insight, jangan copy-paste title verbatim
    const prompt = `Kamu analis pasar modal Indonesia. Untuk setiap BERITA beri dampak ke IHSG + ringkasan BERBEDA DARI JUDUL.

Berikan JSON array (panjang ${items.length}) urutan sama, tiap elemen:
{ "impact":"bullish"|"bearish"|"neutral", "confidence":0-100, "reason":"1 kalimat dampak ke IHSG", "tickers":["BBCA"], "category":"IHSG"|"GEOPOLITIK"|"EMAS"|"ENERGI"|"MONETER"|"GLOBAL", "summary":"WAJIB 1-2 kalimat Bahasa Indonesia, JANGAN copy title verbatim, parafrase inti berita + sebut angka/level/tanggal/implikasi ke IHSG" }

ATURAN KETAT SUMMARY:
- JANGAN pernah copy title persis. Parafrase dengan kalimat baru.
- Contoh title "IHSG Sesi I Naik 0,42 Persen ke 6.548" -> summary harus seperti "Indeks menguat 27 poin di sesi pagi ke 6.548, didorong aksi beli saham big cap. Kenaikan terbatas menandakan konsolidasi menjelang penutupan."
- Sebut insight/konteks, bukan ulang judul.

Aturan dampak:
- bullish = dorong IHSG naik (geopolitik mereda, emas stabil, Fed dovish, BI turun, rupiah menguat, stimulus, laba naik, net buy)
- bearish = tekan IHSG (perang memanas, emas anjlok, Fed hawkish, BI naik, rupiah melemah, inflasi, resesi, net sell)
- neutral = tidak jelas

Berita:
${items.map((it, i) => `${i + 1}. Title: ${it.title}\nSnippet: ${it.snippet.slice(0, 260)}`).join('\n\n')}

Jawab HANYA JSON array.`;

    // Helper repair truncated JSON ala ai-analysis
    const repairJson = (s: string): string | null => {
        let inStr = false, esc=false; const closers:string[]=[];
        for (const ch of s){ if(esc){esc=false;continue;} if(ch==='\\'&&inStr){esc=true;continue;} if(ch==='"'){inStr=!inStr;continue;} if(inStr) continue; if(ch==='[') closers.push(']'); else if(ch==='{') closers.push('}'); else if(ch===']'&&closers[closers.length-1]===']') closers.pop(); else if(ch==='}'&&closers[closers.length-1]==='}') closers.pop(); }
        let out=s.replace(/[\r\n\t]+/g,' ').trimEnd(); if(inStr) out+='"'; out=out.replace(/,(\s*[}\]])/g,'$1'); while(closers.length) out+=closers.pop(); return out;
    };
    try {
        const r = await fetch(`${OPENCODE_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCODE_KEY}` },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: 'Kamu analis IHSG. Jawab HANYA JSON array valid.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 2800,
            }),
            signal: AbortSignal.timeout(20000),
        });
        if (!r.ok) throw new Error(`AI ${r.status}`);
        const j: any = await r.json();
        const raw = j.choices?.[0]?.message?.content || '';
        let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        let arr: any = null;
        try {
            const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
            if (s>=0 && e>s) arr = JSON.parse(cleaned.slice(s, e+1));
        } catch {}
        if (!arr) {
            const repaired = repairJson(cleaned);
            if (repaired) { try { const s=repaired.indexOf('['), e=repaired.lastIndexOf(']'); if(s>=0&&e>s) arr=JSON.parse(repaired.slice(s,e+1)); } catch {} }
        }
        if (Array.isArray(arr) && arr.length) {
            // Jika terpotong, pad dengan heuristic agar panjang tetap
            while (arr.length < items.length) {
                const idx = arr.length;
                const h = heuristicImpact(items[idx].title, items[idx].snippet);
                arr.push({ impact: h.impact, confidence: h.confidence, reason: h.reason, tickers:[], category:'IHSG', summary: items[idx].snippet.slice(0,140) });
            }
            return arr.slice(0, items.length).map((x: any, i:number) => {
                let summary = String(x.summary || x.reason || '').slice(0, 280).trim();
                const titleNorm = items[i].title.toLowerCase().trim();
                // Cegah AI copy title verbatim — jika summary == title atau 90% mirip, buat parafrase fallback
                if (summary.toLowerCase() === titleNorm || summary.toLowerCase().includes(titleNorm.slice(0, Math.min(40, titleNorm.length)))) {
                    const h = heuristicImpact(items[i].title, items[i].snippet);
                    summary = `${items[i].title.split(' - ')[0].slice(0, 80)} — ${h.reason}. ${items[i].snippet.slice(0, 80)}`.slice(0, 220);
                }
                return {
                    impact: (['bullish', 'bearish', 'neutral'].includes(x.impact) ? x.impact : 'neutral') as Impact,
                    confidence: Math.min(95, Math.max(0, Number(x.confidence) || 60)),
                    reason: String(x.reason || '').slice(0, 120),
                    tickers: Array.isArray(x.tickers) ? x.tickers.slice(0, 3).map((t: string) => String(t).toUpperCase().replace('.JK', '')) : [],
                    category: (['IHSG','GEOPOLITIK','EMAS','ENERGI','MONETER','GLOBAL'].includes(x.category) ? x.category : 'IHSG'),
                    summary,
                };
            });
        }
    } catch (e) {
        console.warn('[AI] mimo-v2.5 batch failed, fallback heuristic', e);
    }
    // Fallback heuristic — buat summary dari title agar tidak tampil <a href...>
    return items.map(it => {
        const h = heuristicImpact(it.title, it.snippet);
        // Bersihkan snippet jika isinya link HTML
        let cleanSnippet = (it.snippet || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!cleanSnippet || cleanSnippet.startsWith('http') || cleanSnippet.includes('news.google.com')) {
            cleanSnippet = it.title;
        }
        // Ringkas manual 1 kalimat
        const summary = cleanSnippet.slice(0, 180) + (cleanSnippet.length > 180 ? '...' : '');
        return { impact: h.impact, confidence: h.confidence, reason: h.reason, tickers: [], category: 'IHSG', summary };
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || 'IHSG';
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 5);
    const cacheKey = `ihsg:v4:${symbols.join(',')}`;

        const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < TTL) {
        // invaldasi cache lama yang berisi <a href...>
        const hasBad = hit.data?.data?.some((d: any) => String(d.summary || '').includes('<a href'));
        if (!hasBad) return NextResponse.json({ ...hit.data, cached: true });
    }

    try {
        let rawNews: { title: string; link: string; snippet: string; source?: string; publishTime?: number }[] = [];

        // 1. Serper — hemat 1 call, query luas: IHSG + geopolitik + emas + moneter
        if (SERPER_KEY) {
            try {
                const extra = symbols.filter(s => s !== 'IHSG').slice(0, 2).join(' ');
                // Query luas mencakup faktor penggerak IHSG
                const queries = [
                    `IHSG IDX Bursa Efek Indonesia ${extra} saham`,
                    `geopolitik harga emas Fed suku bunga rupiah minyak global pasar saham`,
                ];
                // Hemat: 1 query utama + 1 query makro hanya jika masih kurang — batch 2 max, cache 30 menit
                const first = await serperSearch(queries[0]);
                rawNews = first.map(r => ({ title: r.title, link: r.link, snippet: r.snippet, source: r.source, publishTime: Date.now() }));
                if (rawNews.length < 6) {
                    const second = await serperSearch(queries[1]).catch(() => []);
                    const seen = new Set(rawNews.map(r => r.link));
                    for (const r of second) if (!seen.has(r.link)) { rawNews.push({ title: r.title, link: r.link, snippet: r.snippet, source: r.source, publishTime: Date.now() }); seen.add(r.link); }
                }
            } catch {}
        }

        // 2. Fallback RSS lokal (gratis) + topik makro via Google News RSS
        if (rawNews.length < 8) {
            try {
                const rssSymbols = [...symbols.slice(0, 2), 'GEOPOLITIK', 'EMAS', 'FED'];
                const fallback = await Promise.all(
                    rssSymbols.slice(0, 4).map(s => getStockNews(s).catch(() => []))
                );
                const flat = fallback.flat().map(n => ({
                    title: n.title,
                    link: n.link,
                    snippet: (n.summary || '').slice(0, 200),
                    source: n.source,
                    publishTime: n.publishTime,
                }));
                const seen = new Set(rawNews.map(r => r.link));
                for (const f of flat) if (!seen.has(f.link)) { rawNews.push(f); seen.add(f.link); }
            } catch {}
        }

        // Dedup & slice — hemat Firecrawl & AI
        const seenLink = new Set<string>();
        rawNews = rawNews.filter(r => {
            if (!r.title || !r.link || seenLink.has(r.link)) return false;
            seenLink.add(r.link); return true;
        }).slice(0, 10);

        if (!rawNews.length) {
            return NextResponse.json({ success: true, data: [], meta: { serper: !!SERPER_KEY, firecrawl: !!FIRECRAWL_KEY } });
        }

        // 3. Firecrawl scrape HANYA top 2-3 berita yang snippet terlalu pendek — hemat kredit
        const needScrape = rawNews
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => (r.snippet || '').length < 80)
            .slice(0, 3);

        if (FIRECRAWL_KEY && needScrape.length) {
            for (const { r } of needScrape) {
                const scraped = await firecrawlScrape(r.link).catch(() => '');
                if (scraped) r.snippet = scraped.slice(0, 300);
                // Jeda kecil hemat rate limit
                await new Promise(res => setTimeout(res, 400));
            }
        }

        // 4. AI batch impact + summary per artikel — 1 call mimo-v2.5 untuk semua (hemat)
        // Bersihkan snippet HTML agar AI tidak melihat <a href...> mentah
        const aiInputs = rawNews.map(r => {
            let s = (r.snippet || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (!s || s.startsWith('http') || s.includes('news.google.com/rss/articles')) s = r.title;
            return { title: r.title, snippet: s.slice(0, 280) };
        });
        const impacts = await aiBatchImpactAndSummary(aiInputs);

        const enriched = rawNews.map((r, i) => {
            const imp: any = impacts[i] || heuristicImpact(r.title, r.snippet || '');
            return {
                title: r.title,
                link: r.link,
                source: r.source || 'Berita',
                publishTime: r.publishTime || Date.now(),
                summary: imp.summary || r.snippet || '',
                rawSnippet: r.snippet || '',
                impact: imp.impact,
                confidence: imp.confidence,
                reason: imp.reason,
                tickers: imp.tickers || [],
                category: imp.category || 'IHSG',
            };
        });

        const payload = {
            success: true,
            data: enriched,
            meta: {
                serper: !!SERPER_KEY,
                firecrawl: !!FIRECRAWL_KEY,
                ai: !!OPENCODE_KEY,
                cachedAt: new Date().toISOString(),
            },
        };
        cache.set(cacheKey, { data: payload, ts: Date.now() });
        return NextResponse.json(payload);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 502 });
    }
}
