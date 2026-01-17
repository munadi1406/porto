import html2canvas from "html2canvas";

/**
 * Simple export to PDF using browser's print dialog
 * No external libraries needed, works with all CSS including modern color functions
 */
export function exportToPDF(element: HTMLElement, options: { title?: string } = {}) {
    const { title = 'Portfolio Report' } = options;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
    }

    // Clone element content
    const content = element.cloneNode(true) as HTMLElement;

    // Create print document
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page {
                    size: A4;
                    margin: 0;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: system-ui, -apple-system, sans-serif;
                }
            </style>
            ${Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')}</style>`;
                } catch {
                    return '';
                }
            })
            .join('\n')}
        </head>
        <body>
            ${content.outerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}

/**
 * Export element to Image (PNG) using html2canvas
 */
export async function exportToImage(element: HTMLElement, options: { fileName?: string } = {}) {
    const { fileName = 'portfolio-share' } = options;

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Higher quality
            useCORS: true,
            backgroundColor: null,
            logging: false,
        });

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `${fileName}.png`;
        link.click();
    } catch (error) {
        console.error("Export to Image failed:", error);
        alert("Gagal mengekspor gambar. Silakan coba lagi.");
    }
}
