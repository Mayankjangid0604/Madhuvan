/**
 * Utility to print content without opening a new window (uses a hidden iframe)
 * This replaces window.open calls for printing.
 */
export const printElement = (content, title = "Print", styles = "") => {
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${title}</title>
                <style>${styles}</style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = () => {
                        window.focus();
                        window.print();
                        setTimeout(() => {
                            window.parent.document.body.removeChild(window.frameElement);
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    doc.close();
};

/**
 * Show a print preview overlay before printing.
 * Renders the content in a full-screen modal with Print and Close buttons.
 */
export const printWithPreview = (content, title = "Print", styles = "") => {
    const overlay = document.createElement('div');
    overlay.id = 'print-preview-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.6);
        display: flex; flex-direction: column; align-items: center;
        padding: 16px; overflow-y: auto;
    `;

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        display: flex; gap: 10px; margin-bottom: 12px;
        position: sticky; top: 0; z-index: 1;
    `;

    const printBtn = document.createElement('button');
    printBtn.textContent = 'Print';
    printBtn.style.cssText = `
        padding: 8px 24px; background: #1e3a8a; color: #fff;
        border: none; border-radius: 6px; font-size: 14px; font-weight: 700;
        cursor: pointer;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        padding: 8px 24px; background: #64748b; color: #fff;
        border: none; border-radius: 6px; font-size: 14px; font-weight: 700;
        cursor: pointer;
    `;

    toolbar.appendChild(printBtn);
    toolbar.appendChild(closeBtn);
    overlay.appendChild(toolbar);

    const previewFrame = document.createElement('iframe');
    previewFrame.style.cssText = `
        width: 210mm; max-width: 100%; min-height: 297mm;
        background: #fff; border: none; border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); flex-shrink: 0;
    `;
    overlay.appendChild(previewFrame);
    document.body.appendChild(overlay);

    const frameDoc = previewFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${title}</title>
                <style>${styles} body { margin: 0; }</style>
            </head>
            <body>${content}</body>
        </html>
    `);
    frameDoc.close();

    // Auto-resize iframe to content height
    previewFrame.onload = () => {
        try {
            const h = previewFrame.contentDocument.body.scrollHeight;
            previewFrame.style.height = (h + 20) + 'px';
        } catch (_) {}
    };

    const cleanup = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    printBtn.addEventListener('click', () => {
        previewFrame.contentWindow.focus();
        previewFrame.contentWindow.print();
    });

    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });
};
