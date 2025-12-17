/**
 * Pagination Extension
 * 
 * The main Tiptap extension that provides pagination functionality.
 * This combines the pagination plugin with editor commands for controlling
 * page settings.
 */

import { Extension, Editor } from '@tiptap/core';
import { createPaginationPlugin, paginationPluginKey } from './pagination-plugin';
import type { PaginationOptions, PageSize, PageMargins, HeaderFooterContent } from './types';
import { DEFAULT_OPTIONS, PAGE_SIZES, getPageDimensions, getContentArea } from './types';
import { openPrintPreview, printDirect } from './print-preview';

export interface PaginationExtensionOptions extends Partial<PaginationOptions> {}

// ID for the dynamic print style element
const PRINT_STYLE_ID = 'pagination-print-styles';

/**
 * Convert pixels to millimeters for @page CSS
 * Standard: 96 DPI, so 1 inch = 96px = 25.4mm
 */
function pxToMm(px: number): number {
  return px * 25.4 / 96;
}

/**
 * Inject dynamic @page styles for print
 * This is necessary because @page doesn't support CSS variables
 */
function injectPrintStyles(options: PaginationOptions): void {
  // Remove existing print style if present
  const existing = document.getElementById(PRINT_STYLE_ID);
  if (existing) {
    existing.remove();
  }
  
  const pageDims = getPageDimensions(options);
  
  // Convert to mm for @page (more reliable across browsers)
  const pageWidthMm = pxToMm(pageDims.width);
  const pageHeightMm = pxToMm(pageDims.height);
  const marginTopMm = pxToMm(options.pageMargins.top);
  const marginBottomMm = pxToMm(options.pageMargins.bottom);
  const marginLeftMm = pxToMm(options.pageMargins.left);
  const marginRightMm = pxToMm(options.pageMargins.right);
  
  // Create style element with @page rules
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      @page {
        size: ${pageWidthMm.toFixed(2)}mm ${pageHeightMm.toFixed(2)}mm;
        margin: ${marginTopMm.toFixed(2)}mm ${marginRightMm.toFixed(2)}mm ${marginBottomMm.toFixed(2)}mm ${marginLeftMm.toFixed(2)}mm;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Update CSS variables on the editor element for robust page styling
 */
function applyCssVariables(editor: Editor, options: PaginationOptions): void {
  const dom = editor.view.dom as HTMLElement;
  
  const pageDims = getPageDimensions(options);
  const contentArea = getContentArea(options);
  
  // Build shadow string
  const shadowStr = options.pageShadow 
    ? `0 ${options.pageShadowBlur / 2}px ${options.pageShadowBlur}px ${options.pageShadowSpread}px ${options.pageShadowColor}`
    : 'none';
  
  // Build border string
  const borderStr = options.pageBorder 
    ? `${options.pageBorderWidth}px solid ${options.pageBorderColor}`
    : 'none';
  
  const vars: Record<string, string> = {
    // Page dimensions
    '--page-width': `${pageDims.width}px`,
    '--page-height': `${pageDims.height}px`,
    '--page-content-width': `${contentArea.width}px`,
    '--page-content-height': `${contentArea.height}px`,
    
    // Margins
    '--page-margin-top': `${options.pageMargins.top}px`,
    '--page-margin-bottom': `${options.pageMargins.bottom}px`,
    '--page-margin-left': `${options.pageMargins.left}px`,
    '--page-margin-right': `${options.pageMargins.right}px`,
    '--content-margin-top': `${options.contentMargins.top}px`,
    '--content-margin-bottom': `${options.contentMargins.bottom}px`,
    
    // Page gap
    '--page-gap': `${options.pageGap}px`,
    '--page-gap-color': options.pageGapColor,
    
    // Page styling
    '--page-border': borderStr,
    '--page-border-color': options.pageBorderColor,
    '--page-border-width': `${options.pageBorderWidth}px`,
    '--page-background': options.pageBackground,
    '--page-shadow': shadowStr,
    
    // Header/Footer
    '--header-height': `${options.headerHeight}px`,
    '--footer-height': `${options.footerHeight}px`,
    '--header-font-size': `${options.headerFontSize}px`,
    '--footer-font-size': `${options.footerFontSize}px`,
    '--header-color': options.headerColor,
    '--footer-color': options.footerColor,
  };
  
  Object.entries(vars).forEach(([key, value]) => {
    dom.style.setProperty(key, value);
  });
  
  // Apply direct styles to editor element for PDF/Word-like appearance
  dom.style.width = `${pageDims.width}px`;
  dom.style.minHeight = `${pageDims.height}px`;
  dom.style.paddingLeft = `${options.pageMargins.left}px`;
  dom.style.paddingRight = `${options.pageMargins.right}px`;
  dom.style.paddingTop = `${options.pageMargins.top}px`;
  dom.style.paddingBottom = `${options.pageMargins.bottom}px`;
  
  // Inject dynamic print styles with actual values (not CSS variables)
  injectPrintStyles(options);
  dom.style.backgroundColor = options.pageBackground;
  dom.style.border = borderStr;
  dom.style.boxShadow = shadowStr;
  dom.style.boxSizing = 'border-box';
  
  // Also set CSS variables on document root for print styles
  const root = document.documentElement;
  root.style.setProperty('--print-page-width', `${pageDims.width}px`);
  root.style.setProperty('--print-page-height', `${pageDims.height}px`);
  root.style.setProperty('--print-margin-top', `${options.pageMargins.top}px`);
  root.style.setProperty('--print-margin-bottom', `${options.pageMargins.bottom}px`);
  root.style.setProperty('--print-margin-left', `${options.pageMargins.left}px`);
  root.style.setProperty('--print-margin-right', `${options.pageMargins.right}px`);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      /**
       * Set the page size
       */
      setPageSize: (size: PageSize) => ReturnType;
      
      /**
       * Set page orientation
       */
      setPageOrientation: (orientation: 'portrait' | 'landscape') => ReturnType;
      
      /**
       * Set page margins
       */
      setPageMargins: (margins: Partial<PageMargins>) => ReturnType;
      
      /**
       * Set header content
       */
      setHeaderContent: (content: Partial<HeaderFooterContent>) => ReturnType;
      
      /**
       * Set footer content
       */
      setFooterContent: (content: Partial<HeaderFooterContent>) => ReturnType;
      
      /**
       * Insert a page break at current position
       */
      insertPageBreak: () => ReturnType;
      
      /**
       * Set page gap size
       */
      setPageGap: (gap: number) => ReturnType;
      
      /**
       * Set page background color
       */
      setPageBackground: (color: string) => ReturnType;
      
      /**
       * Toggle page number visibility
       */
      togglePageNumbers: () => ReturnType;
      
      /**
       * Update multiple pagination options at once
       */
      updatePagination: (options: Partial<PaginationOptions>) => ReturnType;
      
      /**
       * Open print preview window
       */
      openPrintPreview: () => ReturnType;
      
      /**
       * Print directly (opens print dialog)
       */
      print: () => ReturnType;
    };
  }
}

