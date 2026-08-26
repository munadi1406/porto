// Fetch URL IDX lewat Chromium asli (menembus challenge Cloudflare).
// Pemakaian: node scripts/idx-browser-fetch.cjs "<url>"
// Output: satu baris JSON {status, text, blocked} atau {error}

const { chromium } = require("playwright");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function main() {
    const target = process.argv[2];
    if (!target) {
        console.log(JSON.stringify({ error: "URL wajib diisi" }));
        process.exit(1);
    }

    const browser = await chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
    });
    try {
        const ctx = await browser.newContext({
            userAgent: UA,
            viewport: { width: 1366, height: 768 },
            locale: "id-ID",
            timezoneId: "Asia/Jakarta",
        });
        // Sembunyikan jejak webdriver
        await ctx.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        });
        const page = await ctx.newPage();

        // 1) Warm-up: buka halaman utama IDX agar challenge Cloudflare diselesaikan
        try {
            await page.goto("https://www.idx.co.id", { waitUntil: "domcontentloaded", timeout: 60000 });
        } catch {}
        const start = Date.now();
        while (Date.now() - start < 45000) {
            let title = "";
            try { title = await page.title(); } catch {}
            if (!/just a moment|attention required|checking your browser/i.test(title)) break;
            await page.waitForTimeout(2500);
        }

        // 2) Panggil API target dari dalam konteks halaman (memakai cookie cf_clearance)
        const result = await page.evaluate(async (url) => {
            try {
                const res = await fetch(url, { headers: { Accept: "application/json, text/plain, */*" } });
                const text = await res.text();
                return {
                    status: res.status,
                    text: text.slice(0, 800000),
                    blocked: /just a moment|cf-error|attention required/i.test(text.slice(0, 600)),
                };
            } catch (e) {
                return { error: String(e && e.message ? e.message : e) };
            }
        }, target);

        console.log(JSON.stringify(result));
    } finally {
        await browser.close().catch(() => {});
    }
}

main().catch(e => {
    console.log(JSON.stringify({ error: e.message }));
    process.exit(1);
});
