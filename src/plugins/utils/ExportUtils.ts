import type { ICellAddress, IMergeInfo, IExportOptions } from '../types/export'

export class ExportUtils {
  static parseCellAddress(cellKey: string): ICellAddress {
    const match = cellKey.match(/R(\d+)C(\d+)/)
    if (!match) throw new Error(`Invalid cell key: ${cellKey}`)
    return { row: parseInt(match[1]), col: parseInt(match[2]) }
  }

  static formatCellValue(value: any, options: IExportOptions): string {
    if (value === null || value === undefined) return ''
    
    if (typeof value === 'number') {
      if (options.numberFormat) {
        return new Intl.NumberFormat('en-US', { 
          style: options.numberFormat.includes('%') ? 'percent' : 'decimal' 
        }).format(value)
      }
      return value.toString()
    }
    
    if (value instanceof Date) {
      return options.dateFormat 
        ? new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(value)
        : value.toISOString().split('T')[0]
    }
    
    return String(value)
  }

  static escapeCsvValue(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  static escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  static findMergeInfo(row: number, col: number, mergeData: any): IMergeInfo | null {
    if (!mergeData) return null
    
    for (const [, merge] of Object.entries(mergeData)) {
      const range = merge as any
      if (row >= range.startRow && row <= range.endRow && col >= range.startColumn && col <= range.endColumn) {
        if (row === range.startRow && col === range.startColumn) {
          return {
            skip: false,
            colspan: range.endColumn - range.startColumn + 1,
            rowspan: range.endRow - range.startRow + 1
          }
        } else {
          return { skip: true }
        }
      }
    }
    return null
  }

  static formatColor(color: any): string {
    if (typeof color === 'string') return color
    if (color?.rgb) return color.rgb
    return '#000000'
  }

  static generateCellStyle(style: any): string {
    let css = ''
    
    if (style.ff) css += `font-family: ${style.ff};`
    if (style.fs) css += `font-size: ${style.fs}px;`
    if (style.bl) css += 'font-weight: bold;'
    if (style.it) css += 'font-style: italic;'
    if (style.ul) css += 'text-decoration: underline;'
    if (style.st) css += 'text-decoration: line-through;'
    if (style.cl) css += `color: ${this.formatColor(style.cl)};`
    if (style.bg) css += `background-color: ${this.formatColor(style.bg)};`
    
    // Text alignment
    if (style.ht) {
      switch (style.ht) {
        case 1: css += 'text-align: left;'; break
        case 2: css += 'text-align: center;'; break
        case 3: css += 'text-align: right;'; break
      }
    }
    
    if (style.vt) {
      switch (style.vt) {
        case 1: css += 'vertical-align: top;'; break
        case 2: css += 'vertical-align: middle;'; break
        case 3: css += 'vertical-align: bottom;'; break
      }
    }

    return css
  }

  static getDataBounds(cellData: any): { maxRow: number; maxCol: number } {
    const keys = Object.keys(cellData || {})
    if (keys.length === 0) return { maxRow: 0, maxCol: 0 }
    
    const addresses = keys.map(key => this.parseCellAddress(key))
    const maxRow = Math.max(...addresses.map(addr => addr.row))
    const maxCol = Math.max(...addresses.map(addr => addr.col))
    
    return { maxRow, maxCol }
  }
} 