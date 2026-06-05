import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { IVTableSheetOptions } from '@visactor/vtable-sheet'
import { useFileStore } from '@/store/files'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/composables/useToast'
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data'
import { convertUniverToVtable } from '@/utils/univerToVtableConverter'
import type { FileData } from '@/types'

function isVTableFormat(parsed: any): boolean {
  return Array.isArray(parsed?.sheets) && parsed.sheets[0]?.sheetKey !== undefined
}

export function useSheetData() {
  const router = useRouter()
  const fileStore = useFileStore()
  const authStore = useAuthStore()

  const data = ref<IVTableSheetOptions | null>(null)
  const title = ref('New Spreadsheet')
  const isTitleEdit = ref(false)
  const editableTitle = ref(title.value)
  const isSaving = ref(false)
  let pendingSaveRequested = false
  const isLoading = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const isSettingCursor = ref(false)

  const isLarge = ref(false)
  const downloadUrl = ref<string | null>(null)

  const accessDenied = ref(false)
  const privacyType = ref<number>(7)
  const backendCanEdit = ref<boolean | null>(null)

  const SHEET_EDITOR_DEBUG = Boolean(import.meta.env.DEV)
  const logDebug = (...args: unknown[]) => {
    if (SHEET_EDITOR_DEBUG) console.debug(...args)
  }

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
    if (backendCanEdit.value !== null) return backendCanEdit.value
    return authStore.isAuthenticated || editablePrivacyTypes.has(privacyType.value)
  })

  async function loadData(id: string): Promise<IVTableSheetOptions | null> {
    isLoading.value = true
    try {
      logDebug('Loading spreadsheet data for ID:', id)
      const loadedData = await fileStore.loadDocument(id, 'xlsx')
      if (!loadedData) {
        console.error('Failed to load document:', id)
        toast.error('Failed to load spreadsheet')
        router.push({ name: 'sheets-view' })
        return null
      }

      // Large-file guard
      try {
        const ld: any = loadedData
        if (ld?.is_large) {
          isLarge.value = true
          const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
          downloadUrl.value = ld.download_url || (ld.file_url ? `${API_BASE_URI}/app-files/${id}/download` : null)
          return null
        }
      } catch {}

      // Title
      if (loadedData?.title) {
        document.title = loadedData.title
        title.value = loadedData.title
      }

      // Last-saved timestamp
      try {
        const ts = (loadedData as any).updated_at || (loadedData as any).created_at
        if (ts) lastSavedAt.value = new Date(ts)
      } catch {}

      // Privacy / access
      const priv = Number((loadedData as any)?.privacy_type ?? (loadedData as any)?.privacyType)
      if (!Number.isNaN(priv)) privacyType.value = priv
      backendCanEdit.value = typeof (loadedData as any)?.can_edit === 'boolean' ? Boolean((loadedData as any).can_edit) : null

      if (!authStore.isAuthenticated) {
        const effectivePriv = Number.isNaN(priv) ? 7 : priv
        if (![1, 2, 3, 4].includes(effectivePriv)) {
          accessDenied.value = true
          return null
        }
      }

      // Parse + format-detect
      if (loadedData.content !== undefined && loadedData.content !== null && loadedData.content !== '') {
        try {
          const parsed = typeof loadedData.content === 'string'
            ? JSON.parse(loadedData.content)
            : loadedData.content

          if (parsed && typeof parsed === 'object') {
            if (isVTableFormat(parsed)) {
              logDebug('Detected VTable format')
              return parsed as IVTableSheetOptions
            }
            // Univer format — convert
            logDebug('Detected Univer format — converting')
            return convertUniverToVtable(parsed)
          }
        } catch (parseError) {
          console.error('Error parsing spreadsheet contents:', parseError)
          toast.error('Document data appears to be corrupted. Loading with default structure.')
        }
      }

      // No content — blank sheet
      return { ...DEFAULT_WORKBOOK_DATA }
    } catch (error) {
      console.error('Error loading spreadsheet data:', error)
      toast.error('Failed to load spreadsheet')
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function saveData(vtableRef: { saveToConfig(): IVTableSheetOptions } | null) {
    if (!canEditSheet.value || !vtableRef) return

    const routeId = router.currentRoute.value.params.id
    if (!routeId) return

    if (isSaving.value) {
      pendingSaveRequested = true
      return
    }

    isSaving.value = true
    try {
      const name = title.value || 'New Spreadsheet'
      const config = vtableRef.saveToConfig()

      const doc: FileData = {
        id: routeId as string,
        title: name,
        content: JSON.stringify(config),
        file_type: 'xlsx',
        is_folder: false,
        file_name: `${name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
        last_viewed: new Date(),
      }

      const result = await fileStore.saveDocument(doc)

      if (result.shouldRedirect && result.redirectId && result.redirectId !== router.currentRoute.value.params.id) {
        await router.replace(`/sheets/${result.redirectId}`)
      }

      if (result.syncStatus === 'synced') {
        lastSavedAt.value = new Date()
        toast.success('Document saved successfully')
      } else {
        toast.error('Changes queued locally — will sync when reconnected.')
      }
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Failed to save document. Please try again.')
    } finally {
      isSaving.value = false
      if (pendingSaveRequested) {
        pendingSaveRequested = false
        queueMicrotask(() => void saveData(vtableRef))
      }
    }
  }

  async function saveTitle(vtableRef: { saveToConfig(): IVTableSheetOptions } | null, exitEditMode = true) {
    if (exitEditMode) isTitleEdit.value = false

    const newTitle = title.value.trim() || 'New Spreadsheet'
    document.title = newTitle
    if (!canEditSheet.value) return
    if (!router.currentRoute.value.params.id || isSaving.value) return

    try {
      let contentToSave: string
      if (vtableRef) {
        contentToSave = JSON.stringify(vtableRef.saveToConfig())
      } else {
        contentToSave = JSON.stringify(data.value ?? DEFAULT_WORKBOOK_DATA)
      }

      const doc: FileData = {
        id: router.currentRoute.value.params.id as string,
        title: newTitle,
        file_name: `${newTitle.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
        file_type: 'xlsx',
        is_folder: false,
        content: contentToSave,
        last_viewed: new Date(),
      }

      const result = await fileStore.saveDocument(doc)
      if (result.syncStatus === 'synced') lastSavedAt.value = new Date()

      if (result.shouldRedirect && result.redirectId && result.redirectId !== router.currentRoute.value.params.id) {
        await router.replace(`/sheets/${result.redirectId}`)
      }
    } catch (error) {
      console.error('Error saving title:', error)
    }
  }

  function editTitle() {
    isTitleEdit.value = true
    editableTitle.value = title.value
    nextTick(() => {
      const titleEl = document.querySelector('[contenteditable="true"]') as HTMLElement
      titleEl?.focus()
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

  function updateTitleRemote(newTitle: string) {
    document.title = newTitle
    title.value = newTitle
  }

  function handleBeforeUnload(e: BeforeUnloadEvent, vtableRef: { saveToConfig(): IVTableSheetOptions } | null) {
    try {
      if (canEditSheet.value && vtableRef && router.currentRoute.value.params.id) {
        saveData(vtableRef)
        e.preventDefault()
        e.returnValue = ''
      }
    } catch {}
  }

  watch(
    () => router.currentRoute.value.params.id,
    async (newId) => {
      if (!newId) return
      const loaded = await loadData(newId as string)
      if (loaded) data.value = loaded
    },
  )

  return {
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
    lastSavedText,
    canEditSheet,
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
