import { ElementParser } from "./ElementParser";
import { FileChild, Paragraph, TextRun } from "docx";
import { getComputedFont, getComputedFontSize, hasFormatting, getComputedAlignment } from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * Paragraph Parser
 * Based on DocExCore's ParagraphParser
 * Handles <p> elements and converts them to DOCX paragraphs
 */
export class ParagraphParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 1); // Priority 1 - process first
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    const text = element.textContent?.trim();
    if (!text) return null;

    // Get computed styles
    const fontSize = getComputedFontSize(element);
    const fontFamily = getComputedFont(element);
    const alignment = getComputedAlignment(element);
    const formatting = hasFormatting(element);

    // Create text runs with formatting
    const runs: TextRun[] = [];
    
    // Simple text run for now (can be enhanced to handle mixed formatting)
    runs.push(new TextRun({
      text,
      size: fontSize * 2, // DOCX uses half-points
      font: fontFamily,
      bold: formatting.bold,
      italics: formatting.italic,
      underline: formatting.underline ? {} : undefined,
      strike: formatting.strike,
    }));

    // Create paragraph with alignment
    return new Paragraph({
      children: runs,
      alignment: alignment === 'justify' ? 'both' : alignment,
      spacing: {
        after: 200, // 10 points after paragraph
      },
    });
  }

  // This static method ensures this parser only processes <p> elements.
  static matches(element: HTMLElement): boolean {
    return element.tagName === "P";
  }
}
