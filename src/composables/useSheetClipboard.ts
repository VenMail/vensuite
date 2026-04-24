import { ref } from 'vue'
import { toast } from '@/composables/useToast'

type ClipboardData = {
  type: 'cells' | 'text'
  data: any[][]
  range?: {
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }
  styles?: Map<string, Record<string, any>>
}

export function useSheetClipboard(vtableRef: any) {
  const clipboardData = ref<ClipboardData | null>(null)

  function getInstance() {
    return vtableRef.value?.getInstance?.() ?? null
  }

  function getActiveSheet() {
    return vtableRef.value?.getActiveSheet?.() ?? null
  }

  function getSelection() {
    const sheet = getActiveSheet()
    const selection = sheet?.getSelection?.()
    if (!selection) return null

    return {
      startRow: Math.min(selection.startRow, selection.endRow ?? selection.startRow),
      startCol: Math.min(selection.startCol, selection.endCol ?? selection.startCol),
      endRow: Math.max(selection.startRow, selection.endRow ?? selection.startRow),
      endCol: Math.max(selection.startCol, selection.endCol ?? selection.startCol),
    }
  }

  function getDataInRange(range: any) {
    const sheet = getActiveSheet()
    const data = sheet?.getData?.()
    if (!Array.isArray(data) || !range) return []

    const result: any[][] = []
    for (let row = range.startRow; row <= range.endRow; row++) {
      const rowData: any[] = []
      for (let col = range.startCol; col <= range.endCol; col++) {
        rowData.push(data[row]?.[col] ?? '')
      }
      result.push(rowData)
    }
    return result
  }

  function handleCopy() {
    const selection = getSelection()
    if (!selection) {
      toast.error('Select cells to copy')
      return
    }

    try {
      const data = getDataInRange(selection)
      
      // Store in internal clipboard
      clipboardData.value = {
        type: 'cells',
        data,
        range: selection,
      }

      // Also copy to system clipboard as tab-separated values
      const textData = data.map(row => row.map(cell => String(cell ?? '')).join('\t')).join('\n')
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(textData)
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = textData
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      toast.success(`Copied ${data.length}×${data[0]?.length || 0} selection`)
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Copy failed')
    }
  }

  function handleCut() {
    const selection = getSelection()
    if (!selection) {
      toast.error('Select cells to cut')
      return
    }

    try {
      // First copy the data
      handleCopy()

      // Then clear the cells
      const sheet = getActiveSheet()
      let clearedCount = 0

      for (let row = selection.startRow; row <= selection.endRow; row++) {
        for (let col = selection.startCol; col <= selection.endCol; col++) {
          sheet?.setCellValue?.(col, row, '')
          clearedCount++
        }
      }

      // Update the display
      const instance = getInstance()
      instance?.scenegraph?.updateNextFrame?.()

      toast.success(`Cut ${clearedCount} cells`)
    } catch (error) {
      console.error('Cut failed:', error)
      toast.error('Cut failed')
    }
  }

  function handlePaste() {
    const selection = getSelection()
    if (!selection) {
      toast.error('Select a cell to paste into')
      return
    }

    if (!clipboardData.value) {
      // Try to get data from system clipboard
      if (navigator.clipboard) {
        navigator.clipboard.readText().then(text => {
          pasteTextData(text, selection)
        }).catch(() => {
          toast.error('Nothing to paste')
        })
      } else {
        toast.error('Nothing to paste')
      }
      return
    }

    try {
      const { data, type } = clipboardData.value
      const sheet = getActiveSheet()
      let pastedCount = 0

      if (type === 'cells' && Array.isArray(data)) {
        // Paste cell data
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < (data[i]?.length || 0); j++) {
            const targetRow = selection.startRow + i
            const targetCol = selection.startCol + j
            sheet?.setCellValue?.(targetCol, targetRow, data[i][j])
            pastedCount++
          }
        }
      }

      // Update the display
      const instance = getInstance()
      instance?.scenegraph?.updateNextFrame?.()

      toast.success(`Pasted ${pastedCount} cells`)
    } catch (error) {
      console.error('Paste failed:', error)
      toast.error('Paste failed')
    }
  }

  function pasteTextData(text: string, selection: any) {
    try {
      const sheet = getActiveSheet()
      const rows = text.split('\n').map(row => row.split('\t'))
      let pastedCount = 0

      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].length; j++) {
          const targetRow = selection.startRow + i
          const targetCol = selection.startCol + j
          sheet?.setCellValue?.(targetCol, targetRow, rows[i][j])
          pastedCount++
        }
      }

      // Update the display
      const instance = getInstance()
      instance?.scenegraph?.updateNextFrame?.()

      toast.success(`Pasted ${pastedCount} cells`)
    } catch (error) {
      console.error('Paste failed:', error)
      toast.error('Paste failed')
    }
  }

  function handleDelete() {
    const selection = getSelection()
    if (!selection) {
      toast.error('Select cells to delete')
      return
    }

    try {
      const sheet = getActiveSheet()
      let deletedCount = 0

      for (let row = selection.startRow; row <= selection.endRow; row++) {
        for (let col = selection.startCol; col <= selection.endCol; col++) {
          sheet?.setCellValue?.(col, row, '')
          deletedCount++
        }
      }

      // Update the display
      const instance = getInstance()
      instance?.scenegraph?.updateNextFrame?.()

      toast.success(`Deleted ${deletedCount} cells`)
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete failed')
    }
  }

  // Keyboard shortcuts
  function setupKeyboardShortcuts() {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'c':
            event.preventDefault()
            handleCopy()
            break
          case 'x':
            event.preventDefault()
            handleCut()
            break
          case 'v':
            event.preventDefault()
            handlePaste()
            break
        }
      } else if (event.key === 'Delete') {
        event.preventDefault()
        handleDelete()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }

  // Clear clipboard data when navigating away
  function clearClipboard() {
    clipboardData.value = null
  }

  return {
    clipboardData,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    setupKeyboardShortcuts,
    clearClipboard,
  }
}
