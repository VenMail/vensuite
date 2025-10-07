/**
 * Pagination Layout Engine
 * Orchestrates the measurement, splitting, and rendering of paginated content
 */

import type { EditorView } from '@tiptap/pm/view';
import type { PageBreakInfo, PageContent, PaginationOptions } from './types';
import { MeasureUtils } from './measure';
import { ContentSplitter } from './splitter';
import { PageRenderer } from './renderer';

export class LayoutEngine {
  private measureUtils: MeasureUtils;
  private splitter: ContentSplitter;
  private renderer: PageRenderer;
  private options: Required<PaginationOptions>;
  private pages: PageBreakInfo[] = [];
  private layoutInProgress = false;

  constructor(options: Required<PaginationOptions>) {
    this.options = options;
    
    // Calculate content width
    const contentWidth = this.options.pageWidth - (this.options.pageMargin * 2);
    
    // Initialize utilities
    this.measureUtils = new MeasureUtils(contentWidth);
    this.splitter = new ContentSplitter(this.measureUtils);
    this.renderer = new PageRenderer(options);
  }

  /**
   * Update options and recalculate if needed
   */
  updateOptions(options: Partial<PaginationOptions>) {
    const oldWidth = this.options.pageWidth;
    const oldHeight = this.options.pageHeight;
    
    this.options = { ...this.options, ...options };
    
    // Update measure utils if width changed
    if (this.options.pageWidth !== oldWidth) {
      const contentWidth = this.options.pageWidth - (this.options.pageMargin * 2);
      this.measureUtils.updateWidth(contentWidth);
    }
    
    // Update renderer with new options
    if (this.options.pageWidth !== oldWidth || this.options.pageHeight !== oldHeight) {
      this.renderer = new PageRenderer(this.options);
    }
  }

  /**
   * Layout pages from editor content
   */
  async layoutPages(view: EditorView, container: HTMLElement): Promise<PageBreakInfo[]> {
    if (this.layoutInProgress) {
      console.debug('Layout already in progress, skipping...');
      return this.pages;
    }

    this.layoutInProgress = true;

    try {
      // Clear existing pages
      this.renderer.clearPages(container);
      
      // Clone editor content
      const content = this.cloneEditorContent(view);
      if (!content) {
        this.layoutInProgress = false;
        return [];
      }

      // Wait for images to load
      await this.measureUtils.waitForImages(content);
      
      // Paginate content
      const pageContents = await this.paginateContent(content);
      
      // Render pages
      this.renderPages(pageContents, container);
      
      // Update page info
      this.pages = this.createPageBreakInfo(pageContents, view);
      
      return this.pages;
    } catch (error) {
      console.error('Layout error:', error);
      return [];
    } finally {
      this.layoutInProgress = false;
    }
  }

  /**
   * Clone editor content for measurement
   */
  private cloneEditorContent(view: EditorView): HTMLElement | null {
    const editorDom = view.dom;
    const proseMirror = editorDom.querySelector('.ProseMirror');
    if (!proseMirror) return null;

    const clone = proseMirror.cloneNode(true) as HTMLElement;
    
    // Clean up clone
    clone.removeAttribute('contenteditable');
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    
    // Remove editor-specific classes and IDs
    clone.className = 'paginated-content-clone';
    clone.querySelectorAll('[id]').forEach(el => {
      el.removeAttribute('id');
    });
    
    // Remove selection decorations
    clone.querySelectorAll('.ProseMirror-selectednode').forEach(el => {
      el.classList.remove('ProseMirror-selectednode');
    });
    
    // Apply proper styles
    clone.style.cssText = `
      width: ${this.options.pageWidth - (this.options.pageMargin * 2)}px;
      padding: 0;
      margin: 0;
      font-size: inherit;
      line-height: inherit;
      font-family: inherit;
    `;

    return clone;
  }

