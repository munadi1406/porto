// Google Finance Scraper — extract data dari HTML Google Finance
// Tidak perlu API key, data dari halaman publik

const GF_BASE = "https://www.google.com/finance/quote";

interface GoogleFinanceData {
    source: "google";
    ticker: string;
    name: string;
    price: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    previousClose: number | null;
    volume: string | null;
    marketCap: string | null;
    pe: number | null;
    dividendYield: number | null;
    eps: number | null;
    week52High: number | null;
    week52Low: number | null;
    sharesOutstanding: string | null;
    employees: string | null;
}

function cleanNumber(s: string): number | null {
    const cleaned = s.replace(/[^\d.,-]/g, "").replace(/,/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

function parseLargeNumber(s: string): number | null {
    if (!s) return null;
    const m = s.match(/([\d.]+)\s*(T|M|B|K)?/i);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const suffix = (m[2] || "").toUpperCase();
    const multipliers: Record<string, number> = { T: 1e12, M: 1e6, B: 1e9, K: 1e3 };
    return num * (multipliers[suffix] || 1);
}

export async function fetchGoogleFinance(ticker: string): Promise<GoogleFinanceData | null> {
    try {
        const res = await fetch(`${GF_BASE}/${ticker}:IDX`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return null;
        const html = await res.text();
        if (html.length < 10000) return null;

        // Extract name
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const name = titleMatch ? titleMatch[1].replace(/ Stock Price.*$/, "").replace(/ - Google Finance$/, "").trim() : ticker;

        // Extract price (first IDR value)
        const priceMatch = html.match(/IDR\s*([\d,]+\.?\d*)/);
        const price = priceMatch ? cleanNumber(priceMatch[1]) : null;

        // Extract all label:value pairs using SwQK7 (label) and dO6ijd (value) pattern
        const labelValueRegex = /SwQK7">(.*?)<\/div><div class="dO6ijd">(.*?)<\/div>/g;
        const pairs: Record<string, string> = {};
        let match;
        while ((match = labelValueRegex.exec(html)) !== null) {
            pairs[match[1].trim()] = match[2].trim();
        }

        // Extract specific fields
        const openRaw = pairs["Open"] || "";
        const highRaw = pairs["High"] || "";
        const lowRaw = pairs["Low"] || "";
        const peRaw = pairs["P/E ratio"] || "";
        const divRaw = pairs["Dividend"] || "";
        const epsRaw = pairs["EPS"] || "";
        const high52Raw = pairs["52-wk high"] || "";
        const low52Raw = pairs["52-wk low"] || "";
        const mktCapRaw = pairs["Mkt. cap"] || "";
        const volRaw = pairs["Volume"] || "";
        const avgVolRaw = pairs["Avg. vol."] || "";
        const sharesRaw = pairs["Shares outstanding"] || "";
        const empRaw = pairs["No. of employees"] || "";

        // Parse IDR values
        const parseIDR = (s: string): number | null => {
            const m2 = s.match(/IDR\s*([\d,]+)/);
            return m2 ? cleanNumber(m2[1]) : null;
        };

        // Calculate previous close and change
        const open = parseIDR(openRaw);
        const high = parseIDR(highRaw);
        const low = parseIDR(lowRaw);
        const prevClose = price && open ? Math.round((price + open) / 2) : null; // Approximate
        const change = price && prevClose ? price - prevClose : null;
        const changePercent = change && prevClose ? (change / prevClose) * 100 : null;

        return {
            source: "google",
            ticker,
            name,
            price,
            open,
            high,
            low,
            previousClose: prevClose,
            volume: volRaw,
            marketCap: mktCapRaw,
            pe: peRaw ? parseFloat(peRaw) : null,
            dividendYield: divRaw ? parseFloat(divRaw.replace("%", "")) : null,
            eps: epsRaw ? cleanNumber(epsRaw) : null,
            week52High: parseIDR(high52Raw),
            week52Low: parseIDR(low52Raw),
            sharesOutstanding: sharesRaw,
            employees: empRaw,
        };
    } catch {
        return null;
    }
}
