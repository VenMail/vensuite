import { ref } from 'vue'
import { toast } from '@/composables/useToast'

type CellRange = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

type SortColumn = {
  column: string
  order: 'asc' | 'desc'
}

type MatchOptions = {
  matchCase: boolean
  matchWholeWord: boolean
  useRegex: boolean
}

export function useSheetDataTools(vtableRef: any) {
  const findReplaceOpen = ref(false)
  const findText = ref('')
  const replaceText = ref('')
  const matchCase = ref(false)
  const matchWholeWord = ref(false)
  const useRegex = ref(false)

  const advancedSortOpen = ref(false)
  const sortColumns = ref<SortColumn[]>([{ column: '', order: 'asc' }])
  const sortHasHeaders = ref(true)
  const currentZoom = ref(1)

  function getInstance() {
    return vtableRef.value?.getInstance?.() ?? null
  }

  function getActiveSheet() {
    return vtableRef.value?.getActiveSheet?.() ?? null
  }

  function getTableInstance(sheet = getActiveSheet()) {
    return sheet?.tableInstance ?? null
  }

  function getRootElement() {
    return getInstance()?.getRootElement?.() ?? null
  }

  function normalizeRange(range: Partial<CellRange> | null | undefined): CellRange | null {
    if (!range) return null
    const startRow = Number(range.startRow)
    const startCol = Number(range.startCol)
    const endRow = Number(range.endRow ?? range.startRow)
    const endCol = Number(range.endCol ?? range.startCol)
    if ([startRow, startCol, endRow, endCol].some(value => Number.isNaN(value))) {
      return null
    }
    return {
      startRow: Math.min(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endRow: Math.max(startRow, endRow),
      endCol: Math.max(startCol, endCol),
    }
  }

  function getSelection(sheet = getActiveSheet()): CellRange | null {
    const selection = sheet?.getSelection?.()
    return normalizeRange(selection)
  }

  function getData(sheet = getActiveSheet()): any[][] {
    const data = sheet?.getData?.()
    if (!Array.isArray(data)) return []
    return data.map(row => Array.isArray(row) ? [...row] : [])
  }

  function cloneColumns(sheet = getActiveSheet(), data = getData(sheet)): any[] {
    const existingColumns = sheet?.getColumns?.() ?? sheet?.options?.columns ?? []
    if (Array.isArray(existingColumns) && existingColumns.length > 0) {
      return existingColumns.map((column: Record<string, any>) => ({ ...column }))
    }
    const width = Math.max(...data.map(row => row.length), 0)
    return Array.from({ length: width }, (_, index) => ({
      field: index,
      title: columnIndexToName(index),
    }))
  }

  function updateSheetData(nextData: any[][], extraOptions: Record<string, any> = {}, sheet = getActiveSheet()) {
    if (!sheet) return
    const columns = extraOptions.columns ?? cloneColumns(sheet, nextData)
    try {
      sheet.updateSheetOption?.({
        ...extraOptions,
        columns,
        data: nextData,
      })
      getTableInstance(sheet)?.scenegraph?.updateNextFrame?.()
    } catch (error) {
      console.error('Failed to update sheet data:', error)
      toast.error('Unable to update the sheet right now')
    }
  }

  function focusCell(row: number, col: number, sheet = getActiveSheet()) {
    const table = getTableInstance(sheet)
    try {
      table?.selectCells?.({ row, col })
    } catch {}
  }

  function columnIndexToName(index: number) {
    let value = index
    let label = ''
    while (value >= 0) {
      label = String.fromCharCode((value % 26) + 65) + label
      value = Math.floor(value / 26) - 1
    }
    return label
  }

  function getCellAddress(row: number, col: number, sheet = getActiveSheet()) {
    return sheet?.addressFromCoord?.({ row, col }) ?? `${columnIndexToName(col)}${row + 1}`
  }

  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function buildMatcher(query: string, options: MatchOptions) {
    const raw = options.useRegex ? query : escapeRegExp(query)
    const source = options.matchWholeWord ? `\\b${raw}\\b` : raw
    const flags = options.matchCase ? 'g' : 'gi'
    const regex = new RegExp(source, flags)

    return (value: unknown) => {
      const text = String(value ?? '')
      regex.lastIndex = 0
      return regex.test(text)
    }
  }

  function replaceMatches(value: unknown, query: string, replacement: string, options: MatchOptions) {
    const text = String(value ?? '')
    const raw = options.useRegex ? query : escapeRegExp(query)
    const source = options.matchWholeWord ? `\\b${raw}\\b` : raw
    const flags = options.matchCase ? 'g' : 'gi'
    return text.replace(new RegExp(source, flags), replacement)
  }

  function compareValues(left: unknown, right: unknown, order: 'asc' | 'desc') {
    const normalize = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      if (typeof value === 'number') return value
      const numeric = Number(value)
      if (!Number.isNaN(numeric) && `${numeric}` === `${value}`.trim()) return numeric
      return String(value).toLowerCase()
    }

    const a = normalize(left)
    const b = normalize(right)
    if (a === b) return 0
    if (a === null) return 1
    if (b === null) return -1
    const result = a > b ? 1 : -1
    return order === 'desc' ? result * -1 : result
  }

  function getSelectedColumnIndexes(selection: CellRange | null, data: any[][]) {
    if (selection) {
      return Array.from(
        { length: selection.endCol - selection.startCol + 1 },
        (_, offset) => selection.startCol + offset,
      )
    }
    const width = Math.max(...data.map(row => row.length), 0)
    return Array.from({ length: width }, (_, index) => index)
  }

  function sortRows(rows: any[][], columns: SortColumn[]) {
    return [...rows].sort((left, right) => {
      for (const spec of columns) {
        const columnIndex = columnNameToIndex(spec.column)
        if (columnIndex < 0) continue
        const result = compareValues(left[columnIndex], right[columnIndex], spec.order)
        if (result !== 0) return result
      }
      return 0
    })
  }

  function columnNameToIndex(columnName: string) {
    const normalized = columnName.trim().toUpperCase()
    if (!normalized) return -1
    let index = 0
    for (let i = 0; i < normalized.length; i++) {
      index = (index * 26) + (normalized.charCodeAt(i) - 64)
    }
    return index - 1
  }

  function applyFrozenCounts(rowCount: number, colCount: number) {
    const sheet = getActiveSheet()
    const table = getTableInstance(sheet)
    if (!sheet || !table) return
    try {
      table.setFrozenRowCount?.(rowCount)
      table.setFrozenColCount?.(colCount)
      sheet.updateSheetOption?.({
        frozenRowCount: rowCount,
        frozenColCount: colCount,
      })
      toast.success('Pane freeze updated')
    } catch (error) {
      console.error('Failed to update frozen panes:', error)
      toast.error('Unable to update frozen panes')
    }
  }

  function handleFreezeTopRow() {
    applyFrozenCounts(1, getTableInstance()?.frozenColCount ?? 0)
  }

  function handleFreezeFirstColumn() {
    applyFrozenCounts(getTableInstance()?.frozenRowCount ?? 0, 1)
  }

  function handleFreezePanes() {
    const selection = getSelection()
    if (!selection) {
      toast.info('Select a cell first to freeze panes')
      return
    }
    applyFrozenCounts(selection.startRow, selection.startCol)
  }

  function handleUnfreeze() {
    applyFrozenCounts(0, 0)
  }

  function handleFindReplace() {
    findReplaceOpen.value = true
  }

  function findMatches() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    const query = findText.value.trim()
    if (!sheet || !query) return []

    const matcher = buildMatcher(query, {
      matchCase: matchCase.value,
      matchWholeWord: matchWholeWord.value,
      useRegex: useRegex.value,
    })

    const matches: Array<{ row: number; col: number; value: string }> = []
    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (matcher(cell)) {
          matches.push({ row: rowIndex, col: colIndex, value: String(cell ?? '') })
        }
      })
    })
    return matches
  }

  function executeFind() {
    const matches = findMatches()
    if (matches.length === 0) {
      toast.info('No matching cells found')
      return
    }
    const firstMatch = matches[0]
    focusCell(firstMatch.row, firstMatch.col)
    toast.success(`Found a match at ${getCellAddress(firstMatch.row, firstMatch.col)}`)
  }

  function executeReplace() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    const data = getData(sheet)
    const query = findText.value.trim()
    if (!sheet || !selection || !query) return

    const matcher = buildMatcher(query, {
      matchCase: matchCase.value,
      matchWholeWord: matchWholeWord.value,
      useRegex: useRegex.value,
    })

    const currentValue = data[selection.startRow]?.[selection.startCol]
    if (matcher(currentValue)) {
      const nextValue = replaceMatches(currentValue, query, replaceText.value, {
        matchCase: matchCase.value,
        matchWholeWord: matchWholeWord.value,
        useRegex: useRegex.value,
      })
      sheet.setCellValue?.(selection.startCol, selection.startRow, nextValue)
      toast.success(`Replaced match at ${getCellAddress(selection.startRow, selection.startCol)}`)
      return
    }

    const firstMatch = findMatches()[0]
    if (!firstMatch) {
      toast.info('No matching cells found')
      return
    }

    const nextValue = replaceMatches(firstMatch.value, query, replaceText.value, {
      matchCase: matchCase.value,
      matchWholeWord: matchWholeWord.value,
      useRegex: useRegex.value,
    })
    sheet.setCellValue?.(firstMatch.col, firstMatch.row, nextValue)
    focusCell(firstMatch.row, firstMatch.col, sheet)
    toast.success(`Replaced match at ${getCellAddress(firstMatch.row, firstMatch.col)}`)
  }

  function executeReplaceAll() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    const query = findText.value.trim()
    if (!sheet || !query) return

    let replacements = 0
    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const nextValue = replaceMatches(cell, query, replaceText.value, {
          matchCase: matchCase.value,
          matchWholeWord: matchWholeWord.value,
          useRegex: useRegex.value,
        })
        if (nextValue !== String(cell ?? '')) {
          sheet.setCellValue?.(colIndex, rowIndex, nextValue)
          replacements += 1
        }
      })
    })

    if (replacements === 0) {
      toast.info('No matching cells found')
      return
    }

    toast.success(`Replaced ${replacements} cell${replacements === 1 ? '' : 's'}`)
  }

  function handleAdvancedSort() {
    advancedSortOpen.value = true
    sortColumns.value = [{ column: '', order: 'asc' }]
    sortHasHeaders.value = true
  }

  function addSortColumn() {
    sortColumns.value.push({ column: '', order: 'asc' })
  }

  function removeSortColumn(index: number) {
    sortColumns.value.splice(index, 1)
  }

  function executeAdvancedSort() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    const activeColumns = sortColumns.value.filter(column => column.column.trim())
    if (!sheet || activeColumns.length === 0) return

    const headerOffset = sortHasHeaders.value ? 1 : 0
    const headerRow = sortHasHeaders.value ? data.slice(0, 1) : []
    const bodyRows = data.slice(headerOffset)
    const nextData = [...headerRow, ...sortRows(bodyRows, activeColumns)]

    updateSheetData(nextData, {
      sortState: activeColumns.map(column => ({
        field: columnNameToIndex(column.column),
        order: column.order,
      })),
    }, sheet)

    advancedSortOpen.value = false
    toast.success('Rows sorted')
  }

  function handleDataSort() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    const selection = getSelection(sheet)
    if (!sheet || data.length === 0) return

    const sortColumnIndex = selection?.startCol ?? 0
    const currentState = getTableInstance(sheet)?.internalProps?.sortState
    const currentOrder = Array.isArray(currentState) ? currentState[0]?.order : currentState?.order
    const nextOrder: 'asc' | 'desc' = currentOrder === 'asc' ? 'desc' : 'asc'
    const hasHeaders = Boolean(sheet?.options?.showHeader)

    const nextData = hasHeaders
      ? [data[0], ...sortRows(data.slice(1), [{ column: columnIndexToName(sortColumnIndex), order: nextOrder }])]
      : sortRows(data, [{ column: columnIndexToName(sortColumnIndex), order: nextOrder }])

    updateSheetData(nextData, {
      sortState: [{ field: sortColumnIndex, order: nextOrder }],
    }, sheet)

    toast.success(`Sorted column ${columnIndexToName(sortColumnIndex)} ${nextOrder === 'asc' ? 'A to Z' : 'Z to A'}`)
  }

  function handleDataFilter() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    if (!sheet || data.length === 0) return

    const selection = getSelection(sheet)
    const columns = cloneColumns(sheet, data)
    const targetIndexes = getSelectedColumnIndexes(selection, data)
    const nextEnabled = !targetIndexes.every(index => Boolean(columns[index]?.filter))

    targetIndexes.forEach(index => {
      if (!columns[index]) return
      columns[index].filter = nextEnabled
    })

    sheet.updateSheetOption?.({
      columns,
      filter: columns.some(column => Boolean(column?.filter)),
    })
    getTableInstance(sheet)?.scenegraph?.updateNextFrame?.()

    toast.success(nextEnabled ? 'Column filters enabled' : 'Column filters cleared')
  }

  function handleDataGroup() {
    const sheet = getActiveSheet()
    const table = getTableInstance(sheet)
    const columns = cloneColumns(sheet)
    const selection = getSelection(sheet)
    if (!sheet || !table) return

    if (!sheet?.options?.showHeader) {
      sheet.setFirstRowAsHeader?.()
      toast.success('First row promoted to headers for easier grouping')
      return
    }

    const groupColumnIndex = selection?.startCol ?? 0
    const groupField = columns[groupColumnIndex]?.field ?? groupColumnIndex
    const currentGroupBy = table.options?.groupBy
    const isActive = Array.isArray(currentGroupBy)
      ? currentGroupBy.includes(groupField)
      : currentGroupBy === groupField

    table.updateOption?.({
      ...table.options,
      groupBy: isActive ? undefined : [groupField],
    })

    toast.success(
      isActive
        ? `Removed grouping from column ${columnIndexToName(groupColumnIndex)}`
        : `Grouped rows by column ${columnIndexToName(groupColumnIndex)}`,
    )
  }

  function setZoom(value: number) {
    const instance = getInstance()
    const root = getRootElement()
    if (!root) return
    currentZoom.value = Math.max(0.5, Math.min(value, 2))
    const el = root as HTMLElement
    el.style.transformOrigin = 'top left'
    el.style.transform = currentZoom.value === 1 ? '' : `scale(${currentZoom.value})`
    el.style.width = currentZoom.value === 1 ? '' : `${100 / currentZoom.value}%`
    el.style.height = currentZoom.value === 1 ? '' : `${100 / currentZoom.value}%`
    try {
      instance?.resize?.()
    } catch {}
    toast.info(`Zoom ${Math.round(currentZoom.value * 100)}%`)
  }

  function handleViewZoomIn() {
    setZoom(currentZoom.value + 0.1)
  }

  function handleViewZoomOut() {
    setZoom(currentZoom.value - 0.1)
  }

  function handleViewZoomReset() {
    setZoom(1)
  }

  function escapeHtml(text: string) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function handlePrint() {
    const sheet = getActiveSheet()
    const data = getData(sheet)
    const columns = sheet?.getColumns?.() ?? []
    if (!sheet) {
      window.print()
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Allow popups to print')
      return
    }
    const headers = columns.map((c: any) => c.title || c.field || '')
    const hasHeaders = headers.some((h: string) => h !== '')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(sheet.getTitle?.() ?? 'Sheet')}</title>
