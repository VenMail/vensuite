import { ElementParser } from "./ElementParser";
import { FileChild, Paragraph, TextRun } from "docx";
import { getComputedAlignment } from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * BulletList Parser
 * Based on DocExCore's BulletListParser
 * Handles <ul> elements and converts them to DOCX bulleted lists
 */
export class BulletListParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 3); // Priority 3 - process after headings
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    if (element.tagName !== "UL") return null;

    const paragraphs: Paragraph[] = [];
    const listItems = element.querySelectorAll('li');
    const alignment = getComputedAlignment(element);

    listItems.forEach((li) => {
      const liText = li.textContent?.trim();
      if (liText) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: "• ",
              bold: true,
            }),
            new TextRun({ text: liText })
          ],
          alignment: alignment === 'justify' ? 'both' : alignment,
          numbering: {
            reference: "bullet-list",
            level: 0,
          },
        }));
      }
    });

    return paragraphs.length > 0 ? paragraphs : null;
  }

  // This static method ensures this parser only processes unordered list elements.
  static matches(element: HTMLElement): boolean {
    return element.tagName === "UL";
  }
}
