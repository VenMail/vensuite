import { saveAs } from 'file-saver'
import type { IExporter, ExportFormat, IExportOptions } from '../types/export'

export class XLSXExporter implements IExporter {
  getFormat(): ExportFormat {
    return 'xlsx' as ExportFormat
  }

  async export(worksheetData: any, filename: string, options: IExportOptions): Promise<void> {
    try {
      const { UniversJSXLSXExporter } = await import('../../lib/XLSXporter')
      const exporter = new UniversJSXLSXExporter()
      
      const buffer = await exporter.exportToXLSX(worksheetData, {
        includeStyles: options.includeStyles ?? true,
        includeFormulas: options.includeFormulas ?? true
      })
      
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      saveAs(blob, filename)
    } catch (error) {
      console.error('XLSX export failed:', error)
      throw error
    }
  }
} 