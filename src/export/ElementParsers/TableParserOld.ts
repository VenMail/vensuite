import { ElementParser } from "./ElementParser";
import { FileChild, Table, TableRow, TableCell, Paragraph, TextRun } from "docx";
import { getComputedAlignment } from "../../utils/exportUtils";
import type { Exporter } from "../Exporter";

/**
 * Enhanced Table Parser
 * Matches our AdvancedTable extension output for perfect export fidelity
 * Handles complex table structures with custom attributes and styling
 */
export class TableParser extends ElementParser {
  constructor(exporter: Exporter) {
    super(exporter, 5); // Priority 5 - process after basic elements
  }

  public parse(element: HTMLElement): FileChild | FileChild[] | null {
    if (element.tagName !== "TABLE") return null;

    const rows: TableRow[] = [];
    const tableAlignment = getComputedAlignment(element);
    
    // Get table styling from our AdvancedTable extension
    const tableWidth = this.parseTableWidth(element);
    const tableBorders = this.parseTableBorders(element);
    const tableLayout = this.parseTableLayout(element);

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

      // Create table row with height support
      const row = new TableRow({
        children: cells,
        height: rowHeight ? {
          value: rowHeight,
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
      alignment: tableAlignment === 'center' ? 'center' : tableAlignment === 'right' ? 'right' : 'left',
      borders: tableBorders,
    };
    
    // Add layout if specified
    if (tableLayout) {
      tableOptions.layout = tableLayout;
    }
    
    return new Table(tableOptions);
  }

  /**
   * Parse complex cell content including formatted text
   */
  private parseCellContent(cellEl: HTMLElement): Paragraph[] {
    const content: Paragraph[] = [];
    
    // Handle multi-paragraph cell content
    const paragraphs = cellEl.querySelectorAll('p') || [cellEl];
    
    paragraphs.forEach((pEl) => {
      const textRuns: TextRun[] = [];
      
      // Process text nodes and inline formatting
      const walker = document.createTreeWalker(
        pEl,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            // Skip script and style elements
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              if (['SCRIPT', 'STYLE'].includes(el.tagName)) {
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      let currentNode: Node | null;
      while (currentNode = walker.nextNode()) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
          const text = currentNode.textContent?.trim();
          if (text) {
            textRuns.push(new TextRun({ text }));
          }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const el = currentNode as Element;
          const text = el.textContent?.trim() || '';
          
          if (!text) continue;
          
          // Parse inline formatting
          const textRunOptions: any = {
            text,
            bold: el.tagName === 'STRONG' || el.tagName === 'B',
            italics: el.tagName === 'EM' || el.tagName === 'I',
            underline: el.tagName === 'U',
            strike: el.tagName === 'S' || el.tagName === 'STRIKE',
            font: this.parseFontFamily(el),
            size: this.parseFontSize(el),
          };
          
          // Add color if specified
          const textColor = this.parseTextColor(el);
          if (textColor) {
            textRunOptions.color = textColor;
          }
          
          // Add highlight if specified
          const highlightColor = this.parseHighlightColor(el);
          if (highlightColor) {
            textRunOptions.highlight = highlightColor;
          }
          
          const textRun = new TextRun(textRunOptions);
          
          textRuns.push(textRun);
        }
      }
      
      if (textRuns.length > 0) {
        content.push(new Paragraph({
          children: textRuns,
          spacing: {
            before: 40,  // Small spacing between paragraphs in cells
            after: 40,
          },
        }));
      }
    });
    
    // Fallback: if no paragraphs found, create single paragraph with plain text
    if (content.length === 0) {
      const text = cellEl.textContent?.trim() || '';
      if (text) {
        content.push(new Paragraph({
          children: [new TextRun({ text })],
        }));
      }
    }
    
    return content;
  }

  /**
   * Parse table width from style or attributes
   */
  private parseTableWidth(element: HTMLElement): { size: number; type: string } {
    const style = (element as HTMLElement).style;
    const width = style.width || element.getAttribute('width');
    
    if (width) {
      if (width.includes('%')) {
        return {
          size: parseInt(width),
          type: 'pct',
        };
      } else if (width.includes('px')) {
        // Convert px to twips (1px = 15 twips at 96 DPI)
        return {
          size: parseInt(width) * 15,
          type: 'dxa',
        };
      }
    }
    
    // Default: 100% width
    return {
      size: 100,
      type: 'pct',
    };
  }

  /**
   * Parse row height from data-row-height attribute
   */
  private parseRowHeight(rowEl: HTMLElement): number | null {
    const rowHeight = rowEl.getAttribute('data-row-height');
    if (rowHeight) {
      // Convert px to twips (1px = 15 twips)
      return parseInt(rowHeight) * 15;
    }
    return null;
  }

  /**
   * Parse cell width
   */
  private parseCellWidth(cellEl: HTMLElement): { size: number; type: string } | undefined {
    const style = (cellEl as HTMLElement).style;
    const width = style.width || cellEl.getAttribute('width');
    
    if (width) {
      if (width.includes('%')) {
        return {
          size: parseInt(width),
          type: 'pct',
        };
      } else if (width.includes('px')) {
        return {
          size: parseInt(width) * 15,
          type: 'dxa',
        };
      }
    }
    
    return undefined;
  }

  /**
   * Parse cell colspan and rowspan
   */
  private parseCellSpan(cellEl: HTMLElement): { colSpan: number; rowSpan: number } {
    return {
      colSpan: parseInt(cellEl.getAttribute('colspan') || '1'),
      rowSpan: parseInt(cellEl.getAttribute('rowspan') || '1'),
    };
  }

  /**
   * Parse cell background color
   */
  private parseCellBackground(cellEl: HTMLElement): string | undefined {
    const style = (cellEl as HTMLElement).style;
    const bgColor = style.backgroundColor;
    
    if (bgColor) {
      // Convert RGB to hex if needed
      if (bgColor.startsWith('rgb')) {
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          return '#' + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        }
      }
      return bgColor;
    }
    
    // Default header background
    if (cellEl.tagName === 'TH') {
      return 'F2F2F2';
    }
    
    return undefined;
  }

  /**
   * Parse cell alignment
   */
  private parseCellAlignment(cellEl: HTMLElement): 'left' | 'center' | 'right' | 'justify' | undefined {
    const style = (cellEl as HTMLElement).style;
    const align = style.textAlign || cellEl.getAttribute('align');
    
    if (align) {
      switch (align.toLowerCase()) {
        case 'center': return 'center';
        case 'right': return 'right';
        case 'justify': return 'justify';
        default: return 'left';
      }
    }
    
    // Default header alignment
    if (cellEl.tagName === 'TH') {
      return 'center';
    }
    
    return 'left';
  }

  /**
   * Parse cell vertical alignment
   */
  private parseCellVerticalAlign(cellEl: HTMLElement): string | undefined {
    const style = (cellEl as HTMLElement).style;
    const valign = style.verticalAlign || cellEl.getAttribute('valign');
    
    if (valign) {
      switch (valign.toLowerCase()) {
        case 'middle':
        case 'center': return 'center';
        case 'bottom': return 'bottom';
        default: return 'top';
      }
    }
    
    return 'top';
  }

  /**
   * Parse table borders
   */
  private parseTableBorders(_element: HTMLElement) {
    // Return default table borders
    return {
      top: { style: 'single', size: 4, color: '000000' },
      left: { style: 'single', size: 4, color: '000000' },
      bottom: { style: 'single', size: 4, color: '000000' },
      right: { style: 'single', size: 4, color: '000000' },
    };
  }

  /**
   * Parse cell borders
   */
  private parseCellBorders(_cellEl: HTMLElement) {
    // Return default cell borders
    return {
      top: { style: 'single', size: 4, color: '000000' },
      left: { style: 'single', size: 4, color: '000000' },
      bottom: { style: 'single', size: 4, color: '000000' },
      right: { style: 'single', size: 4, color: '000000' },
    };
  }

  /**
   * Parse table layout type
   */
  private parseTableLayout(element: HTMLElement): string | undefined {
    const style = (element as HTMLElement).style;
    const layout = style.tableLayout;
    
    return layout === 'fixed' ? 'fixed' : 'autofit';
  }

  /**
   * Parse text color from inline styles
   */
  private parseTextColor(element: Element): string | undefined {
    const style = (element as HTMLElement).style;
    const color = style.color;
    
    if (color) {
      if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          return '#' + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        }
      }
      return color;
    }
    
