import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { useFileManager } from './useFileManager'
import { useExplorerNavigation } from './useExplorerNavigation'
import { toast } from '@/composables/useToast'
import { FileData } from '@/types'
import { 
  FolderOpen, 
  Edit, 
  Download, 
  Share2, 
  Trash2 
} from 'lucide-vue-next'

export function useFileOperations() {
  // Vue Router - must be called at composable top level
  const router = useRouter()
  
  const fileStore = useFileStore()
  const fileManager = useFileManager()
  const explorer = useExplorerNavigation()

  // Context menu state
  const contextMenuState = ref({
    visible: false,
    x: 0,
    y: 0,
    fileId: null as string | null,
  })

  const renameDialog = ref({
    isOpen: false,
    fileId: null as string | null,
    value: '',
    error: '',
  })

  // Context menu actions
  const contextMenuActions = computed(() => {
    const selectedIds = Array.from(fileManager.selectedFiles.value)
    const numSelected = selectedIds.length
    if (numSelected === 0) return []

    const selectedFileItems = selectedIds
      .map(id => fileManager.sortedItems.value.find(item => item.id === id))
      .filter(Boolean) as FileData[]

    return buildContextMenuActions({
      selectedIds,
      selectedFiles: selectedFileItems,
      close: hideContextMenu,
    })
  })

  function buildContextMenuActions({
    selectedIds,
    selectedFiles: selectedFileItems,
    close,
  }: {
    selectedIds: string[]
    selectedFiles: FileData[]
    close: () => void
  }) {
    const numSelected = selectedIds.length
    if (numSelected === 0) return []

    const hasFiles = selectedFileItems.some((file) => file && !file.is_folder)

    const actions = []

    if (numSelected === 1) {
      actions.push(
        {
          label: "Open",
          icon: FolderOpen,
          action: () => {
            const id = selectedIds[0]
            if (id) {
              openFile(id)
            }
            close()
          },
        },
        {
          label: "Rename",
          icon: Edit,
          action: () => {
            startRename()
            close()
          },
        },
      )
    }

    if (hasFiles) {
      actions.push({
        label: `Download ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
        icon: Download,
        action: () => {
          fileManager.bulkDownload()
          close()
        },
      })
    }

    actions.push({
      label: `Delete ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
      icon: Trash2,
      action: () => {
        fileManager.bulkDelete()
        close()
      },
    })

    if (numSelected === 1) {
      actions.push({
        label: "Share",
        icon: Share2,
        action: () => {
          handleShare(selectedIds[0])
          close()
        },
      })
    }

    return actions
  }

  // File operations
  async function openFile(fileId: string) {
    try {
      const file = fileManager.sortedItems.value.find(item => item.id === fileId)
      if (!file) return

      if (file.is_folder) {
        await explorer.openFolder(fileId)
      } else if (fileManager.isViewableMedia(file.file_type)) {
        fileManager.openViewer(fileId)
      } else {
        // Handle other file types - route to appropriate editor
        const fileType = file.file_type?.toLowerCase()
        
        if (['doc', 'docx', 'txt', 'rtf'].includes(fileType || '')) {
          router.push(`/docs/${file.id}`)
        } else if (['xls', 'xlsx', 'csv', 'ods'].includes(fileType || '')) {
          router.push(`/sheets/${file.id}`)
        } else if (['ppt', 'pptx'].includes(fileType || '')) {
          router.push(`/slides/${file.id}`)
        } else if (['pdf'].includes(fileType || '')) {
          router.push(`/media/${file.id}`)
        } else {
          toast.info('Opening file in appropriate editor...')
          // Fallback - try to determine editor based on file properties
          if (file.file_url) {
            window.open(file.file_url, '_blank')
          } else {
            toast.error('Cannot open this file type')
          }
        }
      }
    } catch (error) {
      toast.error('Failed to open file')
    }
  }

  function startRename(fileId?: string) {
    const targetId = fileId ?? Array.from(fileManager.selectedFiles.value)[0]
    if (!targetId) {
      toast.info('Select a file to rename')
      return
    }

    const file = fileManager.sortedItems.value.find(item => item.id === targetId)
    if (!file) {
      toast.error('File not found')
      return
    }

    renameDialog.value = {
      isOpen: true,
      fileId: targetId,
      value: file.title,
      error: '',
    }
  }

  async function confirmRename() {
    const dialog = renameDialog.value
    if (!dialog.fileId) return

    const trimmed = dialog.value.trim()
    if (!trimmed.length) {
      dialog.error = 'Name is required'
      return
    }

    dialog.error = ''

    try {
      const updatedFile = await fileManager.renameFile(dialog.fileId, trimmed)
      if (updatedFile) {
        handleFileUpdated(updatedFile)
      }
      renameDialog.value.isOpen = false
      toast.success('File renamed successfully')
    } catch (error) {
      dialog.error = 'Failed to rename file'
      console.error(error)
    }
  }

  function cancelRename() {
    renameDialog.value.isOpen = false
    renameDialog.value.fileId = null
    renameDialog.value.value = ''
    renameDialog.value.error = ''
  }

  function handleRename() {
    startRename()
  }

  async function handleFileContextMenu(event: { id: string; x: number; y: number }) {
    const { id, x, y } = event
    
    // Select the file if not already selected
    if (!fileManager.selectedFiles.value.has(id)) {
      fileManager.setSelected([id])
    }

    showContextMenu(x, y, id)
  }

  function showContextMenu(x: number, y: number, fileId: string | null = null) {
    contextMenuState.value = {
      visible: true,
      x,
      y,
      fileId,
    }
  }

  function hideContextMenu() {
    contextMenuState.value.visible = false
  }

  function handleSelect(fileId: string, event?: MouseEvent) {
    if (event?.ctrlKey || event?.metaKey) {
      // Multi-select with Ctrl/Cmd
      fileManager.toggleSelection(fileId)
    } else if (event?.shiftKey && fileManager.selectedFiles.value.size > 0) {
      // Range selection with Shift
      const items = fileManager.sortedItems.value
      const lastSelectedIndex = items.findIndex(item => 
        item.id === Array.from(fileManager.selectedFiles.value).pop()
      )
      const currentIndex = items.findIndex(item => item.id === fileId)
      
      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastSelectedIndex, currentIndex)
        const end = Math.max(lastSelectedIndex, currentIndex)
        const rangeIds = items.slice(start, end + 1)
          .map(item => item.id)
          .filter(Boolean) as string[]
        
        fileManager.setSelected(rangeIds)
      }
    } else {
      // Single select
      fileManager.setSelected([fileId])
    }
  }

  function handleFileUpdated(payload: FileData | string | undefined) {
    if (!payload) return

    if (typeof payload === 'string') {
      // moving items updates store already; refresh current folder
      explorer.refresh?.()
      return
    }

    const index = fileStore.allFiles.findIndex(item => item.id === payload.id)
    if (index !== -1) {
      fileStore.allFiles[index] = payload
    }
  }

  function handleFileDeleted(fileId: string) {
    // Remove file from store
    fileStore.allFiles = fileStore.allFiles.filter(item => item.id !== fileId)
    fileManager.selectedFiles.value.delete(fileId)
  }

  function handleBulkOpen() {
    // Open selected files (only works for single selection)
    if (fileManager.selectedFiles.value.size === 1) {
      const fileId = Array.from(fileManager.selectedFiles.value)[0]
      openFile(fileId)
    }
  }

  async function handleShare(fileId?: string) {
    const targetId = fileId ?? Array.from(fileManager.selectedFiles.value)[0]
    if (!targetId) {
      toast.info('Select a file to share')
      return
    }

    const file = fileManager.sortedItems.value.find(item => item.id === targetId)
    if (!file) {
      toast.error('File not found')
      return
    }

    const shareUrl = file.file_public_url || file.download_url || file.file_url
    if (!shareUrl) {
      toast.info('This file does not have a shareable link yet')
      return
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: file.title, url: shareUrl })
        toast.success('Share sheet opened')
        return
      }
    } catch (error) {
      console.warn('navigator.share failed', error)
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard')
        return
      }
    } catch (error) {
      console.warn('Clipboard copy failed', error)
    }

    // Fallback copy
    const textarea = document.createElement('textarea')
    textarea.value = shareUrl
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.success('Link copied to clipboard')
  }

  async function handleBulkShare() {
    const ids = Array.from(fileManager.selectedFiles.value)
    if (ids.length === 0) {
      toast.info('Select files to share')
      return
    }

    if (ids.length === 1) {
      await handleShare(ids[0])
      return
    }

    const links = ids
      .map((id) => {
        const file = fileManager.sortedItems.value.find(item => item.id === id)
        if (!file) return null
        const url = file.file_public_url || file.download_url || file.file_url
        if (!url) return null
        return `${file.title}: ${url}`
      })
      .filter(Boolean) as string[]

    if (links.length === 0) {
      toast.info('Selected files do not have shareable links')
      return
    }

    const text = links.join('\n')

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        toast.success('Links copied to clipboard')
        return
      }
    } catch (error) {
      console.warn('Clipboard copy failed', error)
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.success('Links copied to clipboard')
  }

  // Event handlers
  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest("#context-menu")) {
      hideContextMenu()
    }
    if (fileManager.selectedFiles.value.size > 0) {
      fileManager.clearSelection()
    }
  }

  function handleEscapeKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (fileManager.isViewerOpen.value) {
        fileManager.closeViewer()
      } else {
        fileManager.clearSelection()
        hideContextMenu()
      }
    } else if (event.key === "F2" && fileManager.selectedFiles.value.size === 1) {
      event.preventDefault()
      startRename()
    } else if (event.key === "Delete" && fileManager.selectedFiles.value.size > 0) {
      fileManager.bulkDelete()
    }
  }

  return {
    // State
    contextMenuState,
    contextMenuActions,

    // Methods
    openFile,
    handleRename,
    handleFileContextMenu,
    showContextMenu,
    hideContextMenu,
    handleSelect,
    handleFileUpdated,
    handleFileDeleted,
    handleBulkOpen,
    handleBulkShare,
    handleShare,
    renameDialog,
    startRename,
    confirmRename,
    cancelRename,
    handleOutsideClick,
    handleEscapeKey,
    buildContextMenuActions,
  }
}
