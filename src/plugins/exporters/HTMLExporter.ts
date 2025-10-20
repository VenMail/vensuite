import { saveAs } from 'file-saver'
import type { IExporter, ExportFormat, IExportOptions } from '../types/export'
import { ExportUtils } from '../utils/ExportUtils'

export class HTMLExporter implements IExporter {
  getFormat(): ExportFormat {
    return 'html' as ExportFormat
  }

  async export(worksheetData: any, filename: string, options: IExportOptions): Promise<void> {
    try {
      const htmlContent = this.generateHTML(worksheetData, options)
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
      saveAs(blob, filename)
    } catch (error) {
      console.error('HTML export failed:', error)
      throw error
    }
  }

  private generateHTML(worksheetData: any, options: IExportOptions): string {
    const cellData = worksheetData.cellData || {}
    const mergeData = worksheetData.mergeData || {}
    const rowData = worksheetData.rowData || {}
    const columnData = worksheetData.columnData || {}
    const { maxRow, maxCol } = ExportUtils.getDataBounds(cellData)
    const isNestedNumeric = Object.keys(cellData).every(key => /^\d+$/.test(key))

    const getCell = (row: number, col: number) => {
      if (isNestedNumeric) {
        return cellData[String(row)]?.[String(col)]
      }
      return cellData[`R${row}C${col}`]
    }

    const getRowMeta = (row: number) => rowData[String(row)] ?? rowData[row]
    const getColumnMeta = (col: number) => columnData[String(col)] ?? columnData[col]

    const renderDataRows = (): string => {
      let rowsHtml = ''
      for (let row = 0; row <= maxRow; row++) {
        const rowMeta = getRowMeta(row)
        const rowHeight = rowMeta?.h
        let rowHtml = '<tr'
        if (rowHeight) {
          rowHtml += ` style="height: ${rowHeight}px"`
        }
        rowHtml += '>'

        for (let col = 0; col <= maxCol; col++) {
          const cell = getCell(row, col)
          const mergeInfo = ExportUtils.findMergeInfo(row, col, mergeData)
          if (mergeInfo?.skip) continue

          let cellValue = ''
          if (cell?.v !== undefined) {
            cellValue = options.includeFormulas && cell.f
              ? `=${cell.f}`
              : ExportUtils.formatCellValue(cell.v, options)
          }

          let cellStyle = ''
          if (options.includeStyles && cell?.s) {
            cellStyle += ExportUtils.generateCellStyle(cell.s)
          }

          const colMeta = getColumnMeta(col)
          const colWidth = colMeta?.w
          if (colWidth) {
            cellStyle += `width: ${colWidth}px;`
          }

          if (rowHeight) {
            cellStyle += `height: ${rowHeight}px;`
          }

          const attrs: string[] = []
          if (mergeInfo?.colspan) attrs.push(`colspan="${mergeInfo.colspan}"`)
          if (mergeInfo?.rowspan) attrs.push(`rowspan="${mergeInfo.rowspan}"`)
          if (cellStyle) attrs.push(`style="${cellStyle}"`)

          rowHtml += `<td ${attrs.join(' ')}>${ExportUtils.escapeHtml(cellValue)}</td>`
        }

        rowHtml += '</tr>'
        rowsHtml += rowHtml
      }
      return rowsHtml
    }

    const headerHtml = options.includeHeaders
      ? `<tr class="header-row">${this.renderColumnHeaders(maxCol)}</tr>`
      : ''

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${worksheetData.name || 'Export'}</title>
  <style>
    ${this.generateTableCSS()}
  </style>
</head>
<body>
  <h1 class="sheet-title">${worksheetData.name || 'Sheet'}</h1>
  <table id="export-table">
    <tbody>
      ${headerHtml}
      ${renderDataRows()}
    </tbody>
  </table>
</body>
</html>`
  }

  private renderColumnHeaders(maxCol: number): string {
    const headers: string[] = []
    for (let col = 0; col <= maxCol; col++) {
      headers.push(`<th>${this.getColumnLabel(col)}</th>`)
    }
    return headers.join('')
  }

  private getColumnLabel(index: number): string {
    let label = ''
    let current = index
    while (current >= 0) {
      label = String.fromCharCode((current % 26) + 65) + label
      current = Math.floor(current / 26) - 1
    }
    return label
  }

  private generateTableCSS(): string {
    return `
      table {
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
        font-size: 12px;
      }
      .sheet-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 4px 8px;
        vertical-align: top;
        white-space: pre-wrap;
      }
      th {
        background-color: #f5f5f5;
        font-weight: 600;
        text-align: left;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    `
  }
}