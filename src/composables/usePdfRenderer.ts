import { ref, shallowRef, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// ---------------------------------------------------------------------------
// pdfjs-dist 5.x uses Uint8Array.prototype.toHex() (Chrome 140+, Firefox 133+,
// Safari 18.2+). Older browsers crash with "n.toHex is not a function".
// ---------------------------------------------------------------------------

// 1) Main-thread polyfill
if (typeof (Uint8Array.prototype as any).toHex !== 'function') {
  (Uint8Array.prototype as any).toHex = function (): string {
    return Array.from(this as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

// 2) Worker-thread polyfill via a tiny wrapper module.
//    We cannot simply fetch the worker and create a blob URL from its full
//    source because the worker uses `import.meta.url` for WASM (JBig2) which
//    breaks under blob: origins.  Instead we create a small wrapper module
//    that polyfills toHex, then `await import()`s the real worker URL.
//    This is the same pattern pdf.js itself uses for CDN workers.
//    The Vite build renames .mjs → .js (via rollupOptions.assetFileNames) so
//    servers that don't know about .mjs still serve the correct MIME type.
const workerAbsoluteUrl = new URL(pdfjsWorkerUrl, window.location.href).href;
const workerWrapper = [
  `if(!Uint8Array.prototype.toHex){Uint8Array.prototype.toHex=function(){return Array.from(this).map(b=>b.toString(16).padStart(2,'0')).join('');};}`,
  `await import("${workerAbsoluteUrl}");`,
].join('\n');

pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([workerWrapper], { type: 'text/javascript' })
);

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
