import { ElementParser } from "./ElementParser";
import { FileChild } from "docx";
import { ListHandler } from "./ListHandler";
import { bulletConfig } from "./util/listConfig";
import type { Exporter } from "../Exporter";

/**
 * BulletList Parser
 * Based on DocExCore's BulletListParser
 * Handles <ul> elements and converts them to DOCX bulleted lists
 */
export class BulletListParser extends ElementParser {
  private handler = new ListHandler(bulletConfig);

  constructor(exporter: Exporter) {
    super(exporter, 4); // Priority 4 - process after headings
  }

  static matches(el: HTMLElement): boolean {
    return el.tagName === "UL";
  }

  public parse(element: HTMLElement, listInstance: number): FileChild[] {
    return this.handler.parse(element, listInstance, 0);
  }
}