    return undefined;
  }

  /**
   * Parse highlight color
   */
  private parseHighlightColor(element: Element): string | undefined {
    const style = (element as HTMLElement).style;
    const bgColor = style.backgroundColor;
    
    if (bgColor && element.tagName !== 'TD' && element.tagName !== 'TH') {
      if (bgColor.startsWith('rgb')) {
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          return '#' + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        }
      }
      return bgColor;
    }
    
    return undefined;
  }

  /**
   * Parse font family
   */
  private parseFontFamily(element: Element): string | undefined {
    const style = (element as HTMLElement).style;
    const fontFamily = style.fontFamily;
    
    if (fontFamily) {
      // Remove quotes and clean up font family name
      return fontFamily.replace(/["']/g, '').split(',')[0].trim();
    }
    
    return undefined;
  }

  /**
   * Parse font size
   */
  private parseFontSize(element: Element): number | undefined {
    const style = (element as HTMLElement).style;
    const fontSize = style.fontSize;
    
    if (fontSize) {
      if (fontSize.includes('px')) {
        return parseInt(fontSize);
      } else if (fontSize.includes('pt')) {
        return parseInt(fontSize) * 4/3; // Convert pt to px (approximately)
      }
    }
    
    return undefined;
  }

  // This static method ensures this parser only processes table elements.
  static matches(element: HTMLElement): boolean {
    return element.tagName === "TABLE";
  }
}
