// Probe beberapa kandidat endpoint IDX broker per-saham dalam SATU sesi browser.
// Pemakaian: node scripts/probe-idx.cjs <STOCK> <DATE>

const { chromium } = require("playwright");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function main() {
    const stock = process.argv[2] || "BBCA";
    const date = process.argv[3] || "20260821";

    const candidates = [
        `/primary/TradingSummary/GetBrokerSummary?length=3&start=0&date=${date}&stockCode=${stock}`,
        `/primary/TradingSummary/GetBrokerSummary?length=3&start=0&date=${date}&code=${stock}`,
        `/primary/StockData/GetBrokerSummary?length=3&start=0&date=${date}&stockCode=${stock}`,
        `/primary/TradingSummary/GetBrokerDetail?length=3&start=0&date=${date}&stockCode=${stock}`,
        `/primary/TradingSummary/GetBrokerSummaryByStock?length=3&start=0&date=${date}&stockCode=${stock}`,
        `/primary/TradingSummary/GetStockBrokerSummary?length=3&start=0&date=${date}&stockCode=${stock}`,
        `/primary/TradingSummary/GetBrokerSummaryRegular?length=3&start=0&date=${date}&stockCode=${stock}`,
    ];

    const browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
    try {
        const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 768 }, locale: "id-ID", timezoneId: "Asia/Jakarta" });
        await ctx.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
        const page = await ctx.newPage();
        try { await page.goto("https://www.idx.co.id", { waitUntil: "domcontentloaded", timeout: 60000 }); } catch {}
        const t0 = Date.now();
        while (Date.now() - t0 < 45000) {
            let title = ""; try { title = await page.title(); } catch {}
            if (!/just a moment|attention required/i.test(title)) break;
            await page.waitForTimeout(2500);
        }

        for (const path of candidates) {
            const r = await page.evaluate(async (u) => {
                try {
                    const res = await fetch(u, { headers: { Accept: "application/json" } });
                    const text = await res.text();
                    return { status: res.status, text: text.slice(0, 400), blocked: /just a moment|cf-error/i.test(text.slice(0, 300)) };
                } catch (e) { return { status: 0, text: String(e.message) }; }
            }, `https://www.idx.co.id${path}`);
            console.log(`\n### ${path}`);
            console.log(`status=${r.status} blocked=${r.blocked}`);
            console.log(r.text.replace(/\s+/g, " ").slice(0, 320));
            await page.waitForTimeout(800);
        }
    } finally {
        await browser.close().catch(() => {});
    }
}

main().catch(e => { console.error("FATAL", e.message); process.exit(1); });
