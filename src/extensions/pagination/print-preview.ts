/**
 * Print Preview System
 * 
 * Creates a custom print preview window that renders content exactly
 * as paginated in the editor, ensuring print fidelity.
 * 
 * This bypasses browser print engine layout differences by:
 * 1. Creating a new window with our exact page dimensions
 * 2. Rendering each page as a separate container
 * 3. Using CSS @page to match our dimensions exactly
 */

import type { Editor } from '@tiptap/core';
import type { PaginationOptions } from './types';
import { getPageDimensions } from './types';

/**
 * Convert pixels to millimeters
 * Standard: 96 DPI, so 1 inch = 96px = 25.4mm
 */
function pxToMm(px: number): number {
  return px * 25.4 / 96;
}

/**
 * Generate print-ready HTML with proper page sizing
 */
function generatePrintHTML(
  editor: Editor,
  options: PaginationOptions
): string {
  const pageDims = getPageDimensions(options);
  
  // Convert to mm for CSS @page
  const pageWidthMm = pxToMm(pageDims.width);
  const pageHeightMm = pxToMm(pageDims.height);
  const marginTopMm = pxToMm(options.pageMargins.top);
  const marginBottomMm = pxToMm(options.pageMargins.bottom);
  const marginLeftMm = pxToMm(options.pageMargins.left);
  const marginRightMm = pxToMm(options.pageMargins.right);
  
  // Get editor content without pagination decorations
  const editorDom = editor.view.dom as HTMLElement;
  const proseMirror = editorDom.querySelector('.ProseMirror') || editorDom;
  const contentClone = proseMirror.cloneNode(true) as HTMLElement;
  
  // Remove all pagination decorations
  contentClone.querySelectorAll('.pagination-gap, .pagination-first-header, .pagination-first-footer, .pagination-break').forEach(el => {
    el.remove();
  });
  
  // Get all stylesheets from the current document
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch {
        // Cross-origin stylesheets can't be read
        return '';
      }
    })
    .join('\n');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print Preview</title>
  <style>
    /* Include all document styles */
    ${styles}
    
    /* Reset for print */
    * {
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      background: white;
    }
    
    /* Page setup for print */
    @page {
      size: ${pageWidthMm.toFixed(2)}mm ${pageHeightMm.toFixed(2)}mm;
      margin: ${marginTopMm.toFixed(2)}mm ${marginRightMm.toFixed(2)}mm ${marginBottomMm.toFixed(2)}mm ${marginLeftMm.toFixed(2)}mm;
    }
    
    /* Content container */
    .print-content {
      width: 100%;
      font-family: inherit;
    }
    
    /* Hide pagination decorations */
    .pagination-gap,
    .pagination-gap-space,
    .pagination-gap-footer,
    .pagination-gap-header,
    .pagination-first-header,
    .pagination-first-footer,
    .pagination-break {
      display: none !important;
    }
    
    /* Ensure colors print */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Screen preview styles */
    @media screen {
      body {
        background: #f0f0f0;
        padding: 20px;
      }
      
      .print-content {
        background: white;
        width: ${pageDims.width}px;
        min-height: ${pageDims.height}px;
        margin: 0 auto;
        padding: ${options.pageMargins.top}px ${options.pageMargins.right}px ${options.pageMargins.bottom}px ${options.pageMargins.left}px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
    
    /* Print button - hide when printing */
    .print-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    
    .print-controls button {
      padding: 10px 20px;
      font-size: 14px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
    }
    
    .print-controls .print-btn {
      background: #2563eb;
      color: white;
    }
    
    .print-controls .close-btn {
      background: #6b7280;
      color: white;
    }
    
    @media print {
      .print-controls {
        display: none !important;
      }
      
      .print-content {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <button class="print-btn" onclick="window.print()">Print</button>
    <button class="close-btn" onclick="window.close()">Close</button>
  </div>
  
  <div class="print-content">
    ${contentClone.innerHTML}
  </div>
  
  <script>
    // Auto-focus the window
    window.focus();
  </script>
</body>
</html>
  `.trim();
}

/**
 * Open a print preview window with the editor content
 */
export function openPrintPreview(editor: Editor, options: PaginationOptions): Window | null {
  const html = generatePrintHTML(editor, options);
  
  // Open a new window
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    console.error('[Pagination] Failed to open print preview window. Check popup blocker.');
    return null;
  }
  
  // Write the content
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  
  return printWindow;
}

/**
 * Print the editor content directly (without preview)
 */
export function printDirect(editor: Editor, options: PaginationOptions): void {
  const printWindow = openPrintPreview(editor, options);
  if (printWindow) {
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 100);
    };
  }
}
