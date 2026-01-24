import { ref, computed } from 'vue'
import { useFileStore } from '@/store/files'
import { FileData } from '@/types'
import { toast } from '@/composables/useToast'

export function useFileManager() {
  const fileStore = useFileStore()

  // State
  const selectedFiles = ref<Set<string>>(new Set())
  const viewMode = ref<"grid" | "list" | "thumbnail">("grid")
  const sortBy = ref("name")
  const groupByFileType = ref(false)
  const searchValue = ref("")
  const showRecentFiles = ref(false)

  // File operations
  const isUploadDialogOpen = ref(false)
  const isImportingAttachment = ref(false)
  const isAttachmentDialogOpen = ref(false)
  const attachmentDialogMessage = ref("")
  const attachmentDialogError = ref<string | null>(null)

  // Media viewer
  const isViewerOpen = ref(false)
  const currentViewFile = ref<FileData | null>(null)
  const currentViewIndex = ref(0)

  // File type statistics
  const fileTypeStats = computed(() => {
    const stats: Record<string, number> = {}
    let folderCount = 0

    sortedItems.value.forEach((item) => {
      if (item.is_folder) {
        folderCount++
      } else {
        const fileType = item.file_type?.toUpperCase() || "UNKNOWN"
        stats[fileType] = (stats[fileType] || 0) + 1
      }
    })

    return { folderCount, fileTypes: stats }
  })

  // Computed properties
  const sortedItems = computed(() => {
    let items = [...fileStore.allFiles]
    
    // Filter by search
    if (searchValue.value) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchValue.value.toLowerCase())
      )
    }

    // Filter by recent files
    if (showRecentFiles.value) {
      items = items.filter(item => {
        const createdAt = new Date(item.created_at as any)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return createdAt > thirtyDaysAgo
      })
    }

    // Sort items
    items.sort((a, b) => {
      switch (sortBy.value) {
        case "name":
          return a.title.localeCompare(b.title)
        case "date":
          return new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime()
        case "type":
          return (a.file_type || "").localeCompare(b.file_type || "")
        case "size":
          return (Number(a.file_size) || 0) - (Number(b.file_size) || 0)
        default:
          return 0
      }
    })

    return items
  })

  const groupedItems = computed(() => {
    if (!groupByFileType.value) {
      return { all: sortedItems.value }
    }

    const groups: Record<string, FileData[]> = {}
    
    sortedItems.value.forEach((item) => {
      let groupName = "Other"
      
      if (item.is_folder) {
        groupName = "Folders"
      } else {
        const fileType = item.file_type?.toLowerCase() || ""
        if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(fileType)) {
          groupName = "Images"
        } else if (["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(fileType)) {
          groupName = "Videos"
        } else if (["mp3", "wav", "aac", "ogg", "flac"].includes(fileType)) {
          groupName = "Audio"
        } else if (["pdf"].includes(fileType)) {
          groupName = "Documents"
        } else if (["doc", "docx", "txt", "rtf"].includes(fileType)) {
          groupName = "Text"
        } else if (["xls", "xlsx", "csv"].includes(fileType)) {
          groupName = "Spreadsheets"
        } else if (["ppt", "pptx"].includes(fileType)) {
          groupName = "Presentations"
        } else if (["zip", "rar", "7z", "tar", "gz"].includes(fileType)) {
          groupName = "Archives"
        }
      }
      
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(item)
    })

    return groups
  })

  const isAllSelected = computed(() => {
    return sortedItems.value.length > 0 && 
           sortedItems.value.every(item => item.id && selectedFiles.value.has(item.id))
  })

  const isSomeSelected = computed(() => {
    return selectedFiles.value.size > 0 && !isAllSelected.value
  })

  const viewableFiles = computed(() => {
    return sortedItems.value.filter(item => 
      item.id && isViewableMedia(item.file_type)
    )
  })

  // Helper functions
  function isViewableMedia(fileType: string | null | undefined): boolean {
    if (!fileType) return false
    const type = fileType.toLowerCase()
    return [
      "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
      "mp4", "webm", "ogg",
      "mp3", "wav", "aac"
    ].includes(type)
  }

  // Selection methods
  function setSelected(ids: string[]) {
    selectedFiles.value = new Set(ids)
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedFiles.value.clear()
    } else {
      selectedFiles.value = new Set(
        sortedItems.value
          .filter(item => item.id)
          .map(item => item.id!)
      )
    }
  }

  function clearSelection() {
    selectedFiles.value.clear()
  }

  function toggleSelection(fileId: string) {
    if (selectedFiles.value.has(fileId)) {
      selectedFiles.value.delete(fileId)
    } else {
      selectedFiles.value.add(fileId)
    }
  }

  // File operations
  async function createNewFile(type: string, template?: string) {
    try {
      const newFile = await fileStore.createNewDocument(type, template)
      toast.success(`${type} created successfully`)
      return newFile
    } catch (error) {
      toast.error(`Failed to create ${type}`)
      throw error
    }
  }

  async function createNewFolder(folderId?: string | null, folderName?: string) {
    try {
      const name = (folderName?.trim() && folderName.trim().length > 0)
        ? folderName.trim()
        : 'New Folder'

      const newFolder = await fileStore.makeFolder({
        title: name,
        is_folder: true,
        folder_id: folderId ?? null,
        file_type: 'folder',
      } as FileData)

      if (newFolder?.id) {
        toast.success('Folder created successfully')
      } else {
        toast.error('Failed to create folder')
      }

      return newFolder
    } catch (error) {
      toast.error('Failed to create folder')
      throw error
    }
  }

  async function deleteFile(fileId: string) {
    try {
      await fileStore.moveToTrash(fileId)
      selectedFiles.value.delete(fileId)
      toast.success('File moved to trash')
    } catch (error) {
      toast.error('Failed to delete file')
      throw error
    }
  }

  async function renameFile(fileId: string, newName: string) {
    try {
      const updatedFile = await fileStore.renameItem(fileId, newName)
      toast.success('File renamed successfully')
      return updatedFile
    } catch (error) {
      toast.error('Failed to rename file')
      throw error
    }
  }

  async function downloadFiles(fileIds: string[]) {
    try {
      // Implementation would depend on your backend API
      fileIds.forEach(fileId => {
        const file = sortedItems.value.find(item => item.id === fileId)
        if (file?.file_url) {
          const link = document.createElement('a')
          link.href = file.file_url
          link.download = file.title
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
      toast.success(`Downloading ${fileIds.length} file(s)`)
    } catch (error) {
      toast.error('Failed to download files')
      throw error
    }
  }

  // Media viewer methods
  function openViewer(fileId: string) {
    const file = sortedItems.value.find(item => item.id === fileId)
    if (file && isViewableMedia(file.file_type)) {
      currentViewFile.value = file
      currentViewIndex.value = viewableFiles.value.findIndex(item => item.id === fileId)
      isViewerOpen.value = true
    }
  }

  function closeViewer() {
    isViewerOpen.value = false
    currentViewFile.value = null
    currentViewIndex.value = 0
  }

  function navigateViewer(direction: 'next' | 'prev') {
    if (direction === 'next') {
      currentViewIndex.value = (currentViewIndex.value + 1) % viewableFiles.value.length
    } else {
      currentViewIndex.value = currentViewIndex.value === 0 
        ? viewableFiles.value.length - 1 
        : currentViewIndex.value - 1
    }
    currentViewFile.value = viewableFiles.value[currentViewIndex.value]
  }

  // Bulk operations
  async function bulkDelete() {
    if (selectedFiles.value.size === 0) return
    
    try {
      const deletePromises = Array.from(selectedFiles.value).map(fileId => 
        fileStore.moveToTrash(fileId)
      )
      await Promise.all(deletePromises)
      toast.success(`${selectedFiles.value.size} files moved to trash`)
      clearSelection()
    } catch (error) {
      toast.error('Failed to delete some files')
      throw error
    }
  }

  async function bulkDownload() {
    if (selectedFiles.value.size === 0) return
    
    const fileIds = Array.from(selectedFiles.value)
    await downloadFiles(fileIds)
  }

  // View mode methods
  function toggleViewMode() {
    const modes: Array<'grid' | 'list' | 'thumbnail'> = ['grid', 'list', 'thumbnail']
    const currentIndex = modes.indexOf(viewMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    viewMode.value = modes[nextIndex]
  }

  return {
    // State
    selectedFiles,
    viewMode,
    sortBy,
    groupByFileType,
    searchValue,
    showRecentFiles,
    isUploadDialogOpen,
    isImportingAttachment,
    isAttachmentDialogOpen,
    attachmentDialogMessage,
    attachmentDialogError,
    isViewerOpen,
    currentViewFile,
    currentViewIndex,

    // Computed
    sortedItems,
    groupedItems,
    fileTypeStats,
    isAllSelected,
    isSomeSelected,
    viewableFiles,

    // Methods
    setSelected,
    toggleSelectAll,
    clearSelection,
    toggleSelection,
    createNewFile,
    createNewFolder,
    deleteFile,
    renameFile,
    downloadFiles,
    openViewer,
    closeViewer,
    navigateViewer,
    bulkDelete,
    bulkDownload,
    toggleViewMode,
    isViewableMedia,
  }
}
