<script setup lang="ts">
import UniverSheet from '@/components/UniverSheet.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import type { Ref } from 'vue'
import { nextTick, onMounted, onUnmounted, ref, computed, watch, shallowRef } from 'vue'

import '@/assets/index.css'
import { PencilIcon, MessageSquareIcon, XIcon, ArrowLeft, Share2 } from 'lucide-vue-next'

import { debounce, type IWorkbookData } from '@univerjs/core'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import UnifiedMenubar from '@/components/menu/UnifiedMenubar.vue'
import { useFileStore } from '@/store/files'
import { sluggify } from '@/utils/lib'
import { FUniver } from '@univerjs/core/facade'
import { IWebsocketService, Message, useWebSocket, WebSocketService } from '@/lib/wsService'
import { toast } from '@/composables/useToast'
import { useFavicon } from '@vueuse/core'
import { DEFAULT_WORKBOOK_DATA, BUDGET_TEMPLATE_DATA, INVOICE_TEMPLATE_DATA } from '@/assets/default-workbook-data'
import UserProfile from '@/components/layout/UserProfile.vue'
import Button from '@/components/ui/button/Button.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { FileData } from '@/types'
import { ExportService, ExportFormat, PDFEngine, type IExportOptions } from '@/plugins/ExportPlugin'
import { useAuthStore } from '@/store/auth'
import ShareCard from '@/components/ShareCard.vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { initializeWebSocket } = useWebSocket()

// Filestore setup
const fileStore = useFileStore()

// Reactive references
const data = shallowRef<Partial<IWorkbookData> | null>(null)
const univerRef: Ref<InstanceType<typeof UniverSheet> | null> = ref(null)
const univerCoreRef = ref<FUniver | null>(null)
const title = ref('New Spreadsheet')
const isTitleEdit = ref(false)
const userId = ref(`user-${Math.random().toString(36).substr(2, 9)}`)
const userName = ref(`User ${Math.floor(Math.random() * 1000)}`)
const editableTitle = ref(title.value)
const isSettingCursor = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)
const lastSavedAt = ref<Date | null>(null)
const visibility = ref<'private' | 'link' | 'public'>('private')
// privacy_type: 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
const privacyType = ref<number>(7)
// Share members state (placeholder, integrate API later)
const shareMembers = ref<Array<{ email: string; name?: string; avatarUrl?: string; permission: 'view'|'comment'|'edit' }>>([])

// Note: editing restricted to authenticated users; guards are applied in save handlers

const wsService = ref<IWebsocketService | null>(null)
const isConnected = computed(() => WebSocketService?.isConnected.value)
const isJoined = ref(false)

const chatMessages = ref<Message[]>([])
const isChatOpen = ref(false)
const changesPending = ref(false)
const newChatMessage = ref('')
const textareaHeight = ref('40px')
const chatInput = ref<HTMLTextAreaElement | null>(null)
const chatMessagesContainer = ref<HTMLElement | null>(null)
const replyingTo = ref<Message | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const collaborators = ref<Record<string, { name: string; selection: any; ts: number }>>({})

const shareOpen = ref(false)
// Large-file handling
const isLarge = ref(false)
const downloadUrl = ref<string | null>(null)

// Public access / interstitial state for private sheets
const accessDenied = ref(false)
const requestEmail = ref('')
const accessLevel = ref<'v' | 'c' | 'e'>('v')
const requestMessage = ref('')
const requestSubmitting = ref(false)
const requestSuccess = ref<string | null>(null)

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null)
const exportService = new ExportService()

// Unified sync status text similar to RunDoc
const syncStatusText = computed(() => {
  if (!isConnected.value) return 'Offline'
  if (isSaving.value) return 'Saving...'
  return 'All changes saved'
})

const lastSavedText = computed(() => {
  const d = lastSavedAt.value || (() => {
    const id = route.params.id as string
    const doc = id ? fileStore.allFiles.find(f => f.id === id) : null
    const ts = (doc as any)?.updated_at || (doc as any)?.created_at
    return ts ? new Date(ts) : null
  })()
  if (!d) return 'Never saved'
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `Last saved at ${hh}:${mm}`
})

