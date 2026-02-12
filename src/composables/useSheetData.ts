import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { IWorkbookData } from '@univerjs/core'
import { useFileStore } from '@/store/files'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/composables/useToast'
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data'
import type { FileData } from '@/types'

export function useSheetData() {
  const router = useRouter()
  const fileStore = useFileStore()
  const authStore = useAuthStore()

  // Reactive state
  const data = ref<Partial<IWorkbookData> | null>(null)
  const title = ref('New Spreadsheet')
  const isTitleEdit = ref(false)
  const editableTitle = ref(title.value)
  const isSaving = ref(false)
  const isLoading = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const isSettingCursor = ref(false)

  // Large-file handling
  const isLarge = ref(false)
  const downloadUrl = ref<string | null>(null)

  // Access control
  const accessDenied = ref(false)
  const privacyType = ref<number>(7)

  // Debug logging
  const SHEET_EDITOR_DEBUG = Boolean(import.meta.env.DEV)
  const logSheetEditorDebug = (...args: unknown[]) => {
    if (!SHEET_EDITOR_DEBUG) return
    console.log(...args)
  }

  // Computed properties
  const lastSavedText = computed(() => {
    const d = lastSavedAt.value || (() => {
      const id = router.currentRoute.value.params.id as string
      const doc = id ? fileStore.allFiles.find(f => f.id === id) : null
      const ts = (doc as any)?.updated_at || (doc as any)?.created_at
      return ts ? new Date(ts) : null
    })()
    if (!d) return 'Never saved'
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    return `Last saved at ${hh}:${mm}`
  })

  const canEditSheet = computed(() => {
    const editablePrivacyTypes = new Set<number>([2, 4])
    return authStore.isAuthenticated || editablePrivacyTypes.has(privacyType.value)
  })

  // Load data function
  async function loadData(id: string) {
    isLoading.value = true
    try {
      logSheetEditorDebug('Loading spreadsheet data for ID:', id)
      const loadedData = await fileStore.loadDocument(id, 'xlsx')
      if (!loadedData) {
        console.error('Failed to load document:', id)
        toast.error('Failed to load spreadsheet')
        router.push('/')
        return null
      }

      // Check for large file
      try {
        const ld: any = loadedData
        if (ld?.is_large) {
          isLarge.value = true
          const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
          downloadUrl.value = ld.download_url || (ld.file_url ? `${API_BASE_URI}/app-files/${id}/download` : null)
          return null
        }
      } catch {}

      // Set title
      if (loadedData?.title) {
        document.title = loadedData.title
        title.value = loadedData.title
        logSheetEditorDebug('Set title from loaded document:', loadedData.title)
      }

      // Set last saved timestamp
      try {
        const ts = (loadedData as any).updated_at || (loadedData as any).created_at
        if (ts) lastSavedAt.value = new Date(ts)
      } catch {}

      // Parse content
      if (loadedData.content !== undefined && loadedData.content !== null && loadedData.content !== '') {
        try {
          const parsedData = typeof loadedData.content === 'string'
            ? JSON.parse(loadedData.content)
            : loadedData.content

          if (parsedData && typeof parsedData === 'object') {
            if (!parsedData.id) {
              parsedData.id = id
            }
            if (!parsedData.name && loadedData.title) {
              parsedData.name = loadedData.title
            }

            logSheetEditorDebug('Successfully parsed spreadsheet data:', {
              hasId: !!parsedData.id,
              hasSheets: !!parsedData.sheets,
              hasName: !!parsedData.name,
              dataSize: typeof loadedData.content === 'string' ? loadedData.content.length : JSON.stringify(parsedData).length,
              title: loadedData.title,
            })

            return parsedData
          } else {
            console.warn('Parsed data is not a valid object, using default structure')
            return null
          }
        } catch (parseError) {
          console.error('Error parsing spreadsheet contents:', parseError)
          toast.error('Document data appears to be corrupted. Loading with default structure.')
          return null
        }
      }

      // Handle privacy
      const priv = Number((loadedData as any)?.privacy_type ?? (loadedData as any)?.privacyType)
      if (!Number.isNaN(priv)) {
        privacyType.value = priv
      }

      // Handle guest access
      if (!authStore.isAuthenticated) {
        if ([1, 2, 3, 4].includes(priv)) {
          const fallback = {
            ...DEFAULT_WORKBOOK_DATA,
            id,
            name: loadedData.title || 'Spreadsheet',
          }
          document.title = loadedData.title || 'Spreadsheet'
          title.value = loadedData.title || 'Spreadsheet'
          logSheetEditorDebug('Public link access: initializing viewer with default structure')
          return fallback as any
        }
        accessDenied.value = true
        return null
      }

      logSheetEditorDebug('No contents found for existing document (authenticated), will use default structure but keep title')
      return {
        ...DEFAULT_WORKBOOK_DATA,
        id,
        name: loadedData.title || 'Spreadsheet',
      } as any
    } catch (error) {
      console.error('Error loading spreadsheet data:', error)
      toast.error('Failed to load spreadsheet')
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Save data function
  async function saveData(univerRef: any) {
    if (!canEditSheet.value) {
      return
    }
    
    // Production-ready validation with better error messages
    if (!univerRef) {
      console.warn('Cannot save: Univer reference not available')
      return
    }
    
    const routeId = router.currentRoute.value.params.id
    if (!routeId) {
      console.warn('Cannot save: No document ID in route')
      return
    }

    if (isSaving.value) {
      logSheetEditorDebug('Save already in progress, skipping')
      return
    }

    isSaving.value = true

    try {
      const name = title.value || 'New Spreadsheet'

      const completeData = await univerRef.getData()
      if (!completeData) {
        throw new Error('Failed to capture spreadsheet data')
      }

      try {
        univerRef.setName(name)
      } catch {}

      completeData.id = router.currentRoute.value.params.id as string
      completeData.name = name

      const doc = {
        id: router.currentRoute.value.params.id as string,
        title: name,
        content: JSON.stringify(completeData),
        file_type: 'xlsx',
        is_folder: false,
        file_name: `${name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
        last_viewed: new Date(),
      } as FileData

      logSheetEditorDebug('Saving document with complete data:', {
        id: doc.id,
        title: doc.title,
        dataSize: doc.content?.length || 0,
        hasSheets: !!completeData.sheets,
      })

      const result = await fileStore.saveDocument(doc)
      logSheetEditorDebug('saveResult', result)

      if (result.shouldRedirect && result.redirectId && result.redirectId !== router.currentRoute.value.params.id) {
        logSheetEditorDebug('Document got new server ID, redirecting to:', result.redirectId)
        await router.replace(`/sheets/${result.redirectId}`)
        toast.success('Document saved and synced successfully')
      } else {
        toast.success('Document saved successfully')
      }
      lastSavedAt.value = new Date()

      logSheetEditorDebug('Document saved successfully')
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Failed to save document. Please try again.')
    } finally {
      isSaving.value = false
    }
  }

  // Debounced title save (moved to component scope like old implementation)

  async function saveTitle(univerRef: any) {
    // Exit edit mode first
    isTitleEdit.value = false
    
    const newTitle = title.value.trim()
    if (newTitle && newTitle !== document.title) {
      document.title = newTitle
      if (!canEditSheet.value) return
      if (router.currentRoute.value.params.id && !isSaving.value) {
        try {
          try {
            univerRef?.setName(newTitle)
          } catch {}
          if (data.value && typeof data.value === 'object') {
            ;(data.value as any).name = newTitle
          }
          const doc = {
            id: router.currentRoute.value.params.id as string,
            title: newTitle,
            file_name: `${newTitle.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
            file_type: 'xlsx',
            is_folder: false,
            content: JSON.stringify(data.value),
            last_viewed: new Date(),
          } as FileData

          const result = await fileStore.saveDocument(doc)
          logSheetEditorDebug('Title saved:', newTitle)

          // Handle redirect for documents that got new server IDs
          if (result.shouldRedirect && result.redirectId && result.redirectId !== router.currentRoute.value.params.id) {
            logSheetEditorDebug('Document got new server ID after title change, redirecting to:', result.redirectId)
            await router.replace(`/sheets/${result.redirectId}`)
          }
        } catch (error) {
          console.error('Error saving title:', error)
        }
      }
    }
  }

  function editTitle() {
    isTitleEdit.value = true
    editableTitle.value = title.value
    nextTick(() => {
      const titleEl = document.querySelector('[contenteditable="true"]') as HTMLElement
      if (titleEl) {
        titleEl.focus()
      }
    })
  }

  function updateTitle(event: Event) {
    if (isSettingCursor.value) return

    const target = event.target as HTMLElement
    const newText = target.innerText.trim()

    if (editableTitle.value === newText) return

    editableTitle.value = newText
    title.value = newText
    document.title = newText

    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)
    const offset = range?.startOffset

    nextTick(() => {
      isSettingCursor.value = true
      restoreCursorPosition(target, offset ?? newText.length)
      isSettingCursor.value = false
    })

    // Note: Debounced save is handled in component scope (like old implementation)
  }

  function restoreCursorPosition(element: HTMLElement, offset: number) {
    const range = document.createRange()
    const selection = window.getSelection()

    if (element.childNodes[0]) {
      range.setStart(element.childNodes[0], Math.min(offset, element.textContent?.length ?? 0))
    } else {
      range.selectNodeContents(element)
      range.collapse(false)
    }

    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  function updateTitleRemote(newTitle: string, univerRef: any) {
    document.title = newTitle
    title.value = newTitle
    // Keep local workbook snapshot aligned when remote title changes
    try {
      univerRef?.setName(newTitle)
    } catch {}
    if (data.value && typeof data.value === 'object') {
      ;(data.value as any).name = newTitle
    }
  }

  // Before unload handler
  function handleBeforeUnload(e: BeforeUnloadEvent, univerRef: any) {
    try {
      if (canEditSheet.value && univerRef && router.currentRoute.value.params.id) {
        saveData(univerRef)
        e.preventDefault()
        e.returnValue = ''
      }
    } catch {}
  }

  // Watch for route changes
  watch(
    () => router.currentRoute.value.params.id,
    async (newId) => {
      if (!newId) return
      const loaded = await loadData(newId as string)
      if (loaded) {
        data.value = loaded
        title.value = loaded.name || title.value
      }
    },
  )

  // Watch for data changes
  watch(
    () => data.value,
    async (newValue) => {
      if (newValue) {
        // This would be called from the component with the univerRef
        // await univerRef.setData(newValue as IWorkbookData)
      }
    },
  )

  return {
    // State
    data,
    title,
    isTitleEdit,
    editableTitle,
    isSaving,
    isLoading,
    lastSavedAt,
    isLarge,
    downloadUrl,
    accessDenied,
    privacyType,
    isSettingCursor,
    
    // Computed
    lastSavedText,
    canEditSheet,
    
    // Methods
    loadData,
    saveData,
    editTitle,
    saveTitle,
    updateTitle,
    updateTitleRemote,
    handleBeforeUnload,
    restoreCursorPosition,
  }
}
