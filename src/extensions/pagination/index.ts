/**
 * Pagination Extension
 * 
 * A robust pagination system for Tiptap that provides true print fidelity
 * while maintaining smooth content flow during editing.
 * 
 * Features:
 * - Automatic page break detection based on content height
 * - Support for headers and footers with page numbers
 * - Configurable page sizes (A4, Letter, Legal, etc.)
 * - Portrait and landscape orientation
 * - Customizable margins and gaps
 * - Handles tables, images, and charts gracefully
 * - Print-optimized CSS for exact fidelity
 * 
 * Usage:
 * ```typescript
 * import { Pagination, PAGE_SIZES } from '@/extensions/pagination';
 * 
 * const editor = new Editor({
 *   extensions: [
 *     Pagination.configure({
 *       pageSize: PAGE_SIZES.A4,
 *       pageOrientation: 'portrait',
 *       footerContent: { right: 'Page {page}' },
 *     }),
 *   ],
 * });
 * ```
 */

// Main extension
export { Pagination } from './pagination-extension';
export type { PaginationExtensionOptions } from './pagination-extension';

// Types and constants
export {
  PAGE_SIZES,
  DEFAULT_OPTIONS,
  DEFAULT_MARGINS,
  DEFAULT_CONTENT_MARGINS,
  getContentArea,
  getPageDimensions,
} from './types';

export type {
  PaginationOptions,
  PageSize,
  PageMargins,
  ContentMargins,
  HeaderFooterContent,
  PageInfo,
  PageBreakPoint,
} from './types';

// Node extensions for explicit page structure
export { PageNode } from './page-node';
export { PageHeader } from './page-header';
export { PageFooter } from './page-footer';
export { PageBreak } from './page-break';

// Plugin utilities
export { 
  createPaginationPlugin, 
  paginationPluginKey,
  getPaginationState,
} from './pagination-plugin';

// Content handlers
export {
  measureTable,
  findTableSplitPoint,
  canTableFit,
  estimateTableHeight,
  getTablePaginationClasses,
  getTablePrintStyles,
} from './table-handler';

export {
  measureImage,
  calculateFitDimensions,
  canImageFit,
  estimateImageHeight,
  getImagePaginationClasses,
  getImageScaleStyles,
  getImagePrintStyles,
} from './image-handler';

// CSS import helper
export const PAGINATION_CSS_PATH = './pagination.css';
