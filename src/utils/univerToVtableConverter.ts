import type { IVTableSheetOptions } from '@visactor/vtable-sheet'

// Converts column index (0-based) to A1 column letter(s): 0→A, 25→Z, 26→AA …
function colToLetter(col: number): string {
  let result = ''
  let n = col
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

function toA1(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`
}

export function convertUniverToVtable(univerData: any): IVTableSheetOptions {
  const sheets = univerData.sheets ?? {}
  const sheetOrder: string[] = univerData.sheetOrder ?? Object.keys(sheets)

  const sheetDefs = sheetOrder.map((sheetId, idx) => {
    const sheet = sheets[sheetId] ?? {}
    const cellData: Record<number, Record<number, any>> = sheet.cellData ?? {}
    const rowCount: number = sheet.rowCount ?? 100
    const colCount: number = sheet.columnCount ?? 26

    // Build sparse 2D array — only rows that have data
    const dataMap: Map<number, Map<number, any>> = new Map()
    const formulas: Record<string, string> = {}

    for (const [rowStr, cols] of Object.entries(cellData)) {
      const r = Number(rowStr)
      if (!dataMap.has(r)) dataMap.set(r, new Map())
      for (const [colStr, cell] of Object.entries(cols as Record<string, any>)) {
        const c = Number(colStr)
        const value = cell?.v ?? null
        dataMap.get(r)!.set(c, value)
        if (typeof cell?.f === 'string' && cell.f) {
          formulas[toA1(r, c)] = cell.f
        }
      }
    }

    // Materialise into 2D array — only up to last non-empty row/col
    let maxRow = -1
    let maxCol = -1
    dataMap.forEach((cols, r) => {
      if (r > maxRow) maxRow = r
      cols.forEach((_, c) => {
        if (c > maxCol) maxCol = c
      })
    })

    const data: any[][] = []
    if (maxRow >= 0) {
      for (let r = 0; r <= maxRow; r++) {
        const row: any[] = []
        for (let c = 0; c <= maxCol; c++) {
          row.push(dataMap.get(r)?.get(c) ?? '')
        }
        data.push(row)
      }
    }

    return {
      sheetKey: sheetId,
      sheetTitle: sheet.name ?? `Sheet${idx + 1}`,
      columnCount: colCount,
      rowCount,
      data,
      ...(Object.keys(formulas).length ? { formulas } : {}),
      active: idx === 0,
    }
  })

  return {
    sheets: sheetDefs,
    showFormulaBar: true,
    showSheetTab: true,
    defaultRowHeight: 25,
    defaultColWidth: 100,
  }
}
