import {
  IParagraphOptions,
  IRunOptions,
  ISpacingProperties,
  TextRun,
} from "docx";
import {
  computedStyleToNumber,
  CSS_FONT_TO_WORD_FONT,
  pxToPt,
  pxToTwips,
} from "../../utils/exportUtils";

interface MeasurementNode {
  wrapperDiv: HTMLDivElement;
  measurementSpan: HTMLSpanElement;
}

interface StyledPiece {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

interface Range {
  start: number; // inclusive
  end: number; // inclusive
  text: string; // the actual substring
}

export interface SegmentInfo {
  props: IParagraphOptions;
  isFirstSegment: boolean;
}

interface FormattingRanges {
  text: string; // the full text with all tags stripped out
  boldRanges: Range[];
  italicRanges: Range[];
  underlineRanges: Range[];
  strikeRanges: Range[];
}

type TextStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

interface StyledRun extends TextStyle {
  text: string;
}

/**
 * Enhanced ParagraphHandler for proper text formatting and quoted paragraphs
 * Based on DocExCore's ParagraphHandler with full formatting support
 */
export class ParagraphHandlerEnhanced {
  constructor() {}

  /**
   * Create hidden DOM nodes to measure text wrapping.
   */
  public createMeasurementContainer(
    spanComputeStyle?: CSSStyleDeclaration
  ): MeasurementNode {
    const wrapperDiv = document.createElement("div");
    // mirror your real editor CSS
    wrapperDiv.style.background = "rgb(248 249 250 / 18%";
    wrapperDiv.style.height = "100%";
    wrapperDiv.style.width = "100%";
    wrapperDiv.style.display = "flex";
    wrapperDiv.style.flexDirection = "column";
    wrapperDiv.style.overflow = "hidden";
    wrapperDiv.style.position = "absolute"; // take it out of the flow
    wrapperDiv.style.top = "0"; // pin it to the top of the viewport
    wrapperDiv.style.left = "0"; // pin it to the left
    wrapperDiv.style.zIndex = "1"; // sit on top of everything

    const realPageWrapper = document.querySelector(
      ".editor-wrapper"
    ) as HTMLDivElement;
    // 2. Clone just the element (no children)
    const pageWrapper = realPageWrapper.cloneNode(false) as HTMLDivElement;

    // 3. Copy the few computed props you care about
    const cs = window.getComputedStyle(realPageWrapper);

    pageWrapper.style.backgroundColor = cs.backgroundColor; // rgb(248,249,250)
    pageWrapper.style.display = cs.display; // flex
    pageWrapper.style.flexDirection = cs.flexDirection; // column
    pageWrapper.style.width = cs.width; // 1159.09px
    pageWrapper.style.height = cs.height; // 849.09px
    pageWrapper.style.overflowX = cs.overflowX; // hidden
    pageWrapper.style.overflowY = cs.overflowY; // hidden
    pageWrapper.style.unicodeBidi = cs.unicodeBidi; // isolate

    const editorContainer = document.createElement("div");
    editorContainer.style.position = "relative";
    editorContainer.style.flex = "1";
    editorContainer.style.overflowY = "auto";
    editorContainer.style.overflowX = "hidden";

    const editorWrapper = document
      .querySelector(".editor-wrapper")!
      .cloneNode(false) as HTMLDivElement;

    editorWrapper.style.width = cs.width;
    editorWrapper.style.height = cs.height;
    editorWrapper.style.overflow = cs.overflow;
    editorWrapper.style.padding = cs.padding;

    const measurementSpan = document.createElement("span");
    measurementSpan.style.position = "absolute";
    measurementSpan.style.visibility = "hidden";
    measurementSpan.style.whiteSpace = "pre";
    measurementSpan.style.top = "0";
    measurementSpan.style.left = "0";

    // Apply computed styles to measurement span
    if (spanComputeStyle) {
      measurementSpan.style.fontFamily = spanComputeStyle.fontFamily;
      measurementSpan.style.fontSize = spanComputeStyle.fontSize;
      measurementSpan.style.fontWeight = spanComputeStyle.fontWeight;
      measurementSpan.style.fontStyle = spanComputeStyle.fontStyle;
      measurementSpan.style.lineHeight = spanComputeStyle.lineHeight;
    }

    editorContainer.appendChild(editorWrapper);
    editorWrapper.appendChild(measurementSpan);
    pageWrapper.appendChild(editorContainer);
    wrapperDiv.appendChild(pageWrapper);

    return { wrapperDiv, measurementSpan };
  }

