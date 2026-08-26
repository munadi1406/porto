// News providers for stock news. Uses RSS feeds (Yahoo Finance, Google News).
export interface NewsItem {
    title: string;
    link: string;
    source: string;
    published: string;
    publishTime: number;
    summary: string;
}

function parseRSS(xml: string): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const get = (tag: string) => {
            const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
            if (!m) return '';
            return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        };
        const title = get('title');
        const link = get('link');
        const source = get('source') || get('creator') || 'Yahoo Finance';
        const rawDate = get('pubDate');
        const summary = get('description');
        if (!title || !link) continue;
        const publishTime = rawDate ? new Date(rawDate).getTime() : 0;
        items.push({
            title,
            link: link.startsWith('http') ? link : `https://finance.yahoo.com${link}`,
            source,
            published: rawDate || '',
            publishTime: isNaN(publishTime) ? 0 : publishTime,
            summary,
        });
    }
    return items;
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<string> {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36' },
        signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

function yahooRSSUrl(symbol: string): string {
    return `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(symbol)}`;
}

function googleNewsRSSUrl(query: string): string {
    const q = encodeURIComponent(query);
    return `https://news.google.com/rss/search?hl=id&gl=ID&ceid=ID:id&q=${q}`;
}

export async function getStockNews(symbol: string, query?: string): Promise<NewsItem[]> {
    const cleanSymbol = symbol.replace(/\.JK$/, '');
    const failures: string[] = [];

    // 1. Yahoo Finance RSS for symbol
    try {
        const xml = await fetchWithTimeout(yahooRSSUrl(symbol));
        const items = parseRSS(xml);
        if (items.length > 0) return items.slice(0, 20);
        failures.push('yahoo-empty');
    } catch { failures.push('yahoo'); }

    // 2. Google News RSS (ID) with ticker label
    const labels = ['saham', 'stock', 'emiten'].map(l => `${cleanSymbol} ${l}`);
    for (const label of labels) {
        try {
            const xml = await fetchWithTimeout(googleNewsRSSUrl(label));
            const items = parseRSS(xml);
            if (items.length > 0) return items.slice(0, 20);
            failures.push(`google-${label}`);
        } catch { failures.push(`google-${label}`); }
    }

    // 3. Bare ticker query
    try {
        const xml = await fetchWithTimeout(googleNewsRSSUrl(cleanSymbol));
        const items = parseRSS(xml);
        if (items.length > 0) return items.slice(0, 20);
        failures.push('google-bare');
    } catch { failures.push('google-bare'); }

    throw new Error(`Semua sumber berita tidak dapat dijangkau (${failures.join(', ')})`);
}
