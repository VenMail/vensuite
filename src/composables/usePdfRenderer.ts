import { ref, shallowRef, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// The production CDN (venia.cloud) serves .mjs files with Content-Type:
// application/octet-stream, which browsers reject for module scripts.
// Fix: fetch the worker (MIME checking doesn't apply to fetch()) and re-wrap it
// as a blob: URL with an explicit application/javascript type. This bypasses
// the server misconfiguration without requiring any server-side changes.
const workerReady: Promise<void> = fetch(pdfjsWorkerUrl)
  .then(r => r.blob())
  .then(blob => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
      new Blob([blob], { type: 'application/javascript' })
    );
  })
  .catch(() => {
    // Fallback to direct URL (works in dev where the dev server has correct MIME types)
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
