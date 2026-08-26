import { NextRequest } from 'next/server';
import { analyzeProspectus } from '@/lib/prospectusAnalyzer';

let pdfjs: any = null;
let Tesseract: any = null;

async function getPdfjs() {
    if (!pdfjs) {
        pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        try { pdfjs.GlobalWorkerOptions.workerSrc = require?.resolve?.('pdfjs-dist/legacy/build/pdf.worker.min.mjs'); } catch {}
    }
    return pdfjs;
}

async function parsePDFBuffer(buffer: Buffer): Promise<string> {
    const pdf = await getPdfjs();
    const loadingTask = pdf.getDocument({ data: new Uint8Array(buffer) });
    const timeout = setTimeout(() => loadingTask.destroy(), 60000);
    const doc = await loadingTask.promise;
    clearTimeout(timeout);
    let text = '';
    const maxPages = Math.min(doc.numPages, 100);
    for (let i = 1; i <= maxPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    text = text.trim();
    if (text.length > 200) {
        console.log(`[Prospectus] pdfjs-dist: ${doc.numPages} halaman, ${text.length} chars`);
        return text;
    }
    throw new Error('Teks prospektus terlalu pendek. File mungkin berupa gambar/scan.');
}

const PAINT_IMAGE_XOBJECT = 85;

async function extractPageImages(doc: any, pageNum: number): Promise<Buffer[]> {
    const page = await doc.getPage(pageNum);
    const opList = await page.getOperatorList();
    const results: Buffer[] = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] !== PAINT_IMAGE_XOBJECT) continue;
        try {
            const obj = await page.objs.get(opList.argsArray[i][0]);
            if (obj && obj.data?.length > 1000) {
                const ch = obj.kind === 2 ? 1 : obj.kind === 3 ? 3 : 4;
                const sharp = (await import('sharp')).default;
                const png = await sharp(Buffer.from(obj.data), { raw: { width: obj.width, height: obj.height, channels: ch } }).png().toBuffer();
                if (png.length > 1000) results.push(png);
            }
        } catch {}
    }
    return results;
}

async function renderPageViaCanvas(doc: any, pageNum: number): Promise<Buffer | null> {
    const page = await doc.getPage(pageNum);
    const vp1 = page.getViewport({ scale: 1.0 });
    let cw = Math.max(1, Math.ceil(vp1.width));
    let ch = Math.max(1, Math.ceil(vp1.height));
    if (cw > 4000 || ch > 4000) {
        const scale = Math.min(4000 / cw, 4000 / ch);
        const vp2 = page.getViewport({ scale });
        cw = Math.max(1, Math.ceil(vp2.width));
        ch = Math.max(1, Math.ceil(vp2.height));
    }
    return renderPageViaCanvasAtSize(page, cw, ch);
}

async function renderPageViaCanvasAtSize(page: any, w: number, h: number): Promise<Buffer | null> {
    try {
        const vp = page.getViewport({ scale: 1.0 });
        // Manually compute needed scale to match target dimensions
        const scaleX = w / vp.width;
        const scaleY = h / vp.height;
        const scale = Math.min(scaleX, scaleY);
        const scaledVp = page.getViewport({ scale });
        const cw = Math.max(1, Math.ceil(scaledVp.width));
        const ch = Math.max(1, Math.ceil(scaledVp.height));

        const { createCanvas } = await import('canvas');
        const c = createCanvas(cw, ch);
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cw, ch);

        // Try rendering with pdfjs internal render
        await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
        let buf = c.toBuffer('image/png');
        if (buf.length > 5 * 1024 * 1024) {
            const sharp = (await import('sharp')).default;
            buf = await sharp(buf).resize({ width: 1600, fit: 'inside' }).png().toBuffer();
        }
        return buf;
    } catch (e: any) {
        console.error(`[Prospectus] Canvas render halaman FAIL:`, e.stack?.substring(0, 400));
        // Fallback: extract images from operator list directly
        try {
            const opList = await page.getOperatorList();
            for (let i = 0; i < opList.fnArray.length; i++) {
                if (opList.fnArray[i] !== 85) continue;
                const args = opList.argsArray[i];
                const imgName = args[0];
                try {
                    const obj = await page.objs.get(imgName);
                    if (obj && obj.data?.length > 1000) {
                        const imgBuf = Buffer.from(obj.data);
                        const ch = obj.kind === 2 ? 1 : obj.kind === 3 ? 3 : 4;
                        const sharp = (await import('sharp')).default;
                        const png = await sharp(imgBuf, { raw: { width: obj.width, height: obj.height, channels: ch } }).png().toBuffer();
                        if (png.length > 1000) return png;
                    }
                } catch {}
            }
        } catch {}
        return null;
    }
}

