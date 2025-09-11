import type { FUniver } from '@univerjs/core/facade'
import type { IExportService, IExportOptions, ExportFormat, IExporter, PDFEngine } from '../types/export'
import { CSVExporter } from '../exporters/CSVExporter'
import { XLSXExporter } from '../exporters/XLSXExporter'
import { HTMLExporter } from '../exporters/HTMLExporter'
import { PDFExporter } from '../exporters/PDFExporter'
import { PDFExporterJsPDF } from '../exporters/PDFExporterJsPDF'

export class ExportService implements IExportService {
  private exporters: Map<ExportFormat, IExporter> = new Map()
  private pdfExporters: Map<PDFEngine, IExporter> = new Map()

  constructor() {
    this.initializeExporters()
  }

  private initializeExporters(): void {
    const exporters = [
      new CSVExporter(),
      new XLSXExporter(),
      new HTMLExporter(),
      new PDFExporter() // Default HTML-based PDF exporter
    ]

    exporters.forEach(exporter => {
      this.exporters.set(exporter.getFormat(), exporter)
    })

    // Initialize PDF exporters
    this.pdfExporters.set('html2pdf' as PDFEngine, new PDFExporter())
    this.pdfExporters.set('jspdf' as PDFEngine, new PDFExporterJsPDF())
  }

  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys())
  }

  async export(facadeAPI: FUniver, options: IExportOptions): Promise<void> {
    try {
      if (!facadeAPI) {
        throw new Error('FUniver facade API is required')
      }

      let exporter: IExporter | undefined

      // Special handling for PDF format - choose engine
      if (options.format === 'pdf') {
        const engine = options.pdfEngine || 'jspdf' as PDFEngine // Default to jsPDF for performance
        exporter = this.pdfExporters.get(engine)
        
        if (!exporter) {
          throw new Error(`Unsupported PDF engine: ${options.pdfEngine}`)
        }
      } else {
        exporter = this.exporters.get(options.format)
      }

      if (!exporter) {
        throw new Error(`Unsupported export format: ${options.format}`)
      }

      const workbook = facadeAPI.getActiveWorkbook()
      if (!workbook) {
        throw new Error('No active workbook found')
      }

      const worksheetData = this.getWorksheetData(workbook, options.sheetIndex)
      const filename = options.filename || `export-${Date.now()}.${options.format}`

      await exporter.export(worksheetData, filename, options)
    } catch (error) {
      console.error('Export operation failed:', error)
      throw error
    }
  }

  private getWorksheetData(workbook: any, sheetIndex?: number): any {
    const sheets = workbook.getSheets()
    if (!sheets || sheets.length === 0) {
      throw new Error('No worksheets found in workbook')
    }

    const targetIndex = sheetIndex ?? 0
    if (targetIndex >= sheets.length) {
      throw new Error(`Sheet index ${targetIndex} out of bounds`)
    }

    const worksheet = sheets[targetIndex]
    const snapshot = workbook.getSnapshot()
    
    if (!snapshot || !snapshot.sheets) {
      throw new Error('Unable to get workbook data snapshot')
    }

    const sheetId = worksheet.getSheetId()
    const worksheetData = snapshot.sheets[sheetId]
    
    if (!worksheetData) {
      throw new Error(`Worksheet data not found for sheet: ${sheetId}`)
    }

    return {
      ...worksheetData,
      name: worksheet.getName() || 'Sheet'
    }
  }
} 