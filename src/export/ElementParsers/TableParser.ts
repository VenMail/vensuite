import { ElementParser } from "./ElementParser";
import {
  FileChild,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
} from "docx";
import { ParagraphHandler } from "./ParagraphHandler";
import {
  computedStyleToNumber,
  cssColorToHex,
  getComputedAlignment,
  pxToPt,
  pxToTwips,
} from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * Advanced Table Parser for our AdvancedTable extension
 * Handles standard HTML <table> elements with data-row-height attributes
 * Matches our AdvancedTable plugin output for perfect export fidelity
 */
export class TableParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 5); // Priority 5 - process after basic elements
  }

  /**
   * Determine if this parser should handle the given element.
   * @param element the DOM element to test
   * @returns true if element is a TABLE element from our AdvancedTable extension
   */
  static matches(element: HTMLElement): boolean {
    return element.tagName === "TABLE";
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    if (element.tagName !== "TABLE") return null;

    const rows: TableRow[] = [];
    const tableAlignment = getComputedAlignment(element);
    
    // Get table styling from our AdvancedTable extension
    const tableWidth = this.parseTableWidth(element);
    const tableBorders = this.parseTableBorders(element);

    // Process each row - handle both thead and tbody
    const tableRows = element.querySelectorAll('tr');
    tableRows.forEach((rowEl, rowIndex) => {
      const cells: TableCell[] = [];
      const rowHeight = this.parseRowHeight(rowEl);
      
      // Process each cell in the row
      const cellsEl = rowEl.querySelectorAll('td, th');
      cellsEl.forEach((cellEl) => {
        const cellContent = this.parseCellContent(cellEl as HTMLElement);
        const cellWidth = this.parseCellWidth(cellEl as HTMLElement);
        const cellSpan = this.parseCellSpan(cellEl as HTMLElement);
        const cellBgColor = this.parseCellBackground(cellEl as HTMLElement);
        const cellAlignment = this.parseCellAlignment(cellEl as HTMLElement);
        const cellVerticalAlign = this.parseCellVerticalAlign(cellEl as HTMLElement);
        const cellBorders = this.parseCellBorders(cellEl as HTMLElement);
        
        // Create table cell with advanced styling
        const cellOptions: any = {
          children: cellContent,
          width: cellWidth,
          columnSpan: cellSpan.colSpan,
          rowSpan: cellSpan.rowSpan,
          shading: cellBgColor ? {
            fill: cellBgColor,
            type: "solid",
          } : undefined,
          borders: cellBorders,
          margins: {
            top: 80,  // 0.08 inch margins for cell padding
            bottom: 80,
            left: 80,
            right: 80,
          },
        };
        
        // Add alignment if specified
        if (cellAlignment) {
          cellOptions.alignment = cellAlignment;
        }
        
        // Add vertical alignment if specified
        if (cellVerticalAlign) {
          cellOptions.verticalAlign = cellVerticalAlign;
        }
        
        const cell = new TableCell(cellOptions);
        cells.push(cell);
      });

      // Create table row with height support from our AdvancedTable extension
      const row = new TableRow({
        children: cells,
        height: rowHeight ? {
          value: pxToPt(rowHeight),
          rule: 'exact',
        } : undefined,
        tableHeader: rowIndex === 0 && element.querySelector('thead') !== null,
      });
      
      rows.push(row);
    });

    // Create advanced table with proper styling
    const tableOptions: any = {
      rows,
      width: tableWidth,
      alignment:
        tableAlignment === 'center'
          ? 'center'
          : tableAlignment === 'right'
          ? 'right'
          : 'left',
      borders: tableBorders,
    };

    return new Table(tableOptions);
  }

  /**
   * Parse table width from computed style
   */
  private parseTableWidth(element: HTMLElement): any {
    const computedStyle = window.getComputedStyle(element);
    const width = computedStyle.width;
    
    if (width && width !== 'auto') {
      const widthValue = parseFloat(width);
      if (!isNaN(widthValue)) {
        return {
          type: WidthType.DXA,
          size: Math.round(pxToTwips(widthValue)),
        };
      }
    }
    
    return {
      type: WidthType.AUTO,
      size: 0,
    };
  }

  /**
   * Parse table borders - simple implementation
   */
  private parseTableBorders(element: HTMLElement): any {
    const style = window.getComputedStyle(element);
    const borderColor = cssColorToHex(style.borderColor) ?? "E2E8F0";
    const borderWidth = Math.max(1, Math.round(computedStyleToNumber(style.borderWidth)));
    const borderSize = this.pxBorderToSize(borderWidth);

    const border = {
      style: "single",
      size: borderSize,
      color: borderColor,
    };

    return {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    };
  }

  /**
   * Parse row height from our AdvancedTable extension data-row-height attribute
   */
  private parseRowHeight(rowEl: HTMLElement): number | null {
    // Check for data-row-height attribute from our AdvancedTable extension
    const dataRowHeight = rowEl.getAttribute('data-row-height');
    if (dataRowHeight) {
      const height = parseFloat(dataRowHeight);
      if (!isNaN(height)) {
        return Math.round(pxToTwips(height));
      }
    }
    
    // Check for inline style height
    const styleAttr = rowEl.getAttribute('style');
    if (styleAttr) {
      const heightMatch = styleAttr.match(/height:\s*(\d+(?:\.\d+)?)px/);
      if (heightMatch) {
        return Math.round(pxToTwips(parseFloat(heightMatch[1])));
      }
    }
    
    return null;
  }

  /**
   * Parse cell content using enhanced paragraph handler
   */
  private parseCellContent(cellEl: HTMLElement): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const handler = new ParagraphHandler();
    
    // Process child elements first to preserve structure
    const children = Array.from(cellEl.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );

    if (children.length) {
      children.forEach((child) => {
        if (child.tagName === 'P') {
          const segments = handler.segmentParagraph(child, {
            includeBackground: false,
          });
          segments.forEach(({ props }) => {
            paragraphs.push(new Paragraph(props));
          });
        } else {
          const parsed = this.exporter.parse(child, 0);
          if (parsed) {
            const asArray = Array.isArray(parsed) ? parsed : [parsed];
            asArray.forEach((item) => {
              if (item instanceof Paragraph) {
                paragraphs.push(item);
              }
            });
          }
        }
      });
    }

    if (!paragraphs.length) {
      const text = cellEl.textContent?.trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text })],
          })
        );
      }
    }

    return paragraphs;
  }

  /**
   * Parse cell width from computed style
   */
  private parseCellWidth(cellEl: HTMLElement): any {
    const computedStyle = window.getComputedStyle(cellEl);
    const width = computedStyle.width;
    
    if (width && width !== 'auto') {
      const widthValue = parseFloat(width);
      if (!isNaN(widthValue)) {
        return {
          type: WidthType.DXA,
          size: Math.round(pxToTwips(widthValue)),
        };
      }
    }
    
    return undefined; // Let DOCX handle width automatically
  }

  /**
   * Parse cell colspan and rowspan
   */
  private parseCellSpan(cellEl: HTMLElement): { colSpan: number; rowSpan: number } {
    const colSpan = parseInt(cellEl.getAttribute('colspan') || '1', 10);
    const rowSpan = parseInt(cellEl.getAttribute('rowspan') || '1', 10);
    
    return { colSpan, rowSpan };
  }

  /**
   * Parse cell background color
   */
  private parseCellBackground(cellEl: HTMLElement): string | null {
    const computedStyle = window.getComputedStyle(cellEl);
    return cssColorToHex(computedStyle.backgroundColor) ?? null;
  }

  /**
   * Parse cell alignment
   */
  private parseCellAlignment(cellEl: HTMLElement): string | null {
    const computedStyle = window.getComputedStyle(cellEl);
    const textAlign = computedStyle.textAlign;
    
    switch (textAlign) {
      case 'center':
        return 'center';
      case 'right':
        return 'right';
      case 'justify':
        return 'both';
      default:
        return 'left';
    }
  }

  /**
   * Parse cell vertical alignment
   */
  private parseCellVerticalAlign(cellEl: HTMLElement): string | null {
    const computedStyle = window.getComputedStyle(cellEl);
    const verticalAlign = computedStyle.verticalAlign;
    
    switch (verticalAlign) {
      case 'middle':
        return 'center';
      case 'bottom':
        return 'bottom';
      default:
        return 'top';
    }
  }

  /**
   * Parse cell borders
   */
  private parseCellBorders(cellEl: HTMLElement): any {
    const style = window.getComputedStyle(cellEl);
    return {
      top: this.buildBorder(style.borderTopWidth, style.borderTopColor, style.borderTopStyle),
      bottom: this.buildBorder(style.borderBottomWidth, style.borderBottomColor, style.borderBottomStyle),
      left: this.buildBorder(style.borderLeftWidth, style.borderLeftColor, style.borderLeftStyle),
      right: this.buildBorder(style.borderRightWidth, style.borderRightColor, style.borderRightStyle),
    };
  }

  private buildBorder(width: string, color: string, style: string) {
    if (!width || style === 'none') {
      return { style: 'none', size: 0, color: 'FFFFFF' };
    }

    const size = this.pxBorderToSize(Math.max(1, Math.round(computedStyleToNumber(width))));
    const hexColor = cssColorToHex(color) ?? 'E2E8F0';

    return {
      style: 'single',
      size,
      color: hexColor,
    };
  }

  private pxBorderToSize(px: number): number {
    // DOCX border size is measured in eighths of a point. 1px ≈ 0.75pt.
    const points = px * 0.75;
    return Math.max(2, Math.round(points * 8));
  }
}
