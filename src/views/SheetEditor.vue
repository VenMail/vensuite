<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import type { IVTableSheetOptions } from '@visactor/vtable-sheet'
import { ContextMenuPlugin, DEFAULT_BODY_MENU_ITEMS } from '@visactor/vtable-plugins'

import '@/assets/index.css'
import { MessageSquareIcon, XIcon, ArrowLeft, Share2, FileTextIcon } from 'lucide-vue-next'

import UnifiedMenubar from '@/components/menu/UnifiedMenubar.vue'
import VTableSheet from '@/components/VTableSheet.vue'
import UserProfile from '@/components/layout/UserProfile.vue'
import Button from '@/components/ui/button/Button.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import IntegrationDialog from '@/components/forms/IntegrationDialog.vue'
import ShareCard from '@/components/ShareCard.vue'
import SheetVersionHistory from '@/components/sheets/SheetVersionHistory.vue'
import ChartDialog from '@/components/charts/ChartDialog.vue'
import ChartRenderer from '@/components/charts/ChartRenderer.vue'
import DataValidationDialog from '@/components/dialogs/DataValidationDialog.vue'
import ConditionalFormatDialog from '@/components/dialogs/ConditionalFormatDialog.vue'
import NumberFormatDialog from '@/components/dialogs/NumberFormatDialog.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import { useFavicon, useDebounceFn } from '@vueuse/core'

import {
  DEFAULT_WORKBOOK_DATA,
} from '@/assets/default-workbook-data'
import {
  cloneSpreadsheetWorkbookData,
  resolveSpreadsheetTemplateDefinition,
} from '@/constants/sheetTemplates'

import { extractSheetFields } from '@/utils/fieldExtractor'
import { convertSheetToForm } from '@/utils/sheetToFormConverter'
import { createForm } from '@/services/forms'
import type { FormDefinition } from '@/types'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import type { ShareMember, ShareLevel } from '@/utils/sharing'
// import { t } from '@/i18n'

// Import composables
import axios from 'axios'
import { useSheetData } from '@/composables/useSheetData'
import { useSheetFormatting } from '@/composables/useSheetFormatting'
import { useSheetDataTools } from '@/composables/useSheetDataTools'
import { useSheetCollaboration } from '@/composables/useSheetCollaboration'
import { useSheetExport } from '@/composables/useSheetExport'
import { useSheetYjsBinding } from '@/composables/useSheetYjsBinding'
import { useSheetHistory } from '@/composables/useSheetHistory'
import { useSheetClipboard } from '@/composables/useSheetClipboard'
import { useSheetCharts } from '@/composables/useSheetCharts'

const route = useRoute()
const router = useRouter()

type VersionHistoryItem = {
  id: string;
  version_number: number;
  file_size: number;
  file_name: string;
  mime_type: string;
  change_note: string | null;
  created_at: string;
  created_at_human: string;
  employee_id: string;
}

type VersionHistoryDetail = VersionHistoryItem & {
  app_file_id: string;
  file_url: string;
  content: string;
}

type WorkbookSheetSummary = {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  populatedCellCount: number;
  fingerprint: string;
}

type WorkbookVersionSummary = {
  sheetCount: number;
  sheets: WorkbookSheetSummary[];
}

// Initialize stores
const fileStore = useFileStore()

// Initialize composables
const sheetData = useSheetData()
const {
  data,
  title,
  isTitleEdit,
  editableTitle,
  isSaving,
  isLoading,
  isLarge,
  downloadUrl,
  accessDenied,
  privacyType,
  lastSavedText,
  canEditSheet,
  loadData,
  saveData,
  editTitle,
  saveTitle,
  restoreCursorPosition,
} = sheetData

// Debounced title save
const debouncedHandleTitleChange = useDebounceFn(() => {
  if (vtableRef.value && isVTableReady.value) {
    saveTitle(vtableRef.value, false)
  }
}, 300)

// VTable refs
const vtableRef = ref<InstanceType<typeof VTableSheet> | null>(null)
const vtableInstance = ref<any>(null)

// Yjs cleanup function
let yjsDestroyFn: (() => void) | null = null

// Initialize composables that need vtableRef
const formatting = useSheetFormatting(vtableRef) as any
const dataTools = useSheetDataTools(vtableRef) as any
const exportComposable = useSheetExport(vtableRef)
const history = useSheetHistory(vtableRef)
const clipboard = useSheetClipboard(vtableRef)
const charts = useSheetCharts(vtableRef)

// Collaboration
const collaboration = useSheetCollaboration(vtableInstance, {
  privacyType,
  onRemoteTitleChange: (newTitle: string) => {
    if (!newTitle || sheetData.title.value === newTitle) return
    sheetData.title.value = newTitle
    sheetData.editableTitle.value = newTitle
    document.title = newTitle
  },
  onRemoteChange: (config: any) => {
    // Apply received workbook config to live VTable instance sheet-by-sheet
    if (!vtableInstance.value) return
    const wsMap = (vtableInstance.value as any).workSheetInstances as Map<string, any> | undefined
    if (!wsMap) return
    for (const sheetDef of (config?.sheets ?? [])) {
      const ws = wsMap.get(sheetDef.sheetKey)
      if (!ws || !Array.isArray(sheetDef.data)) continue
      try {
        ws.updateSheetOption({ data: sheetDef.data })
      } catch (err) {
        console.warn('[collab] Failed to apply remote sheet data for', sheetDef.sheetKey, err)
      }
    }
  },
})
const {
  wsService,
  chatMessages,
  isChatOpen,
  unreadCount,
  changesPending,
  newChatMessage,
  textareaHeight,
  replyingTo,
  collaborators,
  canJoinRealtime,
  isApplyingRemote,
  broadcastTitle,
  broadcastChange,
  sendChatMessage,
  handleChatEnterKey,
  adjustTextareaHeight,
  formatDate,
  replyToMessage,
  cancelReply,
  getReplyUserName,
  getReplyContent,
  toggleChat,
  initializeWebSocketAndJoinSheet,
  leaveSheet,
} = collaboration

// Helper functions for window access
function getWindowOrigin(): string {
  return typeof window !== 'undefined' ? window.location?.origin || '' : ''
}

function setWindowLocation(href: string) {
  if (typeof window !== 'undefined') {
    window.location.href = href
  }
}

async function loadVersionHistory() {
  const fileId = route.params.id as string | undefined
  if (!fileId) {
    return
  }

  isLoadingVersions.value = true
  try {
    const response = await fileStore.listVersions(fileId)
    versionHistory.value = response?.versions ?? []
    currentVersionSummary.value = response?.current_version ?? null
  } catch (error) {
    console.error('Failed to load sheet version history:', error)
    versionHistory.value = []
    currentVersionSummary.value = null
    toast.error('Failed to load version history')
  } finally {
    isLoadingVersions.value = false
  }
}

async function openVersionHistory() {
  showVersionHistoryDialog.value = true
  await loadVersionHistory()
  if (versionHistory.value.length > 0) {
    await selectVersion(versionHistory.value[0])
  }
}

async function selectVersion(version: VersionHistoryItem) {
  const fileId = route.params.id as string | undefined
  if (!fileId) {
    return
  }

  selectedVersionNumber.value = version.version_number
  selectedVersionError.value = null
  isLoadingVersionDetail.value = true

  try {
    const detail = await fileStore.getVersion(fileId, version.version_number)
    if (!detail) {
      throw new Error('Version details unavailable')
    }
    selectedVersionDetail.value = {
      ...version,
      ...detail,
    }
  } catch (error) {
    console.error('Failed to load selected version:', error)
    selectedVersionDetail.value = null
    selectedVersionError.value = 'Failed to load this version for comparison.'
  } finally {
    isLoadingVersionDetail.value = false
  }
}

function parseWorkbookSnapshot(raw: unknown): any | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') {
    return raw
  }
  return null
}

function extractCellStats(cellData: unknown): { populatedCellCount: number; sampleValues: string[] } {
  if (!cellData || typeof cellData !== 'object') {
    return { populatedCellCount: 0, sampleValues: [] }
  }

  let populatedCellCount = 0
  const sampleValues: string[] = []

  Object.values(cellData as Record<string, unknown>).forEach((row) => {
    if (!row || typeof row !== 'object') return
    Object.values(row as Record<string, unknown>).forEach((cell) => {
      if (!cell || typeof cell !== 'object') return
      const value = (cell as Record<string, unknown>).v
        ?? (cell as Record<string, unknown>).value
        ?? (cell as Record<string, unknown>).p
      if (value === undefined || value === null || value === '') return
      populatedCellCount += 1
      if (sampleValues.length < 12) {
        sampleValues.push(String(value))
      }
    })
  })

  return { populatedCellCount, sampleValues }
}