<style>
body { font-family: Arial, sans-serif; margin: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #999; padding: 6px 8px; font-size: 11pt; text-align: left; }
th { background: #f0f0f0; font-weight: 600; }
@media print { @page { margin: 12mm; } }
</style></head><body>
<table>
${hasHeaders ? `<thead><tr>${headers.map((h: string) => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr></thead>` : ''}
<tbody>${data.map(row => `<tr>${row.map((c: any) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); }<\/script>
</body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  function getMergeArray(sheet = getActiveSheet()): any[] {
    const existing = sheet?.options?.cellMerge
    return Array.isArray(existing) ? [...existing] : []
  }

  function rangesOverlap(a: CellRange, b: CellRange) {
    return !(a.endRow < b.startRow || a.startRow > b.endRow || a.endCol < b.startCol || a.startCol > b.endCol)
  }

  function handleMergeCells() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select a range first')
      return
    }
    if (selection.startRow === selection.endRow && selection.startCol === selection.endCol) {
      toast.info('Select more than one cell to merge')
      return
    }
    const merges = getMergeArray(sheet)
    const filtered = merges.filter((m: any) => !rangesOverlap(m as CellRange, selection))
    filtered.push({ ...selection })
    sheet.updateSheetOption?.({ cellMerge: filtered })
    getTableInstance(sheet)?.scenegraph?.updateNextFrame?.()
    toast.success('Cells merged')
  }

  function handleUnmergeCells() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select a merged cell first')
      return
    }
    const merges = getMergeArray(sheet)
    const remaining = merges.filter((m: any) => !rangesOverlap(m as CellRange, selection))
    if (remaining.length === merges.length) {
      toast.info('No merged cells in selection')
      return
    }
    sheet.updateSheetOption?.({ cellMerge: remaining })
    getTableInstance(sheet)?.scenegraph?.updateNextFrame?.()
    toast.success('Cells unmerged')
  }

  function insertRow(position: 'above' | 'below') {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet) return
    const data = getData(sheet)
    const width = Math.max(...data.map(r => r.length), sheet?.getColumnCount?.() ?? 0)
    const blankRow = Array.from({ length: width }, () => '')
    const targetRow = selection?.startRow ?? data.length
    const insertAt = position === 'above' ? targetRow : targetRow + 1
    const nextData = [...data.slice(0, insertAt), blankRow, ...data.slice(insertAt)]
    updateSheetData(nextData, {}, sheet)
    toast.success(`Row inserted ${position}`)
  }

  function insertColumn(position: 'left' | 'right') {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet) return
    const data = getData(sheet)
    const targetCol = selection?.startCol ?? 0
    const insertAt = position === 'left' ? targetCol : targetCol + 1
    const nextData = data.map(row => {
      const copy = [...row]
      copy.splice(insertAt, 0, '')
      return copy
    })
    const columns = cloneColumns(sheet, data)
    columns.splice(insertAt, 0, {
      field: `col-${Date.now()}`,
      title: columnIndexToName(insertAt),
    })
    columns.forEach((col: any, idx: number) => {
      if (typeof col.field === 'number') col.field = idx
    })
    updateSheetData(nextData, { columns }, sheet)
    toast.success(`Column inserted ${position}`)
  }

  function deleteSelectedRows() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select row(s) first')
      return
    }
    const data = getData(sheet)
    const nextData = [...data.slice(0, selection.startRow), ...data.slice(selection.endRow + 1)]
    updateSheetData(nextData, {}, sheet)
    toast.success('Rows deleted')
  }

  function deleteSelectedColumns() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select column(s) first')
      return
    }
    const data = getData(sheet)
    const nextData = data.map(row => {
      const copy = [...row]
      copy.splice(selection.startCol, selection.endCol - selection.startCol + 1)
      return copy
    })
    const columns = cloneColumns(sheet, data)
    columns.splice(selection.startCol, selection.endCol - selection.startCol + 1)
    updateSheetData(nextData, { columns }, sheet)
    toast.success('Columns deleted')
  }

  function handleToggleFirstRowHeader() {
    const sheet = getActiveSheet()
    if (!sheet) return
    try {
      sheet.setFirstRowAsHeader?.()
      toast.success('First row set as header')
    } catch (error) {
      console.error('Header toggle failed:', error)
      toast.error('Unable to set header')
    }
  }

  function handleWrapText() {
    const sheet = getActiveSheet()
    const table = getTableInstance(sheet)
    if (!sheet || !table) return
    const current = Boolean(sheet.options?.autoWrapText)
    try {
      table.updateOption?.({ ...table.options, autoWrapText: !current })
      sheet.updateSheetOption?.({ autoWrapText: !current } as any)
      toast.success(current ? 'Wrap text off' : 'Wrap text on')
    } catch (error) {
      console.error('Wrap text failed:', error)
      toast.error('Unable to toggle wrap')
    }
  }

  return {
    findReplaceOpen,
    findText,
    replaceText,
    matchCase,
    matchWholeWord,
    useRegex,
    advancedSortOpen,
    sortColumns,
    sortHasHeaders,
    handleFreezeTopRow,
    handleFreezeFirstColumn,
    handleFreezePanes,
    handleUnfreeze,
    handleFindReplace,
    executeFind,
    executeReplace,
    executeReplaceAll,
    handleAdvancedSort,
    addSortColumn,
    removeSortColumn,
    executeAdvancedSort,
    handleDataSort,
    handleDataFilter,
    handleDataGroup,
    handleViewZoomIn,
    handleViewZoomOut,
    handleViewZoomReset,
    handlePrint,
    handleMergeCells,
    handleUnmergeCells,
    insertRow,
    insertColumn,
    deleteSelectedRows,
    deleteSelectedColumns,
    handleToggleFirstRowHeader,
    handleWrapText,
  }
}
