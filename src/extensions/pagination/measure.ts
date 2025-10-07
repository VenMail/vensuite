/**
 * Pagination Measurement Utilities
 * Handles DOM element measurement and height calculations
 */

import type { MeasureResult } from './types';

export class MeasureUtils {
  private measureContainer: HTMLElement;
  private cache: Map<string, MeasureResult>;

  constructor(width: number) {
    this.cache = new Map();
    this.measureContainer = this.createMeasureContainer(width);
  }

  private createMeasureContainer(width: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'pagination-measure-container';
    container.style.cssText = `
      position: absolute;
      left: -99999px;
      top: 0;
      width: ${width}px;
      visibility: hidden;
      pointer-events: none;
      overflow: visible;
    `;
    document.body.appendChild(container);
    return container;
  }

  destroy() {
    if (this.measureContainer.parentElement) {
      document.body.removeChild(this.measureContainer);
    }
    this.cache.clear();
  }

  updateWidth(width: number) {
    this.measureContainer.style.width = `${width}px`;
    this.cache.clear(); // Clear cache when width changes
  }

  /**
   * Measure an element's dimensions
   */
  measureElement(element: HTMLElement): MeasureResult {
    // Check cache first
    const cacheKey = this.getElementCacheKey(element);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Clear and append to measure container
    this.measureContainer.innerHTML = '';
    const clone = element.cloneNode(true) as HTMLElement;
    this.measureContainer.appendChild(clone);

    // Force layout recalculation
    void clone.offsetHeight;

    // Get measurements
    const rect = clone.getBoundingClientRect();
    const styles = window.getComputedStyle(clone);
    const marginTop = parseFloat(styles.marginTop) || 0;
    const marginBottom = parseFloat(styles.marginBottom) || 0;
    
    const result: MeasureResult = {
      height: rect.height + marginTop + marginBottom,
      width: rect.width,
      canSplit: this.canElementSplit(clone),
      splitPoints: this.findSplitPoints(clone),
    };

    // Cache result
    this.cache.set(cacheKey, result);
    
    // Clean up
    this.measureContainer.innerHTML = '';
    
    return result;
  }

  /**
   * Measure multiple elements as a group
   */
  measureElements(elements: HTMLElement[]): MeasureResult {
    this.measureContainer.innerHTML = '';
    
    let totalHeight = 0;
    let maxWidth = 0;
    const splitPoints: number[] = [];

    elements.forEach((element, index) => {
      const clone = element.cloneNode(true) as HTMLElement;
      this.measureContainer.appendChild(clone);
      
      const rect = clone.getBoundingClientRect();
      const styles = window.getComputedStyle(clone);
      const marginTop = parseFloat(styles.marginTop) || 0;
      const marginBottom = parseFloat(styles.marginBottom) || 0;
      
      const elementHeight = rect.height + marginTop + marginBottom;
      splitPoints.push(totalHeight + elementHeight);
      totalHeight += elementHeight;
      maxWidth = Math.max(maxWidth, rect.width);
    });

    // Clean up
    this.measureContainer.innerHTML = '';

    return {
      height: totalHeight,
      width: maxWidth,
      canSplit: true,
      splitPoints,
    };
  }

  /**
   * Check if an element can be split across pages
   */
  private canElementSplit(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // Elements that should never be split
    const unsplittable = [
      'img', 'video', 'audio', 'iframe', 'object', 'embed', 'svg',
      'canvas', 'table', 'figure', 'picture'
    ];
    
    if (unsplittable.includes(tagName)) {
      return false;
    }

    // Check CSS properties
    const styles = window.getComputedStyle(element);
    if (
      styles.breakInside === 'avoid' ||
      styles.pageBreakInside === 'avoid'
    ) {
      return false;
    }

    // Check if element has contenteditable or other special attributes
    if (element.hasAttribute('contenteditable') || element.hasAttribute('data-no-split')) {
      return false;
    }

    return true;
  }

  /**
   * Find potential split points in an element
   */
  private findSplitPoints(element: HTMLElement): number[] {
    const points: number[] = [];
    
    if (!this.canElementSplit(element)) {
      return points;
    }

    // For text nodes, find line breaks
    if (element.childNodes.length > 0) {
      const range = document.createRange();
      const textNodes = this.getTextNodes(element);
      
      textNodes.forEach(node => {
        if (node.textContent && node.textContent.length > 0) {
          // Get position of each word
          const words = node.textContent.split(/\s+/);
          let currentPos = 0;
          
          words.forEach((word, index) => {
            if (index > 0) {
              range.setStart(node, currentPos);
              range.setEnd(node, currentPos + word.length);
              const rect = range.getBoundingClientRect();
              points.push(rect.top - element.getBoundingClientRect().top);
            }
            currentPos += word.length + 1; // +1 for space
          });
        }
      });
    }

    // For block elements, find child boundaries
    const children = Array.from(element.children) as HTMLElement[];
    children.forEach((child, index) => {
      if (index > 0) {
        const rect = child.getBoundingClientRect();
        const parentRect = element.getBoundingClientRect();
        points.push(rect.top - parentRect.top);
      }
    });

    return points.filter(p => p > 0).sort((a, b) => a - b);
  }

  /**
   * Get all text nodes in an element
   */
  private getTextNodes(element: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    return textNodes;
  }

  /**
   * Generate a cache key for an element
   */
  private getElementCacheKey(element: HTMLElement): string {
    const tagName = element.tagName;
    const className = element.className;
    const textLength = element.textContent?.length || 0;
    const childCount = element.children.length;
    return `${tagName}-${className}-${textLength}-${childCount}`;
  }

  /**
   * Wait for all images in an element to load
   */
  async waitForImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const promises: Promise<void>[] = [];

    images.forEach(img => {
      if (!img.complete) {
        promises.push(
          new Promise((resolve, reject) => {
            img.addEventListener('load', () => resolve());
            img.addEventListener('error', () => reject(new Error(`Failed to load image: ${img.src}`)));
          })
        );
      }
    });

    await Promise.all(promises);
  }
}