async function ocrPDFBuffer(buffer: Buffer, onProgress?: (msg: string) => void): Promise<string> {
    const pdf = await getPdfjs();
    const doc = await pdf.getDocument({ data: new Uint8Array(buffer) }).promise;
    const maxPages = Math.min(doc.numPages, 8);

    if (!Tesseract) Tesseract = await import('tesseract.js');

    let fullText = '';
    for (let i = 1; i <= maxPages; i++) {
        onProgress?.(`📄 OCR halaman ${i}/${maxPages}...`);
        console.log(`[Prospectus] OCR halaman ${i}/${maxPages}`);

        let imagesToOcr: Buffer[] = [];

        // Strategy 1: Extract embedded images from operator list (works for scanned PDFs)
        try {
            imagesToOcr = await extractPageImages(doc, i);
            if (imagesToOcr.length > 0) {
                console.log(`  Found ${imagesToOcr.length} embedded images`);
            }
        } catch (e: any) {
            console.warn(`  extractPageImages gagal: ${e.message}`);
        }

        // Strategy 2: Render page to canvas (works for text PDFs that need imaging)
        if (imagesToOcr.length === 0) {
            const pageImg = await renderPageViaCanvas(doc, i);
            if (pageImg) imagesToOcr = [pageImg];
        }

        for (const imgBuf of imagesToOcr) {
            try {
                const { data } = await Tesseract.recognize(imgBuf, 'eng+ind', {
                    logger: (m: any) => m.status === 'recognizing text' && console.log(`  OCR ${Math.round(m.progress * 100)}%`),
                });
                if (data?.text?.trim()) {
                    fullText += data.text.trim() + '\n\n';
                }
            } catch (e: any) {
                console.warn(`  OCR gagal: ${e.message}`);
            }
        }
    }

    fullText = fullText.trim();
    if (fullText.length < 200) throw new Error('OCR gagal — teks terlalu pendek.');
    console.log(`[Prospectus] OCR: ${doc.numPages} halaman, ${fullText.length} chars`);
    return fullText;
}

async function extractTextFromPDF(url: string): Promise<string> {
    const pdfRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    return await parsePDFBuffer(buffer);
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

                    sendEvent('progress', { step: '📂 Mengekstrak teks dari PDF via pdfjs...', progress: 5, eta: 30 });
                    console.log(`[Prospectus] Upload file: ${fileName} (${(file.size / 1024).toFixed(0)} KB)`);

                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    try {
                        content = await parsePDFBuffer(buffer);
                        console.log(`[Prospectus] pdfjs-dist: ${content.length} chars`);
                    } catch (pdfErr: any) {
                        console.warn(`[Prospectus] pdfjs-dist gagal, coba OCR:`, pdfErr.message);
                        sendEvent('progress', { step: '🔍 Teks tidak terbaca, mencoba OCR dengan tesseract.js...', progress: 5, eta: 120 });
                        try {
                            content = await ocrPDFBuffer(buffer, (msg) => sendEvent('progress', { step: msg, progress: 20, eta: 90 }));
                            console.log(`[Prospectus] OCR: ${content.length} chars`);
                        } catch (ocrErr: any) {
                            console.error(`[Prospectus] OCR juga gagal:`, ocrErr.message);
                            sendEvent('error', { message: `Gagal membaca PDF (text & OCR): ${pdfErr.message}` });
                            controller.close(); return;
                        }
                    }
                } else {
                    const body = await request.json();
                    fileName = body.fileName || 'prospectus.pdf';
                    const sourceUrl = body.url || body.pdfUrl;

                    if (body.text) {
                        content = body.text;
                        console.log(`[Prospectus] Teks langsung: ${content.length} chars`);
                    } else if (sourceUrl) {
                        sendEvent('progress', { step: '🌐 Mendownload & membaca PDF dari URL...', progress: 5, eta: 40 });
                        console.log(`[Prospectus] URL PDF: ${sourceUrl}`);
                        content = await extractTextFromPDF(sourceUrl);
                        console.log(`[Prospectus] Ekstraksi URL: ${content.length} chars`);
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
