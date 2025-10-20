import { saveAs } from 'file-saver'
import type { IExporter, ExportFormat, IExportOptions } from '../types/export'
import { ExportUtils } from '../utils/ExportUtils'

export class CSVExporter implements IExporter {
  getFormat(): ExportFormat {
    return 'csv' as ExportFormat
  }

  async export(worksheetData: any, filename: string, options: IExportOptions): Promise<void> {
    try {
      const csvContent = this.generateCSV(worksheetData, options)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, filename)
    } catch (error) {
      console.error('CSV export failed:', error)
      throw error
    }
  }

  private generateCSV(worksheetData: any, options: IExportOptions): string {
    const cellData = worksheetData.cellData || {}
    const { maxRow, maxCol } = ExportUtils.getDataBounds(cellData)
    const rows: string[][] = []

    const isNestedNumeric = Object.keys(cellData).every(k => /^(\d+)$/.test(k) && typeof cellData[k] === 'object')

    for (let row = 0; row <= maxRow; row++) {
      const csvRow: string[] = []
      for (let col = 0; col <= maxCol; col++) {
        let cell: any
        if (isNestedNumeric) {
          const r = String(row)
          const c = String(col)
          cell = cellData[r]?.[c]
        } else {
          const cellKey = `R${row}C${col}`
          cell = cellData[cellKey]
        }
        let value = ''

        if (cell?.v !== undefined) {
          if (options.includeFormulas && cell.f) {
            value = `=${cell.f}`
          } else {
            value = ExportUtils.formatCellValue(cell.v, options)
          }
        }

        csvRow.push(ExportUtils.escapeCsvValue(value))
      }
      rows.push(csvRow)
    }

    return rows.map(row => row.join(',')).join('\n')
  }
}