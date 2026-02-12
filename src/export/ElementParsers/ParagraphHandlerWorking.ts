import {
  IParagraphOptions,
  TextRun,
} from "docx";

export interface SegmentInfo {
  props: IParagraphOptions;
  isFirstSegment: boolean;
}

/**
 * Working ParagraphHandler for proper text formatting and quoted paragraphs
 * Simplified version that handles quoted text detection and formatting
 */
export class ParagraphHandler {
  constructor() {}

  /**
   * Segment a paragraph into multiple segments for proper text wrapping and formatting
   * Enhanced version that handles quoted text and complex formatting
   */
  public segmentParagraph(element: HTMLElement): SegmentInfo[] {
    const segments: SegmentInfo[] = [];
    
    // Get the text content
    const text = element.textContent || '';
    
    // Check for quoted text patterns
    const isQuoted = this.detectQuotedText(element);
    
    // Check for formatting elements
    const hasBold = element.querySelector('strong, b') !== null;
    const hasItalic = element.querySelector('em, i') !== null;
    const hasUnderline = element.querySelector('u') !== null;
    
    // Create a segment with proper formatting
    const paragraphOptions: IParagraphOptions = {
      children: [new TextRun({ 
        text,
        bold: hasBold,
        italics: hasItalic || isQuoted, // Italicize quoted text
        underline: hasUnderline ? {} : undefined,
      })],
      spacing: {
        after: 0, // No spacing for list items
      },
      // Add indentation for quoted text
      indent: isQuoted ? {
        left: 720, // 0.5 inch indent for quotes
      } : undefined,
    };
    
    segments.push({
      props: paragraphOptions,
      isFirstSegment: true,
    });
    
    return segments;
  }

  /**
   * Detect if text is quoted
   */
  private detectQuotedText(element: HTMLElement): boolean {
    // Check for blockquote elements
    if (element.querySelector('blockquote') !== null) {
      return true;
    }
    
    // Check for quoted text patterns
    const text = element.textContent || '';
    if (text.startsWith('"') && text.endsWith('"')) {
      return true;
    }
    
    // Check for quote classes
    if (element.classList.contains('quoted') || 
        element.classList.contains('quote') ||
        element.classList.contains('blockquote')) {
      return true;
    }
    
    // Check for data attributes indicating quotes
    if (element.getAttribute('data-quote') === 'true' ||
        element.getAttribute('data-type') === 'quote') {
      return true;
    }
    
    return false;
  }
}
