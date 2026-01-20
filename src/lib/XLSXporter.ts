import { Workbook, Worksheet, Cell, CellValue, Borders, Font, Alignment, BorderStyle, FillPattern } from 'exceljs';
import {
  IWorksheetData,
  ICellData,
  IStyleData,
  IRange,
  BooleanNumber,
  BorderStyleTypes,
  CellValueType,
  IColorStyle,
  IBorderData,
  VerticalAlign,
  HorizontalAlign,
  ITextRotation,
  Nullable
} from '@univerjs/core';

interface ExportOptions {
  includeStyles: boolean;
  includeFormulas: boolean;
  password?: string;
}

class UniversJSXLSXExporter {
  private workbook: Workbook;

  constructor() {
    this.workbook = new Workbook();
  }

  public async exportToXLSX(
    input: IWorksheetData,
    options: ExportOptions = {
      includeStyles: true,
      includeFormulas: true
    }
  ): Promise<Uint8Array> {
    try {
      await this.parseUniversJSSheet(input, options);

      if (options.password) {
        console.warn("Workbook protection is not supported in this implementation");
      }

      return await this.workbook.xlsx.writeBuffer() as unknown as Uint8Array;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Export failed:', errorMessage);
      throw new Error(`Failed to export XLSX: ${errorMessage}`);
    }
  }

  private async parseUniversJSSheet(sheet: IWorksheetData, options: ExportOptions): Promise<void> {
    const worksheet = this.workbook.addWorksheet(sheet.name);

    // Process cells
    Object.entries(sheet.cellData).forEach(([cellId, cellData]) => {
      const { row, col } = this.parseCellId(cellId);
      this.processCell(worksheet, row, col, cellData, options);
    });

    if (sheet.mergeData) {
      Object.entries(sheet.mergeData).forEach(([, range]) => {
        worksheet.mergeCells(this.rangeToExcelRange(range));
      });
    }

    this.applySheetProperties(worksheet, sheet);
  }

