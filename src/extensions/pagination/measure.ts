import type { EditorView } from '@tiptap/pm/view';

const MM_TO_PX = 96 / 25.4; // Standard DPI conversion

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

/**
 * Measure the height of a DOM node in pixels
 */
export function measureNodeHeight(view: EditorView, pos: number): number {
  try {
    const domNode = view.nodeDOM(pos);
    if (!domNode || !(domNode instanceof HTMLElement)) {
      return 0;
    }
    
    // Use getBoundingClientRect for accurate height including margins
    const rect = domNode.getBoundingClientRect();
    return rect.height;
  } catch (error) {
    console.warn('[Measure] Error measuring node at pos', pos, ':', error);
    return 0;
  }
}

/**
 * Get the cumulative height from document start to a given position
 */
export function getCumulativeHeight(view: EditorView, toPos: number): number {
  let totalHeight = 0;
  const { state } = view;
  
  state.doc.nodesBetween(0, Math.min(toPos, state.doc.content.size), (_node, pos) => {
    if (pos >= toPos) {
      return false; // Stop iteration
    }
    
    const height = measureNodeHeight(view, pos);
    if (height > 0) {
      totalHeight += height;
    }
  });
  
  return totalHeight;
}

/**
 * Measure all node heights in the document efficiently
 */
export function measureAllNodes(view: EditorView): Map<number, number> {
  const heights = new Map<number, number>();
  const { state } = view;
  
  state.doc.descendants((_node, pos) => {
    const height = measureNodeHeight(view, pos);
    if (height > 0) {
      heights.set(pos, height);
    }
  });
  
  return heights;
}

/**
 * Calculate total document content height
 */
export function getTotalContentHeight(view: EditorView): number {
  try {
    const editorDom = view.dom as HTMLElement;
    return editorDom.scrollHeight;
  } catch {
    return 0;
  }
}
