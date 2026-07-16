/**
 * Utility for printing specific elements
 */
export async function printElement(elementId: string, title?: string, type?: 'A4' | '58mm' | 'auto') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found for printing.`);
    return;
  }

  let styleTags = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
    styleTags += el.outerHTML;
  });

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.querySelectorAll('.print\\:hidden').forEach(el => {
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
  });

  let pageStyle = '@page { size: auto; margin: 0mm; padding: 0mm; }\n          body { background-color: #ffffff !important; margin: 0 !important; padding: 24px !important; font-family: monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';

  if (type === 'A4') {
    pageStyle = '@page { size: A4; margin: 10mm; }\n          body { background-color: #ffffff !important; margin: 0 auto !important; padding: 0 !important; font-family: monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 210mm; }';
  } else if (type === '58mm') {
    pageStyle = '@page { size: 58mm auto; margin: 0; padding: 0; }\n          body { background-color: #ffffff !important; margin: 0 !important; padding: 2mm !important; width: 58mm !important; max-width: 58mm !important; overflow: hidden; font-family: monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }';
    // Shrink text sizes slightly for 58mm
    clonedElement.style.zoom = '0.7';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Impression'}</title>
        ${styleTags}
        <style>
          ${pageStyle}
          #${elementId} { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; display: block !important; }
        </style>
      </head>
      <body>
        <div id="${elementId}">${clonedElement.innerHTML}</div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              try {
                window.print();
                setTimeout(() => window.close(), 500);
              } catch (e) {
                console.error("Print failed", e);
              }
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  // First try opening a popup window (best for escaping iframe sandbox restrictions like 'allow-modals')
  try {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn("Popup blocked. Using iframe fallback.");
  }

  // Fallback to hidden iframe (will fail in sandboxes lacking 'allow-modals')
  const existingFrame = document.getElementsByName("print_iframe")[0];
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.name = "print_iframe";
  iframe.setAttribute("style", "position: absolute; width: 0px; height: 0px; left: -1000px; top: -1000px; border: none;");
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  const frameWindow = iframe.contentWindow;
  if (frameWindow) {
    frameWindow.focus();
    setTimeout(() => {
      try {
        frameWindow.print();
      } catch (e) {
        console.error("Iframe print blocked:", e);
        // Clean alternative: open in same window and reconstruct
        alert("Erreur: Impossible d'imprimer directement depuis l'aperçu. Veuillez utiliser le lien en haut à droite pour ouvrir l'application dans un nouvel onglet.");
      }
      setTimeout(() => {
        const frame = document.getElementsByName("print_iframe")[0];
        if (frame) frame.remove();
      }, 2000);
    }, 800);
  }
}