  private processCell(worksheet: Worksheet, row: number, col: number, cellData: ICellData, options: ExportOptions): void {
    const excelCell = worksheet.getCell(row, col);

    if (cellData.v !== undefined) {
      excelCell.value = cellData.v as CellValue;
    }

    if (options.includeFormulas && cellData.f) {
      try {
        excelCell.value = { formula: this.translateFormula(cellData.f) };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to translate formula in R${row}C${col}: ${errorMessage}`);
        excelCell.value = { error: '#VALUE!', formula: cellData.f };
      }
    }

    if (cellData.t) {
      this.applyCellType(excelCell, cellData.t);
    }

    if (options.includeStyles && cellData.s && typeof cellData.s === 'object') {
      this.applyCellStyle(excelCell, cellData.s);
    }
  }

  private translateFormula(formula: string): string {
    // Basic formula translation
    return formula
      .replace(/COLUMN\(\)/g, 'COLUMN()')
      .replace(/ROW\(\)/g, 'ROW()')
      .replace(/SUM\(/g, 'SUM(')
      .replace(/AVERAGE\(/g, 'AVERAGE(');
  }

  private applyCellType(excelCell: Cell, type: CellValueType): void {
    switch (type) {
      case CellValueType.NUMBER:
        excelCell.numFmt = '0.00';
        break;
      case CellValueType.BOOLEAN:
        excelCell.numFmt = '@';
        break;
      case CellValueType.STRING:
        excelCell.numFmt = '@';
        break;
      // Add more type handling as needed
    }
  }

  private applyCellStyle(cell: Cell, style: IStyleData): void {
    const font: Partial<Font> = {};
    const fill: Partial<FillPattern> = {};
    const alignment: Partial<Alignment> = {};
    const border: Partial<Borders> = {};

    if (style.ff) font.name = style.ff;
    if (style.fs) font.size = style.fs;
    if (style.bl) font.bold = style.bl === BooleanNumber.TRUE;
    if (style.it) font.italic = style.it === BooleanNumber.TRUE;
    if (style.ul) font.underline = style.ul ? 'single' : undefined;
    if (style.st) font.strike = style.st ? true : undefined;
    if (style.cl) font.color = { argb: this.rgbToArgb(style.cl) };

    if (style.bg) {
      fill.type = 'pattern';
      fill.pattern = 'solid';
      fill.fgColor = { argb: this.rgbToArgb(style.bg) };
    }

    if (style.bd) {
      this.applyBorderStyle(border, style.bd);
    }

    if (style.vt || style.ht || style.tr) {
      if (style.vt) alignment.vertical = this.mapVerticalAlignment(style.vt);
      if (style.ht) alignment.horizontal = this.mapHorizontalAlignment(style.ht);
      if (style.tr) alignment.textRotation = this.mapTextRotation(style.tr);
    }

    // Apply the styles to the cell
    if (Object.keys(font).length > 0) cell.font = font as Font;
    if (Object.keys(fill).length > 0) cell.fill = fill as FillPattern;
    if (Object.keys(alignment).length > 0) cell.alignment = alignment;
    if (Object.keys(border).length > 0) cell.border = border as Borders;
  }

  private applyBorderStyle(border: Partial<Borders>, borderData: IBorderData): void {
    const sides: (keyof IBorderData)[] = ['t', 'r', 'b', 'l'];
    sides.forEach(side => {
      const borderSide = borderData[side];
      if (borderSide) {
        const excelSide = this.mapBorderSide(side);
        border[excelSide] = {
          style: this.mapBorderStyle(borderSide.s),
          color: { argb: this.rgbToArgb(borderSide.cl || '') }
        };
      }
    });
  }

  private mapBorderSide(side: keyof IBorderData): keyof Borders {
    const sideMap: Partial<Record<keyof IBorderData, keyof Borders>> = {
      t: 'top',
      r: 'right',
      b: 'bottom',
      l: 'left'
    };
    return sideMap[side] || 'top'; // Default to 'top' if not found
  }

  private mapBorderStyle(style?: BorderStyleTypes): BorderStyle {
    switch (style) {
      case BorderStyleTypes.THIN: return 'thin';
      case BorderStyleTypes.MEDIUM: return 'medium';
      case BorderStyleTypes.THICK: return 'thick';
      case BorderStyleTypes.DASHED: return 'dashed';
      case BorderStyleTypes.DOTTED: return 'dotted';
      case BorderStyleTypes.DOUBLE: return 'double';
      default: return 'thin';
    }
  }

  private mapVerticalAlignment(vt: Nullable<VerticalAlign>): 'top' | 'middle' | 'bottom' | undefined {
    switch (vt) {
      case VerticalAlign.TOP: return 'top';
      case VerticalAlign.MIDDLE: return 'middle';
      case VerticalAlign.BOTTOM: return 'bottom';
      default: return undefined;
    }
  }

  private mapHorizontalAlignment(ht: Nullable<HorizontalAlign>): 'left' | 'center' | 'right' | undefined {
    switch (ht) {
      case HorizontalAlign.LEFT: return 'left';
      case HorizontalAlign.CENTER: return 'center';
      case HorizontalAlign.RIGHT: return 'right';
      default: return undefined;
    }
  }

  private mapTextRotation(tr: Nullable<ITextRotation>): number | 'vertical' | undefined {
    if (tr == null) return undefined;
    if (typeof tr === 'number') return tr;
    return tr.a % 90 == 0? 'vertical' : 0;
  }

  private applySheetProperties(worksheet: Worksheet, sheetData: IWorksheetData): void {
    // Apply column widths
    if (sheetData.columnData) {
      Object.entries(sheetData.columnData).forEach(([col, data]) => {
        if (data.w) {
          worksheet.getColumn(parseInt(col)).width = data.w;
        }
      });
    }

    // Apply row heights
    if (sheetData.rowData) {
      Object.entries(sheetData.rowData).forEach(([row, data]) => {
        if (data.h) {
          worksheet.getRow(parseInt(row)).height = data.h;
        }
      });
    }

    // Apply freeze panes
    if (sheetData.freeze) {
      worksheet.views = [{
        state: 'frozen',
        xSplit: sheetData.freeze.xSplit,
        ySplit: sheetData.freeze.ySplit,
      }];
    }
  }

  private rgbToArgb(rgb: string | IColorStyle): string {
    if (typeof rgb !== 'string') {
      // Handle IColorStyle object
      return `FF${rgb.rgb?.slice(1) || '000000'}`;
    }
    const matches = rgb.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (matches) {
      const [, r, g, b] = matches;
      return `FF${r}${g}${b}`;
    }
    return 'FF000000'; // Default to black if parsing fails
  }

  private parseCellId(cellId: string): { row: number; col: number } {
    const match = cellId.match(/R(\d+)C(\d+)/);
    if (!match) throw new Error(`Invalid cell ID: ${cellId}`);
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }

  private rangeToExcelRange(range: IRange): string {
    const startCell = this.numberToColumnName(range.startColumn) + range.startRow;
    const endCell = this.numberToColumnName(range.endColumn) + range.endRow;
    return `${startCell}:${endCell}`;
  }

  private numberToColumnName(num: number): string {
    let columnName = '';
    while (num > 0) {
      num--;
      columnName = String.fromCharCode(65 + (num % 26)) + columnName;
      num = Math.floor(num / 26);
    }
    return columnName;
  }
}

export { UniversJSXLSXExporter, ExportOptions };