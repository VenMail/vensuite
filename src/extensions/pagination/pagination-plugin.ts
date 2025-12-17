/**
 * Pagination Plugin
 * 
 * A ProseMirror plugin that handles automatic content flow across pages.
 * This is the core engine that:
 * 1. Measures content height
 * 2. Detects overflow
 * 3. Calculates optimal page break points
 * 4. Renders page decorations (gaps, headers, footers)
 */

import { Plugin, PluginKey, EditorState, Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PaginationOptions, PageBreakPoint } from './types';
import { getContentArea, DEFAULT_OPTIONS } from './types';

export const paginationPluginKey = new PluginKey('pagination');

interface PaginationState {
  pageCount: number;
  pageBreaks: PageBreakPoint[];
  decorations: DecorationSet;
  options: PaginationOptions;
  lastMeasuredHeight: number;
}

/**
 * Nodes that should not be split across pages
 */
const UNSPLITTABLE_NODES = new Set([
  'image',
  'imagePlus',
  'chart',
  'codeBlock',
  'horizontalRule',
  'pageBreak',
]);

/**
 * Nodes that prefer to stay with the next block (e.g., headings)
 */
const KEEP_WITH_NEXT_NODES = new Set([
  'heading',
]);

/**
 * Calculate the rendered height of a node in the DOM
 */
function measureNodeHeight(view: EditorView, pos: number, node: ProseMirrorNode): number {
  try {
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      return dom.offsetHeight;
    }
    // Fallback: estimate based on content
    return estimateNodeHeight(node);
  } catch {
    return estimateNodeHeight(node);
  }
}

/**
 * Estimate node height when DOM measurement isn't available
 */
function estimateNodeHeight(node: ProseMirrorNode): number {
  const lineHeight = 24; // Default line height in pixels
  
  switch (node.type.name) {
    case 'paragraph':
      // Estimate based on text length and average characters per line
      const textLength = node.textContent.length;
      const charsPerLine = 80;
      const lines = Math.max(1, Math.ceil(textLength / charsPerLine));
      return lines * lineHeight + 16; // + margin
      
    case 'heading':
      const level = node.attrs.level || 1;
      const headingSizes = { 1: 40, 2: 32, 3: 28, 4: 24 };
      return (headingSizes[level as keyof typeof headingSizes] || 24) + 24;
      
    case 'bulletList':
    case 'orderedList':
      let listHeight = 0;
      node.forEach((child) => {
        listHeight += estimateNodeHeight(child);
      });
      return listHeight + 8;
      
    case 'listItem':
      let itemHeight = 0;
      node.forEach((child) => {
        itemHeight += estimateNodeHeight(child);
      });
      return itemHeight;
      
    case 'table':
      // Estimate table height based on rows
      let tableHeight = 0;
      node.forEach(() => {
        tableHeight += 40; // Average row height
      });
      return tableHeight + 4; // + border
      
    case 'image':
    case 'imagePlus':
      return (node.attrs.height || 200) + 16;
      
    case 'chart':
      return (node.attrs.height || 300) + 16;
      
    case 'blockquote':
      let quoteHeight = 0;
      node.forEach((child) => {
        quoteHeight += estimateNodeHeight(child);
      });
      return quoteHeight + 24;
      
    case 'codeBlock':
      const codeLines = (node.textContent.match(/\n/g) || []).length + 1;
      return codeLines * 20 + 32;
      
    case 'horizontalRule':
    case 'pageBreak':
      return 24;
      
    default:
      return lineHeight + 8;
  }
}

/**
 * Find optimal page break points in the document
 */