function summarizeWorkbook(raw: unknown): WorkbookVersionSummary | null {
  const workbook = parseWorkbookSnapshot(raw)
  const sheets = (workbook as any)?.sheets
  if (!sheets || typeof sheets !== 'object') {
    return null
  }

  const sheetSummaries = Object.entries(sheets as Record<string, unknown>).map(([sheetId, sheet]) => {
    const typedSheet = (sheet ?? {}) as Record<string, unknown>
    const rowCount = Number(typedSheet.rowCount ?? typedSheet.row_count ?? 0)
    const columnCount = Number(typedSheet.columnCount ?? typedSheet.column_count ?? 0)
    const { populatedCellCount, sampleValues } = extractCellStats(typedSheet.cellData ?? typedSheet.cell_data)

    return {
      id: sheetId,
      name: String(typedSheet.name ?? sheetId),
      rowCount,
      columnCount,
      populatedCellCount,
      fingerprint: [rowCount, columnCount, populatedCellCount, sampleValues.join('|')].join('::'),
    }
  })

  return {
    sheetCount: sheetSummaries.length,
    sheets: sheetSummaries,
  }
}

const currentWorkbookSummary = computed(() => summarizeWorkbook(data.value))
const selectedWorkbookSummary = computed(() => summarizeWorkbook(selectedVersionDetail.value?.content))

const workbookComparison = computed(() => {
  const current = currentWorkbookSummary.value
  const selected = selectedWorkbookSummary.value
  if (!current || !selected) {
    return null
  }

  const currentMap = new Map(current.sheets.map((sheet) => [sheet.name, sheet]))
  const selectedMap = new Map(selected.sheets.map((sheet) => [sheet.name, sheet]))

  const addedSheets: string[] = []
  const removedSheets: string[] = []
  const changedSheets: string[] = []
  const unchangedSheets: string[] = []

  currentMap.forEach((sheet, sheetName) => {
    const previousSheet = selectedMap.get(sheetName)
    if (!previousSheet) {
      addedSheets.push(sheetName)
      return
    }

    if (previousSheet.fingerprint !== sheet.fingerprint) {
      changedSheets.push(sheetName)
    } else {
      unchangedSheets.push(sheetName)
    }
  })

  selectedMap.forEach((_sheet, sheetName) => {
    if (!currentMap.has(sheetName)) {
      removedSheets.push(sheetName)
    }
  })

  return {
    addedSheets,
    removedSheets,
    changedSheets,
    unchangedSheets,
    hasChanges: addedSheets.length > 0 || removedSheets.length > 0 || changedSheets.length > 0,
  }
})

// Refs for UI elements
const iconRef = ref<HTMLElement | null>(null)

// UI state
const shareOpen = ref(false)
const integrationsOpen = ref(false)
const convertToFormOpen = ref(false)
const showVersionHistoryDialog = ref(false)
const isLoadingVersions = ref(false)
const versionHistory = ref<VersionHistoryItem[]>([])
const currentVersionSummary = ref<{
  file_size?: number;
  updated_at?: string;
  updated_at_human?: string;
} | null>(null)
const selectedVersionNumber = ref<number | null>(null)
const selectedVersionDetail = ref<VersionHistoryDetail | null>(null)
const isLoadingVersionDetail = ref(false)
const selectedVersionError = ref<string | null>(null)
const sheetPublicApiKey = ref<string>('')
const sheetPublicApiEnabled = ref<boolean>(false)
const isUpdatingSheetPublicApi = ref(false)
const generatedFormQuestions = ref<any[]>([])
const isConvertingToForm = ref(false)
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// Format color dialogs
const fontColorOpen = ref(false)
const fillColorOpen = ref(false)
const selectedFontColor = ref('#000000')
const selectedFillColor = ref('#ffffff')

// Common color palette for quick selection
const commonColors = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#9ca3af', '#d1d5db',
  '#374151', '#1f2937', '#111827', '#7c2d12', '#991b1b',
  '#1e3a8a', '#312e81', '#581c87',
]

// Sharing state
const shareMembers = ref<ShareMember[]>([])
const isUpdatingSharing = ref(false)

// Initialize stores (fileStore used by composables)

// Computed properties
const extractedSheetFields = computed(() => {
  if (!data.value) return []
  return extractSheetFields(data.value as any)
})

const shareLinkSheet = computed(() => {
  const id = route.params.id as string
  if (!id) return ''
  const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || getWindowOrigin()
  return `${SHARE_BASE_URL}/share/sheet/${id}`
})

const sheetIntegrationEndpoint = computed(() => {
  if (!sheetPublicApiKey.value) return ''
  return `${API_BASE_URI}/public/sheets/${sheetPublicApiKey.value}/rows`
})

const shareMembersForCard = computed(() => {
  return shareMembers.value
})

// Template loading (for future use)
// const templates = {
//   budget: BUDGET_TEMPLATE_DATA,
//   invoice: INVOICE_TEMPLATE_DATA,
//   okr: OKR_TEMPLATE_DATA,
//   tasks: TASKS_TEMPLATE_DATA,
// }

// VTable ready state
const isVTableReady = ref(false)

// Chart context menu children (stable reference — defined once)
const chartMenuChildren = [
  { text: 'Bar Chart',     menuKey: 'chart_bar' },
  { text: 'Line Chart',    menuKey: 'chart_line' },
  { text: 'Pie Chart',     menuKey: 'chart_pie' },
  { text: 'Scatter Chart', menuKey: 'chart_scatter' },
  '-',
  { text: 'Configure Chart...', menuKey: 'chart_configure' },
]

// Computed config that extends loaded workbook data with chart context menu
const vtableInitialConfig = computed(() => {
  if (!data.value) return null
  return {
    ...data.value,
    VTablePluginModules: [
      {
        module: ContextMenuPlugin,
        moduleOptions: {
          bodyCellMenuItems: [
            ...DEFAULT_BODY_MENU_ITEMS,
            { text: '启用首行表头', menuKey: 'enable_first_row_as_header' },
            '-',
            { text: 'Visualize Selection', menuKey: 'visualize_selection', children: chartMenuChildren },
          ],
          // menuClickCallback and beforeShowAdjustMenuItems intentionally omitted
          // → vtable-sheet's internal defaults handle set_filter / enable_first_row_as_header
        },
      },
    ],
  }
})

// Patch ContextMenuPlugin on a WorkSheet table instance to handle chart actions.
// VTable's ContextMenuPlugin uses `menuClickCallback` (object or function) directly —
// the `dropdown_menu_click` VTable event is NOT fired for plugin-based menus.
function patchChartActionsOnTableInstance(tableInstance: any) {
  const plugin = tableInstance?.pluginManager?.getPlugin?.('context-menu')
  if (!plugin) return
  const cb = plugin.pluginOptions?.menuClickCallback
  if (typeof cb !== 'object' || cb === null) return
  cb.chart_bar       = () => onChartAction('chart_bar')
  cb.chart_line      = () => onChartAction('chart_line')
  cb.chart_pie       = () => onChartAction('chart_pie')
  cb.chart_scatter   = () => onChartAction('chart_scatter')
  cb.chart_configure = () => onChartAction('chart_configure')
}

// VTable ready handler
function onSheetReady(event: { instance: any }) {
  vtableInstance.value = event.instance
  isVTableReady.value = true

  history.initializeHistoryMonitoring()

  // Load persisted charts from workbook data
  if ((data.value as any)?.charts?.length) {
    charts.loadCharts((data.value as any).charts)
  }

  // Wrap saveToConfig to inject chart serialization on every save
  if (vtableRef.value) {
    const originalSave = (vtableRef.value as any).saveToConfig.bind(vtableRef.value)
    ;(vtableRef.value as any).saveToConfig = () => {
      const config = originalSave()
      if (charts.hasCharts()) {
        (config as any).charts = charts.serializeCharts()
      }
      return config
    }
  }

  // Patch chart actions into all loaded sheets' ContextMenuPlugin instances
  const inst = event.instance as any
  for (const sheet of inst.workSheetInstances?.values?.() ?? []) {
    if (sheet?.tableInstance) patchChartActionsOnTableInstance(sheet.tableInstance)
  }
  inst.on?.('sheet_added', (e: any) => {
    const sheet = inst.workSheetInstances?.get(e.sheetKey) as any
    if (sheet?.tableInstance) patchChartActionsOnTableInstance(sheet.tableInstance)
  })

  if (canJoinRealtime.value) {
    initializeWebSocketAndJoinSheet()
  }

  const routeId = route.params.id as string
  if (routeId) {
    // Clean up previous Yjs binding if exists
    if (yjsDestroyFn) {
      yjsDestroyFn()
      yjsDestroyFn = null
    }
    const binding = useSheetYjsBinding({
      vtableInstance: event.instance,
      routeId,
      userId: collaboration.userId.value,
      userName: collaboration.userName.value,
    })
    yjsDestroyFn = binding.destroy
  }
}

