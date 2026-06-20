import fs from 'fs';
import path from 'path';

export function getAllStocks(): string[] {
    try {
        const jsonPath = path.join(process.cwd(), 'stocks-idx.json');
        if (!fs.existsSync(jsonPath)) return [];
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return (parsed.stocks || []).filter((t: string) => /^[A-Z]{2,4}\.JK$/.test(t));
    } catch {
        return [];
    }
}
