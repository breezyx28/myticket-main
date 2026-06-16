import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { toSameOriginStorageUrl } from '@/lib/storageUrl';

const SITE_LOGO_SRC = '/favicon.svg';

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'ticket';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

/** Fetch remote images for the screenshot clone only — never mutates the live DOM. */
async function fetchImageForCapture(url: string): Promise<string | false> {
  const resolved = toSameOriginStorageUrl(url) ?? url;
  if (resolved.startsWith('data:') || resolved.startsWith('blob:')) return resolved;

  try {
    const res = await fetch(resolved, { credentials: 'same-origin' });
    if (!res.ok) return false;
    return await blobToDataUrl(await res.blob());
  } catch {
    return false;
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
}

type ScaleBackup = {
  scaleNode: HTMLElement;
  scaleCss: string;
  hostNode: HTMLElement | null;
  hostCss: string;
};

/** Render at design width (700px) so the PDF matches the on-screen ticket layout. */
function beginFullSizeCapture(element: HTMLElement): ScaleBackup | null {
  const scaleNode = element.parentElement;
  if (!scaleNode) return null;

  const hostNode = scaleNode.parentElement;
  const backup: ScaleBackup = {
    scaleNode,
    scaleCss: scaleNode.style.cssText,
    hostNode,
    hostCss: hostNode?.style.cssText ?? '',
  };

  scaleNode.style.transform = 'none';
  scaleNode.style.width = '700px';
  if (hostNode) {
    hostNode.style.height = 'auto';
    hostNode.style.overflow = 'visible';
  }

  void element.offsetHeight;
  return backup;
}

function endFullSizeCapture(backup: ScaleBackup | null): void {
  if (!backup) return;
  backup.scaleNode.style.cssText = backup.scaleCss;
  if (backup.hostNode) backup.hostNode.style.cssText = backup.hostCss;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ticket screenshot.'));
    img.src = dataUrl;
  });
}

/**
 * Screenshot the visible ticket node and save as a single-page PDF image.
 */
export async function downloadAdmitOneTicketPdf(
  element: HTMLElement,
  filenameBase: string,
): Promise<void> {
  if (!element.isConnected) {
    throw new Error('Ticket preview is not ready. Refresh the page and try again.');
  }

  const scaleBackup = beginFullSizeCapture(element);

  try {
    await document.fonts?.ready;
    await waitForImages(element);

    const dataUrl = await domToPng(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      timeout: 30000,
      fetchFn: fetchImageForCapture,
      fetch: {
        placeholderImage: SITE_LOGO_SRC,
      },
    });

    const shot = await loadImage(dataUrl);
    if (shot.naturalWidth < 2 || shot.naturalHeight < 2) {
      throw new Error('Ticket screenshot was empty. Refresh and try again.');
    }

    const imgW = shot.naturalWidth;
    const imgH = shot.naturalHeight;

    const doc = new jsPDF({
      unit: 'px',
      format: [imgW, imgH],
      orientation: imgW >= imgH ? 'landscape' : 'portrait',
      hotfixes: ['px_scaling'],
    });

    doc.addImage(dataUrl, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST');
    doc.save(`ticket-${safeFilenamePart(filenameBase)}.pdf`);
  } finally {
    endFullSizeCapture(scaleBackup);
  }
}