// Local title update function (from old implementation)
function handleTitleUpdate(event: Event) {
  if (sheetData.isSettingCursor.value) return

  const target = event.target as HTMLElement
  const newText = target.innerText.trim()

  if (sheetData.editableTitle.value === newText) return

  sheetData.editableTitle.value = newText
  sheetData.title.value = newText
  document.title = newText

  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)
  const offset = range?.startOffset

  nextTick(() => {
    sheetData.isSettingCursor.value = true
    restoreCursorPosition(target, offset ?? newText.length)
    sheetData.isSettingCursor.value = false
  })

  debouncedHandleTitleChange()

  if (canJoinRealtime.value) {
    broadcastTitle(newText)
  }
}

// Menu event handlers
function handleMenuAction(action: string, payload?: string) {
  switch (action) {
    case 'save':
      saveData(vtableRef.value)
      break
    case 'undo':
      history.handleUndo()
      break
    case 'redo':
      history.handleRedo()
      break
    case 'export':
      // Handle export
      break
    case 'toggle-chat':
      toggleChat()
      break
    case 'cut':
      clipboard.handleCut()
      break
    case 'copy':
      clipboard.handleCopy()
      break
    case 'paste':
      clipboard.handlePaste()
      break
    case 'delete':
      clipboard.handleDelete()
      break
    case 'print':
      dataTools.handlePrint()
      break
    // Formatting actions
    case 'format-bold':
      formatting.handleFormatBold()
      break
    case 'format-italic':
      formatting.handleFormatItalic()
      break
    case 'format-underline':
      formatting.handleFormatUnderline()
      break
    case 'format-strike':
      formatting.handleFormatStrike()
      break
    case 'font-color':
      fontColorOpen.value = true
      break
    case 'fill-color':
      fillColorOpen.value = true
      break
    case 'align-left':
      formatting.handleAlign('left')
      break
    case 'align-center':
      formatting.handleAlign('center')
      break
    case 'align-right':
      formatting.handleAlign('right')
      break
    case 'valign-top':
      formatting.handleVerticalAlign('top')
      break
    case 'valign-middle':
      formatting.handleVerticalAlign('middle')
      break
    case 'valign-bottom':
      formatting.handleVerticalAlign('bottom')
      break
    case 'border-all':
      formatting.handleBorder('all')
      break
    case 'border-none':
      formatting.handleBorder('none')
      break
    // Data tools actions
    case 'freeze-top-row':
      dataTools.handleFreezeTopRow()
      break
    case 'freeze-first-column':
      dataTools.handleFreezeFirstColumn()
      break
    case 'freeze-panes':
      dataTools.handleFreezePanes()
      break
    case 'unfreeze':
      dataTools.handleUnfreeze()
      break
    case 'view-zoom-in':
      dataTools.handleViewZoomIn()
      break
    case 'view-zoom-out':
      dataTools.handleViewZoomOut()
      break
    case 'view-zoom-reset':
      dataTools.handleViewZoomReset()
      break
    case 'data-sort':
      dataTools.handleDataSort()
      break
    case 'data-filter':
      dataTools.handleDataFilter()
      break
    case 'data-group':
      dataTools.handleDataGroup()
      break
    case 'data-validation':
      formatting.handleDataValidation()
      break
    case 'number-format':
      formatting.handleNumberFormat()
      break
    case 'advanced-sort':
      dataTools.handleAdvancedSort()
      break
    case 'find-replace':
      dataTools.handleFindReplace()
      break
    case 'conditional-format':
      formatting.handleConditionalFormat()
      break
    case 'convert-to-form':
      handleConvertToForm()
      break
    case 'open-integrations':
      integrationsOpen.value = true
      break
    case 'navigate-to-collaborator':
      if (payload) {
        collaboration.navigateToCollaborator(payload)
      }
      break
    case 'insert-chart':
      charts.openChartDialogFromSelection()
      break
    case 'insert-bar-chart':
      charts.createQuickChartFromSelection('bar')
      break
    case 'insert-line-chart':
      charts.createQuickChartFromSelection('line')
      break
    case 'insert-pie-chart':
      charts.createQuickChartFromSelection('pie')
      break
    case 'import-file':
      exportComposable.handleImport({ clearExisting: false })
      break
    case 'export-all':
      exportComposable.handleExportAll()
      break
    case 'insert-row-above':
      dataTools.insertRow('above')
      break
    case 'insert-row-below':
      dataTools.insertRow('below')
      break
    case 'insert-column-left':
      dataTools.insertColumn('left')
      break
    case 'insert-column-right':
      dataTools.insertColumn('right')
      break
    case 'delete-row':
      dataTools.deleteSelectedRows()
      break
    case 'delete-column':
      dataTools.deleteSelectedColumns()
      break
    case 'merge-cells':
      dataTools.handleMergeCells()
      break
    case 'unmerge-cells':
      dataTools.handleUnmergeCells()
      break
    case 'toggle-first-row-header':
      dataTools.handleToggleFirstRowHeader()
      break
    case 'toggle-wrap-text':
      dataTools.handleWrapText()
      break
    case 'open-about':
      toast.info('Venmail Sheets - spreadsheet editor')
      break
  }
}

