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
    
    let html = `<!DOCTYPE html>
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
  <table id="export-table">`

    for (let row = 0; row <= maxRow; row++) {
      html += '<tr>'
      for (let col = 0; col <= maxCol; col++) {
        const cellKey = `R${row}C${col}`
        const cell = cellData[cellKey]
        
        const mergeInfo = ExportUtils.findMergeInfo(row, col, mergeData)
        if (mergeInfo?.skip) continue

        let cellValue = ''
        let cellStyle = ''

        if (cell?.v !== undefined) {
          if (options.includeFormulas && cell.f) {
            cellValue = `=${cell.f}`
          } else {
            cellValue = ExportUtils.formatCellValue(cell.v, options)
          }
        }

        if (options.includeStyles && cell?.s) {
          cellStyle = ExportUtils.generateCellStyle(cell.s)
        }

        const colWidth = columnData[col]?.w
        if (colWidth) {
          cellStyle += `width: ${colWidth}px;`
        }

        const rowHeight = rowData[row]?.h
        if (rowHeight) {
          cellStyle += `height: ${rowHeight}px;`
        }

        const mergeAttrs = mergeInfo ? `colspan="${mergeInfo.colspan}" rowspan="${mergeInfo.rowspan}"` : ''
        const styleAttr = cellStyle ? `style="${cellStyle}"` : ''
        
        html += `<td ${mergeAttrs} ${styleAttr}>${ExportUtils.escapeHtml(cellValue)}</td>`
      }
      html += '</tr>'
    }

    html += `</table>
</body>
</html>`

    return html
  }

  private generateTableCSS(): string {
    return `
      table {
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
        font-size: 12px;
      }
      td {
        border: 1px solid #ddd;
        padding: 4px 8px;
        vertical-align: top;
        white-space: pre-wrap;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    `
  }
} 