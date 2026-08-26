import { execFile } from "child_process";
import path from "path";

// Menjalankan scripts/idx-browser-fetch.cjs (Chromium headless) untuk menembus
// Cloudflare IDX. Dibatasi SATU job browser dalam satu waktu (antrean berurutan).

let chain: Promise<unknown> = Promise.resolve();

export function idxBrowserFetchText(url: string, timeoutMs = 120000): Promise<string> {
    const run = () =>
        new Promise<string>((resolve, reject) => {
            const script = path.join(process.cwd(), "scripts", "idx-browser-fetch.cjs");
            execFile(
                process.execPath,
                [script, url],
                { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 },
                (err, stdout) => {
                    if (err && !stdout) return reject(new Error(`browser-fetch gagal: ${err.message}`));
                    try {
                        const parsed = JSON.parse(String(stdout).trim());
                        if (parsed.error) return reject(new Error(parsed.error));
                        if (parsed.blocked) return reject(new Error("masih terhalang challenge Cloudflare"));
                        if (parsed.status !== 200) return reject(new Error(`HTTP ${parsed.status}`));
                        resolve(parsed.text);
                    } catch (e: any) {
                        reject(new Error(`output browser tidak valid: ${e.message}`));
                    }
                }
            );
        });

    const p = chain.then(run, run);
    chain = p.catch(() => {});
    return p as Promise<string>;
}