  /**
   * Paginate content into pages
   */
  private async paginateContent(content: HTMLElement): Promise<PageContent[]> {
    const pages: PageContent[] = [];
    const availableHeight = this.calculateAvailableHeight();
    
    // Get all top-level elements
    const elements = Array.from(content.children) as HTMLElement[];
    
    let currentPageElements: HTMLElement[] = [];
    let currentPageHeight = 0;
    let pageIndex = 0;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Skip empty elements
      if (!element.textContent?.trim() && !element.querySelector('img, video, iframe, svg')) {
        continue;
      }
      
      // Measure element
      const measurement = this.measureUtils.measureElement(element);
      
      // Check if we need a new page
      if (currentPageHeight + measurement.height > availableHeight && currentPageElements.length > 0) {
        // Save current page
        pages.push({
          elements: currentPageElements,
          height: currentPageHeight,
          hasOverflow: false
        });
        
        // Start new page
        currentPageElements = [];
        currentPageHeight = 0;
        pageIndex++;
      }
      
      // Handle element that's taller than a page
      if (measurement.height > availableHeight) {
        // Try to split the element
        const splitResults = await this.splitAcrossPages(element, availableHeight - currentPageHeight, availableHeight);
        
        for (let j = 0; j < splitResults.length; j++) {
          const splitElement = splitResults[j];
          const splitMeasurement = this.measureUtils.measureElement(splitElement);
          
          if (j === 0 && currentPageHeight > 0) {
            // Add first part to current page
            currentPageElements.push(splitElement);
            pages.push({
              elements: currentPageElements,
              height: currentPageHeight + splitMeasurement.height,
              hasOverflow: splitMeasurement.height > availableHeight - currentPageHeight
            });
            currentPageElements = [];
            currentPageHeight = 0;
          } else {
            // Create new page for this part
            if (currentPageElements.length > 0) {
              pages.push({
                elements: currentPageElements,
                height: currentPageHeight,
                hasOverflow: false
              });
            }
            currentPageElements = [splitElement];
            currentPageHeight = splitMeasurement.height;
          }
        }
      } else {
        // Add element to current page
        currentPageElements.push(element.cloneNode(true) as HTMLElement);
        currentPageHeight += measurement.height;
      }
    }
    
    // Add last page if it has content
    if (currentPageElements.length > 0) {
      pages.push({
        elements: currentPageElements,
        height: currentPageHeight,
        hasOverflow: false
      });
    }
    
    return pages;
  }

  /**
   * Split an element across multiple pages
   */
  private async splitAcrossPages(
    element: HTMLElement, 
    firstPageSpace: number, 
    fullPageHeight: number
  ): Promise<HTMLElement[]> {
    const results: HTMLElement[] = [];
    
    // First, try to split for the remaining space on current page
    if (firstPageSpace > 50) { // Minimum useful height
      const firstSplit = this.splitter.splitElement(element, firstPageSpace);
      
      if (firstSplit.after) {
        results.push(firstSplit.before);
        
        // Continue splitting the remainder
        let remainder: HTMLElement | null = firstSplit.after;
        while (remainder) {
          const measurement = this.measureUtils.measureElement(remainder);
          if (measurement.height <= fullPageHeight) {
            results.push(remainder);
            break;
          }
          
          const nextSplit = this.splitter.splitElement(remainder, fullPageHeight);
          results.push(nextSplit.before);
          remainder = nextSplit.after;
        }
        
        return results;
      }
    }
    
    // Couldn't split for first page, start fresh on next page
    let current = element;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    
    while (current && iterations < maxIterations) {
      iterations++;
      const measurement = this.measureUtils.measureElement(current);
      
      if (measurement.height <= fullPageHeight) {
        results.push(current);
        break;
      }
      
      const split = this.splitter.splitElement(current, fullPageHeight);
      results.push(split.before);
      
      if (!split.after) {
        break;
      }
      
      current = split.after;
    }
    
    if (iterations >= maxIterations) {
      console.warn('Maximum split iterations reached, element may be truncated');
      if (current) {
        results.push(current);
      }
    }
    
    return results.length > 0 ? results : [element];
  }

  /**
   * Calculate available height for content on a page
   */
  private calculateAvailableHeight(): number {
    return this.options.pageHeight - 
           this.options.headerHeight - 
           this.options.footerHeight - 
           (this.options.pageMargin * 2);
  }

  /**
   * Render pages to container
   */
  private renderPages(pageContents: PageContent[], container: HTMLElement) {
    const totalPages = pageContents.length;
    
    pageContents.forEach((pageContent, index) => {
      const pageNumber = index + 1;
      const pageElement = this.renderer.createPage(
        pageContent.elements,
        pageNumber,
        totalPages,
        pageContent.hasOverflow
      );
      container.appendChild(pageElement);
    });
  }

  /**
   * Create page break info for reference
   */
  private createPageBreakInfo(pageContents: PageContent[], view: EditorView): PageBreakInfo[] {
    return pageContents.map((content, index) => ({
      pageIndex: index,
      nodes: [],
      height: content.height,
      startPos: 0,
      endPos: view.state.doc.content.size
    }));
  }

  /**
   * Destroy the layout engine and clean up
   */
  destroy() {
    this.measureUtils.destroy();
    this.renderer.destroy();
    this.pages = [];
  }
}