const _FILES_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/app-files`
function _buildSheetAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = fileStore.getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
async function patchSharingData(id: string, body: Record<string, unknown>) {
  await axios.patch(`${_FILES_ENDPOINT}/${id}`, body, {
    headers: _buildSheetAuthHeaders({ 'Content-Type': 'application/json' }),
  })
}

// Sharing and API functions (simplified for now)
function openShareDialog() {
  shareOpen.value = true
}

async function copyShareLink() {
  if (shareLinkSheet.value) {
    navigator.clipboard.writeText(shareLinkSheet.value)
      .then(() => {
        toast.success('Share link copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy share link:', err)
        toast.error('Failed to copy share link')
      })
  }
}

async function handleChangePrivacy(newPrivacyType: number) {
  if (isUpdatingSharing.value) return
  
  const id = route.params.id as string
  if (!id) return
  
  isUpdatingSharing.value = true
  const prevPrivacy = privacyType.value
  privacyType.value = newPrivacyType
  try {
    await patchSharingData(id, { privacy_type: newPrivacyType })
    toast.success('Privacy settings updated')
  } catch (error) {
    console.error('Failed to update privacy:', error)
    toast.error('Failed to update privacy settings')
    privacyType.value = prevPrivacy
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleUpdateMember(payload: { email: string; shareLevel: ShareLevel; label: string }) {
  if (isUpdatingSharing.value) return

  const id = route.params.id as string
  if (!id) return

  isUpdatingSharing.value = true
  const previous = [...shareMembers.value]
  const memberIndex = shareMembers.value.findIndex(m => m.email === payload.email)
  if (memberIndex !== -1) {
    shareMembers.value[memberIndex].shareLevel = payload.shareLevel
  }
  try {
    const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
    await patchSharingData(id, { sharing_info: updatedSharing })
    toast.success(`Updated ${payload.email}'s access`)
  } catch (error) {
    console.error('Failed to update member:', error)
    toast.error('Failed to update member access')
    shareMembers.value = previous
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleRemoveMember(payload: { email: string }) {
  if (isUpdatingSharing.value) return

  const id = route.params.id as string
  if (!id) return

  isUpdatingSharing.value = true
  const previous = [...shareMembers.value]
  shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
  try {
    const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
    await patchSharingData(id, { sharing_info: updatedSharing })
    toast.success(`Removed ${payload.email}`)
  } catch (error) {
    console.error('Failed to remove member:', error)
    toast.error('Failed to remove member')
    shareMembers.value = previous
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleInvite(payload: { email: string; shareLevel: ShareLevel; label: string; note?: string }) {
  if (isUpdatingSharing.value) return

  const id = route.params.id as string
  if (!id) return

  isUpdatingSharing.value = true

  if (shareMembers.value.some(m => m.email === payload.email)) {
    toast.error('This person already has access')
    isUpdatingSharing.value = false
    return
  }

  const newMember: ShareMember = {
    email: payload.email,
    shareLevel: payload.shareLevel,
    status: 'pending',
  }
  shareMembers.value.push(newMember)
  try {
    const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
    await patchSharingData(id, { sharing_info: updatedSharing })
    toast.success(`Invited ${payload.email}`)
  } catch (error) {
    console.error('Failed to invite member:', error)
    toast.error('Failed to send invitation')
    shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
  } finally {
    isUpdatingSharing.value = false
  }
}

async function loadSharingData() {
  const id = route.params.id as string
  if (!id) return
  
  try {
    const document = await fileStore.loadDocument(id, 'xlsx')
    sheetPublicApiEnabled.value = Boolean((document as any)?.public_api_enabled)
    sheetPublicApiKey.value = ((document as any)?.public_api_key || '') as string
    const sharingData = (document as any)?.sharing_info ?? (document as any)?.sharing
    if (document && sharingData) {
      // Parse sharing data into members
      if (typeof sharingData === 'string') {
        shareMembers.value = sharingData
          .split(',')
          .map((entry: string) => {
            const [email, level] = entry.split(':')
            return {
              email: email.trim(),
              shareLevel: (level || 'v').trim() as ShareLevel,
              status: 'accepted' as const
            }
          })
          .filter((m: any) => m.email)
      } else if (Array.isArray(sharingData)) {
        shareMembers.value = sharingData
      }
    }
  } catch (error) {
    console.error('Failed to load sharing data:', error)
  }
}

async function handleSetSheetPublicApiEnabled(enabled: boolean) {
  const id = route.params.id as string
  if (!id) return
  if (isUpdatingSheetPublicApi.value) return
  
  isUpdatingSheetPublicApi.value = true
  try {
    const response = await axios.put(`${_FILES_ENDPOINT}/${id}/public-api`, { enabled }, {
      headers: _buildSheetAuthHeaders({ 'Content-Type': 'application/json' }),
    })
    const payload = response.data?.data ?? response.data ?? {}
    sheetPublicApiEnabled.value = Boolean(payload.public_api_enabled ?? enabled)
    sheetPublicApiKey.value = (payload.public_api_key || sheetPublicApiKey.value || '') as string
  } catch (error) {
    console.error('Failed to update public API status:', error)
    toast.error('Failed to update API access')
  } finally {
    isUpdatingSheetPublicApi.value = false
  }
}

async function handleRotateSheetPublicApiKey() {
  const id = route.params.id as string
  if (!id) return
  if (isUpdatingSheetPublicApi.value) return
  
  isUpdatingSheetPublicApi.value = true
  try {
    const response = await axios.post(`${_FILES_ENDPOINT}/${id}/public-api/key`, {}, {
      headers: _buildSheetAuthHeaders({ 'Content-Type': 'application/json' }),
    })
    const payload = response.data?.data ?? response.data ?? {}
    sheetPublicApiEnabled.value = Boolean(payload.public_api_enabled ?? sheetPublicApiEnabled.value)
    sheetPublicApiKey.value = (payload.public_api_key || payload.publicApiKey || '') as string
  } catch (error) {
    console.error('Failed to rotate API key:', error)
    toast.error('Failed to rotate API key')
  } finally {
    isUpdatingSheetPublicApi.value = false
  }
}

// Template loading function
async function loadTemplate(templateSlug: string): Promise<{ name: string; data: IVTableSheetOptions } | null> {
  try {
    const template = resolveSpreadsheetTemplateDefinition(templateSlug)
    return {
      name: template.workbookTitle || template.name,
      data: cloneSpreadsheetWorkbookData(template.workbookData),
    }
  } catch (error) {
    console.error('Error loading template:', error)
    return null
  }
}

// Form conversion functions
async function handleConvertToForm() {
  if (!data.value) return
  
  isConvertingToForm.value = true
  try {
    const questions = convertSheetToForm(data.value as any, {
      titleRow: 0,
      dataStartRow: 1,
      maxRowsToAnalyze: 10,
      includeSampleData: true
    })
    
    generatedFormQuestions.value = questions
    convertToFormOpen.value = true
  } catch (error) {
    console.error('Failed to convert sheet to form:', error)
  } finally {
    isConvertingToForm.value = false
  }
}

async function createFormFromQuestions() {
  if (generatedFormQuestions.value.length === 0) {
    console.error('No questions to create form from')
    return
  }

  isConvertingToForm.value = true
  try {
    // Create proper FormDefinition structure
    const formDefinition: Partial<FormDefinition> = {
      title: `${title.value} - Form`,
      description: `Form generated from spreadsheet "${title.value}"`,
      layout_mode: 'focus',
      status: 'draft',
      settings: {
        progress_bar: { show: true, type: 'percentage' },
        navigation: { allow_back: true, allow_skip: false },
        auto_focus: true,
        show_question_number: true,
        collect_email: false,
        save_partial_responses: true,
        locale: 'en',
        timezone: 'UTC',
        label_placement: 'stacked',
        form_density: 'comfortable'
      },
      pages: [
        {
          id: 'page_1',
          title: 'Page 1',
          description: '',
          position: 1,
          question_order: generatedFormQuestions.value.map(q => q.id),
          metadata: {}
        }
      ],
      questions: generatedFormQuestions.value.map(q => {
        const question: any = {
          id: q.id,
          page_id: 'page_1',
          category: q.category,
          type: q.type,
          question: q.question,
          description: q.description || '',
          placeholder: q.placeholder || '',
          required: q.required,
          help_text: q.help_text || '',
          metadata: q.metadata || {}
        }

        // Add type-specific properties
        if (q.validation) question.validation = q.validation
        if (q.options && q.options.length > 0) question.options = q.options
        if (q.min !== undefined) question.min = q.min
        if (q.max !== undefined) question.max = q.max
        if (q.allowed_types) question.allowed_types = q.allowed_types
        if (q.max_size_mb) question.max_size_mb = q.max_size_mb
        if (q.icon_type) question.icon_type = q.icon_type
        if (q.allow_half !== undefined) question.allow_half = q.allow_half
        if (q.orientation) question.orientation = q.orientation
        if (q.show_labels !== undefined) question.show_labels = q.show_labels
        if (q.left_label) question.left_label = q.left_label
        if (q.right_label) question.right_label = q.right_label
        if (q.randomize_options !== undefined) question.randomize_options = q.randomize_options
        if (q.allow_search !== undefined) question.allow_search = q.allow_search
        if (q.max_selections) question.max_selections = q.max_selections
        if (q.min_selections) question.min_selections = q.min_selections
        if (q.supports_new !== undefined) question.supports_new = q.supports_new

        return question
      }),
      logic_rules: [],
      sharing: {
        is_public: false,
        allow_resubmit: false,
        embed_allowed: false,
        notify_on_submission: false,
        notification_emails: []
      },
      security: {
        captcha_enabled: false,
        password_required: false,
        domain_restrictions: [],
        max_submissions: undefined,
        submission_window_start: undefined,
        submission_window_end: undefined
      },
      theme: {
        primary_color: '#3B82F6',
        secondary_color: '#64748B',
        button_style: 'solid',
        border_radius: '0.375rem',
        background_color: '#ffffff',
        text_color: '#1f2937',
        surface_color: '#f9fafb'
      },
      typography: {
        heading_font_family: 'Inter',
        heading_font_weight: '600',
        body_font_family: 'Inter',
        body_font_weight: '400',
        line_height: 1.5,
        letter_spacing: 0
      },
      header: {
        enabled: false,
        background: { type: 'solid', color: '#3B82F6' },
        title: '',
        subtitle: '',
        call_to_action_text: '',
        call_to_action_url: '',
        alignment: 'center',
        logo_url: '',
        logo_width: 120,
        footer_image_url: ''
      },
      navigation: {
        allow_back: true,
        allow_skip: false,
        show_progress: true,
        progress_type: 'percentage',
        redirect_on_submit: ''
      },
      welcome_screen: {
        enabled: false,
        title: '',
        subtitle: '',
        button_text: 'Start',
        background_url: ''
      },
      completion_screen: {
        enabled: true,
        title: 'Thank you!',
        message: 'Your response has been submitted successfully.',
        button_text: 'Submit another response',
        button_url: '',
        show_summary: false
      },
      metadata: {},
      version: 1
    }

    // Create form using the proper service
    const newForm = await createForm(formDefinition)
    
    if (newForm?.id) {
      // Navigate to form builder
      router.push({ name: 'form-edit', params: { id: newForm.id } })
      convertToFormOpen.value = false
    } else {
      throw new Error('Failed to create form: No ID returned')
    }
  } catch (error) {
    console.error('Error creating form:', error)
    toast.error('Failed to create form. Please try again.')
  } finally {
    isConvertingToForm.value = false
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Load data based on route
  if (route.params.template) {
    // Handle template route
    const template = route.params.template as string
    
    // Special case: "new" template means create new document
    if (template === 'new') {
      const initialData = cloneSpreadsheetWorkbookData(DEFAULT_WORKBOOK_DATA)
      const initialContent = JSON.stringify(initialData)
      const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet', initialContent)

      if (!newDoc || !newDoc.id) {
        console.error('Failed to create document - invalid response:', newDoc)
        data.value = initialData
        document.title = 'New Spreadsheet'
        title.value = document.title
        return
      }

      data.value = initialData
      document.title = 'New Spreadsheet'
      title.value = document.title

      await router.replace(`/sheets/${newDoc.id}`)
      return
    }
    
    // Normal template loading
    const templateResult = await loadTemplate(template)
    if (templateResult) {
      const { name: templateName, data: templateData } = templateResult
      const templateContent = JSON.stringify(templateData)
      const newDoc = await fileStore.createNewDocument('xlsx', templateName, templateContent)

      if (!newDoc || !newDoc.id) {
        console.error('Failed to create document - invalid response:', newDoc)
        data.value = templateData
        title.value = templateName
        return
      }

      data.value = templateData
      document.title = templateName
      title.value = document.title
      
      await nextTick()
      await router.replace(`/sheets/${newDoc.id}`)
    } else {
      // Fallback to default if template not found
      data.value = cloneSpreadsheetWorkbookData(DEFAULT_WORKBOOK_DATA)
      title.value = 'New Spreadsheet'
    }
  } else if (route.params.id) {
    // Handle existing sheet
    const loaded = await loadData(route.params.id as string)
    if (loaded) {
      data.value = loaded
    }
  } else {
    // Create new sheet with initial content so backend saves it properly
    const initialData = cloneSpreadsheetWorkbookData(DEFAULT_WORKBOOK_DATA)
    const initialContent = JSON.stringify(initialData)
    const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet', initialContent)
    
    if (!newDoc || !newDoc.id) {
      console.error('Failed to create document - invalid response:', newDoc)
      // Fallback to default data
      data.value = initialData
      document.title = 'New Spreadsheet'
      title.value = document.title
      return
    }
    
    data.value = initialData
    document.title = 'New Spreadsheet'
    title.value = document.title
    
    await router.replace(`/sheets/${newDoc.id}`)
    
    // Initialize collaboration after redirect
    if (canJoinRealtime.value) {
      initializeWebSocketAndJoinSheet()
    }
  }

  // Set favicon
  nextTick(() => {
    const iconHTML = iconRef.value?.outerHTML
    if (iconHTML) {
      const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML.replace(/currentColor/g, '#38a169'))}`
      useFavicon(iconDataURL)
    }
    
    // Setup keyboard shortcuts for history and clipboard
    const cleanupHistory = history.setupKeyboardShortcuts()
    const cleanupClipboard = clipboard.setupKeyboardShortcuts()
    
    // Store cleanup functions for onUnmounted
    ;(window as any).__sheetKeyboardCleanup = () => {
      cleanupHistory?.()
      cleanupClipboard?.()
    }
  })

  // Load sharing data for existing sheets
  if (route.params.id && !route.params.template) {
    await loadSharingData()
  }
})

onUnmounted(() => {
  leaveSheet()
  // Cleanup auto-save timeouts
  if (saveTimeout) clearTimeout(saveTimeout)
  if (maxWaitTimeout) clearTimeout(maxWaitTimeout)
  // Cleanup keyboard shortcuts
  ;(window as any).__sheetKeyboardCleanup?.()
  delete (window as any).__sheetKeyboardCleanup
  // Cleanup Yjs binding
  if (yjsDestroyFn) {
    yjsDestroyFn()
    yjsDestroyFn = null
  }
})

onBeforeRouteLeave(async (_to, _from, next) => {
  if (canEditSheet.value && vtableRef.value && router.currentRoute.value.params.id) {
    try {
      await saveData(vtableRef.value)
    } catch (error) {
      console.warn('Failed to save before route leave:', error)
    }
  }
  next()
})

// Watch for title changes
watch(title, (newTitle) => {
  document.title = newTitle
})

// Auto-save functionality
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null
const autoSaveIdleDelay = 3000 // 3 seconds idle
const autoSaveMaxWait = 30000 // 30 seconds max

// Schedule auto-save
function scheduleAutoSave() {
  if (!canEditSheet.value || !vtableRef.value || !isVTableReady.value) return

  if (saveTimeout) clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {
    if (vtableRef.value) saveData(vtableRef.value)
  }, autoSaveIdleDelay)

  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(() => {
      if (vtableRef.value) saveData(vtableRef.value)
      maxWaitTimeout = null
    }, autoSaveMaxWait)
  }
}

// VTable change handler — triggers auto-save and chart refresh
const debouncedRefreshCharts = useDebounceFn(() => {
  if (charts.hasCharts()) charts.refreshAllCharts()
}, 500)

function onSheetChange() {
  scheduleAutoSave()
  debouncedRefreshCharts()
  // Broadcast workbook state to collaborators (skip when we're applying a remote change)
  if (!isApplyingRemote.value && collaboration.isJoined.value && vtableRef.value) {
    try {
      broadcastChange(vtableRef.value.saveToConfig())
    } catch (err) {
      console.warn('[collab] Failed to broadcast sheet change:', err)
    }
  }
}

// Handle chart visualization actions from context menu
function onChartAction(key: string) {
  switch (key) {
    case 'chart_bar':       charts.createQuickChartFromSelection('bar');    break
    case 'chart_line':      charts.createQuickChartFromSelection('line');   break
    case 'chart_pie':       charts.createQuickChartFromSelection('pie');    break
    case 'chart_scatter':   charts.createQuickChartFromSelection('scatter'); break
    case 'chart_configure': charts.openChartDialogFromSelection();          break
  }
}

// Expose methods for template (if needed)
// const $t = t
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Top Bar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center gap-3">
        <Button @click="router.back()" variant="ghost" size="sm" class="p-2">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        
        <div class="flex items-center gap-2">
          <div ref="iconRef" class="w-5 h-5 text-green-600">
            <defaultIcons.IconMicrosoftExcel />
          </div>
          <div
            v-if="!isTitleEdit"
            @click="canEditSheet ? editTitle() : undefined"
            class="text-lg font-medium text-gray-900 dark:text-gray-100 px-2 py-1 rounded"
            :class="canEditSheet ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : 'cursor-default'"
            ref="titleRef"
          >
            {{ title }}
          </div>
          <div
            v-else
            contenteditable="true"
            @input="handleTitleUpdate"
            @blur="saveTitle(vtableRef)"
            @keydown.enter.prevent="($event.target as HTMLElement)?.blur()"
            class="text-lg font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
            ref="titleRef"
          >
            {{ editableTitle }}
          </div>
          <span
            v-if="!canEditSheet"
            class="hidden sm:inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300"
          >
            View only
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="openVersionHistory"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          :disabled="!route.params.id"
        >
          {{ lastSavedText }}
        </button>
        
        <div v-if="isSaving" class="text-sm text-blue-600 dark:text-blue-400">
          Saving...
        </div>
        
        <div v-if="changesPending" class="text-sm text-orange-600 dark:text-orange-400">
          Syncing...
        </div>

        <Button v-if="canEditSheet" @click="openShareDialog" variant="outline" size="sm">
          <Share2 class="h-4 w-4 mr-2" />
          Share
        </Button>

        <Button v-if="canEditSheet" @click="toggleChat" variant="outline" size="sm" class="relative">
          <MessageSquareIcon class="h-4 w-4" />
          <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {{ unreadCount }}
          </span>
        </Button>

        <UserProfile :is-mobile="false" />
      </div>
    </div>

    <!-- Unified Menubar — hidden in read-only/view mode -->
    <UnifiedMenubar
      v-if="canEditSheet"
      :file-id="route.params.id as string"
      mode="sheet"
      :collaborators="collaborators"
      @save="() => handleMenuAction('save')"
      @toggle-chat="() => handleMenuAction('toggle-chat')"
      @export="(format) => exportComposable?.handleExport(format)"
      @open-integrations="() => handleMenuAction('open-integrations')"
      @undo="() => handleMenuAction('undo')"
      @redo="() => handleMenuAction('redo')"
      @format-bold="() => handleMenuAction('format-bold')"
      @format-italic="() => handleMenuAction('format-italic')"
      @format-underline="() => handleMenuAction('format-underline')"
      @format-strike="() => handleMenuAction('format-strike')"
      @font-color="() => handleMenuAction('font-color')"
      @fill-color="() => handleMenuAction('fill-color')"
      @align-left="() => handleMenuAction('align-left')"
      @align-center="() => handleMenuAction('align-center')"
      @align-right="() => handleMenuAction('align-right')"
      @valign-top="() => handleMenuAction('valign-top')"
      @valign-middle="() => handleMenuAction('valign-middle')"
      @valign-bottom="() => handleMenuAction('valign-bottom')"
      @border-all="() => handleMenuAction('border-all')"
      @border-none="() => handleMenuAction('border-none')"
      @freeze-top-row="() => handleMenuAction('freeze-top-row')"
      @freeze-first-column="() => handleMenuAction('freeze-first-column')"
      @freeze-panes="() => handleMenuAction('freeze-panes')"
      @unfreeze="() => handleMenuAction('unfreeze')"
      @view-zoom-in="() => handleMenuAction('view-zoom-in')"
      @view-zoom-out="() => handleMenuAction('view-zoom-out')"
      @view-zoom-reset="() => handleMenuAction('view-zoom-reset')"
      @data-sort="() => handleMenuAction('data-sort')"
      @data-filter="() => handleMenuAction('data-filter')"
      @data-group="() => handleMenuAction('data-group')"
      @data-validation="() => handleMenuAction('data-validation')"
      @number-format="() => handleMenuAction('number-format')"
      @advanced-sort="() => handleMenuAction('advanced-sort')"
      @find-replace="() => handleMenuAction('find-replace')"
      @conditional-format="() => handleMenuAction('conditional-format')"
      @convert-to-form="() => handleMenuAction('convert-to-form')"
      @print="() => handleMenuAction('print')"
      @navigate-to-collaborator="(uid: any) => handleMenuAction('navigate-to-collaborator', uid)"
      @import-file="() => handleMenuAction('import-file')"
      @export-all="() => handleMenuAction('export-all')"
      @insert-row-above="() => handleMenuAction('insert-row-above')"
      @insert-row-below="() => handleMenuAction('insert-row-below')"
      @insert-column-left="() => handleMenuAction('insert-column-left')"
      @insert-column-right="() => handleMenuAction('insert-column-right')"
      @delete-row="() => handleMenuAction('delete-row')"
      @delete-column="() => handleMenuAction('delete-column')"
      @merge-cells="() => handleMenuAction('merge-cells')"
      @unmerge-cells="() => handleMenuAction('unmerge-cells')"
      @insert-chart="() => handleMenuAction('insert-chart')"
      @toggle-first-row-header="() => handleMenuAction('toggle-first-row-header')"
      @toggle-wrap-text="() => handleMenuAction('toggle-wrap-text')"
      @open-about="() => handleMenuAction('open-about')"
    />

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">Loading spreadsheet...</p>
        </div>
      </div>

      <!-- Access Denied -->
      <div v-else-if="accessDenied" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center max-w-md">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Access Denied</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            This spreadsheet is private. You need permission to view or edit it.
          </p>
          <Button @click="router.back()" variant="outline">
            Go Back
          </Button>
        </div>
      </div>

      <!-- Large File Download -->
      <div v-else-if="isLarge" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center max-w-md">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Large File</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            This spreadsheet is too large to edit in the browser. Please download it to view.
          </p>
          <Button v-if="downloadUrl" @click="setWindowLocation(downloadUrl)" variant="default">
            Download Spreadsheet
          </Button>
        </div>
      </div>

      <!-- VTable Sheet -->
      <VTableSheet
        v-else-if="vtableInitialConfig"
        ref="vtableRef"
        :initial-config="vtableInitialConfig"
        @ready="onSheetReady"
        @change="onSheetChange"
        @chart-action="onChartAction"
        class="w-full h-full bg-white dark:bg-gray-900"
      />
    </div>

    <!-- Chat Sidebar -->
    <div
      v-if="isChatOpen"
      class="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-20 flex flex-col"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Chat</h3>
        <Button @click="toggleChat" variant="ghost" size="sm">
          <XIcon class="h-4 w-4" />
        </Button>
      </div>

      <div ref="chatMessagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="message in chatMessages"
          :key="message.id"
          class="space-y-2"
        >
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
              {{ (message.user?.name || 'Unknown').charAt(0).toUpperCase() }}
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ message.user?.name || 'Unknown User' }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDate(message.timestamp) }}
            </span>
          </div>
          
          <div v-if="replyingTo?.id === message.replyTo" class="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Replying to {{ getReplyUserName(message.replyTo || '') }}: "{{ getReplyContent(message.replyTo || '') }}"
          </div>
          
          <div class="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
            {{ message.content?.message }}
          </div>
          
          <Button @click="replyToMessage(message)" variant="ghost" size="sm" class="text-xs">
            Reply
          </Button>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <div v-if="replyingTo" class="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          <div class="flex items-center justify-between">
            <span>Replying to {{ replyingTo.user?.name }}</span>
            <Button @click="cancelReply" variant="ghost" size="sm">
              <XIcon class="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <textarea
          ref="chatInput"
          v-model="newChatMessage"
          @keydown="handleChatEnterKey"
          @input="adjustTextareaHeight"
          :style="{ height: textareaHeight }"
          placeholder="Type a message..."
          class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="1"
        />
        
        <Button @click="sendChatMessage" variant="default" size="sm" class="mt-2 w-full">
          Send
        </Button>
      </div>
    </div>

    <!-- Share Dialog -->
    <Dialog v-model:open="shareOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Spreadsheet</DialogTitle>
        </DialogHeader>
        
        <ShareCard
          :file-id="route.params.id as string"
          mode="sheet"
          :share-link="shareLinkSheet"
          :privacy-type="privacyType"
          :members="shareMembersForCard"
          :can-edit-privacy="canEditSheet"
          @close="shareOpen = false"
          @copy-link="copyShareLink"
          @change-privacy="handleChangePrivacy"
          @update-member="handleUpdateMember"
          @remove-member="handleRemoveMember"
          @invite="handleInvite"
        />
      </DialogContent>
    </Dialog>

    <!-- Integrations Dialog -->
    <Dialog v-model:open="integrationsOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Integrations</DialogTitle>
        </DialogHeader>
        
        <IntegrationDialog
          type="sheet"
          :id="Array.isArray(route.params.id) ? route.params.id[0] : route.params.id"
          :api-enabled="sheetPublicApiEnabled"
          :api-key="sheetPublicApiKey"
          :is-updating-api="isUpdatingSheetPublicApi"
          :public-url="shareLinkSheet"
          :endpoint="sheetIntegrationEndpoint"
          :fields="extractedSheetFields"
          @close="integrationsOpen = false"
          @rotate-api-key="handleRotateSheetPublicApiKey"
          @set-api-enabled="handleSetSheetPublicApiEnabled"
        />
      </DialogContent>
    </Dialog>

    <!-- Data Validation Dialog -->
    <Dialog v-model:open="formatting.dataValidationOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Validation</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Validation Type
            </label>
            <select v-model="formatting.validationType" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="list">List</option>
              <option value="whole">Whole Number</option>
              <option value="decimal">Decimal</option>
              <option value="date">Date</option>
              <option value="textLength">Text Length</option>
              <option value="custom">Custom Formula</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operator
            </label>
            <select v-model="formatting.validationOperator" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="between">Between</option>
              <option value="notBetween">Not Between</option>
              <option value="equal">Equal To</option>
              <option value="notEqual">Not Equal To</option>
              <option value="greaterThan">Greater Than</option>
              <option value="lessThan">Less Than</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Value 1
            </label>
            <input v-model="formatting.validationValue1" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div v-if="formatting.validationOperator === 'between' || formatting.validationOperator === 'notBetween'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Value 2
            </label>
            <input v-model="formatting.validationValue2" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div class="flex gap-2">
            <Button @click="formatting.applyDataValidation" variant="default">
              Apply
            </Button>
            <Button @click="formatting.dataValidationOpen = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Find & Replace Dialog -->
    <Dialog v-model:open="dataTools.findReplaceOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find & Replace</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Find
            </label>
            <input v-model="dataTools.findText" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Replace With
            </label>
            <input v-model="dataTools.replaceText" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input v-model="dataTools.matchCase" type="checkbox" class="rounded" />
              <span class="text-sm">Match Case</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input v-model="dataTools.matchWholeWord" type="checkbox" class="rounded" />
              <span class="text-sm">Match Whole Word</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input v-model="dataTools.useRegex" type="checkbox" class="rounded" />
              <span class="text-sm">Use Regular Expression</span>
            </label>
          </div>
          
          <div class="flex gap-2">
            <Button @click="dataTools.executeFind" variant="outline" class="flex-1">
              Find
            </Button>
            <Button @click="dataTools.executeReplace" variant="outline" class="flex-1">
              Replace
            </Button>
            <Button @click="dataTools.executeReplaceAll" variant="default" class="flex-1">
              Replace All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Number Format Dialog -->
    <Dialog v-model:open="formatting.numberFormatOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Number Format</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format Type
            </label>
            <select v-model="formatting.numberFormatType" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="general">General</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="accounting">Accounting</option>
              <option value="percentage">Percentage</option>
              <option value="fraction">Fraction</option>
              <option value="scientific">Scientific</option>
              <option value="text">Text</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div v-if="formatting.numberFormatType.value === 'number' || formatting.numberFormatType.value === 'currency' || formatting.numberFormatType.value === 'percentage'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decimal Places
            </label>
            <input v-model.number="formatting.numberFormatDecimals" type="number" min="0" max="10" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div v-if="formatting.numberFormatType.value === 'currency' || formatting.numberFormatType.value === 'accounting'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency Symbol
            </label>
            <select v-model="formatting.numberFormatSymbol" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="$">$</option>
              <option value="€">€</option>
              <option value="£">£</option>
              <option value="¥">¥</option>
            </select>
          </div>
          
          <div v-if="formatting.numberFormatType.value === 'custom'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Format Code
            </label>
            <input v-model="formatting.numberFormatCustomCode" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div class="flex gap-2">
            <Button @click="formatting.applyNumberFormat" variant="default">
              Apply
            </Button>
            <Button @click="formatting.numberFormatOpen.value = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Advanced Sort Dialog -->
    <Dialog v-model:open="dataTools.advancedSortOpen">
      <DialogContent class="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Advanced Sort</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-2">
              <input v-model="dataTools.sortHasHeaders" type="checkbox" class="rounded" />
              <span class="text-sm">My data has headers</span>
            </label>
          </div>
          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">Sort by</label>
              <Button
                v-if="dataTools.sortColumns.value.length < 5"
                @click="dataTools.addSortColumn"
                variant="outline"
                size="sm"
              >
                Add Column
              </Button>
            </div>
            
            <div class="space-y-2">
              <div
                v-for="(col, index) in dataTools.sortColumns.value"
                :key="index"
                class="flex gap-2 items-center"
              >
                <select v-model="col.column" class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="">Select Column</option>
                  <option v-for="i in 26" :key="i" :value="String.fromCharCode(64 + i)">
                    {{ String.fromCharCode(64 + i) }}
                  </option>
                </select>
                
                <select v-model="col.order" class="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="asc">A to Z</option>
                  <option value="desc">Z to A</option>
                </select>
                
                <Button
                  v-if="dataTools.sortColumns.value.length > 1"
                  @click="dataTools.removeSortColumn(index)"
                  variant="outline"
                  size="sm"
                >
                  <XIcon class="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div class="flex gap-2 pt-2">
            <Button @click="dataTools.advancedSortOpen.value = false" variant="outline">
              Cancel
            </Button>
            <Button @click="dataTools.executeAdvancedSort" variant="default">
              Sort
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Font Color Dialog -->
    <Dialog v-model:open="fontColorOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Font Color</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="color in commonColors"
              :key="color"
              @click="selectedFontColor = color"
              class="w-8 h-8 rounded-full border-2 transition-all"
              :class="selectedFontColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'"
              :style="{ backgroundColor: color }"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Color
            </label>
            <div class="flex gap-2">
              <input
                v-model="selectedFontColor"
                type="color"
                class="h-10 w-16 rounded cursor-pointer"
              />
              <input
                v-model="selectedFontColor"
                type="text"
                class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="#000000"
              />
            </div>
          </div>
          <div class="flex gap-2">
            <Button @click="formatting.handleFontColor(selectedFontColor); fontColorOpen = false" variant="default">
              Apply
            </Button>
            <Button @click="fontColorOpen = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Fill Color Dialog -->
    <Dialog v-model:open="fillColorOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fill Color</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="color in commonColors"
              :key="color"
              @click="selectedFillColor = color"
              class="w-8 h-8 rounded-full border-2 transition-all"
              :class="selectedFillColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'"
              :style="{ backgroundColor: color }"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Color
            </label>
            <div class="flex gap-2">
              <input
                v-model="selectedFillColor"
                type="color"
                class="h-10 w-16 rounded cursor-pointer"
              />
              <input
                v-model="selectedFillColor"
                type="text"
                class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div class="flex gap-2">
            <Button @click="formatting.handleFillColor(selectedFillColor); fillColorOpen = false" variant="default">
              Apply
            </Button>
            <Button @click="fillColorOpen = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Conditional Formatting Dialog -->
    <Dialog v-model:open="formatting.conditionalFormatOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conditional Formatting</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format Type
            </label>
            <select v-model="formatting.conditionalFormatType" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="colorScale">Color Scale</option>
              <option value="dataBar">Data Bar</option>
              <option value="iconSet">Icon Set</option>
              <option value="formula">Formula</option>
            </select>
          </div>
          
          <!-- Color Scale Options -->
          <div v-if="formatting.conditionalFormatType.value === 'colorScale'" class="space-y-3">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Color</label>
                <input v-model="formatting.conditionalFormatRule.colorScale.minColor" type="color" class="w-full h-10 rounded" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mid Color</label>
                <input v-model="formatting.conditionalFormatRule.colorScale.midColor" type="color" class="w-full h-10 rounded" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Color</label>
                <input v-model="formatting.conditionalFormatRule.colorScale.maxColor" type="color" class="w-full h-10 rounded" />
              </div>
            </div>
          </div>
          
          <!-- Data Bar Options -->
          <div v-if="formatting.conditionalFormatType.value === 'dataBar'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bar Color</label>
              <input v-model="formatting.conditionalFormatRule.dataBar.color" type="color" class="w-full h-10 rounded" />
            </div>
            <label class="flex items-center gap-2">
              <input v-model="formatting.conditionalFormatRule.dataBar.showBarOnly" type="checkbox" class="rounded" />
              <span class="text-sm">Show Bar Only</span>
            </label>
          </div>
          
          <!-- Icon Set Options -->
          <div v-if="formatting.conditionalFormatType.value === 'iconSet'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon Style</label>
              <select v-model="formatting.conditionalFormatRule.iconSet.style" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <option value="3TrafficLights1">3 Traffic Lights</option>
                <option value="3Arrows">3 Arrows</option>
                <option value="3Symbols">3 Symbols</option>
                <option value="4Arrows">4 Arrows</option>
                <option value="5Arrows">5 Arrows</option>
              </select>
            </div>
            <label class="flex items-center gap-2">
              <input v-model="formatting.conditionalFormatRule.iconSet.reverse" type="checkbox" class="rounded" />
              <span class="text-sm">Reverse Icon Order</span>
            </label>
          </div>
          
          <!-- Formula Options -->
          <div v-if="formatting.conditionalFormatType.value === 'formula'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formula</label>
              <input v-model="formatting.conditionalFormatRule.formula.formula" type="text" placeholder="e.g., =A1>100" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
              <input v-model="formatting.conditionalFormatRule.formula.format" type="color" class="w-full h-10 rounded" />
            </div>
          </div>
          
          <div class="flex gap-2">
            <Button @click="formatting.applyConditionalFormat" variant="default">
              Apply
            </Button>
            <Button @click="formatting.clearConditionalFormats" variant="outline">
              Clear
            </Button>
            <Button @click="formatting.conditionalFormatOpen.value = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Convert to Form Dialog -->
    <Dialog v-model:open="convertToFormOpen">
      <DialogContent class="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to Form</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-6">
          <!-- Summary -->
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Form Preview</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              We've analyzed your spreadsheet and generated {{ generatedFormQuestions.length }} form fields.
              Review the detected field types and create your form.
            </p>
          </div>

          <!-- Questions List -->
          <div class="space-y-4">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Detected Fields</h4>
            
            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="(question, index) in generatedFormQuestions"
                :key="question.id"
                class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {{ index + 1 }}. {{ question.question }}
                      </span>
                      <span
                        v-if="question.required"
                        class="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded"
                      >
                        Required
                      </span>
                    </div>
                    
                    <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span class="capitalize">{{ question.type.replace('_', ' ') }}</span>
                      <span v-if="question.confidence" class="text-xs">
                        Confidence: {{ Math.round(question.confidence * 100) }}%
                      </span>
                      <span v-if="question.columnName" class="text-xs text-gray-500">
                        Column: {{ question.columnName }}
                      </span>
                    </div>

                    <!-- Show sample data if available -->
                    <div v-if="question.sampleData && question.sampleData.length > 0" class="mt-2">
                      <span class="text-xs text-gray-500">Sample data:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <span
                          v-for="sample in question.sampleData.slice(0, 3)"
                          :key="sample"
                          class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                        >
                          {{ sample }}
                        </span>
                        <span
                          v-if="question.sampleData.length > 3"
                          class="text-xs text-gray-500"
                        >
                          +{{ question.sampleData.length - 3 }} more
                        </span>
                      </div>
                    </div>

                    <!-- Show options for select/radio fields -->
                    <div v-if="question.options && question.options.length > 0" class="mt-2">
                      <span class="text-xs text-gray-500">Options:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <span
                          v-for="option in question.options.slice(0, 5)"
                          :key="option.value"
                          class="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded"
                        >
                          {{ option.label }}
                        </span>
                        <span
                          v-if="question.options.length > 5"
                          class="text-xs text-gray-500"
                        >
                          +{{ question.options.length - 5 }} more
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              @click="createFormFromQuestions"
              :disabled="isConvertingToForm || generatedFormQuestions.length === 0"
              variant="default"
              class="flex-1"
            >
              <FileTextIcon class="h-4 w-4 mr-2" />
              {{ isConvertingToForm ? 'Creating Form...' : 'Create Form' }}
            </Button>
            <Button
              @click="convertToFormOpen = false"
              variant="outline"
              class="flex-1"
              :disabled="isConvertingToForm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <SheetVersionHistory
      :open="showVersionHistoryDialog"
      :loading="isLoadingVersions"
      :versions="versionHistory"
      :current-version="currentVersionSummary"
      :selected-number="selectedVersionNumber"
      :loading-detail="isLoadingVersionDetail"
      :detail="selectedVersionDetail"
      :detail-error="selectedVersionError"
      :current-summary="currentWorkbookSummary"
      :selected-summary="selectedWorkbookSummary"
      :comparison="workbookComparison"
      @close="showVersionHistoryDialog = false"
      @select="selectVersion"
    />

    <!-- Chart Dialog -->
    <ChartDialog
      v-model:is-open="charts.isChartDialogOpen"
      :editing-chart="charts.editingChart"
      :sheet-data="charts.getSheetData()"
      :initial-range="charts.pendingRange"
      @save="charts.handleChartSave"
    />

    <!-- Data Validation Dialog -->
    <DataValidationDialog
      v-model:is-open="formatting.dataValidationOpen"
      @apply="formatting.applyDataValidation"
    />

    <!-- Conditional Format Dialog -->
    <ConditionalFormatDialog
      v-model:is-open="formatting.conditionalFormatOpen"
      @apply="formatting.applyConditionalFormat"
    />

    <!-- Number Format Dialog -->
    <NumberFormatDialog
      v-model:is-open="formatting.numberFormatOpen"
      @apply="formatting.applyNumberFormat"
    />

    <!-- Chart Renderers -->
    <div class="charts-layer absolute inset-0 pointer-events-none">
      <ChartRenderer
        v-for="chart in charts.chartList"
        :key="chart.id"
        :config="chart"
        :is-selected="charts.selectedChartId === chart.id"
        @edit="charts.openChartDialog"
        @delete="charts.deleteChart"
        @resize="charts.resizeChart"
        @move="charts.moveChart"
        @select="charts.selectChart"
        @register-canvas="charts.registerCanvas"
        @unregister-canvas="charts.unregisterCanvas"
        class="pointer-events-auto"
      />
    </div>
  </div>
</template>

<style scoped>
/* Custom styles for the sheet editor */
.slide-preview-content {
  transform-origin: top left;
}
</style>

<style>
html.dark .vtable-sheet-container,
body.dark .vtable-sheet-container,
.dark .vtable-sheet-container {
  --bg-default: #0f172a;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --bg-hover: #1e293b;
  --border-color: #334155;
  --text-primary: #e5e7eb;
  --text-secondary: #cbd5e1;
  --gray-text: #94a3b8;
  --light-gray: #111827;
}

html.dark .vtable-sheet-top-container,
html.dark .vtable-sheet-main-menu,
html.dark .vtable-sheet-undo-redo,
html.dark .vtable-sheet-formula-bar,
html.dark .vtable-sheet-tab-bar,
html.dark .vtable-sheet-nav-buttons,
html.dark .vtable-sheet-menu-list,
html.dark .vtable-sheet-add-button,
html.dark .vtable-sheet-menu-button,
html.dark .vtable-sheet-scroll-button,
body.dark .vtable-sheet-top-container,
body.dark .vtable-sheet-main-menu,
body.dark .vtable-sheet-undo-redo,
body.dark .vtable-sheet-formula-bar,
body.dark .vtable-sheet-tab-bar,
body.dark .vtable-sheet-nav-buttons,
body.dark .vtable-sheet-menu-list,
body.dark .vtable-sheet-add-button,
body.dark .vtable-sheet-menu-button,
body.dark .vtable-sheet-scroll-button,
.dark .vtable-sheet-top-container,
.dark .vtable-sheet-main-menu,
.dark .vtable-sheet-undo-redo,
.dark .vtable-sheet-formula-bar,
.dark .vtable-sheet-tab-bar,
.dark .vtable-sheet-nav-buttons,
.dark .vtable-sheet-menu-list,
.dark .vtable-sheet-add-button,
.dark .vtable-sheet-menu-button,
.dark .vtable-sheet-scroll-button {
  background: #111827 !important;
  color: #e5e7eb !important;
  border-color: #334155 !important;
}

html.dark .vtable-sheet-cell-address,
html.dark .vtable-sheet-formula-input,
html.dark .vtable-sheet-formula-button,
html.dark .vtable-sheet-main-menu-action,
html.dark .vtable-sheet-main-menu-button,
html.dark .vtable-sheet-main-menu-item,
html.dark .vtable-sheet-submenu-item,
html.dark .vtable-sheet-tab,
html.dark .vtable-sheet-tab[contenteditable='true'],
html.dark .vtable-sheet-menu-item,
html.dark .vtable-sheet-menu-item-title,
html.dark .vtable-sheet-formula-icon,
html.dark .vtable-sheet-submenu-container,
html.dark .vtable-sheet-main-menu-container,
html.dark .vtable-formula-autocomplete,
html.dark .vtable-formula-autocomplete-item,
html.dark .vtable-formula-autocomplete-empty,
html.dark .vtable-formula-autocomplete-group,
html.dark .vtable-formula-autocomplete-footer,
html.dark .vtable-formula-autocomplete-footer .key,
body.dark .vtable-sheet-cell-address,
body.dark .vtable-sheet-formula-input,
body.dark .vtable-sheet-formula-button,
body.dark .vtable-sheet-main-menu-action,
body.dark .vtable-sheet-main-menu-button,
body.dark .vtable-sheet-main-menu-item,
body.dark .vtable-sheet-submenu-item,
body.dark .vtable-sheet-tab,
body.dark .vtable-sheet-tab[contenteditable='true'],
body.dark .vtable-sheet-menu-item,
body.dark .vtable-sheet-menu-item-title,
body.dark .vtable-sheet-formula-icon,
body.dark .vtable-sheet-submenu-container,
body.dark .vtable-sheet-main-menu-container,
body.dark .vtable-formula-autocomplete,
body.dark .vtable-formula-autocomplete-item,
body.dark .vtable-formula-autocomplete-empty,
body.dark .vtable-formula-autocomplete-group,
body.dark .vtable-formula-autocomplete-footer,
body.dark .vtable-formula-autocomplete-footer .key,
.dark .vtable-sheet-cell-address,
.dark .vtable-sheet-formula-input,
.dark .vtable-sheet-formula-button,
.dark .vtable-sheet-main-menu-action,
.dark .vtable-sheet-main-menu-button,
.dark .vtable-sheet-main-menu-item,
.dark .vtable-sheet-submenu-item,
.dark .vtable-sheet-tab,
.dark .vtable-sheet-tab[contenteditable='true'],
.dark .vtable-sheet-menu-item,
.dark .vtable-sheet-menu-item-title,
.dark .vtable-sheet-formula-icon,
.dark .vtable-sheet-submenu-container,
.dark .vtable-sheet-main-menu-container,
.dark .vtable-formula-autocomplete,
.dark .vtable-formula-autocomplete-item,
.dark .vtable-formula-autocomplete-empty,
.dark .vtable-formula-autocomplete-group,
.dark .vtable-formula-autocomplete-footer,
.dark .vtable-formula-autocomplete-footer .key {
  background: #0f172a !important;
  color: #e5e7eb !important;
  border-color: #334155 !important;
}

html.dark .vtable-sheet-main-menu-item:hover,
html.dark .vtable-sheet-submenu-item:hover,
html.dark .vtable-sheet-menu-item:hover,
html.dark .vtable-sheet-tab:hover,
html.dark .vtable-sheet-main-menu-action:hover:not(:disabled),
html.dark .vtable-formula-autocomplete-item:hover,
body.dark .vtable-sheet-main-menu-item:hover,
body.dark .vtable-sheet-submenu-item:hover,
body.dark .vtable-sheet-menu-item:hover,
body.dark .vtable-sheet-tab:hover,
body.dark .vtable-sheet-main-menu-action:hover:not(:disabled),
body.dark .vtable-formula-autocomplete-item:hover,
.dark .vtable-sheet-main-menu-item:hover,
.dark .vtable-sheet-submenu-item:hover,
.dark .vtable-sheet-menu-item:hover,
.dark .vtable-sheet-tab:hover,
.dark .vtable-sheet-main-menu-action:hover:not(:disabled),
.dark .vtable-formula-autocomplete-item:hover {
  background: #1e293b !important;
}

html.dark .vtable-sheet-tab.active,
body.dark .vtable-sheet-tab.active,
.dark .vtable-sheet-tab.active {
  background: #172554 !important;
  color: #93c5fd !important;
  border-top-color: #3b82f6 !important;
}

html.dark .vtable-sheet-formula-input::placeholder,
body.dark .vtable-sheet-formula-input::placeholder,
.dark .vtable-sheet-formula-input::placeholder {
  color: #94a3b8 !important;
}
</style>
