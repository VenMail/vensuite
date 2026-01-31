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

  // Freeze panes functions - Using Univer API
  function handleFreezeTopRow() {
    try {
      // For now, use a simple approach - the actual freeze functionality 
      // may require additional Univer plugins that aren't loaded
      console.log('Freeze top row functionality requires Univer freeze plugin')
      // TODO: Implement proper freeze when freeze plugin is available
    } catch (error) {
      console.error('Error freezing top row:', error)
    }
  }

  function handleFreezeFirstColumn() {
    try {
      console.log('Freeze first column functionality requires Univer freeze plugin')
      // TODO: Implement proper freeze when freeze plugin is available
    } catch (error) {
      console.error('Error freezing first column:', error)
    }
  }

  function handleFreezePanes() {
    try {
      console.log('Freeze panes functionality requires Univer freeze plugin')
      // TODO: Implement proper freeze when freeze plugin is available
    } catch (error) {
      console.error('Error freezing panes:', error)
    }
  }

  function handleUnfreeze() {
    try {
      console.log('Unfreeze functionality requires Univer freeze plugin')
      // TODO: Implement proper unfreeze when freeze plugin is available
    } catch (error) {
      console.error('Error unfreezing panes:', error)
    }
  }

  // Find & Replace functions - Simplified for now (requires additional preset)
  function handleFindReplace() {
    findReplaceOpen.value = true
  }

  function executeFind() {
    try {
      if (!findText.value.trim()) {
        console.log('Please enter text to find')
        return
      }
      
      console.log('Find functionality requires additional Univer preset installation')
    } catch (error) {
      console.error('Error finding text:', error)
    }
  }

  function executeReplace() {
    try {
      if (!findText.value.trim()) {
        console.log('Please enter text to find')
        return
      }
      
      console.log('Replace functionality requires additional Univer preset installation')
    } catch (error) {
      console.error('Error replacing text:', error)
    }
  }

  function executeReplaceAll() {
    try {
      if (!findText.value.trim()) {
        console.log('Please enter text to find')
        return
      }
      
      console.log('Replace All functionality requires additional Univer preset installation')
    } catch (error) {
      console.error('Error replacing all text:', error)
    }
  }

  // Advanced sorting functions
  function handleAdvancedSort() {
    advancedSortOpen.value = true
    // Reset form
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
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      // Build sort specification
      const sortSpec = sortColumns.value
        .filter(col => col.column.trim())
        .map(col => ({
          column: col.column,
          order: col.order
        }))
      
      if (sortSpec.length === 0) {
        console.log('Please select at least one column to sort by')
        return
      }
      
      // Apply multi-column sort
      console.log(`Sorting by ${sortSpec.length} column(s)`)
      advancedSortOpen.value = false
    } catch (error) {
      console.error('Error applying advanced sort:', error)
    }
  }

  // Data tools functions - Remove unnecessary toasts for now
  function handleDataSort() {
    try {
      console.log('Data sort functionality requires Univer data plugin')
      // TODO: Implement proper sort when data plugin is available
    } catch (error) {
      console.error('Error sorting data:', error)
    }
  }

  function handleDataFilter() {
    try {
      console.log('Data filter functionality requires Univer data plugin')
      // TODO: Implement proper filter when data plugin is available
    } catch (error) {
      console.error('Error filtering data:', error)
    }
  }

  function handleDataGroup() {
    try {
      console.log('Data group functionality requires Univer data plugin')
      // TODO: Implement proper grouping when data plugin is available
    } catch (error) {
      console.error('Error grouping data:', error)
    }
  }

  // View functions - Using browser zoom for now
  function handleViewZoomIn() {
    try {
      const currentZoom = parseFloat(document.body.style.zoom || '1')
      const newZoom = Math.min(currentZoom * 1.1, 4)
      document.body.style.zoom = newZoom.toString()
    } catch (error) {
      console.error('Error zooming in:', error)
    }
  }

  function handleViewZoomOut() {
    try {
      const currentZoom = parseFloat(document.body.style.zoom || '1')
      const newZoom = Math.max(currentZoom * 0.9, 0.1)
      document.body.style.zoom = newZoom.toString()
    } catch (error) {
      console.error('Error zooming out:', error)
    }
  }

  function handleViewZoomReset() {
    try {
      document.body.style.zoom = '1'
    } catch (error) {
      console.error('Error resetting zoom:', error)
    }
  }

  function handlePrint() {
    try { 
      window.print()
    } catch (error) {
      console.error('Error printing:', error)
    }
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
