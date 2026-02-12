import { ElementParser } from "./ElementParser";
import { FileChild, Paragraph } from "docx";
import type { Exporter } from "../Exporter";
import { ParagraphHandler } from "./ParagraphHandler";

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
    const handler = new ParagraphHandler();
    const segments = handler.segmentParagraph(element);
    if (!segments.length) return null;

    const paragraphs = segments.map(({ props }) => new Paragraph(props));
    return paragraphs.length === 1 ? paragraphs[0] : paragraphs;
  }

  // This static method ensures this parser only processes <p> elements.
  static matches(element: HTMLElement): boolean {
    return element.tagName === "P";
  }
}
