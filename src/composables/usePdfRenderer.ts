import { ref, shallowRef, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
