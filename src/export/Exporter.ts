import { ElementParser, ParagraphParser, HeadingParser, TableParser, OrderedListParser, BulletListParser } from "./ElementParsers";
import { FileChild, Document } from "docx";
import * as docx from "docx";
import { ExportOptions, createSectionProperties } from "./export";
import {
  nextListInstance,
  resetListCounter,
} from "./ElementParsers/util/listCounter";
import {
  bulletList,
  numberedLevelList,
  unnumberedLevelList,
} from "./ElementParsers/util/listConfig";

type ElementParserClass = (new (exporter: Exporter) => ElementParser) &
  Pick<typeof ElementParser, keyof typeof ElementParser>;

/**
 * Main Exporter class
 * Based on DocExCore's Exporter
 * Orchestrates the conversion of HTML to DOCX
 */
export class Exporter {
  private readonly parsers: ElementParserClass[] = [
    ParagraphParser,
    HeadingParser,
    OrderedListParser,
    BulletListParser,
    TableParser,
    // Add more parsers as needed
  ];

  constructor(private readonly document: HTMLElement) {}

  /**
   * Add a parser to the list
   */
  addParser(parser: ElementParserClass): void {
    this.parsers.push(parser);
    // Sort by priority (lower numbers first)
    this.parsers.sort((a, b) => {
      const aInstance = new a(this);
      const bInstance = new b(this);
      return aInstance.getPriority() - bInstance.getPriority();
    });
  }

  /**
   * Find the appropriate parser for an element
   */
  private getParser(element: HTMLElement): ElementParserClass | undefined {
    return this.parsers.find((parser) => parser.matches(element));
  }

  /**
   * Export the document to DOCX
   * Exactly matches DocExCore's export method
   */
  public async export(options: ExportOptions = {}): Promise<Document> {
    const children: FileChild[] = [];
    resetListCounter();
    
    // Process each element in the document - exactly like DocExCore
    for (const element of this.document.children) {
      if (!(element instanceof HTMLElement)) continue;
      
      // Parse the element into one or more FileChild - exactly like DocExCore
      const parsed = this.parse(element, nextListInstance());
      const parsedArray = Array.isArray(parsed)
        ? parsed
        : parsed
        ? [parsed]
        : [];

      children.push(...parsedArray);

      // Handle spacers (page breaks) - exactly like DocExCore
      if (element.classList.contains("spacer")) {
        const last = children.at(-1);
        if (last instanceof docx.Paragraph) {
          last?.addChildElement(new docx.PageBreak());
        }
      }
    }

    // Create document with numbering - exactly like DocExCore
    const sectionProperties = createSectionProperties(options);
    
    const doc = new Document({
      numbering: {
        config: [numberedLevelList, unnumberedLevelList, bulletList],
      },
      sections: [
        {
          properties: sectionProperties,
          children,
        },
      ],
    });
    
    return doc;
  }

  /**
   * Export to blob with download option
   * Complete export function that handles the full process
   */
  public async exportToBlob(options: ExportOptions = {}): Promise<Blob> {
    const doc = await this.export(options);
    return this.packDocx(doc, options);
  }

  /**
   * Pack DOCX document into blob and optionally download
   * Based on DocExCore's packDocx function
   */
  private async packDocx(
    doc: docx.Document,
    options: ExportOptions
  ): Promise<Blob> {
    // Generate the document blob
    const blob = await docx.Packer.toBlob(doc);
    
    // Download if requested
    if (options.toDownload) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = options.fileName ?? "document.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
    
    return blob;
  }

  /**
   * Parse a single element
   * Based on DocExCore's parse method
   */
  public parse(
    element: HTMLElement,
    instance: number
  ): FileChild | Array<FileChild> {
    const Parser = this.getParser(element);
    if (!Parser) {
      console.warn("No parser found for element", element);
      return [];
    }

    const parser = new Parser(this);
    const parsedChildren = parser.parse(element, instance);

    return parsedChildren ?? [];
  }

}
