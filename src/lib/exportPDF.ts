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
export async function exportToImage(element: HTMLElement, options: { fileName?: string; share?: boolean; shareTitle?: string } = {}) {
    const { fileName = 'portfolio-share', share = false, shareTitle = 'Portfolio Return' } = options;

    try {
        // Disable ALL stylesheets before html2canvas to prevent oklch() parse error.
        // Export element uses only inline styles, so page styling doesn't affect it.
        const savedStyles: { el: HTMLElement; restore: () => void }[] = [];

        document.querySelectorAll('style').forEach(el => {
            if (el.textContent && /oklch|lch|lab/.test(el.textContent)) {
                const orig = el.textContent;
                el.textContent = '';
                savedStyles.push({ el, restore: () => { el.textContent = orig; } });
            }
        });

        document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            if (el.parentNode) {
                const placeholder = document.createElement('style');
                placeholder.setAttribute('data-html2canvas-placeholder', '');
                el.parentNode.insertBefore(placeholder, el.nextSibling);
                el.parentNode.removeChild(el);
                savedStyles.push({ el: placeholder, restore: () => {
                    if (placeholder.parentNode) {
                        placeholder.parentNode.insertBefore(el, placeholder.nextSibling);
                        placeholder.parentNode.removeChild(placeholder);
                    }
                }});
            }
        });

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#0f172a",
                logging: false,
            });

            await new Promise<void>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Failed to create blob"));
                        return;
                    }
                    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
                    if (share && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
                        navigator.share({ title: shareTitle, files: [file] }).then(() => resolve()).catch((error) => {
                            if (error?.name === 'AbortError') resolve();
                            else reject(error);
                        });
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${fileName}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    resolve();
                }, "image/png");
            });
        } finally {
            // Restore all original stylesheets
            savedStyles.forEach(s => s.restore());
        }
    } catch (error) {
        console.error("Export to Image failed:", error);
        alert("Gagal mengekspor gambar. Silakan coba lagi.");
    }
}
