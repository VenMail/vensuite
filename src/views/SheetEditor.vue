<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import type { Ref } from 'vue'
import type { IWorkbookData } from '@univerjs/core'
import { FUniver } from '@univerjs/core/facade'
import { debounce } from '@univerjs/core'

import '@/assets/index.css'
import { MessageSquareIcon, XIcon, ArrowLeft, Share2, FileTextIcon } from 'lucide-vue-next'

import UnifiedMenubar from '@/components/menu/UnifiedMenubar.vue'
import UniverSheet from '@/components/UniverSheet.vue'
import UserProfile from '@/components/layout/UserProfile.vue'
import Button from '@/components/ui/button/Button.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import IntegrationDialog from '@/components/forms/IntegrationDialog.vue'
import ShareCard from '@/components/ShareCard.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import { useFavicon } from '@vueuse/core'

import {
  DEFAULT_WORKBOOK_DATA,
} from '@/assets/default-workbook-data'
import { spreadsheetTemplateMap } from '@/constants/sheetTemplates'

import { extractSheetFields } from '@/utils/fieldExtractor'
import { convertSheetToForm } from '@/utils/sheetToFormConverter'
import { createForm } from '@/services/forms'
import type { FormDefinition } from '@/types'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import type { ShareMember, ShareLevel } from '@/utils/sharing'
// import { t } from '@/i18n'

// Import composables
import { useSheetData } from '@/composables/useSheetData'
import { useSheetFormatting } from '@/composables/useSheetFormatting'
import { useSheetDataTools } from '@/composables/useSheetDataTools'
import { useSheetCollaboration } from '@/composables/useSheetCollaboration'
import { useSheetExport } from '@/composables/useSheetExport'

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

// Debounced title save (from old implementation)
// Pass exitEditMode=false so user isn't kicked out of edit mode mid-typing
const debouncedHandleTitleChange = debounce(() => {
  if (univerRef.value && isUniverReady.value) {
    saveTitle(univerRef.value, false)
  }
}, 300)

// Univer refs
const univerRef: Ref<InstanceType<typeof UniverSheet> | null> = ref(null)
const univerCoreRef = ref<FUniver | null>(null)

// Initialize composables that need univerRef
const formatting = useSheetFormatting(univerRef)
const dataTools = useSheetDataTools(univerRef)
const exportComposable = useSheetExport(univerCoreRef)

// Collaboration
const collaboration = useSheetCollaboration(univerCoreRef)
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
  privacyType: collaborationPrivacyType,
  canJoinRealtime,
  broadcastTitle,
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

// Update collaboration privacy type when it changes
watch(() => sheetData.privacyType.value, (newPrivacyType) => {
  collaborationPrivacyType.value = newPrivacyType
})

// Route and router
const route = useRoute()
const router = useRouter()

// Check if this is a template route (for potential future use)
// const isTemplateRoute = computed(() => !!(route.params.template as string))
// const templateSlug = computed(() => route.params.template as string)

// Refs for UI elements
const iconRef = ref<HTMLElement | null>(null)

// UI state
const shareOpen = ref(false)
const integrationsOpen = ref(false)
const convertToFormOpen = ref(false)
const sheetPublicApiKey = ref<string>('')
const sheetPublicApiEnabled = ref<boolean>(false)
const isUpdatingSheetPublicApi = ref(false)
const generatedFormQuestions = ref<any[]>([])
const isConvertingToForm = ref(false)

// Sharing state
const shareMembers = ref<ShareMember[]>([])
const isUpdatingSharing = ref(false)

// Initialize stores (fileStore used by composables)

// Computed properties
const extractedSheetFields = computed(() => {
  if (!data.value) return []
  return extractSheetFields(data.value as IWorkbookData)
})

