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
    
    // Generate header row if needed
    if (options.includeHeaders && maxRow >= 0) {
      const headerRow = this.createTableRow(0, maxCol, cellData, mergeData, rowData, columnData, options, true)
      table.appendChild(headerRow)
    }
    
    // Generate data rows - each row as a separate unit for pagination
    const startRow = options.includeHeaders ? 1 : 0
    for (let row = startRow; row <= maxRow; row++) {
      const tableRow = this.createTableRow(row, maxCol, cellData, mergeData, rowData, columnData, options, false)
      table.appendChild(tableRow)
    }
    
    container.appendChild(table)
    return container
  }

  private createTableRow(
    row: number, 
    maxCol: number, 
    cellData: any, 
    mergeData: any, 
    rowData: any, 
    columnData: any, 
    options: IExportOptions,
    isHeader: boolean
  ): HTMLElement {
    const tr = document.createElement('tr')
    tr.className = 'table-row-unit' // Mark each row as a pagination unit
    
    // Apply row height
    const rowHeight = rowData[row]?.h
    if (rowHeight) {
      tr.style.height = `${Math.min(rowHeight, 100)}px`
    }
    
    // Base row styling
    tr.style.cssText += `
      page-break-inside: avoid;
      border-bottom: 1px solid #ddd;
      ${isHeader ? 'background-color: #f5f5f5; font-weight: bold;' : ''}
      ${row % 2 === 0 && !isHeader ? 'background-color: #fafafa;' : ''}
    `
    
    for (let col = 0; col <= maxCol; col++) {
      const cellKey = `R${row}C${col}`
      const cell = cellData[cellKey]
      
      const mergeInfo = ExportUtils.findMergeInfo(row, col, mergeData)
      if (mergeInfo?.skip) continue

      const td = document.createElement('td')
      let cellValue = ''
      let cellStyle = `
        border: 1px solid #ccc;
        padding: 4px 6px;
        vertical-align: top;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
      `

      if (cell?.v !== undefined) {
        if (options.includeFormulas && cell.f) {
          cellValue = `=${cell.f}`
        } else {
          cellValue = ExportUtils.formatCellValue(cell.v, options)
        }
      }

      if (options.includeStyles && cell?.s) {
        cellStyle += ExportUtils.generateCellStyle(cell.s)
      }

      // Apply column width
      const colWidth = columnData[col]?.w
      if (colWidth) {
        cellStyle += `width: ${Math.min(colWidth, 120)}px;`
      }

      // Apply merge attributes
      if (mergeInfo) {
        if (mergeInfo.colspan && mergeInfo.colspan > 1) td.colSpan = mergeInfo.colspan
        if (mergeInfo.rowspan && mergeInfo.rowspan > 1) td.rowSpan = mergeInfo.rowspan
      }

      td.style.cssText = cellStyle
      td.textContent = cellValue
      tr.appendChild(td)
    }
    
    return tr
  }
} 