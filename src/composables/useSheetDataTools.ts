import { ref } from 'vue'
import { toast } from '@/composables/useToast'

export function useSheetDataTools(univerRef: any) {
  // Find & Replace state
  const findReplaceOpen = ref(false)
  const findText = ref('')
  const replaceText = ref('')
  const matchCase = ref(false)
  const matchWholeWord = ref(false)
  const useRegex = ref(false)

  // Advanced Sorting state
  const advancedSortOpen = ref(false)
  const sortColumns = ref([{ column: '', order: 'asc' }])
  const sortHasHeaders = ref(true)

  // Freeze panes functions - Updated for Univer 0.15.x
  function handleFreezeTopRow() {
    try {
      const worksheet = univerRef.value?.fUniver?.getActiveWorkbook()?.getActiveSheet()
      if (!worksheet) {
        toast.error('No active worksheet found')
        return
      }
      
      // Updated API for Univer 0.15.x
      const freezeManager = worksheet.getFreezeManager?.()
      if (freezeManager) {
        freezeManager.freezeTopRow?.(1) || freezeManager.freezeRows?.(1)
        toast.success('Top row frozen')
      } else {
        // Fallback to older API
        worksheet?.setFrozenRows?.(1)
        toast.success('Top row frozen')
      }
    } catch (error) {
      console.error('Error freezing top row:', error)
      toast.error('Failed to freeze top row')
    }
  }

  function handleFreezeFirstColumn() {
    try {
      const worksheet = univerRef.value?.fUniver?.getActiveWorkbook()?.getActiveSheet()
      if (!worksheet) {
        toast.error('No active worksheet found')
        return
      }
      
      // Updated API for Univer 0.15.x
      const freezeManager = worksheet.getFreezeManager?.()
      if (freezeManager) {
        freezeManager.freezeLeftColumn?.(1) || freezeManager.freezeColumns?.(1)
        toast.success('First column frozen')
      } else {
        // Fallback to older API
        worksheet?.setFrozenColumns?.(1)
        toast.success('First column frozen')
      }
    } catch (error) {
      console.error('Error freezing first column:', error)
      toast.error('Failed to freeze first column')
    }
  }

  function handleFreezePanes() {
    try {
      const worksheet = univerRef.value?.fUniver?.getActiveWorkbook()?.getActiveSheet()
      if (!worksheet) {
        toast.error('No active worksheet found')
        return
      }
      
      const selection = worksheet?.getSelection?.()
      const activeRange = selection?.getActiveRange?.()
      
      if (!activeRange) {
        toast.info('Select a cell to freeze panes from')
        return
      }
      
      const startRow = activeRange.getRow?.()
      const startColumn = activeRange.getColumn?.()
      
      if (startRow === undefined || startColumn === undefined) {
        toast.error('Could not determine cell position')
        return
      }
      
      // Updated API for Univer 0.15.x
      const freezeManager = worksheet.getFreezeManager?.()
      if (freezeManager) {
        freezeManager.freezePanes?.(startColumn, startRow) || 
        freezeManager.freeze?.({ xSplit: startColumn, ySplit: startRow })
        toast.success(`Panes frozen from row ${startRow + 1}, column ${String.fromCharCode(65 + startColumn)}`)
      } else {
        // Fallback to older API
        worksheet?.setFreeze?.({
          xSplit: startColumn,
          ySplit: startRow,
          startRow: startRow + 1,
          startColumn: startColumn + 1
        })
        toast.success(`Panes frozen from row ${startRow + 1}, column ${String.fromCharCode(65 + startColumn)}`)
      }
    } catch (error) {
      console.error('Error freezing panes:', error)
      toast.error('Failed to freeze panes')
    }
  }

  function handleUnfreeze() {
    try {
      const worksheet = univerRef.value?.fUniver?.getActiveWorkbook()?.getActiveSheet()
      if (!worksheet) {
        toast.error('No active worksheet found')
        return
      }
      
      // Updated API for Univer 0.15.x
      const freezeManager = worksheet.getFreezeManager?.()
      if (freezeManager) {
        freezeManager.unfreeze?.() || freezeManager.cancelFreeze?.()
        toast.success('Freeze removed')
      } else {
        // Fallback to older API
        worksheet?.cancelFreeze?.()
        toast.success('Freeze removed')
      }
    } catch (error) {
      console.error('Error unfreezing:', error)
      toast.error('Failed to remove freeze')
    }
  }

  // Find & Replace functions
  function handleFindReplace() {
    findReplaceOpen.value = true
    findText.value = ''
    replaceText.value = ''
  }

  function executeFind() {
    try {
      if (!findText.value.trim()) {
        toast.info('Please enter text to find')
        return
      }
      
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      
      // Use Univer's find functionality
      const findResult = worksheet?.find(findText.value, {
        matchCase: matchCase.value,
        matchWholeWord: matchWholeWord.value,
        useRegex: useRegex.value
      })
      
      if (findResult) {
        toast.success(`Found ${findResult.length} occurrence(s)`)
        // Navigate to first occurrence
        if (findResult.length > 0) {
          const firstMatch = findResult[0]
          const range = worksheet?.getRange(firstMatch.row, firstMatch.column, 1, 1)
          range?.activate()
        }
      } else {
        toast.info('No matches found')
      }
    } catch (error) {
      console.error('Error finding text:', error)
      toast.error('Failed to find text')
    }
  }

  function executeReplace() {
    try {
      if (!findText.value.trim()) {
        toast.info('Please enter text to find')
        return
      }
      
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      
      // Use Univer's replace functionality
      const replaceResult = worksheet?.replace(findText.value, replaceText.value, {
        matchCase: matchCase.value,
        matchWholeWord: matchWholeWord.value,
        useRegex: useRegex.value
      })
      
      if (replaceResult) {
        toast.success(`Replaced ${replaceResult.length} occurrence(s)`)
      } else {
        toast.info('No matches found to replace')
      }
    } catch (error) {
      console.error('Error replacing text:', error)
      toast.error('Failed to replace text')
    }
  }

  function executeReplaceAll() {
    try {
      if (!findText.value.trim()) {
        toast.info('Please enter text to find')
        return
      }
      
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      
      // Use Univer's replace all functionality
      const replaceAllResult = worksheet?.replaceAll(findText.value, replaceText.value, {
        matchCase: matchCase.value,
        matchWholeWord: matchWholeWord.value,
        useRegex: useRegex.value
      })
      
      if (replaceAllResult) {
        toast.success(`Replaced all ${replaceAllResult.length} occurrence(s)`)
      } else {
        toast.info('No matches found to replace')
      }
    } catch (error) {
      console.error('Error replacing all text:', error)
      toast.error('Failed to replace all text')
    }
  }

  // Advanced Sorting functions
  function handleAdvancedSort() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to sort')
        return
      }
      
      // Initialize sort columns based on selection
      const colCount = range.getColumnCount()
      sortColumns.value = Array.from({ length: Math.min(colCount, 3) }, (_, i) => ({
        column: i === 0 ? String.fromCharCode(65 + i) : '',
        order: 'asc'
      }))
      
      advancedSortOpen.value = true
    } catch (error) {
      console.error('Error initializing advanced sort:', error)
      toast.error('Failed to initialize sort')
    }
  }

  function addSortColumn() {
    if (sortColumns.value.length < 5) {
      sortColumns.value.push({ column: '', order: 'asc' })
    }
  }

  function removeSortColumn(index: number) {
    if (sortColumns.value.length > 1) {
      sortColumns.value.splice(index, 1)
    }
  }

  function executeAdvancedSort() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to sort')
        return
      }
      
      // Build sort specification
      const sortSpec = sortColumns.value
        .filter(col => col.column)
        .map(col => ({
          column: col.column.charCodeAt(0) - 65, // Convert A, B, C to 0, 1, 2
          order: col.order
        }))
      
      if (sortSpec.length === 0) {
        toast.info('Please select at least one column to sort by')
        return
      }
      
      // Apply multi-column sort
      worksheet?.sort(range, {
        hasHeaders: sortHasHeaders.value,
        sortSpec
      })
      
      toast.success('Data sorted successfully')
      advancedSortOpen.value = false
    } catch (error) {
      console.error('Error sorting data:', error)
      toast.error('Failed to sort data')
    }
  }

  // Data tools
  function handleDataSort() {
    try {
      const wb = univerRef.value?.fUniver?.getActiveWorkbook()
      const ws = wb?.getActiveSheet()
      const range = ws?.getSelection()?.getActiveRange()
      if (!range) return
      const cellData = [] as any[][]
      range.forEach((row: number, col: number, cell: any) => {
        if (!cellData[row]) cellData[row] = []
        cellData[row][col] = cell
      })
      const nonNullRows = cellData.filter(r => r?.some(c => c != null))
      const values = nonNullRows.map(row => row.map(c => c?.v ?? null))
      const nonEmptyCols = values[0]?.map((_, i) => values.some(r => r[i] !== null)) || []
      const filtered = values.map(r => r.filter((_, i) => nonEmptyCols[i]))
      filtered.sort((a, b) => {
        for (let i = 0; i < a.length; i++) {
          const A = a[i], B = b[i]
          if (A === null && B !== null) return 1
          if (A !== null && B === null) return -1
          if (A === null && B === null) continue
          if (A < B) return -1
          if (A > B) return 1
        }
        return 0
      })
      const sortedCells = filtered.map(row => row.map(v => ({ v })))
      range.setValues(sortedCells)
    } catch {}
  }

  function handleDataFilter() {
    try {
      // Use Univer's built-in filter functionality
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to filter')
        return
      }
      
      // Toggle auto filter for the selected range
      const autoFilter = worksheet?.getAutoFilter()
      if (autoFilter) {
        worksheet?.removeAutoFilter()
        toast.success('Filter removed')
      } else {
        worksheet?.setAutoFilter(range)
        toast.success('Filter applied to selected range')
      }
    } catch (error) {
      console.error('Error applying filter:', error)
      toast.error('Failed to apply filter')
    }
  }

  function handleDataGroup() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const selection = worksheet?.getSelection()
      
      if (!selection) {
        toast.info('Please select rows or columns to group')
        return
      }
      
      // Get the selection range
      const range = selection.getActiveRange()
      if (!range) {
        toast.info('Please select a range to group')
        return
      }
      
      // Group rows (for now, we'll group rows)
      const startRow = range.getRow()
      const rowCount = range.getRowCount()
      
      if (rowCount > 1) {
        worksheet?.groupRows(startRow, rowCount)
        toast.success(`Rows ${startRow + 1}-${startRow + rowCount} grouped`)
      } else {
        toast.info('Select multiple rows to group')
      }
    } catch (error) {
      console.error('Error grouping data:', error)
      toast.error('Failed to group data')
    }
  }

  // View zoom controls
  let _sheetZoom = 1
  function handleViewZoomIn() {
    _sheetZoom = Math.min(2, _sheetZoom + 0.1)
    document.body.style.transform = `scale(${_sheetZoom})`
    document.body.style.transformOrigin = '0 0'
  }

  function handleViewZoomOut() {
    _sheetZoom = Math.max(0.5, _sheetZoom - 0.1)
    document.body.style.transform = `scale(${_sheetZoom})`
    document.body.style.transformOrigin = '0 0'
  }

  function handleViewZoomReset() {
    _sheetZoom = 1
    document.body.style.transform = `scale(${_sheetZoom})`
    document.body.style.transformOrigin = '0 0'
  }

  function handlePrint() {
    try { window.print() } catch {}
  }

  return {
    // State
    findReplaceOpen,
    findText,
    replaceText,
    matchCase,
    matchWholeWord,
    useRegex,
    advancedSortOpen,
    sortColumns,
    sortHasHeaders,
    
    // Methods
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
  }
}