export const Pagination = Extension.create<PaginationExtensionOptions>({
  name: 'pagination',

  addOptions() {
    return {
      ...DEFAULT_OPTIONS,
    };
  },

  addStorage() {
    return {
      pageCount: 1,
      currentPage: 1,
      options: { ...DEFAULT_OPTIONS, ...this.options },
    };
  },

  onCreate() {
    // Apply initial styles to editor container
    const dom = this.editor.view.dom as HTMLElement;
    dom.classList.add('with-pagination');
    
    // Set CSS variables for page dimensions
    applyCssVariables(this.editor, this.storage.options as PaginationOptions);
  },

  onUpdate() {
    // Update CSS variables when content changes
    applyCssVariables(this.editor, this.storage.options as PaginationOptions);
  },

  addCommands() {
    const extension = this;
    return {
      setPageSize: (size: PageSize) => ({ tr, dispatch }) => {
        if (dispatch) {
          const newOptions = { pageSize: size };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      setPageOrientation: (orientation: 'portrait' | 'landscape') => ({ tr, dispatch }) => {
        if (dispatch) {
          const newOptions = { pageOrientation: orientation };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      setPageMargins: (margins: Partial<PageMargins>) => ({ tr, dispatch }) => {
        if (dispatch) {
          const currentMargins = extension.storage.options.pageMargins;
          const newMargins = { ...currentMargins, ...margins };
          const newOptions = { pageMargins: newMargins };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      setHeaderContent: (content: Partial<HeaderFooterContent>) => ({ tr, dispatch }) => {
        if (dispatch) {
          const currentHeader = extension.storage.options.headerContent;
          const newHeader = { ...currentHeader, ...content };
          const newOptions = { headerContent: newHeader };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
        }
        return true;
      },

      setFooterContent: (content: Partial<HeaderFooterContent>) => ({ tr, dispatch }) => {
        if (dispatch) {
          const currentFooter = extension.storage.options.footerContent;
          const newFooter = { ...currentFooter, ...content };
          const newOptions = { footerContent: newFooter };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
        }
        return true;
      },

      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({
          type: 'pageBreak',
          attrs: { breakType: 'hard' },
        });
      },

      setPageGap: (gap: number) => ({ tr, dispatch }) => {
        if (dispatch) {
          const newOptions = { pageGap: gap };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      setPageBackground: (color: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          const newOptions = { pageBackground: color };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      togglePageNumbers: () => ({ tr, dispatch }) => {
        if (dispatch) {
          const newOptions = { showPageNumbers: !extension.storage.options.showPageNumbers };
          tr.setMeta(paginationPluginKey, newOptions);
          extension.storage.options = { ...extension.storage.options, ...newOptions };
        }
        return true;
      },

      updatePagination: (options: Partial<PaginationOptions>) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(paginationPluginKey, options);
          extension.storage.options = { ...extension.storage.options, ...options };
          applyCssVariables(extension.editor, extension.storage.options as PaginationOptions);
        }
        return true;
      },

      openPrintPreview: () => () => {
        openPrintPreview(extension.editor, extension.storage.options as PaginationOptions);
        return true;
      },

      print: () => () => {
        printDirect(extension.editor, extension.storage.options as PaginationOptions);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      createPaginationPlugin(this.options),
    ];
  },
});

// Re-export types and utilities
export { PAGE_SIZES, DEFAULT_OPTIONS, getPageDimensions, getContentArea };
export type { PaginationOptions, PageSize, PageMargins, HeaderFooterContent };
