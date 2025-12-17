/**
 * Pagination Extension Types
 * 
 * A robust pagination system for Tiptap that provides true print fidelity
 * while maintaining smooth content flow during editing.
 */

export interface PageSize {
  width: number;   // in pixels at 96 DPI
  height: number;  // in pixels at 96 DPI
}

export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ContentMargins {
  top: number;    // Space between header and content
  bottom: number; // Space between content and footer
}

export interface HeaderFooterContent {
  left: string;
  center?: string;
  right: string;
}

export interface PaginationOptions {
  // Page dimensions
  pageSize: PageSize;
  pageOrientation: 'portrait' | 'landscape';
  
  // Margins
  pageMargins: PageMargins;
  contentMargins: ContentMargins;
  
  // Visual settings
  pageGap: number;
  pageGapColor: string;
  pageBorderColor: string;
  pageBackground: string;
  
  // Page styling (PDF/Word-like)
  pageBorder: boolean;            // Show border around page
  pageBorderWidth: number;        // Border width in pixels
  pageShadow: boolean;            // Show shadow around page
  pageShadowColor: string;        // Shadow color
  pageShadowBlur: number;         // Shadow blur radius
  pageShadowSpread: number;       // Shadow spread
  
  // Header/Footer
  headerContent: HeaderFooterContent;
  footerContent: HeaderFooterContent;
  showPageNumbers: boolean;
  pageNumberFormat: 'numeric' | 'roman' | 'alpha';
  firstPageDifferent: boolean;    // Different header/footer on first page
  firstPageHeader: HeaderFooterContent;
  firstPageFooter: HeaderFooterContent;
  
  // Header/Footer styling
  headerHeight: number;           // Height reserved for header
  footerHeight: number;           // Height reserved for footer
  headerFontSize: number;         // Font size for header text
  footerFontSize: number;         // Font size for footer text
  headerColor: string;            // Header text color
  footerColor: string;            // Footer text color
  
  // Behavior
  enableAutoFlow: boolean;        // Auto-paginate content
  preventOrphanLines: boolean;    // Avoid single lines at page top/bottom
  keepWithNext: boolean;          // Keep headings with following content
  tableRowSplitting: boolean;     // Allow table rows to split across pages
  
  // Debug
  showPageBoundaries: boolean;
}

export interface PageInfo {
  pageNumber: number;
  totalPages: number;
  contentHeight: number;
  availableHeight: number;
  overflowAmount: number;
}

export interface PageBreakPoint {
  pos: number;           // ProseMirror position
  nodeType: string;      // Type of node at break point
  preferredBreak: boolean; // Is this a good break point?
  reason: 'overflow' | 'explicit' | 'keep-together';
}

// Standard page sizes at 96 DPI
export const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1591 },
  A5: { width: 559, height: 794 },
  LETTER: { width: 816, height: 1056 },
  LEGAL: { width: 816, height: 1344 },
  TABLOID: { width: 1056, height: 1632 },
} as const;

// Default margins (in pixels)
export const DEFAULT_MARGINS: PageMargins = {
  top: 72,    // ~0.75 inch
  bottom: 72,
  left: 72,
  right: 72,
};

export const DEFAULT_CONTENT_MARGINS: ContentMargins = {
  top: 16,
  bottom: 16,
};

export const DEFAULT_OPTIONS: PaginationOptions = {
  pageSize: PAGE_SIZES.A4,
  pageOrientation: 'portrait',
  pageMargins: DEFAULT_MARGINS,
  contentMargins: DEFAULT_CONTENT_MARGINS,
  pageGap: 40,
  pageGapColor: '#f3f4f6',
  pageBorderColor: '#e5e7eb',
  pageBackground: '#ffffff',
  
  // Page styling defaults (PDF/Word-like)
  pageBorder: true,
  pageBorderWidth: 1,
  pageShadow: true,
  pageShadowColor: 'rgba(0, 0, 0, 0.1)',
  pageShadowBlur: 8,
  pageShadowSpread: 0,
  
  // Header/Footer defaults
  headerContent: { left: '', right: '' },
  footerContent: { left: '', right: '{page}' },
  showPageNumbers: true,
  pageNumberFormat: 'numeric',
  firstPageDifferent: false,
  firstPageHeader: { left: '', right: '' },
  firstPageFooter: { left: '', right: '' },
  
  // Header/Footer styling
  headerHeight: 40,
  footerHeight: 40,
  headerFontSize: 11,
  footerFontSize: 11,
  headerColor: '#6b7280',
  footerColor: '#6b7280',
  
  // Behavior
  enableAutoFlow: true,
  preventOrphanLines: true,
  keepWithNext: true,
  tableRowSplitting: false,
  showPageBoundaries: true,
};

/**
 * Print safety factor - reduces content height to account for
 * differences between screen and print rendering.
 * 
 * Browser print engines use different font metrics and line heights,
 * which can cause content to be 5-15% taller in print than on screen.
 * This factor provides a conservative buffer.
 */
const PRINT_SAFETY_FACTOR = 0.92; // Use 92% of calculated height

/**
 * Calculate effective page dimensions after margins
 */
export function getContentArea(options: PaginationOptions): { width: number; height: number } {
  const { pageSize, pageOrientation, pageMargins, contentMargins } = options;
  
  const pageWidth = pageOrientation === 'landscape' ? pageSize.height : pageSize.width;
  const pageHeight = pageOrientation === 'landscape' ? pageSize.width : pageSize.height;
  
  // Calculate raw content height
  const rawHeight = pageHeight - pageMargins.top - pageMargins.bottom - contentMargins.top - contentMargins.bottom;
  
  // Apply print safety factor to prevent overflow in print
  const safeHeight = Math.floor(rawHeight * PRINT_SAFETY_FACTOR);
  
  return {
    width: pageWidth - pageMargins.left - pageMargins.right,
    height: safeHeight,
  };
}

/**
 * Get full page dimensions based on orientation
 */
export function getPageDimensions(options: PaginationOptions): PageSize {
  const { pageSize, pageOrientation } = options;
  
  if (pageOrientation === 'landscape') {
    return { width: pageSize.height, height: pageSize.width };
  }
  return { ...pageSize };
}