function findPageBreaks(
  view: EditorView,
  options: PaginationOptions
): PageBreakPoint[] {
  const { doc } = view.state;
  const contentArea = getContentArea(options);
  const pageHeight = contentArea.height;
  
  const breaks: PageBreakPoint[] = [];
  let currentPageHeight = 0;
  let lastGoodBreakPos = 0;
  let lastGoodBreakHeight = 0;
  
  // Track positions for keep-with-next logic
  let pendingKeepWithNext: { pos: number; height: number } | null = null;
  
  doc.forEach((node, offset) => {
    const pos = offset;
    const nodeHeight = measureNodeHeight(view, pos, node);
    
    // Check for explicit page breaks
    if (node.type.name === 'pageBreak') {
      breaks.push({
        pos,
        nodeType: 'pageBreak',
        preferredBreak: true,
        reason: 'explicit',
      });
      currentPageHeight = 0;
      lastGoodBreakPos = pos + node.nodeSize;
      lastGoodBreakHeight = 0;
      pendingKeepWithNext = null;
      return;
    }
    
    // Check if this node would overflow the page
    const wouldOverflow = currentPageHeight + nodeHeight > pageHeight;
    
    if (wouldOverflow) {
      // Determine where to break
      let breakPos = lastGoodBreakPos;
      let breakReason: PageBreakPoint['reason'] = 'overflow';
      
      // If we have a pending keep-with-next, break before it instead
      if (pendingKeepWithNext && options.keepWithNext) {
        breakPos = pendingKeepWithNext.pos;
        currentPageHeight = pendingKeepWithNext.height + nodeHeight;
      } else if (UNSPLITTABLE_NODES.has(node.type.name)) {
        // Don't split unsplittable nodes - break before them
        breakPos = pos;
        currentPageHeight = nodeHeight;
      } else if (node.type.name === 'table' && !options.tableRowSplitting) {
        // Don't split tables unless explicitly allowed
        breakPos = pos;
        currentPageHeight = nodeHeight;
      } else {
        // Normal break at last good position
        currentPageHeight = currentPageHeight - lastGoodBreakHeight + nodeHeight;
      }
      
      breaks.push({
        pos: breakPos,
        nodeType: node.type.name,
        preferredBreak: !UNSPLITTABLE_NODES.has(node.type.name),
        reason: breakReason,
      });
      
      lastGoodBreakPos = pos + node.nodeSize;
      lastGoodBreakHeight = nodeHeight;
      pendingKeepWithNext = null;
    } else {
      currentPageHeight += nodeHeight;
      
      // Track keep-with-next nodes
      if (KEEP_WITH_NEXT_NODES.has(node.type.name) && options.keepWithNext) {
        pendingKeepWithNext = { pos, height: nodeHeight };
      } else {
        // This is a good break point
        lastGoodBreakPos = pos + node.nodeSize;
        lastGoodBreakHeight = currentPageHeight;
        pendingKeepWithNext = null;
      }
    }
  });
  
  return breaks;
}

/**
 * Create page gap decoration
 */
