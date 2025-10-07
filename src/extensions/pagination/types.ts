/**
 * Pagination Types and Interfaces
 */

import type { Node as PMNode } from '@tiptap/pm/model';

export interface PageDimensions {
  width: number;
  height: number;
}

export interface PageFormat {
  a4: PageDimensions;
  a3: PageDimensions;
  letter: PageDimensions;
  legal: PageDimensions;
  card: PageDimensions;
}

export interface PaginationOptions {
  pageFormat?: keyof PageFormat;
  orientation?: 'portrait' | 'landscape';
  pageWidth?: number; // px - overrides format
  pageHeight?: number; // px - overrides format
  pageMargin?: number; // px
  pageGap?: number; // px between pages
  footerHeight?: number; // px
  headerHeight?: number; // px
  pageClass?: string;
  containerClass?: string;
  printable?: boolean;
  enabled?: boolean;
  showPageNumbers?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
}

export interface PageBreakInfo {
  pageIndex: number;
  nodes: Array<{ node: PMNode; pos: number }>;
  height: number;
  startPos: number;
  endPos: number;
}

export interface PageContent {
  elements: HTMLElement[];
  height: number;
  hasOverflow: boolean;
}

export interface MeasureResult {
  height: number;
  width: number;
  canSplit: boolean;
  splitPoints?: number[];
}

export interface SplitResult {
  before: HTMLElement;
  after: HTMLElement | null;
  splitPosition: number;
}

export interface PaginationStorage {
  pages: PageBreakInfo[];
  container: HTMLElement | null;
  measureContainer: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  mutationObserver: IntersectionObserver | null;
  layoutDebounceTimer: NodeJS.Timeout | null;
  isLayouting: boolean;
  lastLayoutHash: string;
}

// Extended storage with additional properties
export interface ExtendedPaginationStorage extends PaginationStorage {
  layoutEngine?: LayoutEngine;
  originalDisplay?: string;
  forceLayout?: boolean;
}

// Re-export LayoutEngine type
import type { LayoutEngine } from './layout-engine';

// Page dimensions in pixels at 96 DPI
export const PAGE_FORMATS: PageFormat = {
  a4: { width: 794, height: 1123 },
  a3: { width: 1123, height: 1587 },
  letter: { width: 816, height: 1056 },
  legal: { width: 816, height: 1344 },
  card: { width: 336, height: 192 },
};

export const DEFAULT_OPTIONS: Required<PaginationOptions> = {
  pageFormat: 'a4',
  orientation: 'portrait',
  pageWidth: 794,
  pageHeight: 1123,
  pageMargin: 48,
  pageGap: 24,
  footerHeight: 30,
  headerHeight: 30,
  pageClass: 'paginated-page',
  containerClass: 'paginated-container',
  printable: true,
  enabled: true,
  showPageNumbers: true,
  pageNumberPosition: 'right',
};
