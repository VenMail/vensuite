import { ref, shallowRef, onUnmounted } from 'vue';
import { PDF } from '@libpdf/core';

export interface LibPdfFieldInfo {
  name: string;
  type: string;            // 'text' | 'checkbox' | 'radio' | 'dropdown' | 'listbox' | 'signature' | 'button'
  value?: string | boolean | string[];
  readOnly: boolean;
  required: boolean;
  pageIndex: number;
  rect: [number, number, number, number]; // PDF coordinate space [x1, y1, x2, y2]
  width: number;           // PDF units
  height: number;          // PDF units
  pageWidth: number;       // PDF units
  pageHeight: number;      // PDF units
}

// Instance-scoped state (no module-level singletons to avoid cross-component conflicts)

/**
 * Composable for LibPDF form detection, filling, flattening, and image drawing.
 * Used alongside usePdfRenderer (pdfjs for visual page rendering).
 */
export function useLibPdf() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const formFieldCount = ref(0);
  const pdfDoc = shallowRef<Awaited<ReturnType<typeof PDF.load>> | null>(null);
  let localBuffer: ArrayBuffer | null = null;

  async function loadPdf(source: string | ArrayBuffer): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      let bytes: Uint8Array;
      if (typeof source === 'string') {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        const buf = await response.arrayBuffer();
        bytes = new Uint8Array(buf);
        localBuffer = buf;
      } else {
        bytes = new Uint8Array(source.slice(0));
        localBuffer = source;
      }

      pdfDoc.value = await PDF.load(bytes);

      const form = pdfDoc.value.getForm();
      formFieldCount.value = form?.fieldCount ?? 0;
    } catch (e: any) {
      error.value = e?.message || 'Failed to load PDF with LibPDF';
      console.error('LibPDF load error:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Detect all AcroForm fields with their page positions.
   * Uses getFields() for metadata + page.getAnnotations() for positions.
   */
  async function detectFormFields(): Promise<LibPdfFieldInfo[]> {
    if (!pdfDoc.value) return [];

    const form = pdfDoc.value.getForm();
    if (!form || form.isEmpty) return [];

    const fields: LibPdfFieldInfo[] = [];
    const allFields = form.getFields();

    // Build a map of field name → page index + rect from page annotations
    const fieldLocations = new Map<string, { pageIndex: number; rect: [number, number, number, number]; pageWidth: number; pageHeight: number }>();

    const pageCount = pdfDoc.value.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.value.getPage(i);
      if (!page) continue;

      const annotations = page.getAnnotations();
      for (const ann of annotations) {
        const annAny = ann as any;
        const fieldName = annAny.fieldName || annAny.T;
        if (!fieldName) continue;

        // LibPDF Rect is { x, y, width, height } (bottom-left origin)
        // Convert to [x1, y1, x2, y2] for consistency with pdfjs format
        const r = annAny.rect;
        const annRect: [number, number, number, number] = r
          ? [r.x ?? 0, r.y ?? 0, (r.x ?? 0) + (r.width ?? 0), (r.y ?? 0) + (r.height ?? 0)]
          : [0, 0, 0, 0];
        fieldLocations.set(fieldName, {
          pageIndex: i,
          rect: annRect,
          pageWidth: page!.width,
          pageHeight: page!.height,
        });
      }
    }

    for (const field of allFields) {
      const loc = fieldLocations.get(field.name);
      const [x1, y1, x2, y2] = loc?.rect || [0, 0, 0, 0];
      const fieldAny = field as any;

      fields.push({
        name: field.name,
        type: field.type,
        value: fieldAny.value ?? fieldAny.getValue?.(),
        readOnly: fieldAny.isReadOnly?.() ?? false,
        required: fieldAny.isRequired?.() ?? false,
        pageIndex: loc?.pageIndex ?? 0,
        rect: [x1, y1, x2, y2],
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        pageWidth: loc?.pageWidth ?? 612,
        pageHeight: loc?.pageHeight ?? 792,
      });
    }

    return fields;
  }

  /**
   * Fill form fields with values and optionally flatten.
   * Returns the modified PDF as Uint8Array.
   */
  async function fillForm(
    fieldValues: Record<string, string | boolean>,
    options: { flatten?: boolean } = {}
  ): Promise<Uint8Array | null> {
    if (!pdfDoc.value) return null;

    const form = pdfDoc.value.getForm();
    if (!form || form.isEmpty) return null;

    // Fill field-by-field to be resilient to type mismatches
    for (const [name, value] of Object.entries(fieldValues)) {
      try {
        const field = form.getField(name);
        if (!field) continue;

        if (field.type === 'checkbox') {
          const cb = form.getCheckbox(name);
          if (!cb) continue;
          if (value === true || value === 'true' || value === '1') {
            cb.check();
          } else {
            cb.uncheck();
          }
        } else if (field.type === 'text' && typeof value === 'string') {
          form.getTextField(name)?.setValue(value);
        } else if (typeof value === 'string') {
          // Fallback: try text field for any string value
          form.getTextField(name)?.setValue(value);
        }
      } catch (e) {
        console.warn(`LibPDF: skipped field "${name}" due to error:`, e);
      }
    }

    // Update appearances so filled values render correctly
    try { form.updateAppearances(); } catch { /* best effort */ }

    if (options.flatten) {
      form.flatten();
    }

    return await pdfDoc.value.save();
  }

  /**
   * Fill + flatten in one step.
   */
  async function fillAndFlatten(
    fieldValues: Record<string, string | boolean>
  ): Promise<Uint8Array | null> {
    return fillForm(fieldValues, { flatten: true });
  }

  /**
   * Draw an image (e.g. signature PNG) on a specific page at given coordinates.
   * Coordinates are in PDF user space (bottom-left origin).
   */
  async function drawImageOnPage(
    pageIndex: number,
    imageBytes: Uint8Array,
    options: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    if (!pdfDoc.value) return;

    const page = pdfDoc.value.getPage(pageIndex);
    if (!page) return;

    const image = pdfDoc.value.embedImage(imageBytes);
    page.drawImage(image, options);
  }

  /**
   * Get the raw PDF bytes for the current document state.
   */
  async function save(): Promise<Uint8Array | null> {
    if (!pdfDoc.value) return null;
    return await pdfDoc.value.save();
  }

  function getLoadedBuffer(): ArrayBuffer | null {
    return localBuffer;
  }

  onUnmounted(() => {
    pdfDoc.value = null;
    localBuffer = null;
  });

  return {
    isLoading,
    error,
    formFieldCount,
    pdfDoc,
    loadPdf,
    detectFormFields,
    fillForm,
    fillAndFlatten,
    drawImageOnPage,
    save,
    getLoadedBuffer,
  };
}
