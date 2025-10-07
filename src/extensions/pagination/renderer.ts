import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type { PaginationState, PaginationOptions } from './types';
import { mmToPx } from './measure';

/**
 * Create visual page break decorations
 */
export function createPageBreakDecorations(
  state: EditorState,
  paginationState: PaginationState,
  options: PaginationOptions
): DecorationSet {
  
  const decorations: Decoration[] = [];
  
  const marginLeftPx = mmToPx(options.margins.left);
  
  // Add first page number at document start if enabled
  if (options.showPageNumbers && paginationState.totalPages > 0) {
    try {
      const firstPageWidget = Decoration.widget(
        0,
        () => {
          const pageNum = document.createElement('div');
          pageNum.className = 'page-number-display';
          pageNum.style.cssText = `
            position: sticky;
            top: 0;
            width: 100%;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: ${options.pageNumberPosition};
            padding: 0 ${marginLeftPx}px;
            font-size: 10px;
            color: #9ca3af;
            background: rgba(249, 250, 251, 0.8);
            backdrop-filter: blur(4px);
            border-bottom: 1px solid #e5e7eb;
            z-index: 10;
            user-select: none;
            pointer-events: none;
          `;
          pageNum.textContent = 'Page 1';
          return pageNum;
        },
        { side: -1 }
      );
      decorations.push(firstPageWidget);
    } catch (error) {
      console.error('[Renderer] Error creating first page widget:', error);
    }
  }
  
  // Create decorations for each page break
  for (const pageBreak of paginationState.pageBreaks) {
    // Ensure position is valid
    const pos = Math.min(pageBreak.afterPos + 1, state.doc.content.size);
    
    if (pos < 0 || pos > state.doc.content.size) {
      console.warn('[Renderer] Invalid position for page break:', pos, 'doc size:', state.doc.content.size);
      continue;
    }
    
    try {
      const widget = Decoration.widget(
        pos,
        () => {
          const container = document.createElement('div');
          container.className = 'page-break-marker';
          container.style.cssText = `
            position: relative;
            width: 100%;
            height: 40px;
            margin: 0 -${marginLeftPx}px;
            padding: 0 ${marginLeftPx}px;
            background: linear-gradient(to bottom, transparent 0%, #f3f4f6 50%, transparent 100%);
            border-top: 1px dashed #d1d5db;
            border-bottom: 1px dashed #d1d5db;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 11px;
            color: #6b7280;
            user-select: none;
            pointer-events: none;
          `;
          
          const label = document.createElement('span');
          label.textContent = `Page ${pageBreak.pageIndex + 1} • Page ${pageBreak.pageIndex + 2}`;
          label.style.cssText = `
            background: white;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
          `;
          
          container.appendChild(label);
          
          // Add page numbers if enabled
          if (options.showPageNumbers) {
            const pageNumbers = document.createElement('div');
            pageNumbers.className = 'page-numbers-preview';
            pageNumbers.style.cssText = `
              display: flex;
              justify-content: space-between;
              width: 100%;
              padding: 0 ${marginLeftPx}px;
              font-size: 9px;
              color: #9ca3af;
            `;
            
            const leftNum = document.createElement('span');
            leftNum.textContent = options.pageNumberPosition === 'left' ? `${pageBreak.pageIndex + 1}` : '';
            
            const centerNum = document.createElement('span');
            centerNum.textContent = options.pageNumberPosition === 'center' ? `${pageBreak.pageIndex + 1}` : '';
            centerNum.style.cssText = 'flex: 1; text-align: center;';
            
            const rightNum = document.createElement('span');
            rightNum.textContent = options.pageNumberPosition === 'right' ? `${pageBreak.pageIndex + 1}` : '';
            
            pageNumbers.appendChild(leftNum);
            pageNumbers.appendChild(centerNum);
            pageNumbers.appendChild(rightNum);
            container.appendChild(pageNumbers);
          }
          
          return container;
        },
        { side: 1 }
      );
      
      decorations.push(widget);
    } catch (error) {
      console.error('[Renderer] Error creating page break widget at pos', pos, ':', error);
    }
  }
  
  // Sort decorations by position (required by ProseMirror)
  decorations.sort((a, b) => {
    const aPos = (a as any).from || 0;
    const bPos = (b as any).from || 0;
    return aPos - bPos;
  });
  
  try {
    const decoSet = DecorationSet.create(state.doc, decorations);
    console.log('[Renderer] Created', decorations.length, 'decorations for', paginationState.pageBreaks.length, 'page breaks');
    return decoSet;
  } catch (error) {
    console.error('[Renderer] Error creating DecorationSet:', error);
    return DecorationSet.empty;
  }
}

/**
 * Create page number footer decorations
 * Note: This is integrated into page break decorations for better positioning
 */
export function createPageNumberDecorations(
  _state: EditorState,
  _paginationState: PaginationState,
  options: PaginationOptions
): DecorationSet {
  if (!options.showPageNumbers) {
    return DecorationSet.empty;
  }
  
  // Page numbers are now rendered as part of page break markers
  // This function is kept for compatibility but returns empty
  return DecorationSet.empty;
}

/**
 * Generate print-specific CSS
 */
export function generatePrintCSS(
  options: PaginationOptions,
  paginationState: PaginationState
): string {
  const pageWidthMm = options.pageSize.width;
  const pageHeightMm = options.pageSize.height;
  const { top, bottom, left, right } = options.margins;
  
  // Generate page break rules based on calculated positions
  const pageBreakRules = paginationState.pageBreaks
    .map((pb) => {
      // Find the node at this position and add page-break-after
      return `[data-page="${pb.pageIndex}"] { page-break-after: always; }`;
    })
    .join('\n      ');
  
  return `
    @page {
      size: ${pageWidthMm}mm ${pageHeightMm}mm;
      margin: ${top}mm ${right}mm ${bottom}mm ${left}mm;
      
      ${options.showPageNumbers ? `
      @bottom-${options.pageNumberPosition} {
        content: counter(page);
        font-size: 10pt;
        color: #6b7280;
      }
      ` : ''}
    }
    
    @media print {
      html, body {
        margin: 0;
        padding: 0;
      }
      
      .page-break-marker,
      .page-number-display,
      .page-numbers-preview {
        display: none !important;
      }
      
      /* Force page breaks at calculated positions */
      ${pageBreakRules}
    }
  `;
}
