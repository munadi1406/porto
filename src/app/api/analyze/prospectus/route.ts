import { NextRequest, NextResponse } from 'next/server';
import { analyzeProspectus } from '@/lib/prospectusAnalyzer';

// Parse PDF via Firecrawl or fallback
async function extractTextFromPDF(url: string): Promise<string> {
    const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

    // Try Firecrawl first
    if (FIRECRAWL_KEY) {
        try {
            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FIRECRAWL_KEY}` },
                body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
                signal: AbortSignal.timeout(30000),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data?.markdown) return data.data.markdown;
            }
        } catch { /* fallback */ }
    }

    // Fallback: try direct PDF fetch + extract text
    try {
        const pdfRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (pdfRes.ok) {
            const text = await pdfRes.text();
            // Try to extract meaningful text from PDF raw content
            return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 20000);
        }
    } catch { /* fallback */ }

    throw new Error('Gagal membaca PDF. Coba upload langsung teks prospektus.');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, pdfUrl, text, fileName } = body;
        const sourceUrl = url || pdfUrl;

        if (!text && !sourceUrl) {
            return NextResponse.json({ success: false, error: 'Text atau URL PDF diperlukan' }, { status: 400 });
        }

        const content = text || await extractTextFromPDF(sourceUrl);
        if (!content || content.length < 100) {
            return NextResponse.json({ success: false, error: 'Teks prospektus terlalu pendek. Upload PDF yang valid.' }, { status: 400 });
        }

        const analysis = await analyzeProspectus(content, fileName || pdfUrl || 'prospectus.pdf');

        return NextResponse.json({ success: true, data: analysis });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
