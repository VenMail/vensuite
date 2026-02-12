// src/parsers/ListHandler.ts
import { FileChild, Paragraph, IParagraphOptions, TextRun } from "docx";
import { MAX_NESTING } from "./util/listConfig";
import { ListConfig, orderedConfig, bulletConfig } from "./util/listConfig";
import { nextListInstance } from "./util/listCounter";

export interface SegmentInfo {
  props: IParagraphOptions;
  isFirstSegment: boolean;
}

/**
 * Working ParagraphHandler for list processing
 * Handles quoted text detection and formatting
 */
class ParagraphHandler {
  constructor() {}

  /**
   * Segment a paragraph into multiple segments for list processing
   * Enhanced version that handles quoted text and formatting
   */
  public segmentParagraph(element: HTMLElement): SegmentInfo[] {
    const segments: SegmentInfo[] = [];
    
    // Get the text content and preserve formatting
    const text = element.textContent || '';
    
    // Check for quoted text
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

export class ListHandler {
  private toBreakPageBefore = false;
  constructor(private config: ListConfig) {}

  public parse(
    listElement: HTMLElement,
    listInstance: number,
    nestingDepth: number = 0
  ): FileChild[] {
    const items = Array.from(listElement.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    return items.flatMap((item) =>
      this.parseListItem(item, listInstance, nestingDepth)
    );
  }

  private parseListItem(
    li: HTMLElement,
    listInstance: number,
    nestingDepth: number
  ): FileChild[] {
    const out: FileChild[] = [];
    Array.from(li.children)
      .filter(
        (liElementChild): liElementChild is HTMLElement =>
          liElementChild instanceof HTMLElement
      )
      .forEach((child, idx) => {
        if (child.classList.contains("spacer")) {
          this.toBreakPageBefore = true;
        }

        if (child.tagName === "P") {
          const isFirst = idx === 0;
          const paras = this.handleParagraph(
            child,
            isFirst,
            listInstance,
            nestingDepth
          );
          out.push(...paras);
        }

        if (child.tagName === "OL" || child.tagName === "UL") {
          const nextConfig =
            child.tagName === "OL" ? orderedConfig : bulletConfig;
          const nextHandler = new ListHandler(nextConfig);
          out.push(
            ...nextHandler.parse(child, nextListInstance(), nestingDepth + 1)
          );
        }
      });
    return out;
  }

  private handleParagraph(
    pEl: HTMLElement,
    isFirstPara: boolean,
    listInstance: number,
    nestingDepth: number
  ): Paragraph[] {
    const handler = new ParagraphHandler();
    return handler.segmentParagraph(pEl).map(({ props }: SegmentInfo, segmentIndex: number) => {
      const effectiveFirst = isFirstPara || this.toBreakPageBefore;
      const isFirstSegment = segmentIndex === 0;

      const level = Math.min(nestingDepth, MAX_NESTING - 1);

      let numberingRef: string | undefined;
      if (isFirstSegment && effectiveFirst) {
        numberingRef = this.config.primaryRef;
      } else {
        numberingRef = this.config.nestedRef;
      }

      const opts = {
        ...props,
        ...(numberingRef && {
          numbering: { reference: numberingRef, level, instance: listInstance },
        }),
        pageBreakBefore: this.toBreakPageBefore,
      };
      this.toBreakPageBefore = false;
      return new Paragraph(opts);
    });
  }
}
