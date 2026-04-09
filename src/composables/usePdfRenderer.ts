import { ref, shallowRef, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// pdfjs-dist 5.x uses Uint8Array.prototype.toHex() which is only natively
// available in Chrome 140+. Polyfill it in the main thread.
if (!Uint8Array.prototype.toHex) {
  (Uint8Array.prototype as any).toHex = function (): string {
    return Array.from(this as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

// The polyfill above only covers the main thread. The PDF worker runs in a
// separate thread and needs its own copy. We also need to serve the worker
// as application/javascript (venia.cloud CDN sends application/octet-stream
// for .mjs files, which browsers reject for module scripts). Both problems
// are solved by fetching the worker source, prepending the polyfill, and
// creating a blob: URL with the correct MIME type.
const TOHEX_POLYFILL = `if(!Uint8Array.prototype.toHex){Uint8Array.prototype.toHex=function(){return Array.from(this).map(b=>b.toString(16).padStart(2,'0')).join('');};}`;

const workerReady: Promise<void> = fetch(pdfjsWorkerUrl)
  .then(r => r.text())
  .then(code => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
      new Blob([TOHEX_POLYFILL + '\n' + code], { type: 'application/javascript' })
    );
  })
  .catch(() => {
    // Fallback to direct URL (works in dev where MIME types are correct)
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  });

export interface PdfPage {
  pageIndex: number;
  width: number;    // PDF points
  height: number;   // PDF points
  imageUrl: string; // data URL of rendered page
}

export function usePdfRenderer() {
  const pages = ref<PdfPage[]>([]);
  const pageCount = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null);

  async function loadPdf(source: string | ArrayBuffer, scale = 1.5): Promise<void> {
    isLoading.value = true;
    error.value = null;
    pages.value = [];

    try {
      await workerReady;
      const loadingTask = pdfjsLib.getDocument(
        typeof source === 'string' ? { url: source } : { data: source }
      );
      const doc = await loadingTask.promise;
      pdfDoc.value = doc;
      pageCount.value = doc.numPages;

      const rendered: PdfPage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const originalViewport = page.getViewport({ scale: 1 });
        rendered.push({
          pageIndex: i - 1,
          width: originalViewport.width,
          height: originalViewport.height,
          imageUrl: canvas.toDataURL('image/png'),
        });

        page.cleanup();
      }

      pages.value = rendered;
    } catch (e: any) {
      error.value = e?.message || 'Failed to load PDF';
      console.error('PDF loading error:', e);
    } finally {
      isLoading.value = false;
    }
  }

  function getPageDimensions(pageIndex: number): { width: number; height: number } | null {
    const page = pages.value.find(p => p.pageIndex === pageIndex);
    return page ? { width: page.width, height: page.height } : null;
  }

  onUnmounted(() => {
    pdfDoc.value?.destroy();
    pdfDoc.value = null;
  });

  return {
    pages,
    pageCount,
    isLoading,
    error,
    loadPdf,
    getPageDimensions,
  };
}
