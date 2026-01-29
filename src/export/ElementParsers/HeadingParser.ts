import { ElementParser } from "./ElementParser";
import { FileChild, Paragraph, TextRun } from "docx";
import { getComputedFont, getComputedFontSize, getComputedAlignment } from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * Heading Parser
 * Based on DocExCore's HeadingParser
 * Handles <h1>, <h2>, <h3>, <h4>, <h5>, <h6> elements
 */
export class HeadingParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 2); // Priority 2 - process after paragraphs
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    const text = element.textContent?.trim();
    if (!text) return null;

    // Get heading level from tag name
    const headingLevel = this.getHeadingLevel(element.tagName);
    
    // Get computed styles
    const fontSize = getComputedFontSize(element);
    const fontFamily = getComputedFont(element);
    const alignment = getComputedAlignment(element);

    // Create heading paragraph
    return new Paragraph({
      children: [
        new TextRun({
          text,
          size: fontSize * 2, // DOCX uses half-points
          font: fontFamily,
          bold: true,
          style: headingLevel,
        }),
      ],
      alignment: alignment === 'justify' ? 'both' : alignment,
      spacing: {
        before: 400, // 20 points before heading
        after: 200,  // 10 points after heading
      },
    });
  }

  private getHeadingLevel(tagName: string): string {
    const level = parseInt(tagName.replace('H', ''));
    switch (level) {
      case 1: return 'Heading1';
      case 2: return 'Heading2';
      case 3: return 'Heading3';
      case 4: return 'Heading4';
      case 5: return 'Heading5';
      case 6: return 'Heading6';
      default: return 'Heading1';
    }
  }

  // This static method ensures this parser only processes heading elements.
  static matches(element: HTMLElement): boolean {
    return /^H[1-6]$/.test(element.tagName);
  }
}
