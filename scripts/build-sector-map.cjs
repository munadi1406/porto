// Generator peta sektor IDX dari Yahoo Finance assetProfile.
// Jalankan sekali: node scripts/build-sector-map.cjs
// Hasil: src/lib/sectorData.json  ({ "BBCA": "Keuangan", ... })

const fs = require("fs");
const path = require("path");

const YahooFinance = require("yahoo-finance2").default;
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YAHOO_TO_ID = {
    "Financial Services": "Keuangan",
    "Technology": "Teknologi",
    "Communication Services": "Media",
    "Consumer Defensive": "Konsumen",
    "Consumer Cyclical": "Konsumen Siklis",
    "Industrials": "Industri",
    "Basic Materials": "Bahan Baku",
    "Energy": "Energi",
    "Utilities": "Infrastruktur",
    "Real Estate": "Properti",
    "Healthcare": "Kesehatan",
};

async function main() {
    const stockPath = path.join(__dirname, "..", "stocks-idx.json");
    const raw = JSON.parse(fs.readFileSync(stockPath, "utf8"));
    const list = Array.isArray(raw) ? raw : (raw.stocks || raw.data || []);
    const codes = (Array.isArray(list) ? list : [])
        .map(s => String(typeof s === "string" ? s : (s.ticker || s.code || s.symbol || "")))
        .map(c => c.replace(".JK", ""))
        .filter(c => /^[A-Z]/.test(c));
    console.log(`Total kode: ${codes.length}`);

    const result = {};
    let done = 0;
    let okCount = 0;
    const CONCURRENCY = 12;

    async function worker(queue) {
        while (queue.length > 0) {
            const code = queue.shift();
            try {
                const q = await Promise.race([
                    yf.quoteSummary(code + ".JK", { modules: ["assetProfile"] }),
                    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
                ]);
                const sec = q?.assetProfile?.sector;
                if (sec && sec !== "Unknown" && YAHOO_TO_ID[sec]) {
                    result[code] = YAHOO_TO_ID[sec];
                    okCount++;
                }
            } catch {}
            done++;
            if (done % 100 === 0) console.log(`Progress: ${done}/${codes.length} (ok: ${okCount})`);
        }
    }

    const queue = [...codes];
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

    const outPath = path.join(__dirname, "..", "src", "lib", "sectorData.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 1));
    console.log(`Selesai. Tersimpan ${Object.keys(result).length}/${codes.length} -> ${outPath}`);
    const dist = {};
    for (const v of Object.values(result)) dist[v] = (dist[v] || 0) + 1;
    console.log(JSON.stringify(dist, null, 1));
}

main();
