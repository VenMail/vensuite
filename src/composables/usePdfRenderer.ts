import { ref, shallowRef, onUnmounted } from 'vue';
import type * as PdfjsLib from 'pdfjs-dist';
// Static ?url import — Vite replaces this with a hashed asset URL at build time.
// Only the URL string is included in the main bundle, not the worker code itself.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
  imageUrl: string;
}

export interface PdfFormField {
  fieldName: string;
  fieldType: string;       // 'Tx' (text), 'Btn' (button/checkbox), 'Ch' (choice), 'Sig' (signature)
  fieldValue?: string;
  pageIndex: number;       // 0-based
  rect: [number, number, number, number]; // PDF coordinate space [x1, y1, x2, y2] (bottom-left origin)
  width: number;           // PDF units
  height: number;          // PDF units
  pageWidth: number;       // PDF units (for percentage calc)
  pageHeight: number;      // PDF units
}

let pdfjsPromise: Promise<typeof PdfjsLib> | null = null;

async function getPdfjs(): Promise<typeof PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      return lib;
    });
  }
  return pdfjsPromise;
}

export function usePdfRenderer() {
  const pages = ref<PdfPage[]>([]);
  const pageCount = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pdfDoc = shallowRef<PdfjsLib.PDFDocumentProxy | null>(null);

  async function loadPdf(source: string | ArrayBuffer, scale = 1.5): Promise<void> {
    isLoading.value = true;
    error.value = null;
    pages.value = [];

    try {
      const pdfjsLib = await getPdfjs();
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
        await page.render({ canvasContext: ctx, viewport }).promise;

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

  async function detectFormFields(): Promise<PdfFormField[]> {
    if (!pdfDoc.value) return [];

    const fields: PdfFormField[] = [];

    for (let i = 1; i <= pdfDoc.value.numPages; i++) {
      const page = await pdfDoc.value.getPage(i);
      const annotations = await page.getAnnotations();

      for (const ann of annotations) {
        if (ann.subtype !== 'Widget') continue;
        if (!ann.fieldName) continue;

        const rect = ann.rect as [number, number, number, number];
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const [x1, y1, x2, y2] = rect;
        const fieldWidth = Math.abs(x2 - x1);
        const fieldHeight = Math.abs(y2 - y1);

        fields.push({
          fieldName: ann.fieldName,
          fieldType: ann.fieldType || 'Tx',
          fieldValue: ann.fieldValue as string | undefined,
          pageIndex: i - 1,
          rect: [x1, y1, x2, y2],
          width: fieldWidth,
          height: fieldHeight,
          pageWidth,
          pageHeight,
        });
      }

      page.cleanup();
    }

    return fields;
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
    detectFormFields,
  };
}
