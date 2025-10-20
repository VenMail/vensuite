import type { IExporter, ExportFormat, IExportOptions } from '../types/export'
import { ExportUtils } from '../utils/ExportUtils'

export class PDFExporter implements IExporter {
  getFormat(): ExportFormat {
    return 'pdf' as ExportFormat
  }

  async export(worksheetData: any, _filename: string, options: IExportOptions): Promise<void> {
    try {
      // Note: @akira1ce/html2pdf automatically handles filename generation
      // The _filename parameter is prefixed with underscore to indicate it's intentionally unused
      // Create HTML structure optimized for @akira1ce/html2pdf
      const container = this.createPDFContainer(worksheetData, options)
      document.body.appendChild(container)
      
      // Dynamic import for @akira1ce/html2pdf
      const { transfer2Pdf } = await import('@akira1ce/html2pdf')
      
      // Use transfer2Pdf with proper unit selectors for pagination
      await transfer2Pdf(
        container,
        '.table-row-unit', // Unit selector for row-based pagination
        'page_wrapper',    // Page wrapper class
        20                 // Page padding
      )
      
      // Clean up the temporary container
      document.body.removeChild(container)
    } catch (error) {
      console.error('PDF export failed:', error)
      throw error
    }
  }

  private createPDFContainer(worksheetData: any, options: IExportOptions): HTMLElement {
    const cellData = worksheetData.cellData || {}
    const mergeData = worksheetData.mergeData || {}
    const rowData = worksheetData.rowData || {}
    const columnData = worksheetData.columnData || {}
    const { maxRow, maxCol } = ExportUtils.getDataBounds(cellData)
    const isNestedNumeric = Object.keys(cellData).every(key => /^\d+$/.test(key))

    // Create container with fixed width (A4 landscape ~794px)
    const container = document.createElement('div')
    container.className = 'pdf-export-container'
    container.style.width = '794px'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '10px'
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'

    // Add title if available
    if (worksheetData.name) {
      const title = document.createElement('div')
      title.className = 'table-row-unit'
      title.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
        padding: 10px;
        border-bottom: 2px solid #333;
      `
      title.textContent = worksheetData.name
      container.appendChild(title)
    }
    
    // Create table structure
    const table = document.createElement('table')
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    `

    if (options.includeHeaders && maxRow >= 0) {
      const thead = document.createElement('thead')
      const headerRow = this.createHeaderRow(maxCol)
      thead.appendChild(headerRow)
      table.appendChild(thead)
    }

    const tbody = document.createElement('tbody')
    for (let row = 0; row <= maxRow; row++) {
      const tableRow = this.createDataRow(row, maxCol, cellData, isNestedNumeric, mergeData, rowData, columnData, options)
      tbody.appendChild(tableRow)
    }
    table.appendChild(tbody)
    
    container.appendChild(table)
    return container
  }

  private createHeaderRow(maxCol: number): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'table-row-unit header-row'
    tr.style.cssText = `
      page-break-inside: avoid;
      background-color: #f5f5f5;
      font-weight: bold;
      border-bottom: 1px solid #ddd;
    `
    for (let col = 0; col <= maxCol; col++) {
      const th = document.createElement('th')
      th.textContent = this.getColumnLabel(col)
      th.style.cssText = `
        border: 1px solid #ccc;
        padding: 4px 6px;
        text-align: left;
        background-color: #f5f5f5;
      `
      tr.appendChild(th)
    }
    return tr
  }

  private createDataRow(
    row: number,
    maxCol: number,
    cellData: any,
    isNestedNumeric: boolean,
    mergeData: any,
    rowData: any,
    columnData: any,
    options: IExportOptions,
  ): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'table-row-unit'
    tr.style.cssText = `
      page-break-inside: avoid;
      border-bottom: 1px solid #ddd;
      ${row % 2 === 0 ? 'background-color: #fafafa;' : ''}
    `

    const rowMeta = rowData[String(row)] ?? rowData[row]
    const rowHeight = rowMeta?.h
    if (rowHeight) {
      tr.style.height = `${Math.min(rowHeight, 100)}px`
    }

    for (let col = 0; col <= maxCol; col++) {
      const cell = this.getCellAt(cellData, isNestedNumeric, row, col)
      const mergeInfo = ExportUtils.findMergeInfo(row, col, mergeData)
      if (mergeInfo?.skip) continue

      const td = document.createElement('td')
      let cellValue = ''
      if (cell?.v !== undefined) {
        cellValue = options.includeFormulas && cell.f
          ? `=${cell.f}`
          : ExportUtils.formatCellValue(cell.v, options)
      }

      let cellStyle = `
        border: 1px solid #ccc;
        padding: 4px 6px;
        vertical-align: top;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      `

      if (options.includeStyles && cell?.s) {
        cellStyle += ExportUtils.generateCellStyle(cell.s)
      }

      const colMeta = columnData[String(col)] ?? columnData[col]
      const colWidth = colMeta?.w
      if (colWidth) {
        cellStyle += `width: ${Math.min(colWidth, 160)}px;`
      }

      if (rowHeight) {
        cellStyle += `height: ${Math.min(rowHeight, 100)}px;`
      }

      if (mergeInfo?.colspan) td.colSpan = mergeInfo.colspan
      if (mergeInfo?.rowspan) td.rowSpan = mergeInfo.rowspan

      td.style.cssText = cellStyle
      td.textContent = cellValue
      tr.appendChild(td)
    }

    return tr
  }

  private getCellAt(cellData: any, isNestedNumeric: boolean, row: number, col: number) {
    if (isNestedNumeric) {
      return cellData?.[String(row)]?.[String(col)]
    }
    return cellData[`R${row}C${col}`]
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
}