export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx', 
  PDF = 'pdf',
  HTML = 'html'
}

export enum PDFEngine {
  JSPDF = 'jspdf',           // High performance, direct PDF generation
  HTML2PDF = 'html2pdf'      // Better for complex layouts, HTML fidelity
}

export interface IExportOptions {
  format: ExportFormat
  filename?: string
  includeStyles?: boolean
  includeFormulas?: boolean
  includeHeaders?: boolean
  sheetIndex?: number
  dateFormat?: string
  numberFormat?: string
  pdfEngine?: PDFEngine      // Choose PDF export engine
}

export interface IExportService {
  export(facadeAPI: any, options: IExportOptions): Promise<void>
  getSupportedFormats(): ExportFormat[]
}

export interface IExporter {
  export(data: any, filename: string, options: IExportOptions): Promise<void>
  getFormat(): ExportFormat
}

export interface ICellAddress {
  row: number
  col: number
}

export interface IMergeInfo {
  skip: boolean
  colspan?: number
  rowspan?: number
} 