import type { EditorView } from '@tiptap/pm/view';
import type { PaginationOptions, PageBreak, NodePosition, PaginationState } from './types';
import { mmToPx, measureNodeHeight } from './measure';

/**
 * Calculate usable content height per page in pixels
 * Note: This should match the actual available height in the editor
 */
export function calculatePageContentHeight(options: PaginationOptions): number {
  const pageHeightPx = mmToPx(options.pageSize.height);
  const marginTopPx = mmToPx(options.margins.top);
  const marginBottomPx = mmToPx(options.margins.bottom);
  const headerHeightPx = mmToPx(options.headerHeight);
  const footerHeightPx = mmToPx(options.footerHeight);
  
  // The actual content height available per page
  // This matches what will be printed on each page
  const contentHeight = pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx;
  
  console.log('[LayoutEngine] Page height breakdown:', {
    pageHeightPx,
    marginTopPx,
    marginBottomPx,
    headerHeightPx,
    footerHeightPx,
    contentHeight,
  });
  
  return contentHeight;
}

/**
 * Calculate page breaks based on node heights
 * This is the core pagination logic - simple and performant
 */
export function calculatePageBreaks(
  view: EditorView,
  options: PaginationOptions
): PaginationState {
  const pageContentHeight = calculatePageContentHeight(options);
  
  const pageBreaks: PageBreak[] = [];
  const nodePositions = new Map<number, NodePosition>();

  let currentPageIndex = 0;
  let currentPageOffset = 0;
  let cumulativeHeight = 0;

  const { state } = view;
  const processBlock = (pos: number) => {
    const height = measureNodeHeight(view, pos);
    if (height <= 0) {
      return;
    }

    if (currentPageOffset > 0 && currentPageOffset + height > pageContentHeight) {
      pageBreaks.push({
        afterPos: pos - 1,
        pageIndex: currentPageIndex,
        y: cumulativeHeight,
      });

      currentPageIndex++;
      currentPageOffset = 0;
    }

    nodePositions.set(pos, {
      pos,
      height,
      pageIndex: currentPageIndex,
      offsetInPage: currentPageOffset,
    });

    currentPageOffset += height;
    cumulativeHeight += height;
  };

  state.doc.descendants((node, pos) => {
    const type = node.type.name;

    if (type === 'doc') {
      return true;
    }

    if (type === 'table') {
      let handledRows = false;

      node.forEach((child, offset) => {
        if (child.type.name === 'tableRow') {
          const rowPos = pos + 1 + offset;
          processBlock(rowPos);
          handledRows = true;
        }
      });

      if (!handledRows) {
        processBlock(pos);
      }

      return false; // do not traverse into cells separately
    }

    if (type === 'tableRow' || type === 'tableCell' || type === 'tableHeader') {
      return false;
    }

    if (!node.isBlock) {
      return true;
    }

    processBlock(pos);
    return false;
  });
  
  return {
    pageBreaks,
    nodePositions,
    totalPages: currentPageIndex + 1,
    contentHeight: cumulativeHeight,
    isDirty: false,
  };
}

/**
 * Find which page a given document position is on
 */
export function findPageForPosition(
  state: PaginationState,
  pos: number
): number {
  const nodePos = state.nodePositions.get(pos);
  if (nodePos) {
    return nodePos.pageIndex;
  }
  
  // If exact position not found, find nearest
  let nearestPage = 0;
  for (const [nodePos, info] of state.nodePositions.entries()) {
    if (nodePos <= pos) {
      nearestPage = info.pageIndex;
    } else {
      break;
    }
  }
  
  return nearestPage;
}

/**
 * Get all nodes on a specific page
 */
export function getNodesOnPage(
  state: PaginationState,
  pageIndex: number
): NodePosition[] {
  const nodes: NodePosition[] = [];
  
  for (const nodePos of state.nodePositions.values()) {
    if (nodePos.pageIndex === pageIndex) {
      nodes.push(nodePos);
    }
  }
  
  return nodes.sort((a, b) => a.pos - b.pos);
}
