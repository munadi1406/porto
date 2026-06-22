import { NextRequest } from 'next/server';
import { analyzeProspectus } from '@/lib/prospectusAnalyzer';

const FC_KEY = process.env.FIRECRAWL_API_KEY || '';

async function extractTextFromPDF(url: string): Promise<string> {
    // Use Firecrawl for PDF parsing (handles tables/images)
    if (FC_KEY) {
        try {
            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FC_KEY}` },
                body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: false }),
                signal: AbortSignal.timeout(45000),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const md = data.data?.markdown || '';
                    if (md.length > 200) return md;
                }
            }
        } catch { /* fallback */ }
    }

    // Fallback: raw text extraction
    const pdfRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    const text = buffer.toString('utf-8')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/\s+/g, ' ').trim();
    if (text.length > 200) return text;

    throw new Error('Tidak bisa membaca file. Pastikan file PDF dapat diakses publik.');
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            try {
                let content = '';
                let fileName = '';
                const contentType = request.headers.get('content-type') || '';

                if (contentType.includes('multipart/form-data')) {
                    const formData = await request.formData();
                    const file = formData.get('file') as File | null;
                    fileName = file?.name || 'uploaded.pdf';
                    if (!file) { sendEvent('error', { message: 'File diperlukan' }); controller.close(); return; }

                    sendEvent('progress', { step: 'Mengupload & membaca PDF...', progress: 5, eta: 30 });

                    // Upload file to a temporary URL for Firecrawl to access
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const dataUrl = `data:application/pdf;base64,${base64}`;

                    // Extract text from uploaded file buffer
                    const buffer = Buffer.from(arrayBuffer);
                    content = buffer.toString('utf-8')
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
                        .replace(/\s+/g, ' ').trim();

                    // If raw extraction fails (binary PDF), try Firecrawl
                    if (content.length < 200 && FC_KEY) {
                        try {
                            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FC_KEY}` },
                                body: JSON.stringify({
                                    url: dataUrl,
                                    formats: ['markdown'],
                                    onlyMainContent: false,
                                }),
                                signal: AbortSignal.timeout(45000),
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.success && data.data?.markdown?.length > 200) {
                                    content = data.data.markdown;
                                }
                            }
                        } catch { /* final fallback */ }
                    }
                } else {
                    const body = await request.json();
                    fileName = body.fileName || 'prospectus.pdf';
                    const sourceUrl = body.url || body.pdfUrl;

                    if (body.text) {
                        content = body.text;
                    } else if (sourceUrl) {
                        sendEvent('progress', { step: 'Mendownload & membaca PDF...', progress: 5, eta: 40 });
                        content = await extractTextFromPDF(sourceUrl);
                    } else {
                        sendEvent('error', { message: 'File, URL, atau teks diperlukan' });
                        controller.close(); return;
                    }
                }

                if (!content || content.length < 100) {
                    sendEvent('error', { message: 'Teks prospektus terlalu pendek. File mungkin berupa gambar/scan.' });
                    controller.close(); return;
                }

                const analysis = await analyzeProspectus(content, fileName, (step, progress, eta) => {
                    sendEvent('progress', { step, progress, eta });
                });

                sendEvent('complete', { data: analysis });
            } catch (error: any) {
                sendEvent('error', { message: error.message || 'Gagal menganalisis prospektus' });
            }

            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
