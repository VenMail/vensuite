/**
 * Table Handler for Pagination
 * 
 * Handles special cases for tables that span across page boundaries.
 * Provides utilities for:
 * - Detecting table overflow
 * - Splitting tables at row boundaries
 * - Repeating header rows on new pages
 */

import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';

export interface TableMeasurement {
  tablePos: number;
  tableNode: ProseMirrorNode;
  totalHeight: number;
  headerHeight: number;
  rowHeights: number[];
  rowPositions: number[];
}

/**
 * Measure a table's dimensions in the DOM
 */
export function measureTable(view: EditorView, tablePos: number): TableMeasurement | null {
  try {
    const tableNode = view.state.doc.nodeAt(tablePos);
    if (!tableNode || tableNode.type.name !== 'table') {
      return null;
    }

    const tableDom = view.nodeDOM(tablePos);
    if (!(tableDom instanceof HTMLElement)) {
      return null;
    }

    const rows = tableDom.querySelectorAll('tr');
    const rowHeights: number[] = [];
    const rowPositions: number[] = [];
    let headerHeight = 0;
    let totalHeight = 0;
    let currentPos = tablePos + 1; // Skip table opening tag

    rows.forEach((row, index) => {
      const height = row.offsetHeight;
      rowHeights.push(height);
      rowPositions.push(currentPos);
      totalHeight += height;

      // First row is typically the header
      if (index === 0) {
        headerHeight = height;
      }

      // Calculate position for next row
      const rowNode = view.state.doc.nodeAt(currentPos);
      if (rowNode) {
        currentPos += rowNode.nodeSize;
      }
    });

    return {
      tablePos,
      tableNode,
      totalHeight,
      headerHeight,
      rowHeights,
      rowPositions,
    };
  } catch {
    return null;
  }
}

/**
 * Find the best row to split a table at given a height constraint
 */
export function findTableSplitPoint(
  measurement: TableMeasurement,
  availableHeight: number,
  includeHeaderOnNewPage: boolean = true
): { splitRowIndex: number; heightBeforeSplit: number } | null {
  const { rowHeights, headerHeight } = measurement;
  
  if (rowHeights.length <= 1) {
    // Can't split a table with only a header
    return null;
  }

  let accumulatedHeight = 0;
  let splitRowIndex = -1;

  for (let i = 0; i < rowHeights.length; i++) {
    const rowHeight = rowHeights[i];
    
    if (accumulatedHeight + rowHeight > availableHeight) {
      // This row would overflow
      splitRowIndex = i;
      break;
    }
    
    accumulatedHeight += rowHeight;
  }

  if (splitRowIndex <= 0) {
    // Can't split before or at the header
    return null;
  }

  // If we need to include header on new page, ensure there's room
  if (includeHeaderOnNewPage) {
    // The new page will need: header + at least one row
    const minNewPageHeight = headerHeight + (rowHeights[splitRowIndex] || 0);
    if (minNewPageHeight > availableHeight) {
      // Even with just header + one row, it won't fit
      // Try splitting one row earlier
      if (splitRowIndex > 1) {
        splitRowIndex -= 1;
        accumulatedHeight -= rowHeights[splitRowIndex];
      }
    }
  }

  return {
    splitRowIndex,
    heightBeforeSplit: accumulatedHeight,
  };
}

/**
 * Check if a table can fit entirely within the available height
 */
export function canTableFit(measurement: TableMeasurement, availableHeight: number): boolean {
  return measurement.totalHeight <= availableHeight;
}

/**
 * Estimate table height without DOM measurement (for initial layout)
 */
export function estimateTableHeight(tableNode: ProseMirrorNode): number {
  const ROW_HEIGHT = 40; // Average row height in pixels
  const HEADER_HEIGHT = 44; // Slightly taller for header
  const BORDER_OVERHEAD = 4;

  let rowCount = 0;
  let hasHeader = false;

  tableNode.forEach((child) => {
    if (child.type.name === 'tableRow') {
      rowCount++;
      // Check if this is a header row (contains th cells)
      child.forEach((cell) => {
        if (cell.type.name === 'tableHeader') {
          hasHeader = true;
        }
      });
    }
  });

  const bodyRows = hasHeader ? rowCount - 1 : rowCount;
  const headerRows = hasHeader ? 1 : 0;

  return (headerRows * HEADER_HEIGHT) + (bodyRows * ROW_HEIGHT) + BORDER_OVERHEAD;
}

/**
 * Get CSS classes for table pagination behavior
 */
export function getTablePaginationClasses(options: {
  allowSplit: boolean;
  repeatHeader: boolean;
}): string[] {
  const classes: string[] = ['pagination-table'];
  
  if (!options.allowSplit) {
    classes.push('pagination-no-split');
  }
  
  if (options.repeatHeader) {
    classes.push('pagination-repeat-header');
  }
  
  return classes;
}

/**
 * Generate CSS for table header repetition on print
 */
export function getTablePrintStyles(): string {
  return `
    @media print {
      /* Repeat table headers on each page */
      .pagination-table thead {
        display: table-header-group;
      }
      
      .pagination-table tbody {
        display: table-row-group;
      }
      
      /* Prevent row splitting unless explicitly allowed */
      .pagination-table:not(.pagination-allow-row-split) tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Tables that shouldn't split at all */
      .pagination-no-split {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  `;
}
