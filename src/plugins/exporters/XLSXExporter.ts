import { saveAs } from 'file-saver'
import type { IExporter, ExportFormat, IExportOptions } from '../types/export'

export class XLSXExporter implements IExporter {
  getFormat(): ExportFormat {
    return 'xlsx' as ExportFormat
  }

  async export(worksheetData: any, filename: string, _options: IExportOptions): Promise<void> {
    try {
      const ExcelJS = await import('exceljs')
      // exceljs exports namespace with Workbook class
      const WorkbookCtor = (ExcelJS as any).Workbook
      const wb = new WorkbookCtor()
      const wsName = worksheetData?.name || 'Sheet1'
      const ws = wb.addWorksheet(wsName)

      const cellData = worksheetData?.cellData || {}
      const rows = this.materializeGrid(cellData)

      // Write values
      for (let r = 0; r < rows.length; r++) {
        const row = ws.getRow(r + 1)
        const values = rows[r]
        for (let c = 0; c < values.length; c++) {
          const v = values[c]
          if (v === undefined || v === null) continue
          row.getCell(c + 1).value = v
        }
        row.commit?.()
      }

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, filename)
    } catch (error) {
      console.error('XLSX export failed:', error)
      throw error
    }
  }

  private materializeGrid(cellData: any): any[][] {
    const rowKeys = Object.keys(cellData || {})
    if (rowKeys.length === 0) return [[]]

    const isNestedNumeric = rowKeys.every(k => /^\d+$/.test(k) && typeof cellData[k] === 'object')
    let maxRow = 0
    let maxCol = 0

    if (isNestedNumeric) {
      maxRow = Math.max(...rowKeys.map(k => parseInt(k, 10)))
      for (const r of rowKeys) {
        const cols = Object.keys(cellData[r] || {}).filter(k => /^\d+$/.test(k)).map(k => parseInt(k, 10))
        if (cols.length) maxCol = Math.max(maxCol, Math.max(...cols))
      }
    } else {
      // Fallback for RnCm keys
      const rc = rowKeys
        .map(k => {
          const m = k.match(/R(\d+)C(\d+)/)
          return m ? { r: parseInt(m[1], 10), c: parseInt(m[2], 10) } : null
        })
        .filter(Boolean) as Array<{ r: number; c: number }>
      if (!rc.length) return [[]]
      maxRow = Math.max(...rc.map(x => x.r))
      maxCol = Math.max(...rc.map(x => x.c))
    }

    const grid: any[][] = []
    for (let r = 0; r <= maxRow; r++) {
      const row: any[] = []
      for (let c = 0; c <= maxCol; c++) {
        let cell: any
        if (isNestedNumeric) {
          cell = cellData[String(r)]?.[String(c)]
        } else {
          cell = cellData[`R${r}C${c}`]
        }
        row.push(cell?.v)
      }
      grid.push(row)
    }
    return grid
  }
}