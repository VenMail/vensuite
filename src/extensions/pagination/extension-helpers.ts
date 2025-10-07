/**
 * Pagination Extension Helper Functions
 */

import type { Editor } from '@tiptap/core';
import type { PaginationOptions, PageFormat } from './types';
import { DEFAULT_OPTIONS, PAGE_FORMATS } from './types';
import { LayoutEngine } from './layout-engine';
import { PageRenderer } from './renderer';

// Import ExtendedPaginationStorage after it's been defined
export interface ExtendedPaginationStorage {
  pages: import('./types').PageBreakInfo[];
  container: HTMLElement | null;
  measureContainer: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  mutationObserver: IntersectionObserver | null;
  layoutDebounceTimer: NodeJS.Timeout | null;
  isLayouting: boolean;
  lastLayoutHash: string;
  layoutEngine?: LayoutEngine;
  originalDisplay?: string;
  forceLayout?: boolean;
}

/**
 * Get resolved options with calculated page dimensions
 */
export function getResolvedOptions(options: PaginationOptions): Required<PaginationOptions> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  
  if (resolved.pageFormat) {
    const format = PAGE_FORMATS[resolved.pageFormat as keyof PageFormat];
    if (format) {
      const isLandscape = resolved.orientation === 'landscape';
      resolved.pageWidth = isLandscape ? format.height : format.width;
      resolved.pageHeight = isLandscape ? format.width : format.height;
    }
  }
  
  return resolved as Required<PaginationOptions>;
}

/**
 * Mount pagination view
 */
export function mountPagination(editor: Editor, storage: ExtendedPaginationStorage, options: PaginationOptions) {
  if (storage.container) return;
  
  const resolvedOptions = getResolvedOptions(options);
  
  // Create container
  const renderer = new PageRenderer(resolvedOptions);
  const container = renderer.createContainer();
  storage.container = container;
  
  // Hide original editor
  const editorElement = editor.view.dom;
  const parent = editorElement.parentElement;
  if (parent) {
    // Store original display style
    storage.originalDisplay = parent.style.display;
    parent.style.display = 'none';
    
    // Insert pagination container
    if (parent.parentElement) {
      parent.parentElement.insertBefore(container, parent.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }
  
  // Perform initial layout
  performLayout(editor, storage, options);
  
  // Setup observers
  setupObservers(editor, storage, options);
}

/**
 * Unmount pagination view
 */
export function unmountPagination(editor: Editor, storage: ExtendedPaginationStorage) {
  // Restore original editor
  const editorElement = editor.view.dom;
  const parent = editorElement.parentElement;
  if (parent && storage.originalDisplay !== undefined) {
    parent.style.display = storage.originalDisplay;
  }
  
  // Remove container
  if (storage.container && storage.container.parentElement) {
    storage.container.parentElement.removeChild(storage.container);
  }
  storage.container = null;
  
  // Cleanup observers
  cleanupObservers(storage);
}

/**
 * Perform layout
 */
export async function performLayout(editor: Editor, storage: ExtendedPaginationStorage, _options?: PaginationOptions) {
  if (!storage.container || !storage.layoutEngine) return;
  
  if (storage.isLayouting) {
    console.debug('Layout already in progress');
    return;
  }
  
  try {
    storage.isLayouting = true;
    
    // Get document hash to check if content changed
    const docHash = getDocumentHash(editor);
    if (docHash === storage.lastLayoutHash && !storage.forceLayout) {
      console.debug('Document unchanged, skipping layout');
      return;
    }
    
    // Perform layout
    const pages = await storage.layoutEngine.layoutPages(
      editor.view,
      storage.container
    );
    
    storage.pages = pages;
    storage.lastLayoutHash = docHash;
    storage.forceLayout = false;
    
  } catch (error) {
    console.error('Layout failed:', error);
  } finally {
    storage.isLayouting = false;
  }
}

/**
 * Debounced layout
 */
export function debouncedLayout(editor: Editor, storage: ExtendedPaginationStorage, options: PaginationOptions) {
  if (storage.layoutDebounceTimer) {
    clearTimeout(storage.layoutDebounceTimer);
  }
  
  storage.layoutDebounceTimer = setTimeout(() => {
    performLayout(editor, storage, options);
  }, 150);
}

/**
 * Setup observers for dynamic content
 */
export function setupObservers(editor: Editor, storage: ExtendedPaginationStorage, options: PaginationOptions) {
  // Observe editor resize
  storage.resizeObserver = new ResizeObserver(() => {
    storage.forceLayout = true;
    debouncedLayout(editor, storage, options);
  });
  storage.resizeObserver.observe(editor.view.dom);
  
  // Observe images loading
  const images = editor.view.dom.querySelectorAll('img');
  if (images.length > 0) {
    storage.mutationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.complete) {
            debouncedLayout(editor, storage, options);
          } else {
            img.addEventListener('load', () => debouncedLayout(editor, storage, options), { once: true });
          }
        }
      });
    });
    
    images.forEach((img: Element) => storage.mutationObserver?.observe(img));
  }
}

/**
 * Cleanup observers
 */
export function cleanupObservers(storage: ExtendedPaginationStorage) {
  if (storage.resizeObserver) {
    storage.resizeObserver.disconnect();
    storage.resizeObserver = null;
  }
  
  if (storage.mutationObserver) {
    storage.mutationObserver.disconnect();
    storage.mutationObserver = null;
  }
  
  if (storage.layoutDebounceTimer) {
    clearTimeout(storage.layoutDebounceTimer);
    storage.layoutDebounceTimer = null;
  }
}

/**
 * Get document hash for change detection
 */
export function getDocumentHash(editor: Editor): string {
  const doc = editor.state.doc;
  // Simple hash based on doc size and first/last content
  const size = doc.content.size;
  const firstText = doc.textBetween(0, Math.min(100, size));
  const lastText = doc.textBetween(Math.max(0, size - 100), size);
  return `${size}-${firstText}-${lastText}`;
}
