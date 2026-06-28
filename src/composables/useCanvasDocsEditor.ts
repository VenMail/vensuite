import { ref, computed, reactive } from 'vue';
import type { Ref } from 'vue';

export interface CanvasDocPageSettings {
  pageSize: 'a4' | 'a3' | 'letter' | 'legal';
  pageOrientation: 'portrait' | 'landscape';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showPageNumbers: boolean;
  pageNumberPosition: string;
}

export interface CanvasRangeStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  color?: string;
  highlight?: string;
  font?: string;
  size?: number;
  rowFlex?: string;
  verticalAlign?: string;
  superscript?: boolean;
  subscript?: boolean;
}

// Page dimension map (px at 96dpi)
const PAGE_DIM_PX: Record<string, { w: number; h: number }> = {
  a4:     { w: 794,  h: 1123 },
  a3:     { w: 1123, h: 1587 },
  letter: { w: 816,  h: 1056 },
  legal:  { w: 816,  h: 1344 },
};

function getPageDimensions(size: string, orientation: 'portrait' | 'landscape') {
  const dim = PAGE_DIM_PX[size] ?? PAGE_DIM_PX.a4;
  return orientation === 'landscape'
    ? { width: dim.h, height: dim.w }
    : { width: dim.w, height: dim.h };
}

/** Extract the most common font-family from inline styles in an HTML string.
 *  canvas-editor ignores font-family during HTML parsing and always falls back to
 *  options.defaultFont, so detecting the document's base font improves fidelity.
 */
export function extractBaseFontFromHtml(html: string): string | null {
  const host = document.createElement('div');
  host.innerHTML = html;
  const counts = new Map<string, number>();
  host.querySelectorAll('[style]').forEach((el) => {
    const style = (el as HTMLElement).getAttribute('style') || '';
    const match = style.match(/font-family\s*:\s*([^;]+)/i);
    if (match) {
      const font = match[1].trim().replace(/['"]/g, '').split(',')[0].trim();
      if (font && font !== 'inherit' && font !== 'initial') {
        counts.set(font, (counts.get(font) || 0) + 1);
      }
    }
  });
  if (!counts.size) return null;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

/** Build canvas-editor constructor options from page settings */
export function buildCanvasEditorOptions(
  settings: CanvasDocPageSettings,
  defaultFontOverride?: string
) {
  const { width, height } = getPageDimensions(settings.pageSize, settings.pageOrientation);

  const footer = settings.showPageNumbers
    ? [{ value: '{pageNo}', size: 10 }]
    : undefined;

  return {
    width,
    height,
    margins: [
      settings.marginTop,
      settings.marginRight,
      settings.marginBottom,
      settings.marginLeft,
    ] as [number, number, number, number],
    pageGap: 30,
    footer: footer ? { disabled: false, defaultValue: footer } : undefined,
    header: { disabled: false },
    defaultFont: defaultFontOverride || 'Arial',
    defaultSize: 16,
    historyMaxRecordCount: 100,
    locale: 'en',
  };
}

/** Convert stored content (Tiptap JSON string | HTML string | canvas-editor JSON) to
 *  the correct input for canvas-editor's executeSetHTML / executeSetValue */
export function parseDocContentForCanvas(raw: any): { mode: 'html' | 'value' | 'empty'; payload: any } {
  if (!raw) return { mode: 'empty', payload: null };

  // Already canvas-editor IEditorData saved by us
  if (typeof raw === 'object' && raw?._canvasEditor === true) {
    return { mode: 'value', payload: raw };
  }

  // String content
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { mode: 'empty', payload: null };

    // Try parse as JSON
    try {
      const parsed = JSON.parse(trimmed);
      // Our own canvas-editor save format
      if (parsed?._canvasEditor === true) {
        return { mode: 'value', payload: parsed };
      }
      // Old Tiptap JSON — extract HTML via a best-effort approach
      // We'll pass nothing and let the caller handle Tiptap→HTML conversion
      if (parsed?.type === 'doc' || parsed?.content) {
        return { mode: 'html', payload: null }; // caller must supply HTML from Tiptap
      }
    } catch {
      // not JSON
    }

    // HTML string
    if (trimmed.startsWith('<')) {
      return { mode: 'html', payload: trimmed };
    }

    // Plain text — wrap in paragraph
    return { mode: 'html', payload: `<p>${trimmed}</p>` };
  }

  return { mode: 'empty', payload: null };
}

/** Wrap canvas-editor getValue result for storage */
export function serializeCanvasContent(value: any): string {
  const payload = { ...value, _canvasEditor: true };
  return JSON.stringify(payload);
}

/** Composable for per-document canvas editor state */
export function useCanvasDocsEditor() {
  const pageSettings = reactive<CanvasDocPageSettings>({
    pageSize: 'a4',
    pageOrientation: 'portrait',
    marginTop: 100,
    marginBottom: 100,
    marginLeft: 120,
    marginRight: 120,
    showPageNumbers: true,
    pageNumberPosition: 'bottom-right',
  });

  const rangeStyle = ref<CanvasRangeStyle>({});
  const wordCount = ref(0);
  const pageCount = ref(1);
  const currentPage = ref(1);
  const zoomLevel = ref(100);
  const isFindReplaceOpen = ref(false);

  const currentPageDim = computed(() =>
    getPageDimensions(pageSettings.pageSize, pageSettings.pageOrientation),
  );

  function zoomIn()    { zoomLevel.value = Math.min(200, zoomLevel.value + 25); }
  function zoomOut()   { zoomLevel.value = Math.max(25,  zoomLevel.value - 25); }
  function resetZoom() { zoomLevel.value = 100; }

  function applyPageSettings(settings: Partial<CanvasDocPageSettings>) {
    Object.assign(pageSettings, settings);
  }

  return {
    pageSettings,
    rangeStyle,
    wordCount,
    pageCount,
    currentPage,
    zoomLevel,
    isFindReplaceOpen,
    currentPageDim,
    zoomIn,
    zoomOut,
    resetZoom,
    applyPageSettings,
  };
}
