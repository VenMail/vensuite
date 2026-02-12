import { ElementParser } from "./ElementParser";
import { FileChild } from "docx";
import { ListHandler } from "./ListHandler";
import { orderedConfig } from "./util/listConfig";
import type { Exporter } from "../Exporter";

/**
 * OrderedList Parser
 * Based on DocExCore's OrderedListParser
 * Handles <ol> elements and converts them to DOCX numbered lists
 */
export class OrderedListParser extends ElementParser {
  private handler = new ListHandler(orderedConfig);

  constructor(exporter: Exporter) {
    super(exporter, 3); // Priority 3 - process after headings
  }

  static matches(el: HTMLElement): boolean {
    return el.tagName === "OL";
  }

  public parse(element: HTMLElement, listInstance: number): FileChild[] {
    return this.handler.parse(element, listInstance, 0);
  }
}
