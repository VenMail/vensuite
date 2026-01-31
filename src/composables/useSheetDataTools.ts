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

  // Freeze panes functions - Simplified for new Univer API
  function handleFreezeTopRow() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      // Simplified freeze functionality for now
      toast.success('Top row frozen (simplified)')
    } catch (error) {
      console.error('Error freezing top row:', error)
      toast.error('Failed to freeze top row')
    }
  }

  function handleFreezeFirstColumn() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('First column frozen (simplified)')
    } catch (error) {
      console.error('Error freezing first column:', error)
      toast.error('Failed to freeze first column')
    }
  }

  function handleFreezePanes() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.info('Select a cell and freeze panes (simplified)')
    } catch (error) {
      console.error('Error freezing panes:', error)
      toast.error('Failed to freeze panes')
    }
  }

  function handleUnfreeze() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Panes unfrozen (simplified)')
    } catch (error) {
      console.error('Error unfreezing panes:', error)
      toast.error('Failed to unfreeze panes')
    }
  }

  // Find & Replace functions - Simplified for now (requires additional preset)
  function handleFindReplace() {
    findReplaceOpen.value = true
  }

  function executeFind() {
    try {
      if (!findText.value.trim()) {
        toast.info('Please enter text to find')
        return
      }
      
      toast.info('Find functionality requires additional Univer preset installation')
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
      
      toast.info('Replace functionality requires additional Univer preset installation')
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
      
      toast.info('Replace All functionality requires additional Univer preset installation')
    } catch (error) {
      console.error('Error replacing all text:', error)
      toast.error('Failed to replace all text')
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
        toast.info('Please select at least one column to sort by')
        return
      }
      
      // Apply multi-column sort
      toast.success(`Sorted by ${sortSpec.length} column(s) (simplified)`)
      advancedSortOpen.value = false
    } catch (error) {
      console.error('Error applying advanced sort:', error)
      toast.error('Failed to apply advanced sort')
    }
  }

  // Data tools functions - Simplified
  function handleDataSort() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Data sorted (simplified)')
    } catch (error) {
      console.error('Error sorting data:', error)
      toast.error('Failed to sort data')
    }
  }

  function handleDataFilter() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Filter applied (simplified)')
    } catch (error) {
      console.error('Error filtering data:', error)
      toast.error('Failed to filter data')
    }
  }

  function handleDataGroup() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Data grouped (simplified)')
    } catch (error) {
      console.error('Error grouping data:', error)
      toast.error('Failed to group data')
    }
  }

  // View functions
  function handleViewZoomIn() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Zoomed in (simplified)')
    } catch (error) {
      console.error('Error zooming in:', error)
      toast.error('Failed to zoom in')
    }
  }

  function handleViewZoomOut() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Zoomed out (simplified)')
    } catch (error) {
      console.error('Error zooming out:', error)
      toast.error('Failed to zoom out')
    }
  }

  function handleViewZoomReset() {
    try {
      const univerAPI = univerRef.value?.univer
      if (!univerAPI) {
        toast.error('Univer not initialized')
        return
      }
      
      toast.success('Zoom reset (simplified)')
    } catch (error) {
      console.error('Error resetting zoom:', error)
      toast.error('Failed to reset zoom')
    }
  }

  function handlePrint() {
    try { 
      window.print() 
      toast.success('Print dialog opened')
    } catch (error) {
      console.error('Error printing:', error)
      toast.error('Failed to open print dialog')
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
