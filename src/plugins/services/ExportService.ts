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
        // Primary path for XLSX: use LuckyExcel for 1:1 parity, fallback to registered exporter on error
        if (options.format === 'xlsx') {
          const workbook = (facadeAPI as any).getActiveWorkbook()
          if (!workbook) {
            throw new Error('No active workbook found')
          }
          const filename = options.filename || `export-${Date.now()}.xlsx`
          const saved = typeof (workbook as any).save === 'function' ? await (workbook as any).save() : null
          if (!saved) {
            throw new Error('Workbook save() is not available')
          }

          // Attempt primary export using univer-import-export
          try {
            // @ts-ignore dynamic import; package may not exist until installed
            const mod: any = await import(/* @vite-ignore */ '@mertdeveci55/univer-import-export')
            if (mod?.LuckyExcel?.transformUniverToExcel) {
              await new Promise<void>((resolve, reject) => {
                try {
                  mod.LuckyExcel.transformUniverToExcel({
                    snapshot: saved,
                    fileName: filename,
                    success: () => resolve(),
                    error: (err: any) => reject(err),
                  })
                } catch (e) {
                  reject(e)
                }
              })
              return
            }
          } catch (e) {
            console.warn('LuckyExcel XLSX export not available or failed, falling back to default exporter:', e)
            // fall through to exporter fallback
          }

          exporter = this.exporters.get(options.format)
        } else {
          exporter = this.exporters.get(options.format)
        }
      }

      if (!exporter) {
        throw new Error(`Unsupported export format: ${options.format}`)
      }

      const workbook = (facadeAPI as any).getActiveWorkbook()
      if (!workbook) {
        throw new Error('No active workbook found')
      }
      const saved = typeof (workbook as any).save === 'function' ? await (workbook as any).save() : null
      if (!saved) {
        throw new Error('Unable to get workbook data using save()')
      }

      const worksheetData = this.getWorksheetDataFromSaved(saved, workbook, options.sheetIndex)
      const filename = options.filename || `export-${Date.now()}.${options.format}`

      await exporter.export(worksheetData, filename, options)
    } catch (error) {
      console.error('Export operation failed:', error)
      throw error
    }
  }

  private getWorksheetDataFromSaved(saved: any, workbook: any, sheetIndex?: number): any {
    const order: string[] = Array.isArray(saved?.sheetOrder) ? saved.sheetOrder : []
    if (!order.length || !saved?.sheets) {
      throw new Error('No worksheets found in saved workbook')
    }

    // Try active sheet id first
    let activeSheetId: string | undefined
    try {
      const activeSheet = workbook?.getActiveSheet?.()
      activeSheetId = activeSheet?.getSheetId?.()
    } catch {}

    let targetId = typeof sheetIndex === 'number' ? order[sheetIndex] : activeSheetId || order[0]
    if (!targetId || !saved.sheets[targetId]) {
      targetId = order[0]
    }

    const worksheetData = saved.sheets[targetId]
    const name = worksheetData?.name || 'Sheet'
    return { ...worksheetData, name }
  }
} 