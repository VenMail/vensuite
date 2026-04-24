import { ref, onBeforeUnmount } from 'vue'
import { toast } from '@/composables/useToast'

export function useSheetHistory(vtableRef: any) {
  const canUndo = ref(false)
  const canRedo = ref(false)
  let unsubscribeChange: (() => void) | null = null
  let keyboardCleanup: (() => void) | null = null

  function getInstance() {
    return vtableRef.value?.getInstance?.() ?? null
  }

  function getHistoryManager() {
    return getInstance()?.getWorkbookHistoryManager?.() ?? null
  }

  function updateHistoryState() {
    const manager = getHistoryManager()
    if (!manager) {
      canUndo.value = false
      canRedo.value = false
      return
    }
    canUndo.value = Boolean(manager.canUndo?.())
    canRedo.value = Boolean(manager.canRedo?.())
  }

  function handleUndo() {
    const instance = getInstance()
    if (!instance) {
      toast.error('No active sheet for undo')
      return
    }

    try {
      instance.undo()
      updateHistoryState()
    } catch (error) {
      console.error('Undo failed:', error)
      toast.error('Undo failed')
    }
  }

  function handleRedo() {
    const instance = getInstance()
    if (!instance) {
      toast.error('No active sheet for redo')
      return
    }

    try {
      instance.redo()
      updateHistoryState()
    } catch (error) {
      console.error('Redo failed:', error)
      toast.error('Redo failed')
    }
  }

  function setupKeyboardShortcuts() {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    keyboardCleanup = () => document.removeEventListener('keydown', handleKeyDown)
    return keyboardCleanup
  }

  function initializeHistoryMonitoring() {
    const manager = getHistoryManager()
    if (!manager) return

    unsubscribeChange?.()
    const unsub = manager.onChange?.(() => updateHistoryState())
    unsubscribeChange = typeof unsub === 'function' ? unsub : null
    updateHistoryState()
  }

  onBeforeUnmount(() => {
    unsubscribeChange?.()
    unsubscribeChange = null
    keyboardCleanup?.()
    keyboardCleanup = null
  })

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    updateHistoryState,
    setupKeyboardShortcuts,
    initializeHistoryMonitoring,
  }
}