const shareLinkSheet = computed(() => {
  const id = route.params.id as string
  if (!id) return ''
  const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || getWindowOrigin()
  return `${SHARE_BASE_URL}/share/sheet/${id}`
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

// Univer ready state
const isUniverReady = ref(false)

// Univer event handlers
function onUniverReady(event: { univer: any, workbook: any, univerAPI: any }) {
  univerCoreRef.value = event.univerAPI
  isUniverReady.value = true
  
  // Initialize collaboration if ready
  if (canJoinRealtime.value) {
    initializeWebSocketAndJoinSheet()
  }
  
  // Don't set data here - it's already set during initialization
  // This prevents the duplicate unit ID error
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
function handleMenuAction(action: string) {
  switch (action) {
    case 'save':
      saveData(univerRef.value)
      break
    case 'export':
      // Handle export
      break
    case 'toggle-chat':
      toggleChat()
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
      // Navigate to collaborator's cursor/selection
      // This would need collaborator ID and position data
      break
  }
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
  try {
    // Update local state immediately for responsive UI
    privacyType.value = newPrivacyType
    
    // Load current document and update privacy
    const currentDoc = await fileStore.loadDocument(id, 'xlsx')
    if (currentDoc) {
      const updatedDoc = { ...currentDoc, privacy_type: newPrivacyType }
      await fileStore.saveToAPI(updatedDoc)
    }
    
    toast.success('Privacy settings updated')
  } catch (error) {
    console.error('Failed to update privacy:', error)
    toast.error('Failed to update privacy settings')
    // Revert on error
    privacyType.value = sheetData.privacyType.value
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleUpdateMember(payload: { email: string; shareLevel: ShareLevel; label: string }) {
  if (isUpdatingSharing.value) return
  
  const id = route.params.id as string
  if (!id) return
  
  isUpdatingSharing.value = true
  try {
    // Update local members list
    const memberIndex = shareMembers.value.findIndex(m => m.email === payload.email)
    if (memberIndex !== -1) {
      shareMembers.value[memberIndex].shareLevel = payload.shareLevel
    }
    
    // Load current document and update sharing
    const currentDoc = await fileStore.loadDocument(id, 'xlsx')
    if (currentDoc) {
      const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
      const updatedDoc = { ...currentDoc, sharing: updatedSharing }
      await fileStore.saveToAPI(updatedDoc)
    }
    
    toast.success(`Updated ${payload.email}'s access`)
  } catch (error) {
    console.error('Failed to update member:', error)
    toast.error('Failed to update member access')
    // Revert on error by reloading
    await loadSharingData()
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleRemoveMember(payload: { email: string }) {
  if (isUpdatingSharing.value) return
  
  const id = route.params.id as string
  if (!id) return
  
  isUpdatingSharing.value = true
  try {
    // Update local members list
    shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
    
    // Load current document and update sharing
    const currentDoc = await fileStore.loadDocument(id, 'xlsx')
    if (currentDoc) {
      const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
      const updatedDoc = { ...currentDoc, sharing: updatedSharing }
      await fileStore.saveToAPI(updatedDoc)
    }
    
    toast.success(`Removed ${payload.email}`)
  } catch (error) {
    console.error('Failed to remove member:', error)
    toast.error('Failed to remove member')
    // Revert on error by reloading
    await loadSharingData()
  } finally {
    isUpdatingSharing.value = false
  }
}

async function handleInvite(payload: { email: string; shareLevel: ShareLevel; label: string; note?: string }) {
  if (isUpdatingSharing.value) return
  
  const id = route.params.id as string
  if (!id) return
  
  isUpdatingSharing.value = true
  try {
    // Check if member already exists
    if (shareMembers.value.some(m => m.email === payload.email)) {
      toast.error('This person already has access')
      return
    }
    
    // Add to local members list
    const newMember: ShareMember = {
      email: payload.email,
      shareLevel: payload.shareLevel,
      status: 'pending'
    }
    shareMembers.value.push(newMember)
    
    // Load current document and update sharing
    const currentDoc = await fileStore.loadDocument(id, 'xlsx')
    if (currentDoc) {
      const updatedSharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
      const updatedDoc = { ...currentDoc, sharing: updatedSharing }
      await fileStore.saveToAPI(updatedDoc)
    }
    
    toast.success(`Invited ${payload.email}`)
  } catch (error) {
    console.error('Failed to invite member:', error)
    toast.error('Failed to send invitation')
    // Revert on error by reloading
    await loadSharingData()
  } finally {
    isUpdatingSharing.value = false
  }
}

async function loadSharingData() {
  const id = route.params.id as string
  if (!id) return
  
  try {
    const document = await fileStore.loadDocument(id, 'xlsx')
    if (document && (document as any).sharing) {
      // Parse sharing string into members
      const sharingString = (document as any).sharing
      if (sharingString) {
        shareMembers.value = sharingString
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
    // API call would go here
    sheetPublicApiEnabled.value = enabled
  } catch (error) {
    console.error('Failed to update public API status:', error)
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
    // API call would go here to generate new key
    sheetPublicApiKey.value = 'new-api-key-' + Date.now()
  } catch (error) {
    console.error('Failed to rotate API key:', error)
  } finally {
    isUpdatingSheetPublicApi.value = false
  }
}

// Template loading function
async function loadTemplate(templateSlug: string): Promise<IWorkbookData | null> {
  try {
    const template = spreadsheetTemplateMap[templateSlug as keyof typeof spreadsheetTemplateMap]
    if (template) {
      // Return a deep copy of the template data to prevent mutations
      return JSON.parse(JSON.stringify(template.workbookData))
    }
    return null
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
    const questions = convertSheetToForm(data.value as IWorkbookData, {
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
      router.push(`/forms/${newForm.id}/edit-new`)
      convertToFormOpen.value = false
    } else {
      throw new Error('Failed to create form: No ID returned')
    }
  } catch (error) {
    console.error('Error creating form:', error)
    // TODO: Show user-friendly error message
    alert('Failed to create form. Please try again.')
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
      const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet')
      
      if (!newDoc || !newDoc.id) {
        console.error('Failed to create document - invalid response:', newDoc)
        data.value = DEFAULT_WORKBOOK_DATA
        document.title = 'New Spreadsheet'
        title.value = document.title
        return
      }
      
      const newDocData = {
        ...DEFAULT_WORKBOOK_DATA,
        id: newDoc.id,
        name: 'New Spreadsheet',
      }
      
      data.value = newDocData
      document.title = 'New Spreadsheet'
      title.value = document.title
      
      await router.replace(`/sheets/${newDoc.id}`)
      return
    }
    
    // Normal template loading
    const templateData = await loadTemplate(template)
    if (templateData) {
      const templateContent = JSON.stringify(templateData)
      const newDoc = await fileStore.createNewDocument('xlsx', templateData.name || 'New Spreadsheet', templateContent)
      
      if (!newDoc || !newDoc.id) {
        console.error('Failed to create document - invalid response:', newDoc)
        data.value = templateData
        title.value = templateData.name || title.value
        return
      }
      
      // Use template data but with real document ID
      const newDocData = {
        ...templateData,
        id: newDoc.id,
        name: templateData.name || 'New Spreadsheet',
      }
      
      data.value = newDocData
      document.title = templateData.name || 'New Spreadsheet'
      title.value = document.title
      
      // Wait for next tick to ensure route is updated before navigation
      await nextTick()
      await router.replace(`/sheets/${newDoc.id}`)
    } else {
      // Fallback to default if template not found
      data.value = DEFAULT_WORKBOOK_DATA
      title.value = 'New Spreadsheet'
    }
  } else if (route.params.id) {
    // Handle existing sheet
    const loaded = await loadData(route.params.id as string)
    if (loaded) {
      data.value = loaded
      title.value = loaded.name || title.value
    }
  } else {
    // Create new sheet (match old implementation exactly)
    const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet')
    
    if (!newDoc || !newDoc.id) {
      console.error('Failed to create document - invalid response:', newDoc)
      // Fallback to default data
      data.value = DEFAULT_WORKBOOK_DATA
      document.title = 'New Spreadsheet'
      title.value = document.title
      return
    }
    
    const newDocData = {
      ...DEFAULT_WORKBOOK_DATA,
      id: newDoc.id,
      name: 'New Spreadsheet',
    }
    
    data.value = newDocData
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
})

onBeforeRouteLeave(async (_to, _from, next) => {
  // Check if there are unsaved changes before leaving
  if (canEditSheet.value && univerRef.value && router.currentRoute.value.params.id) {
    try {
      // Save data before leaving - wait for completion
      await saveData(univerRef.value)
    } catch (error) {
      console.warn('Failed to save before route leave:', error)
      // Continue anyway - don't block navigation
    }
  }
  next()
})

// Watch for title changes
watch(title, (newTitle) => {
  document.title = newTitle
})

// Watch for data changes to save to Univer
watch(data, (newData) => {
  if (newData && univerRef.value) {
    try {
      univerRef.value.setData(newData as unknown as IWorkbookData)
    } catch (error) {
      console.error('Failed to set data in Univer:', error)
    }
  }
})

// Auto-save functionality
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null
const autoSaveIdleDelay = 3000 // 3 seconds idle
const autoSaveMaxWait = 30000 // 30 seconds max

// Schedule auto-save
function scheduleAutoSave() {
  if (!canEditSheet.value || !univerRef.value || !isUniverReady.value) {
    return
  }
  
  // Clear existing timeouts
  if (saveTimeout) clearTimeout(saveTimeout)
  
  // Schedule save after idle delay
  saveTimeout = setTimeout(() => {
    if (univerRef.value) {
      saveData(univerRef.value)
    }
  }, autoSaveIdleDelay)
  
  // Ensure we save within max wait regardless of activity
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(() => {
      if (univerRef.value) {
        saveData(univerRef.value)
      }
      maxWaitTimeout = null
    }, autoSaveMaxWait)
  }
}

// Watch for Univer changes to trigger auto-save
function onUniverChange() {
  scheduleAutoSave()
  // Broadcast changes to collaborators
  if (wsService.value && route.params.id) {
    // This would broadcast the change via WebSocket
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
            @click="editTitle"
            class="text-lg font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
            ref="titleRef"
          >
            {{ title }}
          </div>
          <div
            v-else
            contenteditable="true"
            @input="handleTitleUpdate"
            @blur="saveTitle(univerRef)"
            @keydown.enter.prevent="($event.target as HTMLElement)?.blur()"
            class="text-lg font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
            ref="titleRef"
          >
            {{ editableTitle }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ lastSavedText }}
        </div>
        
        <div v-if="isSaving" class="text-sm text-blue-600 dark:text-blue-400">
          Saving...
        </div>
        
        <div v-if="changesPending" class="text-sm text-orange-600 dark:text-orange-400">
          Syncing...
        </div>

        <Button @click="openShareDialog" variant="outline" size="sm">
          <Share2 class="h-4 w-4 mr-2" />
          Share
        </Button>

        <Button @click="toggleChat" variant="outline" size="sm" class="relative">
          <MessageSquareIcon class="h-4 w-4" />
          <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {{ unreadCount }}
          </span>
        </Button>

        <UserProfile :is-mobile="false" />
      </div>
    </div>

    <!-- Unified Menubar -->
    <UnifiedMenubar
      :file-id="route.params.id as string"
      mode="sheet"
      :collaborators="collaborators"
      @save="() => handleMenuAction('save')"
      @toggle-chat="() => handleMenuAction('toggle-chat')"
      @export="(format) => exportComposable?.handleExport(format)"
      @open-dialog="() => {}"
      @open-integrations="() => handleMenuAction('open-integrations')"
      @undo="() => {}"
      @redo="() => {}"
      @format-bold="() => handleMenuAction('format-bold')"
      @format-italic="() => handleMenuAction('format-italic')"
      @format-underline="() => handleMenuAction('format-underline')"
      @format-strike="() => handleMenuAction('format-strike')"
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
      @navigate-to-collaborator="() => handleMenuAction('navigate-to-collaborator')"
    />

    <!-- Main Content -->
    <div class="flex-1 relative overflow-hidden">
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

      <!-- Univer Sheet -->
      <UniverSheet
        v-else
        ref="univerRef"
        :data="data as IWorkbookData"
        @ready="onUniverReady"
        @change="onUniverChange"
        class="w-full h-full"
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
          :public-url="`${getWindowOrigin()}/s/${Array.isArray(route.params.id) ? route.params.id[0] : route.params.id as string}`"
          endpoint="/api/v1/sheets"
          :fields="extractedSheetFields"
          @close="integrationsOpen = false"
          @rotate-api-key="handleRotateSheetPublicApiKey"
          @set-api-enabled="handleSetSheetPublicApiEnabled"
        />
      </DialogContent>
    </Dialog>

    <!-- Data Validation Dialog -->
    <Dialog v-model:open="formatting.dataValidationOpen.value">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Validation</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Validation Type
            </label>
            <select v-model="formatting.validationType.value" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
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
            <select v-model="formatting.validationOperator.value" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
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
            <input v-model="formatting.validationValue1.value" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div v-if="formatting.validationOperator.value === 'between' || formatting.validationOperator.value === 'notBetween'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Value 2
            </label>
            <input v-model="formatting.validationValue2.value" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div class="flex gap-2">
            <Button @click="formatting.applyDataValidation" variant="default">
              Apply
            </Button>
            <Button @click="formatting.dataValidationOpen.value = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Find & Replace Dialog -->
    <Dialog v-model:open="dataTools.findReplaceOpen.value">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find & Replace</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Find
            </label>
            <input v-model="dataTools.findText.value" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Replace With
            </label>
            <input v-model="dataTools.replaceText.value" type="text" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
          
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input v-model="dataTools.matchCase.value" type="checkbox" class="rounded" />
              <span class="text-sm">Match Case</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input v-model="dataTools.matchWholeWord.value" type="checkbox" class="rounded" />
              <span class="text-sm">Match Whole Word</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input v-model="dataTools.useRegex.value" type="checkbox" class="rounded" />
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
    <Dialog v-model:open="formatting.numberFormatOpen.value">
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
    <Dialog v-model:open="dataTools.advancedSortOpen.value">
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

    <!-- Conditional Formatting Dialog -->
    <Dialog v-model:open="formatting.conditionalFormatOpen.value">
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
                <input v-model="formatting.conditionalFormatRule.value.colorScale.minColor" type="color" class="w-full h-10 rounded" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mid Color</label>
                <input v-model="formatting.conditionalFormatRule.value.colorScale.midColor" type="color" class="w-full h-10 rounded" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Color</label>
                <input v-model="formatting.conditionalFormatRule.value.colorScale.maxColor" type="color" class="w-full h-10 rounded" />
              </div>
            </div>
          </div>
          
          <!-- Data Bar Options -->
          <div v-if="formatting.conditionalFormatType.value === 'dataBar'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bar Color</label>
              <input v-model="formatting.conditionalFormatRule.value.dataBar.color" type="color" class="w-full h-10 rounded" />
            </div>
            <label class="flex items-center gap-2">
              <input v-model="formatting.conditionalFormatRule.value.dataBar.showBarOnly" type="checkbox" class="rounded" />
              <span class="text-sm">Show Bar Only</span>
            </label>
          </div>
          
          <!-- Icon Set Options -->
          <div v-if="formatting.conditionalFormatType.value === 'iconSet'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon Style</label>
              <select v-model="formatting.conditionalFormatRule.value.iconSet.style" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <option value="3TrafficLights1">3 Traffic Lights</option>
                <option value="3Arrows">3 Arrows</option>
                <option value="3Symbols">3 Symbols</option>
                <option value="4Arrows">4 Arrows</option>
                <option value="5Arrows">5 Arrows</option>
              </select>
            </div>
            <label class="flex items-center gap-2">
              <input v-model="formatting.conditionalFormatRule.value.iconSet.reverse" type="checkbox" class="rounded" />
              <span class="text-sm">Reverse Icon Order</span>
            </label>
          </div>
          
          <!-- Formula Options -->
          <div v-if="formatting.conditionalFormatType.value === 'formula'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formula</label>
              <input v-model="formatting.conditionalFormatRule.value.formula.formula" type="text" placeholder="e.g., =A1>100" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
              <input v-model="formatting.conditionalFormatRule.value.formula.format" type="color" class="w-full h-10 rounded" />
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
  </div>
</template>

<style scoped>
/* Custom styles for the sheet editor */
.slide-preview-content {
  transform-origin: top left;
}
</style>
