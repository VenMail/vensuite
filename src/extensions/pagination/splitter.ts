/**
 * Pagination Content Splitter
 * Handles splitting content across pages intelligently
 */

import type { SplitResult } from './types';
import { MeasureUtils } from './measure';

export class ContentSplitter {
  private measureUtils: MeasureUtils;

  constructor(measureUtils: MeasureUtils) {
    this.measureUtils = measureUtils;
  }

  /**
   * Split an element at a specific height
   */
  splitElement(element: HTMLElement, maxHeight: number): SplitResult {
    const tagName = element.tagName.toLowerCase();
    
    // Handle different element types
    if (this.isTextElement(tagName)) {
      return this.splitTextElement(element, maxHeight);
    } else if (this.isListElement(tagName)) {
      return this.splitListElement(element, maxHeight);
    } else if (this.isContainerElement(tagName)) {
      return this.splitContainerElement(element, maxHeight);
    }

    // Default: don't split
    return {
      before: element,
      after: null,
      splitPosition: -1,
    };
  }

  /**
   * Split a text element (p, div, span, etc.)
   */
  private splitTextElement(element: HTMLElement, maxHeight: number): SplitResult {
    const text = element.textContent || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
      return { before: element, after: null, splitPosition: -1 };
    }

    // Binary search to find split point
    let left = 0;
    let right = words.length;
    let bestSplit = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testText = words.slice(0, mid).join(' ');
      
      const testElement = element.cloneNode(false) as HTMLElement;
      testElement.textContent = testText;
      
      const result = this.measureUtils.measureElement(testElement);
      
      if (result.height <= maxHeight) {
        bestSplit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (bestSplit === 0) {
      // Can't fit any words, return whole element
      return { before: element, after: null, splitPosition: -1 };
    }

    if (bestSplit === words.length) {
      // All words fit
      return { before: element, after: null, splitPosition: -1 };
    }

    // Create split elements
    const beforeElement = element.cloneNode(false) as HTMLElement;
    beforeElement.textContent = words.slice(0, bestSplit).join(' ');
    
    const afterElement = element.cloneNode(false) as HTMLElement;
    afterElement.textContent = words.slice(bestSplit).join(' ');

    // Handle widow/orphan control
    const minWordsPerPage = 3;
    if (bestSplit < minWordsPerPage || words.length - bestSplit < minWordsPerPage) {
      // Too few words on either side, keep together
      return { before: element, after: null, splitPosition: -1 };
    }

    return {
      before: beforeElement,
      after: afterElement,
      splitPosition: bestSplit,
    };
  }

  /**
   * Split a list element
   */
  private splitListElement(element: HTMLElement, maxHeight: number): SplitResult {
    const items = Array.from(element.children) as HTMLElement[];
    if (items.length === 0) {
      return { before: element, after: null, splitPosition: -1 };
    }

    let currentHeight = 0;
    let splitIndex = -1;

    // Find split point between list items
    for (let i = 0; i < items.length; i++) {
      const itemResult = this.measureUtils.measureElement(items[i]);
      
      if (currentHeight + itemResult.height > maxHeight && i > 0) {
        splitIndex = i;
        break;
      }
      
      currentHeight += itemResult.height;
    }

    if (splitIndex === -1) {
      // All items fit or none fit
      return { before: element, after: null, splitPosition: -1 };
    }

    // Create split lists
    const beforeList = element.cloneNode(false) as HTMLElement;
    const afterList = element.cloneNode(false) as HTMLElement;

    items.slice(0, splitIndex).forEach(item => {
      beforeList.appendChild(item.cloneNode(true));
    });

    items.slice(splitIndex).forEach(item => {
      afterList.appendChild(item.cloneNode(true));
    });

    return {
      before: beforeList,
      after: afterList,
      splitPosition: splitIndex,
    };
  }

  /**
   * Split a container element (div, section, article, etc.)
   */
  private splitContainerElement(element: HTMLElement, maxHeight: number): SplitResult {
    const children = Array.from(element.children) as HTMLElement[];
    if (children.length === 0) {
      return this.splitTextElement(element, maxHeight);
    }

    let currentHeight = 0;
    let splitIndex = -1;
    let splitChild: SplitResult | null = null;

    // Find which child causes overflow
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childResult = this.measureUtils.measureElement(child);
      
      if (currentHeight + childResult.height > maxHeight) {
        // Try to split this child
        const remainingHeight = maxHeight - currentHeight;
        if (remainingHeight > 50) { // Minimum useful height
          splitChild = this.splitElement(child, remainingHeight);
          if (splitChild.after) {
            splitIndex = i;
            break;
          }
        }
        
        // Can't split child, break before it
        if (i > 0) {
          splitIndex = i;
        }
        break;
      }
      
      currentHeight += childResult.height;
    }

    if (splitIndex === -1) {
      // Everything fits or nothing fits
      return { before: element, after: null, splitPosition: -1 };
    }

    // Create split containers
    const beforeContainer = element.cloneNode(false) as HTMLElement;
    const afterContainer = element.cloneNode(false) as HTMLElement;

    // Add children to before container
    children.slice(0, splitIndex).forEach(child => {
      beforeContainer.appendChild(child.cloneNode(true));
    });

    // Handle split child if exists
    if (splitChild && splitChild.after) {
      beforeContainer.appendChild(splitChild.before);
      afterContainer.appendChild(splitChild.after);
      
      // Add remaining children
      children.slice(splitIndex + 1).forEach(child => {
        afterContainer.appendChild(child.cloneNode(true));
      });
    } else {
      // Add remaining children starting from splitIndex
      children.slice(splitIndex).forEach(child => {
        afterContainer.appendChild(child.cloneNode(true));
      });
    }

    return {
      before: beforeContainer,
      after: afterContainer.children.length > 0 ? afterContainer : null,
      splitPosition: splitIndex,
    };
  }

  /**
   * Check if element is a text element
   */
  private isTextElement(tagName: string): boolean {
    return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'blockquote'].includes(tagName);
  }

  /**
   * Check if element is a list element
   */
  private isListElement(tagName: string): boolean {
    return ['ul', 'ol', 'dl'].includes(tagName);
  }

  /**
   * Check if element is a container element
   */
  private isContainerElement(tagName: string): boolean {
    return ['div', 'section', 'article', 'aside', 'main', 'footer', 'header'].includes(tagName);
  }

  /**
   * Apply widow/orphan rules to split
   */
  applyWidowOrphanRules(before: HTMLElement, after: HTMLElement): boolean {
    // Check for headings at end of page
    const lastInBefore = before.lastElementChild;
    if (lastInBefore && /^h[1-6]$/i.test(lastInBefore.tagName)) {
      // Move heading to next page
      after.insertBefore(lastInBefore, after.firstChild);
      return true;
    }

    // Check for single line paragraphs
    const firstInAfter = after.firstElementChild;
    if (firstInAfter && firstInAfter.tagName.toLowerCase() === 'p') {
      const text = firstInAfter.textContent || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 5) {
        // Move to previous page if possible
        before.appendChild(firstInAfter);
        return true;
      }
    }

    return false;
  }
}
