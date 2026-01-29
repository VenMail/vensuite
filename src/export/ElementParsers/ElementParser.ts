import { FileChild } from "docx";
import type { Exporter } from "../Exporter";

/**
 * Base class for all element parsers
 * Based on DocExCore's ElementParser
 */
export abstract class ElementParser {
  constructor(
    /** the shared Exporter so sub-parsers can recurse */
    protected exporter: Exporter,
    /** ordering priority - lower numbers process first */
    protected priority: number
  ) {}
  
  /**
   * Parse an element into DOCX children
   */
  abstract parse(
    element: HTMLElement,
    instance?: number
  ): FileChild | Array<FileChild> | null;

  /**
   * Check if the parser matches the element
   * Override in subclasses to implement matching logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static matches(_element: HTMLElement): boolean {
    return true;
  }

  /**
   * Get parser priority for ordering
   */
  getPriority(): number {
    return this.priority;
  }
}