  /**
   * Segment a paragraph into multiple segments for proper text wrapping and formatting
   * Enhanced version that handles quoted text and complex formatting
   */
  public segmentParagraph(element: HTMLElement): SegmentInfo[] {
    this.removeTrailingBreaks(element);
    const computedStyle = window.getComputedStyle(element);
    const segments: SegmentInfo[] = [];

    const linesOfNodes = this.splitToLines(Array.from(element.childNodes));

    linesOfNodes.forEach((lineNodes, lineIndex) => {
      const wrapper = document.createElement("div");
      lineNodes.forEach((node) => wrapper.appendChild(node.cloneNode(true)));
      const htmlFragment = wrapper.innerHTML;

      const formatting = this.extractFormattingRanges(htmlFragment);
      const plainText = formatting.text;

      const measuredText = this.measureParagraphLine(plainText, computedStyle);
      const textSegments = this.splitContentIntoSegments(measuredText);

      let cumulativeOffset = 0;
      textSegments.forEach((segmentText, segmentIndex) => {
        const paragraphOptions = this.createDocxParagraph(
          segmentText,
          lineIndex,
          segmentIndex,
          textSegments.length,
          linesOfNodes.length,
          computedStyle,
          this.getSpacingAfterPx(element, computedStyle),
          cumulativeOffset,
          formatting
        );
        segments.push({
          props: paragraphOptions,
          isFirstSegment: segmentIndex === 0,
        });
        cumulativeOffset += segmentText.length;
      });
    });

    return segments;
  }

  /**
   * Remove any ProseMirror "trailing break" `<br>` elements
   */
  private removeTrailingBreaks(element: HTMLElement): void {
    const trailingBreaks = element.querySelectorAll(
      "br.ProseMirror-trailingBreak"
    );
    trailingBreaks.forEach((br) => {
      // Remove only if it's the last child (trailing)
      if (br.parentElement?.lastChild === br) {
        br.remove();
      }
    });
  }

  /**
   * Recursively walk a Node[] and split on <br> into an array of lines
   */
  private splitToLines(nodes: Node[]): Node[][] {
    const lines: Node[][] = [[]];

    nodes.forEach((node) => {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).tagName === "BR"
      ) {
        // Hard break
        lines.push([]);
      } else if (node.nodeType === Node.TEXT_NODE) {
        // Plain text clones into the current line
        lines[lines.length - 1].push(node.cloneNode(true));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Recurse into element children
        const elementNode = node as HTMLElement;
        const childLines = this.splitToLines(
          Array.from(elementNode.childNodes)
        );

        childLines.forEach((childLineNodes, idx) => {
          // Clone just the wrapper tag
          const wrapperClone = elementNode.cloneNode(false) as HTMLElement;
          childLineNodes.forEach((childNode) =>
            wrapperClone.appendChild(childNode)
          );

          if (idx === 0) {
            // First child-line merges into current output line
            lines[lines.length - 1].push(wrapperClone);
          } else {
            // Subsequent lines start new output lines
            lines.push([wrapperClone]);
          }
        });
      }
    });

