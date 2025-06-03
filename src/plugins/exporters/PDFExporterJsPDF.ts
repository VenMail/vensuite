import type { IExporter, ExportFormat, IExportOptions } from '../types/export'
import { ExportUtils } from '../utils/ExportUtils'
import { saveAs } from 'file-saver'

export class PDFExporterJsPDF implements IExporter {
  getFormat(): ExportFormat {
    return 'pdf' as ExportFormat
  }

  async export(worksheetData: any, filename: string, options: IExportOptions): Promise<void> {
    try {
      // Dynamic imports for better code splitting
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      })

      // Add title if available
      if (worksheetData.name) {
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(worksheetData.name, 40, 40)
      }

      const tableData = this.prepareTableData(worksheetData, options)
      
      if (tableData.head.length > 0 || tableData.body.length > 0) {
        const startY = worksheetData.name ? 60 : 40

        autoTable(doc, {
          head: options.includeHeaders ? [tableData.head] : [],
          body: tableData.body,
          startY: startY,
          margin: { top: 40, right: 40, bottom: 40, left: 40 },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.5
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: this.generateColumnStyles(worksheetData, options),
          didParseCell: (data) => {
            // Apply custom cell styling based on original cell data
            this.applyCellStyling(data, worksheetData, options)
          },
          // Handle page breaks intelligently
          showHead: 'everyPage',
          pageBreak: 'auto',
          tableWidth: 'auto'
        })
      }

      // Save the PDF
      const pdfBlob = doc.output('blob')
      saveAs(pdfBlob, filename)
    } catch (error) {
      console.error('jsPDF export failed:', error)
      throw error
    }
  }

  private prepareTableData(worksheetData: any, options: IExportOptions): { head: string[], body: string[][] } {
    const cellData = worksheetData.cellData || {}
    const { maxRow, maxCol } = ExportUtils.getDataBounds(cellData)
    
    const head: string[] = []
    const body: string[][] = []

    // Generate header row
    if (options.includeHeaders && maxRow >= 0) {
      for (let col = 0; col <= maxCol; col++) {
        const cellKey = `R0C${col}`
        const cell = cellData[cellKey]
        let value = ''

        if (cell?.v !== undefined) {
          value = ExportUtils.formatCellValue(cell.v, options)
        }
        head.push(value || `Col ${col + 1}`)
      }
    }

    // Generate data rows
    const startRow = options.includeHeaders ? 1 : 0
    for (let row = startRow; row <= maxRow; row++) {
      const dataRow: string[] = []
      
      for (let col = 0; col <= maxCol; col++) {
        const cellKey = `R${row}C${col}`
        const cell = cellData[cellKey]
        let value = ''

        if (cell?.v !== undefined) {
          if (options.includeFormulas && cell.f) {
            value = `=${cell.f}`
          } else {
            value = ExportUtils.formatCellValue(cell.v, options)
          }
        }
        dataRow.push(value)
      }
      body.push(dataRow)
    }

    return { head, body }
  }

  private generateColumnStyles(worksheetData: any, options: IExportOptions): Record<number, any> {
    const columnData = worksheetData.columnData || {}
    const columnStyles: Record<number, any> = {}
    
    if (!options.includeStyles) return columnStyles

    Object.keys(columnData).forEach(colStr => {
      const col = parseInt(colStr)
      const colInfo = columnData[col]
      
      if (colInfo?.w) {
        // Convert column width to points (rough approximation)
        const widthPt = Math.max(30, Math.min(colInfo.w * 0.75, 120))
        columnStyles[col] = { cellWidth: widthPt }
      }
    })

    return columnStyles
  }

  private applyCellStyling(data: any, worksheetData: any, options: IExportOptions): void {
    if (!options.includeStyles) return

    const cellData = worksheetData.cellData || {}
    const cellKey = `R${data.row.index}C${data.column.index}`
    const cell = cellData[cellKey]

    if (!cell?.s) return

    const style = cell.s
    
    // Apply font styling
    if (style.bl) data.cell.styles.fontStyle = 'bold'
    if (style.it) data.cell.styles.fontStyle = 'italic'
    
    // Apply text color
    if (style.cl) {
      const color = ExportUtils.formatColor(style.cl)
      if (color !== '#000000') {
        const rgb = this.hexToRgb(color)
        if (rgb) data.cell.styles.textColor = [rgb.r, rgb.g, rgb.b]
      }
    }
    
    // Apply background color
    if (style.bg) {
      const color = ExportUtils.formatColor(style.bg)
      if (color !== '#ffffff' && color !== '#FFFFFF') {
        const rgb = this.hexToRgb(color)
        if (rgb) data.cell.styles.fillColor = [rgb.r, rgb.g, rgb.b]
      }
    }
    
    // Apply text alignment
    if (style.ht) {
      switch (style.ht) {
        case 1: data.cell.styles.halign = 'left'; break
        case 2: data.cell.styles.halign = 'center'; break
        case 3: data.cell.styles.halign = 'right'; break
      }
    }
    
    if (style.vt) {
      switch (style.vt) {
        case 1: data.cell.styles.valign = 'top'; break
        case 2: data.cell.styles.valign = 'middle'; break
        case 3: data.cell.styles.valign = 'bottom'; break
      }
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
} 