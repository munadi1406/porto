import { NextRequest, NextResponse } from 'next/server';
import { analyzeProspectus } from '@/lib/prospectusAnalyzer';

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
    // Try raw text extraction from PDF buffer
    const text = buffer.toString('utf-8');
    // Remove PDF binary garbage, keep readable text
    const cleaned = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/(?:BT|ET|Td|Tf|TJ|cm|q|Q|w|J|j|M|d|ri|i|gs|Do|sh|BX|EX|EI|BMC|BDC|EMC|MP|DP|n|v|y|h|re|S|s|f|F|B|b|W|m|l|c)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (cleaned.length > 200) return cleaned;

    throw new Error('Tidak bisa membaca PDF. Pastikan file adalah PDF teks (bukan scan/gambar).');
}

async function extractTextFromURL(url: string): Promise<string> {
    const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
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

    const pdfRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!pdfRes.ok) throw new Error(`Gagal download PDF: ${pdfRes.status}`);
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    return extractTextFromPDFBuffer(buffer);
}

export async function POST(request: NextRequest) {
    try {
        let content = '';
        let fileName = '';

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            fileName = file?.name || 'uploaded.pdf';

            if (!file) {
                return NextResponse.json({ success: false, error: 'File PDF diperlukan' }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            content = await extractTextFromPDFBuffer(buffer);
        } else {
            const body = await request.json();
            const { url, pdfUrl, text } = body;
            const sourceUrl = url || pdfUrl;
            fileName = body.fileName || 'prospectus.pdf';

            if (text) {
                content = text;
            } else if (sourceUrl) {
                content = await extractTextFromURL(sourceUrl);
            } else {
                return NextResponse.json({ success: false, error: 'File PDF, URL, atau teks diperlukan' }, { status: 400 });
            }
        }

        if (!content || content.length < 100) {
            return NextResponse.json({ success: false, error: 'Teks prospektus terlalu pendek. Upload PDF yang valid.' }, { status: 400 });
        }

        const analysis = await analyzeProspectus(content, fileName);

        return NextResponse.json({ success: true, data: analysis });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