const shareLinkSheet = computed(() => {
  const id = route.params.id as string
  if (!id) return ''
  return `${window.location.origin}/sheets/${id}`
})

// Handler for univerRefChange event
function onUniverRefChange(childUniverRef: FUniver | null) {
  univerCoreRef.value = childUniverRef
}

// Load data function
async function loadData(id: string) {
  isLoading.value = true
  try {
    console.log('Loading spreadsheet data for ID:', id)
    const loadedData = await fileStore.loadDocument(id, 'xlsx')
    if (!loadedData) {
      console.error('Failed to load document:', id)
      toast.error('Failed to load spreadsheet')
      router.push('/')
      return null
    }
    try {
      const ld: any = loadedData
      if (ld?.is_large) {
        isLarge.value = true
        const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
        downloadUrl.value = ld.download_url || (ld.file_url ? `${API_BASE_URI}/app-files/${id}/download` : null)
        return null
      }
    } catch {}

    if (loadedData?.title) {
      document.title = loadedData.title
      title.value = loadedData.title
      console.log('Set title from loaded document:', loadedData.title)
    }
    try {
      const ts = (loadedData as any).updated_at || (loadedData as any).created_at
      if (ts) lastSavedAt.value = new Date(ts)
    } catch {}

    if (loadedData.content) {
      try {
        const contentString = loadedData.content
        if (!contentString) {
          console.log('Content string is empty, will use default structure')
          return null
        }

        const parsedData = JSON.parse(contentString)

        if (parsedData && typeof parsedData === 'object') {
          if (!parsedData.id) {
            parsedData.id = id
          }
          if (!parsedData.name && loadedData.title) {
            parsedData.name = loadedData.title
          }

          console.log('Successfully parsed spreadsheet data:', {
            hasId: !!parsedData.id,
            hasSheets: !!parsedData.sheets,
            hasName: !!parsedData.name,
            dataSize: contentString.length,
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

    const priv = Number((loadedData as any)?.privacy_type ?? (loadedData as any)?.privacyType)
    if (!authStore.isAuthenticated) {
      if ([1, 2, 3, 4].includes(priv)) {
        const fallback = {
          ...DEFAULT_WORKBOOK_DATA,
          id,
          name: loadedData.title || 'Spreadsheet',
        }
        document.title = loadedData.title || 'Spreadsheet'
        title.value = loadedData.title || 'Spreadsheet'
        console.log('Public link access: initializing viewer with default structure')
        return fallback as any
      }
      accessDenied.value = true
      requestEmail.value = authStore.email || ''
      return null
    }
    console.log('No contents found for existing document (authenticated), will use default structure but keep title')
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

// Request access API call (sheets)
async function submitAccessRequestSheet() {
  if (!route.params.id) return
  requestSubmitting.value = true
  requestSuccess.value = null
  try {
    const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
    const res = await fetch(`${API_BASE_URI}/app-files/${route.params.id}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: requestEmail.value,
        access_level: accessLevel.value,
        message: requestMessage.value || undefined,
      }),
    })
    const payload = await res.json()
    if (res.ok && (payload?.requested || payload?.success)) {
      requestSuccess.value = 'Access request sent. You will receive an email when approved.'
    } else {
      requestSuccess.value = payload?.message || 'Request sent (if the email is valid).'
    }
  } catch (e) {
    requestSuccess.value = 'Request submitted. Please check your email later.'
  } finally {
    requestSubmitting.value = false
  }
}

function editTitle() {
  isTitleEdit.value = true
  editableTitle.value = title.value
  nextTick(() => {
    const titleEl = titleRef.value
    if (titleEl) {
      titleEl.focus()
    }
  })
}

// Unified title commit similar to RunDoc's saveTitle
async function saveTitle() {
  const newTitle = title.value.trim()
  if (newTitle && newTitle !== document.title) {
    document.title = newTitle
    if (!authStore.isAuthenticated) return
    if (route.params.id && !isSaving.value) {
      try {
        try {
          univerRef.value?.setName(newTitle)
        } catch {}
        if (data.value && typeof data.value === 'object') {
          ;(data.value as any).name = newTitle
        }
        const doc = {
          id: route.params.id as string,
          title: newTitle,
          file_name: `${sluggify(newTitle)}.xlsx`,
          file_type: 'xlsx',
          is_folder: false,
          content: JSON.stringify(data.value),
          last_viewed: new Date(),
        } as FileData

        const result = await fileStore.saveDocument(doc)
        console.log('Title saved:', newTitle)

        // Send WebSocket message for real-time collaboration
        wsService.value?.sendMessage(route.params.id as string, 'title', { title: newTitle }, userId.value, userName.value)

        // Handle redirect for documents that got new server IDs
        if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
          console.log('Document got new server ID after title change, redirecting to:', result.redirectId)
          await router.replace(`/sheets/${result.redirectId}`)
        }
      } catch (error) {
        console.error('Error saving title:', error)
      }
    }
  }
}

function updateTitleRemote(newTitle: string) {
  document.title = newTitle
  title.value = newTitle
  // Keep local workbook snapshot aligned when remote title changes
  try {
    univerRef.value?.setName(newTitle)
  } catch {}
  if (data.value && typeof data.value === 'object') {
    ;(data.value as any).name = newTitle
  }
}

const SOCKET_URI = import.meta.env.SOCKET_BASE_URL || 'wss://w.venmail.io:8443'

function initializeWebSocketAndJoinSheet() {
  if (!authStore.isAuthenticated || !route.params.id) return
  if (!wsService.value) {
    wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${route.params.id}&userName=${userName.value}&userId=${userId.value}`)
  }
  joinSheet()
}

function joinSheet() {
  if (isJoined.value) return
  if (wsService.value && route.params.id) {
    try {
      isJoined.value = wsService.value.joinSheet(route.params.id as string, handleIncomingMessage)
      console.log('Joined sheet:', route.params.id)
    } catch (error) {
      console.error('Error joining sheet:', error)
    }
  }
}

// Helper function to create workbook data from template
function createWorkbookFromTemplate(templateData: any): IWorkbookData {
  return {
    ...templateData,
    sheets: templateData.sheets as any,
  } as IWorkbookData
}

onMounted(async () => {
  isLoading.value = true

  try {
    // Handle template-based new documents first
    if (route.params.template) {
      const templateName = route.params.template as string

      let templateData: IWorkbookData = DEFAULT_WORKBOOK_DATA as IWorkbookData
      let docTitle = 'New Spreadsheet'

      if (templateName.toLowerCase().includes('budget')) {
        templateData = createWorkbookFromTemplate(BUDGET_TEMPLATE_DATA)
        docTitle = 'Budget'
      } else if (templateName.toLowerCase().includes('invoice')) {
        templateData = createWorkbookFromTemplate(INVOICE_TEMPLATE_DATA)
        docTitle = 'Invoice'
      }

      console.log('Creating new document from template:', templateName)

      const newDoc = await fileStore.createNewDocument('xlsx', docTitle)

      const newDocData = {
        ...templateData,
        id: newDoc.id,
        name: docTitle,
      }

      data.value = newDocData
      document.title = docTitle
      title.value = document.title

      await router.replace(`/sheets/${newDoc.id}`)

      if (authStore.isAuthenticated) initializeWebSocketAndJoinSheet()
    }
    // Handle existing document with ID
    else if (route.params.id) {
      const existingDoc = fileStore.allFiles.find(doc => doc.id === route.params.id)
      if (existingDoc && existingDoc.title) {
        title.value = existingDoc.title
        document.title = existingDoc.title
        console.log('Set title from existing store data:', existingDoc.title)
      }

      if (authStore.isAuthenticated) initializeWebSocketAndJoinSheet()

      const loadedData = await loadData(route.params.id as string)
      if (loadedData) {
        data.value = loadedData
        const finalTitle = title.value || loadedData.name || (loadedData as any).title || 'New Spreadsheet'
        document.title = finalTitle
        title.value = finalTitle
        console.log('Loaded existing document:', {
          id: loadedData.id,
          name: loadedData.name,
          title: finalTitle,
          hasSheets: !!loadedData.sheets,
        })
      } else {
        console.log('Creating new document with ID:', route.params.id)
        const currentTitle = title.value || 'New Spreadsheet'
        const newDocData = {
          ...DEFAULT_WORKBOOK_DATA,
          id: route.params.id as string,
          name: currentTitle,
        }
        data.value = newDocData
        document.title = currentTitle
        title.value = currentTitle
      }
    }
    // Handle completely new document without ID (route: /sheets)
    else {
      console.log('Creating completely new document')

      const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet')

      const newDocData = {
        ...DEFAULT_WORKBOOK_DATA,
        id: newDoc.id,
        name: 'New Spreadsheet',
      }

      data.value = newDocData
      document.title = 'New Spreadsheet'
      title.value = document.title

      await router.replace(`/sheets/${newDoc.id}`)

      initializeWebSocketAndJoinSheet()
    }

    nextTick(() => {
      const iconHTML = iconRef.value?.outerHTML
      if (iconHTML) {
        const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML.replace(/currentColor/g, '#38a169'))}`
        useFavicon(iconDataURL)
      }
    })
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (wsService.value && route.params.id) {
    wsService.value.leaveSheet(route.params.id as string)
  }
})

// Watch for changes in the connection status
watch(isConnected, newIsConnected => {
  if (newIsConnected) {
    console.log('WebSocket connection established. Joining sheet...')
    joinSheet()
  } else {
    console.log('WebSocket connection lost.')
    isJoined.value = false
  }
})

function handleIncomingMessage(message: Message) {
  if (message.sheetId !== route.params.id) return

  if (message.messages) {
    return message.messages?.forEach(handleIncomingMessage)
  }

  switch (message.type) {
    case 'chat':
      handleChatMessage(message)
      break
    case 'change':
      if (message.user?.id === userId.value) {
        break
      }
      changesPending.value = true
      univerCoreRef.value?.executeCommand(message.content.command.id, message.content.command.params)
      setTimeout(() => {
        requestAnimationFrame(() => {
          changesPending.value = false
        })
      }, 10)
      break
    case 'cursor':
      if (message.user?.id && message.user?.name) {
        collaborators.value[message.user.id] = {
          name: message.user.name,
          selection: (message as any).content?.selection,
          ts: Date.now(),
        }
      }
      break
    case 'title':
      if (message.user?.id !== userId.value && message.content?.title) {
        updateTitleRemote(message.content.title)
      }
      break
  }
}

function handleChatMessage(messageInfo: Message) {
  chatMessages.value.push(messageInfo)
  scrollToBottom()
}

function sendChatMessage() {
  if (route.params.id) {
    const message = newChatMessage.value
    if (message.trim()) {
      wsService.value?.sendMessage(route.params.id as string, 'chat', { message }, userId.value, userName.value)
      adjustTextareaHeight()
      replyingTo.value = null
      newChatMessage.value = ''
    }
  }
}

const debouncedHandleTitleChange = debounce(saveTitle, 300)

async function handleExport(format: string) {
  try {
    if (!univerCoreRef.value) {
      toast.error('Export is not available yet')
      return
    }
    const exportOptions: IExportOptions = {
      format: format as ExportFormat,
      filename: `${(title.value || 'sheet-export')}.${format}`,
      includeStyles: true,
      includeFormulas: true,
      includeHeaders: true,
      pdfEngine: format === 'pdf' ? PDFEngine.JSPDF : undefined,
    }
    await exportService.export(univerCoreRef.value as any, exportOptions)
  } catch (err) {
    console.error('Export failed', err)
    toast.error('Export failed')
  }
}

function handleUndo() {
  try {
    univerCoreRef.value?.undo()
  } catch {}
}

function handleRedo() {
  try {
    univerCoreRef.value?.redo()
  } catch {}
}

// Formatting actions using Univer facade selection
function handleFormatBold() {
  try {
    const wb = univerCoreRef.value?.getActiveWorkbook()
    const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
    range?.setFontWeight('bold')
  } catch {}
}

function handleFormatItalic() {
  try {
    const wb = univerCoreRef.value?.getActiveWorkbook()
    const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
    range?.setFontStyle('italic')
  } catch {}
}

function handleFormatUnderline() {
  try {
    const wb = univerCoreRef.value?.getActiveWorkbook()
    const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
    range?.setFontLine('underline')
  } catch {}
}

function handleFormatStrike() {
  try {
    const wb = univerCoreRef.value?.getActiveWorkbook()
    const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
    range?.setFontLine('line-through')
  } catch {}
}

// View zoom controls (simple CSS zoom fallback)
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

// Data tools
function handleDataSort() {
  try {
    const wb = univerCoreRef.value?.getActiveWorkbook()
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
  // Placeholder: Could toggle a header filter UI; for now, no-op with toast
  toast.info('Filter: Coming soon')
}

function handleDataGroup() {
  // Placeholder: Could group rows/columns; for now, no-op with toast
  toast.info('Group: Coming soon')
}

function handlePrint() {
  try { window.print() } catch {}
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  try {
    if (authStore.isAuthenticated && univerRef.value && route.params.id) {
      saveData()
      e.preventDefault()
      e.returnValue = ''
    }
  } catch {}
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }
})

onUnmounted(() => {
  if (authStore.isAuthenticated) {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

onBeforeRouteLeave(async () => {
  try {
    if (authStore.isAuthenticated && univerRef.value && route.params.id) {
      await saveData()
    }
  } catch {}
})

function updateTitle(event: Event) {
  if (isSettingCursor.value) return

  const target = event.target as HTMLElement
  const newText = target.innerText.trim()

  if (editableTitle.value === newText) return

  editableTitle.value = newText
  title.value = newText

  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)
  const offset = range?.startOffset

  nextTick(() => {
    isSettingCursor.value = true
    restoreCursorPosition(target, offset ?? newText.length)
    isSettingCursor.value = false
  })

  debouncedHandleTitleChange()
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

async function saveData() {
  if (!authStore.isAuthenticated) {
    return
  }
  if (!univerRef.value || !route.params.id) {
    console.warn('Cannot save: univerRef or route.params.id is missing')
    toast.error('Cannot save: Missing document reference or ID')
    return
  }

  if (isSaving.value) {
    console.log('Save already in progress, skipping')
    return
  }

  isSaving.value = true

  try {
    const name = title.value || 'New Spreadsheet'

    const completeData = await univerRef.value.getData()
    if (!completeData) {
      throw new Error('Failed to capture spreadsheet data')
    }

    try {
      univerRef.value.setName(name)
    } catch {}

    completeData.id = route.params.id as string
    completeData.name = name

    const doc = {
      id: route.params.id as string,
      title: name,
      content: JSON.stringify(completeData),
      file_type: 'xlsx',
      is_folder: false,
      file_name: `${name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
      last_viewed: new Date(),
    } as FileData

    console.log('Saving document with complete data:', {
      id: doc.id,
      title: doc.title,
      dataSize: doc.content?.length || 0,
      hasSheets: !!completeData.sheets,
    })

    const result = await fileStore.saveDocument(doc)
    console.log('saveResult', result)

    if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
      console.log('Document got new server ID, redirecting to:', result.redirectId)
      await router.replace(`/sheets/${result.redirectId}`)
      toast.success('Document saved and synced successfully')
    } else {
      toast.success('Document saved successfully')
    }
    lastSavedAt.value = new Date()

    console.log('Document saved successfully')
  } catch (error) {
    console.error('Error saving document:', error)
    toast.error('Failed to save document. Please try again.')
  } finally {
    isSaving.value = false
  }
}

function copyShareLink() {
  const id = route.params.id as string
  if (!id) return
  const url = `${window.location.origin}/sheets/${id}`
  navigator.clipboard.writeText(url).then(() => toast.success('Link copied'))
}

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

const permToApi: Record<'view' | 'comment' | 'edit', 'v' | 'c' | 'e'> = { view: 'v', comment: 'c', edit: 'e' }
const apiToPerm: Record<'v' | 'c' | 'e', 'view' | 'comment' | 'edit'> = { v: 'view', c: 'comment', e: 'edit' }

function parseSharingInfoString(info?: string | null) {
  const list: Array<{ email: string; permission: 'view' | 'comment' | 'edit' }> = []
  if (!info || typeof info !== 'string') return list
  info
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(pair => {
      const [email, access] = pair.split(':').map(x => (x || '').trim())
      if (email && (access === 'v' || access === 'c' || access === 'e')) {
        list.push({ email, permission: apiToPerm[access] })
      }
    })
  return list
}

async function fetchSharingInfo() {
  try {
    const id = route.params.id as string
    if (!id) return
    const token = fileStore.getToken?.()
    const res = await axios.get(`${FILES_ENDPOINT}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const payload = res.data?.data || {}
    const parsed = parseSharingInfoString(payload.sharing_info)
    shareMembers.value = parsed
    if (typeof payload.privacy_type === 'number') privacyType.value = Number(payload.privacy_type)
  } catch {}
}

async function handleInviteMember(payload: { email: string; permission: 'view' | 'comment' | 'edit' | 'owner'; note?: string }) {
  try {
    const id = route.params.id as string
    if (!id) return
    const token = fileStore.getToken?.()
    await axios.post(
      `${FILES_ENDPOINT}/${id}/share`,
      {
        email: payload.email,
        access_level: payload.permission === 'owner' ? 'o' : permToApi[payload.permission],
        note: payload.note,
      },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    await fetchSharingInfo()
    toast.success('Shared successfully')
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to share')
  }
}

async function handleUpdateMember(payload: { email: string; permission: 'view' | 'comment' | 'edit' | 'owner' }) {
  return handleInviteMember(payload)
}

async function handleRemoveMember(payload: { email: string }) {
  try {
    const id = route.params.id as string
    if (!id) return
    const token = fileStore.getToken?.()
    await axios.post(
      `${FILES_ENDPOINT}/${id}/unshare`,
      { email: payload.email },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )
    await fetchSharingInfo()
    toast.success('Removed access')
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to remove access')
  }
}

function openShareDialog() {
  fetchSharingInfo()
}

function downloadFile() {
  if (downloadUrl.value) {
    try {
      window.open(downloadUrl.value, '_blank')
    } catch {}
  }
}

async function updateVisibility(newVis: number) {
  visibility.value = newVis === 3 || newVis === 4 ? 'link' : 'private'
  if (!route.params.id) return
  const name = title.value || 'New Spreadsheet'
  const latest = univerRef.value?.getData ? await univerRef.value.getData() : data.value
  const contentJson = latest ? JSON.stringify(latest) : undefined
  const doc: FileData = {
    id: route.params.id as string,
    title: name,
    content: contentJson,
    file_type: 'xlsx',
    is_folder: false,
    file_name: `${name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
    last_viewed: new Date(),
    privacy_type: newVis,
    url: false,
    thumbnail_url: undefined,
  }
  const result = await fileStore.saveDocument(doc)
  if (result?.document) toast.success('Visibility updated')
}

function adjustTextareaHeight() {
  if (chatInput.value) {
    chatInput.value.style.height = '40px'
    chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`
    textareaHeight.value = chatInput.value.style.height
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight
    }
  })
}

function formatDate(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleTimeString()
  } catch {
    return ''
  }
}

function replyToMessage(message: Message) {
  replyingTo.value = message
  chatInput.value?.focus()
}

function cancelReply() {
  replyingTo.value = null
}

function getReplyUserName(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => msg.id === replyId)
  return replyMessage ? replyMessage.user.name : 'Unknown User'
}

function getReplyContent(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => msg.id === replyId)
  return replyMessage ? replyMessage.content.message : ''
}

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (!newId) return
    if (wsService.value && oldId) {
      wsService.value.leaveSheet(oldId as string)
      isJoined.value = false
    }
    if (authStore.isAuthenticated) {
      initializeWebSocketAndJoinSheet()
    }
    const loaded = await loadData(newId as string)
    if (loaded) {
      data.value = loaded
      title.value = loaded.name || title.value
    }
  },
)

watch(
  () => data.value,
  async newValue => {
    if (newValue && univerRef.value) {
      try {
        await univerRef.value.setData(newValue as IWorkbookData)
      } catch (error) {
        console.warn('Failed to push latest data into UniverSheet:', error)
      }
    }
  },
)

watch(
  () => collaborators.value,
  () => {
    const now = Date.now()
    for (const [id, info] of Object.entries(collaborators.value)) {
      if (now - info.ts > 8000) {
        delete collaborators.value[id]
      }
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="sheet-editor h-screen flex flex-col">
    <div v-if="isLoading" class="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden">
      <div class="h-full bg-primary-600 w-1/3 animate-pulse"></div>
    </div>

    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
    >
      <div class="flex items-center gap-4">
        <button class="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" @click="router.back()">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <router-link to="/">
          <defaultIcons.IconMicrosoftExcel ref="iconRef" class="w-[1.5rem] h-[3rem] text-green-600" xmlns="http://www.w3.org/2000/svg" />
        </router-link>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <div
              :contenteditable="isTitleEdit"
              ref="titleRef"
              class="font-bold border-b border-dotted border-gray-300 min-w-[100px] px-2 py-1 relative"
              :class="{ 'cursor-text': isTitleEdit, 'hover:bg-gray-100': !isTitleEdit }"
              @click="editTitle"
              @input="updateTitle"
              @blur="saveTitle"
              @keydown.enter.prevent="saveTitle"
            >
              {{ title }}
            </div>
            <div class="flex items-center gap-2">
              <PencilIcon v-if="!isTitleEdit" @click="editTitle" class="h-3 w-3 cursor-pointer hover:text-primary-600" />
              <div class="flex items-center gap-3 text-sm">
                <span
                  :class="{
                    'text-yellow-500': !isConnected,
                    'text-green-500': isConnected && !isSaving,
                    'text-blue-500': isSaving,
                  }"
                >
                  {{ syncStatusText }}
                </span>
                <span class="text-gray-500 cursor-pointer" title="Click to save now" @click="saveData">
                  {{ lastSavedText }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Dialog v-model:open="shareOpen">
          <DialogTrigger asChild>
            <Button variant="outline" @click="openShareDialog">
              <Share2 class="h-4 w-4 mr-2" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share</DialogTitle>
            </DialogHeader>
            <ShareCard
              @close="shareOpen = false"
              mode="sheet"
              :share-link="shareLinkSheet"
              :privacy-type="privacyType"
              :members="shareMembers"
              :can-edit-privacy="authStore.isAuthenticated"
              @copy-link="copyShareLink"
              @change-privacy="updateVisibility"
              @invite="handleInviteMember"
              @update-member="handleUpdateMember"
              @remove-member="handleRemoveMember"
            />
          </DialogContent>
        </Dialog>

        <button @click="toggleChat" class="p-2 rounded-full hover:bg-gray-200">
          <MessageSquareIcon class="h-6 w-6 text-gray-600" />
        </button>
        <UserProfile :isMobile="false" />
      </div>
    </div>

    <UnifiedMenubar
      :file-id="route.params.id as string"
      mode="sheet"
      :collaborators="collaborators"
      @toggle-chat="toggleChat"
      @save="saveData"
      @export="handleExport"
      @undo="handleUndo"
      @redo="handleRedo"
      @format-bold="handleFormatBold"
      @format-italic="handleFormatItalic"
      @format-underline="handleFormatUnderline"
      @format-strike="handleFormatStrike"
      @view-zoom-in="handleViewZoomIn"
      @view-zoom-out="handleViewZoomOut"
      @view-zoom-reset="handleViewZoomReset"
      @data-sort="handleDataSort"
      @data-filter="handleDataFilter"
      @data-group="handleDataGroup"
      @print="handlePrint"
    />

    <div v-if="accessDenied" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow p-6">
        <div class="mb-4">
          <h2 class="text-lg font-semibold">Request access to this sheet</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            This sheet is private. Enter your email to request access from the owner.
          </p>
        </div>
        <form @submit.prevent="submitAccessRequestSheet" class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input
              v-model="requestEmail"
              type="email"
              required
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Requested access</label>
            <select
              v-model="accessLevel"
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
            >
              <option value="v">View</option>
              <option value="c">Comment</option>
              <option value="e">Edit</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Message (optional)</label>
            <textarea
              v-model="requestMessage"
              rows="3"
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              placeholder="Add a note to the owner"
            ></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <Button type="submit" :disabled="requestSubmitting || !requestEmail" variant="default">
              <span v-if="!requestSubmitting">Request access</span>
              <span v-else>Sending...</span>
            </Button>
            <span v-if="requestSuccess" class="text-sm text-green-600">{{ requestSuccess }}</span>
          </div>
        </form>
      </div>
    </div>

    <div v-else-if="isLarge" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow p-6 text-center">
        <h2 class="text-lg font-semibold mb-2">This spreadsheet is large</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          The file is too large to preview online. You can download it to view locally.
        </p>
        <Button variant="default" @click="downloadFile" :disabled="!downloadUrl">Download file</Button>
      </div>
    </div>
    <div v-else class="relative w-full flex-1 min-h-0">
      <UniverSheet
        id="sheet"
        ref="univerRef"
        class="w-full h-full"
        :data="data as IWorkbookData"
        :changes-pending="changesPending"
        :sheet-id="route.params.id as string"
        :user-id="userId"
        :user-name="userName"
        :ws="wsService as IWebsocketService"
        @univer-ref-change="onUniverRefChange"
      />
    </div>

    <div
      v-if="!accessDenied && isChatOpen"
      class="fixed right-0 bottom-0 w-80 h-96 z-50 bg-white border-l border-t border-gray-200 shadow-lg flex flex-col"
    >
      <div class="flex justify-between items-center p-3 border-b border-gray-200">
        <h3 class="font-semibold">Chat</h3>
        <button @click="toggleChat" class="p-1 rounded-full hover:bg-gray-200">
          <XIcon class="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-3" ref="chatMessagesContainer">
        <div v-for="message in chatMessages" :key="message.id" class="mb-4">
          <div v-if="message.replyTo" class="ml-4 mb-1 p-2 bg-gray-100 rounded text-sm">
            <span class="font-semibold">{{ getReplyUserName(message.replyTo) }}:</span>
            {{ getReplyContent(message.replyTo) }}
          </div>
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-semibold mr-2">
              {{ message.user.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-baseline">
                <span class="font-semibold mr-2">{{ message.user.name }}</span>
                <span class="text-xs text-gray-500">{{ formatDate(message.timestamp) }}</span>
              </div>
              <div class="mt-1">{{ message.content.message }}</div>
              <button @click="replyToMessage(message)" class="text-sm text-blue-500 mt-1">
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200">
        <form @submit.prevent="sendChatMessage" class="flex flex-col">
          <div v-if="replyingTo" class="mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
            <div class="text-sm">
              <span class="font-semibold">Replying to {{ replyingTo.user.name }}:</span>
              {{ replyingTo.content.message }}
            </div>
            <button @click="cancelReply" class="text-gray-500 hover:text-gray-700">
              <XIcon class="h-4 w-4" />
            </button>
          </div>
          <div class="flex">
            <textarea
              v-model="newChatMessage"
              placeholder="Type a message..."
              class="flex-grow border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              :style="{ height: textareaHeight }"
              @input="adjustTextareaHeight"
              ref="chatInput"
            ></textarea>
            <button
              type="submit"
              class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-editor {
  background: var(--univer-editor-bg, #f9fafb);
}

[contenteditable='true'] {
  outline: none;
}

#sheet {
  flex: 1;
}

.chat-input {
  min-height: 40px;
  max-height: 150px;
}
</style>