function createPageGapDecoration(
  pos: number,
  pageNumber: number,
  totalPages: number,
  options: PaginationOptions
): Decoration {
  return Decoration.widget(pos, () => {
    
    const container = document.createElement('div');
    container.className = 'pagination-gap';
    container.dataset.pageNumber = String(pageNumber);
    
    // Footer for previous page (shows page number of the page that just ended)
    const footer = document.createElement('div');
    footer.className = 'pagination-gap-footer';
    footer.innerHTML = `
      <span class="footer-left">${formatPageContent(options.footerContent.left, pageNumber, totalPages)}</span>
      <span class="footer-center">${formatPageContent(options.footerContent.center || '', pageNumber, totalPages)}</span>
      <span class="footer-right">${formatPageContent(options.footerContent.right, pageNumber, totalPages)}</span>
    `;
    
    // Gap space
    const gap = document.createElement('div');
    gap.className = 'pagination-gap-space';
    gap.style.height = `${options.pageGap}px`;
    gap.style.backgroundColor = options.pageGapColor;
    gap.style.borderTop = `1px solid ${options.pageBorderColor}`;
    gap.style.borderBottom = `1px solid ${options.pageBorderColor}`;
    
    // Header for next page
    const header = document.createElement('div');
    header.className = 'pagination-gap-header';
    header.innerHTML = `
      <span class="header-left">${formatPageContent(options.headerContent.left, pageNumber + 1, totalPages)}</span>
      <span class="header-center">${formatPageContent(options.headerContent.center || '', pageNumber + 1, totalPages)}</span>
      <span class="header-right">${formatPageContent(options.headerContent.right, pageNumber + 1, totalPages)}</span>
    `;
    
    container.appendChild(footer);
    container.appendChild(gap);
    container.appendChild(header);
    
    // Apply styles
    container.style.cssText = `
      width: calc(100% + ${options.pageMargins.left + options.pageMargins.right}px);
      margin-left: -${options.pageMargins.left}px;
      margin-right: -${options.pageMargins.right}px;
      position: relative;
      z-index: 10;
    `;
    
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 8px ${options.pageMargins.right}px 16px ${options.pageMargins.left}px;
      font-size: var(--footer-font-size, 11px);
      color: var(--footer-color, #6b7280);
    `;
    
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 16px ${options.pageMargins.right}px 8px ${options.pageMargins.left}px;
      font-size: var(--header-font-size, 11px);
      color: var(--header-color, #6b7280);
    `;
    
    return container;
  }, { side: -1 });
}

/**
 * Format page content with placeholders
 */
function formatPageContent(content: string, pageNumber: number, totalPages: number): string {
  return content
    .replace(/\{page\}/gi, String(pageNumber))
    .replace(/\{total\}/gi, String(totalPages))
    .replace(/\{pages\}/gi, String(totalPages));
}

/**
 * Create first page header decoration
 */
function createFirstPageHeaderDecoration(options: PaginationOptions, totalPages: number): Decoration {
  return Decoration.widget(0, () => {
    const header = document.createElement('div');
    header.className = 'pagination-first-header';
    
    const hasHeaderContent = options.headerContent.left || options.headerContent.right || options.headerContent.center;
    
    header.innerHTML = `
      <span class="header-left">${formatPageContent(options.headerContent.left, 1, totalPages)}</span>
      <span class="header-center">${formatPageContent(options.headerContent.center || '', 1, totalPages)}</span>
      <span class="header-right">${formatPageContent(options.headerContent.right, 1, totalPages)}</span>
    `;
    
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding-bottom: 8px;
      margin-bottom: 16px;
      font-size: var(--header-font-size, 11px);
      color: var(--header-color, #6b7280);
      border-bottom: ${hasHeaderContent ? '1px solid #e5e7eb' : 'none'};
      min-height: ${hasHeaderContent ? 'auto' : '0'};
    `;
    
    return header;
  }, { side: -1 });
}

/**
 * Create first page footer decoration (at end of first page content area)
 * This is used for single-page documents to show page number
 */
function createFirstPageFooterDecoration(pos: number, options: PaginationOptions, totalPages: number): Decoration {
  return Decoration.widget(pos, () => {
    const footer = document.createElement('div');
    footer.className = 'pagination-first-footer';
    
    footer.innerHTML = `
      <span class="footer-left">${formatPageContent(options.footerContent.left, 1, totalPages)}</span>
      <span class="footer-center">${formatPageContent(options.footerContent.center || '', 1, totalPages)}</span>
      <span class="footer-right">${formatPageContent(options.footerContent.right, 1, totalPages)}</span>
    `;
    
    // Use relative positioning with margin-top to push to bottom
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 16px 0 8px 0;
      margin-top: 40px;
      font-size: var(--footer-font-size, 11px);
      color: var(--footer-color, #6b7280);
      border-top: 1px solid #e5e7eb;
    `;
    
    return footer;
  }, { side: 1 });
}

/**
 * Create decorations for all page breaks
 */
function createDecorations(
  state: EditorState,
  pageBreaks: PageBreakPoint[],
  options: PaginationOptions
): DecorationSet {
  const decorations: Decoration[] = [];
  const totalPages = pageBreaks.length + 1;
  
  
  // Add first page header if content exists
  const hasHeaderContent = options.headerContent.left || options.headerContent.right || options.headerContent.center;
  if (hasHeaderContent) {
    decorations.push(createFirstPageHeaderDecoration(options, totalPages));
  }
  
  // Add page gap decorations at each break point
  pageBreaks.forEach((breakPoint, index) => {
    decorations.push(createPageGapDecoration(breakPoint.pos, index + 1, totalPages, options));
  });
  
  // If there are no page breaks, we still need to show page 1 footer
  // This is handled by adding a footer decoration at the end of the document
  if (pageBreaks.length === 0) {
    const hasFooterContent = options.footerContent.left || options.footerContent.right || options.footerContent.center;
    if (hasFooterContent) {
      // Add footer at end of document
      const endPos = state.doc.content.size;
      decorations.push(createFirstPageFooterDecoration(endPos, options, 1));
    }
  }
  
  return DecorationSet.create(state.doc, decorations);
}

/**
 * Create the pagination plugin
 */
export function createPaginationPlugin(initialOptions: Partial<PaginationOptions> = {}): Plugin {
  const options: PaginationOptions = { ...DEFAULT_OPTIONS, ...initialOptions };
  
  
  return new Plugin<PaginationState>({
    key: paginationPluginKey,
    
    state: {
      init(): PaginationState {
        return {
          pageCount: 1,
          pageBreaks: [],
          decorations: DecorationSet.empty,
          options,
          lastMeasuredHeight: 0,
        };
      },
      
      apply(tr: Transaction, pluginState: PaginationState): PaginationState {
        // Check if meta contains full state update (from recalculate)
        const meta = tr.getMeta(paginationPluginKey);
        if (meta) {
          // If meta contains decorations, it's a full recalculation
          if (meta.decorations) {
            return {
              ...pluginState,
              pageCount: meta.pageCount ?? pluginState.pageCount,
              pageBreaks: meta.pageBreaks ?? pluginState.pageBreaks,
              decorations: meta.decorations,
              options: meta.options ? { ...pluginState.options, ...meta.options } : pluginState.options,
            };
          }
          // Otherwise it's just an options update
          return {
            ...pluginState,
            options: { ...pluginState.options, ...meta },
          };
        }
        
        // If document changed, map decorations but mark for recalculation
        if (tr.docChanged) {
          return {
            ...pluginState,
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
          };
        }
        
        // Map existing decorations through the transaction
        return {
          ...pluginState,
          decorations: pluginState.decorations.map(tr.mapping, tr.doc),
        };
      },
    },
    
    view(view: EditorView) {
      let recalculateTimeout: ReturnType<typeof setTimeout> | null = null;
      let lastOptionsHash = '';
      
      // Initial calculation
      const recalculate = (force = false) => {
        const pluginState = paginationPluginKey.getState(view.state);
        if (!pluginState) return;
        
        // Create a hash of options to detect changes
        const optionsHash = JSON.stringify({
          showPageNumbers: pluginState.options.showPageNumbers,
          footerContent: pluginState.options.footerContent,
          headerContent: pluginState.options.headerContent,
          pageMargins: pluginState.options.pageMargins,
        });
        
        const pageBreaks = findPageBreaks(view, pluginState.options);
        const decorations = createDecorations(view.state, pageBreaks, pluginState.options);
        
        // Check if we need to update
        const breaksChanged = pageBreaks.length !== pluginState.pageBreaks.length;
        const optionsChanged = optionsHash !== lastOptionsHash;
        
        if (breaksChanged || optionsChanged || force) {
          lastOptionsHash = optionsHash;
          
          // Update state with new calculations
          const tr = view.state.tr.setMeta(paginationPluginKey, {
            pageBreaks,
            decorations,
            pageCount: pageBreaks.length + 1,
          });
          
          // Use requestAnimationFrame to avoid layout thrashing
          requestAnimationFrame(() => {
            if (view.isDestroyed) return;
            view.dispatch(tr);
          });
        }
      };
      
      // Debounced recalculate
      const debouncedRecalculate = (force = false) => {
        if (recalculateTimeout) {
          clearTimeout(recalculateTimeout);
        }
        recalculateTimeout = setTimeout(() => recalculate(force), 50);
      };
      
      // Recalculate on mount
      setTimeout(() => recalculate(true), 100);
      
      // Set up resize observer for container size changes
      const resizeObserver = new ResizeObserver(() => {
        debouncedRecalculate();
      });
      
      resizeObserver.observe(view.dom);
      
      return {
        update(view, prevState) {
          // Check if document changed
          if (view.state.doc !== prevState.doc) {
            debouncedRecalculate();
          }
          
          // Check if options changed via meta
          const prevPluginState = paginationPluginKey.getState(prevState);
          const currPluginState = paginationPluginKey.getState(view.state);
          if (prevPluginState && currPluginState) {
            if (prevPluginState.options !== currPluginState.options) {
              // Options changed, force recalculate
              debouncedRecalculate(true);
            }
          }
        },
        destroy() {
          if (recalculateTimeout) {
            clearTimeout(recalculateTimeout);
          }
          resizeObserver.disconnect();
        },
      };
    },
    
    props: {
      decorations(state: EditorState): DecorationSet {
        const pluginState = paginationPluginKey.getState(state);
        return pluginState?.decorations || DecorationSet.empty;
      },
      
      // Add class to editor for styling
      attributes: {
        class: 'with-pagination',
      },
    },
  });
}

/**
 * Get current pagination state from editor
 */
export function getPaginationState(state: EditorState): PaginationState | undefined {
  return paginationPluginKey.getState(state);
}

/**
 * Update pagination options
 */
export function updatePaginationOptions(
  view: EditorView,
  options: Partial<PaginationOptions>
): void {
  const tr = view.state.tr.setMeta(paginationPluginKey, options);
  view.dispatch(tr);
}