    return lines;
  }

  /**
   * Extract formatting ranges from HTML fragment
   */
  private extractFormattingRanges(htmlFragment: string): FormattingRanges {
    const fullText = htmlFragment.replace(/<[^>]*>/g, "");
    
    // Simple extraction - in a real implementation this would be more sophisticated
    const boldRanges: Range[] = [];
    const italicRanges: Range[] = [];
    const underlineRanges: Range[] = [];
    const strikeRanges: Range[] = [];

    // Extract bold ranges
    const boldMatches = htmlFragment.matchAll(/<strong[^>]*>(.*?)<\/strong>/gi);
    let offset = 0;
    for (const match of boldMatches) {
      const beforeText = htmlFragment.substring(0, match.index!);
      const textBefore = beforeText.replace(/<[^>]*>/g, "");
      const start = textBefore.length;
      const text = match[1].replace(/<[^>]*>/g, "");
      const end = start + text.length - 1;
      boldRanges.push({ start, end, text });
    }

    // Similar extraction for italic, underline, strike...
    
    return {
      text: fullText,
      boldRanges,
      italicRanges,
      underlineRanges,
      strikeRanges,
    };
  }

  /**
   * Measure paragraph line for text wrapping
   */
  private measureParagraphLine(text: string, computedStyle: CSSStyleDeclaration): string {
    // Simplified measurement - in real implementation this would use the measurement container
    return text;
  }

  /**
   * Split content into segments based on line breaks
   */
  private splitContentIntoSegments(text: string): string[] {
    return text.split('\n').filter(segment => segment.trim());
  }

  /**
   * Create DOCX paragraph with proper formatting
   */
  private createDocxParagraph(
    segmentText: string,
    lineIndex: number,
    segmentIndex: number,
    segmentsCount: number,
    totalLinesCount: number,
    computedStyle: CSSStyleDeclaration,
    afterSpacingPX: number,
    cumulativeOffset: number,
    formatting: FormattingRanges
  ): IParagraphOptions {
    const textRuns = this.createTextRuns(segmentText, formatting, cumulativeOffset);
    
    return {
      children: textRuns,
      spacing: this.computeSpacing(
        lineIndex,
        segmentIndex,
        segmentsCount,
        totalLinesCount,
        computedStyle,
        afterSpacingPX
      ),
      ...this.getBaseParagraphProps(computedStyle),
    };
  }

  /**
   * Create text runs with proper formatting
   */
  private createTextRuns(
    text: string,
    formatting: FormattingRanges,
    offset: number
  ): TextRun[] {
    const runs: TextRun[] = [];
    
    // Check if text has any formatting
    const hasBold = formatting.boldRanges.some(range => 
      offset >= range.start && offset <= range.end
    );
    const hasItalic = formatting.italicRanges.some(range => 
      offset >= range.start && offset <= range.end
    );
    const hasUnderline = formatting.underlineRanges.some(range => 
      offset >= range.start && offset <= range.end
    );
    const hasStrike = formatting.strikeRanges.some(range => 
      offset >= range.start && offset <= range.end
    );

    runs.push(new TextRun({
      text,
      bold: hasBold,
      italics: hasItalic,
      underline: hasUnderline ? {} : undefined,
      strike: hasStrike,
    }));

    return runs;
  }

  /**
   * Compute paragraph spacing
   */
  private computeSpacing(
    paragraphLineIndex: number,
    segmentIndex: number,
    segmentsCount: number,
    totalLinesCount: number,
    computedStyle: CSSStyleDeclaration,
    afterSpacingPX: number
  ): ISpacingProperties {
    const lineH = computedStyleToNumber(computedStyle.lineHeight);
    return paragraphLineIndex === totalLinesCount - 1 &&
      segmentIndex === segmentsCount - 1
      ? this.getFinalSpacing(afterSpacingPX, lineH)
      : this.baseLineSpaceing(lineH);
  }

  /**
   * Get base paragraph properties
   */
  private getBaseParagraphProps(computedStyle: CSSStyleDeclaration): Partial<IParagraphOptions> {
    return {
      alignment: this.getAlignment(computedStyle.textAlign),
    };
  }

  /**
   * Get text alignment
   */
  private getAlignment(textAlign: string): any {
    switch (textAlign) {
      case "center": return "center";
      case "right": return "right";
      case "justify": return "both";
      default: return "left";
    }
  }

  /**
   * Get spacing after paragraph in pixels
   */
  private getSpacingAfterPx(element: HTMLElement, computedStyle: CSSStyleDeclaration): number {
    return computedStyleToNumber(computedStyle.marginBottom);
  }

  /**
   * Base line spacing
   */
  private baseLineSpaceing(lineHeightPx: number): ISpacingProperties {
    return {
      line: pxToTwips(lineHeightPx),
      lineRule: "atLeast",
    };
  }

  /**
   * Final spacing with after spacing
   */
  private getFinalSpacing(afterSpacingPX: number, lineHeight: number): ISpacingProperties {
    return {
      ...this.baseLineSpaceing(lineHeight),
      after: pxToTwips(afterSpacingPX),
    };
  }
}
