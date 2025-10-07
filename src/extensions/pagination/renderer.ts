/**
 * Pagination Renderer
 * Handles rendering pages and managing the paginated view
 */

import type { PaginationOptions } from './types';

export class PageRenderer {
  private options: Required<PaginationOptions>;
  private styleElement: HTMLStyleElement | null = null;

  constructor(options: Required<PaginationOptions>) {
    this.options = options;
  }

  /**
   * Create the main container for pages
   */
  createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.options.containerClass;
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${this.options.pageGap}px;
      padding: 20px;
      width: 100%;
      max-width: ${this.options.pageWidth + 100}px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      background: #f5f5f5;
    `;

    // Add styles
    this.injectStyles();
    
    return container;
  }

  /**
   * Inject CSS styles for pages
   */
  private injectStyles() {
    if (this.styleElement) return;

    const styleEl = document.createElement('style');
    styleEl.dataset.paginationStyles = 'true';
    styleEl.textContent = this.generateStyles();
    document.head.appendChild(styleEl);
    this.styleElement = styleEl;
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(): string {
    const { 
      pageWidth, 
      pageHeight, 
      pageMargin, 
      headerHeight, 
      footerHeight,
      pageClass,
      containerClass
    } = this.options;

    return `
      .${containerClass} {
        font-family: inherit;
      }

      .${pageClass} {
        width: ${pageWidth}px;
        height: ${pageHeight}px;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        position: relative;
        overflow: hidden;
        page-break-after: always;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
      }
      
      .${pageClass}-header {
        flex: 0 0 ${headerHeight}px;
        padding: 0 ${pageMargin}px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
      
      .${pageClass}-content {
        flex: 1 1 auto;
        padding: ${pageMargin}px;
        overflow: hidden;
        position: relative;
      }

      .${pageClass}-content > *:first-child {
        margin-top: 0 !important;
      }

      .${pageClass}-content > *:last-child {
        margin-bottom: 0 !important;
      }
      
      .${pageClass}-footer {
        flex: 0 0 ${footerHeight}px;
        padding: 0 ${pageMargin}px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
      
      .${pageClass}-number {
        font-weight: 500;
      }

      .${pageClass}-overflow-indicator {
        position: absolute;
        bottom: ${footerHeight + 10}px;
        right: ${pageMargin}px;
        color: #ef4444;
        font-size: 10px;
        padding: 2px 6px;
        background: #fee2e2;
        border-radius: 4px;
        display: none;
      }

      .${pageClass}.has-overflow .${pageClass}-overflow-indicator {
        display: block;
      }
      
      @media print {
        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        .${containerClass} {
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
        }
        
        .${pageClass} {
          box-shadow: none !important;
          margin: 0 !important;
          page-break-after: always !important;
        }
        
        .${pageClass}:last-child {
          page-break-after: avoid !important;
        }

        .${pageClass}-overflow-indicator {
          display: none !important;
        }
        
        @page {
          size: ${pageWidth}px ${pageHeight}px;
          margin: 0;
        }
      }

      /* Animation for page updates */
      .${pageClass}-content.updating {
        opacity: 0.5;
        transition: opacity 0.2s ease;
      }
    `;
  }

  /**
   * Create a single page element
   */
  createPage(
    content: HTMLElement | HTMLElement[], 
    pageNumber: number, 
    totalPages: number,
    hasOverflow: boolean = false
  ): HTMLElement {
    const page = document.createElement('div');
    page.className = this.options.pageClass;
    if (hasOverflow) {
      page.classList.add('has-overflow');
    }
    
    // Add header
    if (this.options.headerHeight > 0) {
      const header = this.createHeader(pageNumber, totalPages);
      page.appendChild(header);
    }
    
    // Add content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = `${this.options.pageClass}-content`;
    
    if (Array.isArray(content)) {
      content.forEach(el => contentWrapper.appendChild(el));
    } else {
      contentWrapper.appendChild(content);
    }
    
    page.appendChild(contentWrapper);
    
    // Add footer
    if (this.options.footerHeight > 0) {
      const footer = this.createFooter(pageNumber, totalPages);
      page.appendChild(footer);
    }

    // Add overflow indicator
    const overflowIndicator = document.createElement('div');
    overflowIndicator.className = `${this.options.pageClass}-overflow-indicator`;
    overflowIndicator.textContent = 'Content overflow';
    page.appendChild(overflowIndicator);
    
    return page;
  }

  /**
   * Create page header
   */
  private createHeader(_pageNumber: number, _totalPages: number): HTMLElement {
    const header = document.createElement('div');
    header.className = `${this.options.pageClass}-header`;
    
    const left = document.createElement('span');
    left.className = `${this.options.pageClass}-header-left`;
    
    const center = document.createElement('span');
    center.className = `${this.options.pageClass}-header-center`;
    
    const right = document.createElement('span');
    right.className = `${this.options.pageClass}-header-right`;
    
    header.appendChild(left);
    header.appendChild(center);
    header.appendChild(right);
    
    return header;
  }

  /**
   * Create page footer
   */
  private createFooter(pageNumber: number, totalPages: number): HTMLElement {
    const footer = document.createElement('div');
    footer.className = `${this.options.pageClass}-footer`;
    
    const left = document.createElement('span');
    left.className = `${this.options.pageClass}-footer-left`;
    
    const center = document.createElement('span');
    center.className = `${this.options.pageClass}-footer-center`;
    
    const right = document.createElement('span');
    right.className = `${this.options.pageClass}-footer-right`;
    
    // Add page numbers based on position setting
    const pageNumberElement = document.createElement('span');
    pageNumberElement.className = `${this.options.pageClass}-number`;
    pageNumberElement.textContent = `Page ${pageNumber} of ${totalPages}`;

    if (this.options.showPageNumbers) {
      switch (this.options.pageNumberPosition) {
        case 'left':
          left.appendChild(pageNumberElement);
          break;
        case 'center':
          center.appendChild(pageNumberElement);
          break;
        case 'right':
        default:
          right.appendChild(pageNumberElement);
          break;
      }
    }
    
    footer.appendChild(left);
    footer.appendChild(center);
    footer.appendChild(right);
    
    return footer;
  }

  /**
   * Update page numbers in existing pages
   */
  updatePageNumbers(container: HTMLElement) {
    const pages = container.querySelectorAll(`.${this.options.pageClass}`);
    const totalPages = pages.length;

    pages.forEach((page, index) => {
      const pageNumber = index + 1;
      const numberElement = page.querySelector(`.${this.options.pageClass}-number`);
      
      if (numberElement) {
        numberElement.textContent = `Page ${pageNumber} of ${totalPages}`;
      }
    });
  }

  /**
   * Clear all pages from container
   */
  clearPages(container: HTMLElement) {
    const pages = container.querySelectorAll(`.${this.options.pageClass}`);
    pages.forEach(page => page.remove());
  }

  /**
   * Animate page content update
   */
  animateContentUpdate(contentElement: HTMLElement, newContent: HTMLElement) {
    contentElement.classList.add('updating');
    
    setTimeout(() => {
      contentElement.innerHTML = '';
      contentElement.appendChild(newContent);
      contentElement.classList.remove('updating');
    }, 200);
  }

  /**
   * Destroy renderer and clean up
   */
  destroy() {
    if (this.styleElement && this.styleElement.parentElement) {
      this.styleElement.parentElement.removeChild(this.styleElement);
    }
    this.styleElement = null;
  }
}
