import { ElementParser } from "./ElementParser";
import { FileChild, Table, TableRow, TableCell, Paragraph, TextRun } from "docx";
import { getComputedAlignment } from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * Table Parser
 * Based on DocExCore's TableParser
 * Handles <table> elements and converts them to DOCX tables
 */
export class TableParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 5); // Priority 5 - process after basic elements
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    if (element.tagName !== "TABLE") return null;

    const rows: TableRow[] = [];
    const tableAlignment = getComputedAlignment(element);

    // Process each row
    const tableRows = element.querySelectorAll('tr');
    tableRows.forEach((rowEl) => {
      const cells: TableCell[] = [];
      
      // Process each cell in the row
      const cellsEl = rowEl.querySelectorAll('td, th');
      cellsEl.forEach((cellEl) => {
        const cellText = cellEl.textContent?.trim() || '';
        const isHeader = cellEl.tagName === 'TH';
        
        // Create paragraph for cell content
        const cellParagraph = new Paragraph({
          children: [new TextRun({
            text: cellText,
            bold: isHeader,
          })],
          alignment: 'center',
        });

        // Create table cell
        const cell = new TableCell({
          children: [cellParagraph],
          // Basic cell styling
          shading: isHeader ? {
            fill: "F2F2F2",
            type: "solid",
          } : undefined,
        });

        cells.push(cell);
      });

      // Create table row
      const row = new TableRow({
        children: cells,
      });
      
      rows.push(row);
    });

    // Create table
    return new Table({
      rows,
      width: {
        size: 100,
        type: "pct",
      },
      alignment: tableAlignment === 'center' ? 'center' : tableAlignment === 'right' ? 'right' : 'left',
    });
  }

  // This static method ensures this parser only processes table elements.
  static matches(element: HTMLElement): boolean {
    return element.tagName === "TABLE";
  }
}
