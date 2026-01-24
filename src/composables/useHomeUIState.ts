import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useFileStore } from '@/store/files'
import { useAuthStore } from '@/store/auth'
import { storeToRefs } from 'pinia'
import { t } from '@/i18n'
import { FileText, FileSpreadsheet } from 'lucide-vue-next'

export function useHomeUIState() {
  const route = useRoute()
  const authStore = useAuthStore()
  const fileStore = useFileStore()
  const { isAuthenticated } = storeToRefs(authStore)

  // Constants
  const venmailUrl = 'https://venmail.io'

  // Template data
  const templates = {
    Documents: [
      { name: "Blank Document", icon: FileText },
      { name: "Resume", icon: FileText },
      { name: "Letter", icon: FileText },
    ],
    Spreadsheets: [
      { name: "Blank Spreadsheet", icon: FileSpreadsheet },
      { name: "Budget", icon: FileSpreadsheet },
      { name: "Invoice", icon: FileSpreadsheet },
    ],
  }

  // Attachment import state
  const isImportingAttachment = ref(false)
  const isAttachmentDialogOpen = ref(false)
  const attachmentDialogMessage = ref("")
  const attachmentDialogError = ref<string | null>(null)

  // Context menu state
  const contextMenuState = ref({
    visible: false,
    x: 0,
    y: 0,
    fileId: null as string | null,
  })

  // Computed properties
  const isLoading = ref(false)

  // Navigation methods
  const goBackToVenmail = () => {
    window.location.href = venmailUrl
  }

  // Attachment import methods
  const handleAttachmentImport = async (refreshFn: () => Promise<void>, openFileFn: (id: string) => Promise<void>) => {
    const attachId = route.params?.id as string | undefined
    if (!attachId) return

    console.log("importing..", attachId)
    isAttachmentDialogOpen.value = true
    attachmentDialogError.value = null
    attachmentDialogMessage.value = t('Views.Home.text.attachment_import_importing')
    isImportingAttachment.value = true
    
    try {
      const doc = await fileStore.importAttachment(attachId)
      if (doc) {
        attachmentDialogMessage.value = t('Views.Home.text.attachment_import_preparing_document')
        await refreshFn()
        if (doc.id) {
          attachmentDialogMessage.value = t('Views.Home.text.attachment_import_opening_document')
          await openFileFn(doc.id)
          isAttachmentDialogOpen.value = false
        }
      } else {
        attachmentDialogError.value = t('Views.Home.text.attachment_import_failed')
      }
    } finally {
      isImportingAttachment.value = false
    }
  }

  // Context menu methods
  const showContextMenu = (x: number, y: number, fileId: string | null) => {
    contextMenuState.value = {
      visible: true,
      x,
      y,
      fileId,
    }
  }

  const hideContextMenu = () => {
    contextMenuState.value.visible = false
  }

  // Helper functions
  const formatGroupName = (groupName: string): string => {
    return groupName.charAt(0).toUpperCase() + groupName.slice(1)
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    if (i === 0) return `${bytes} B`
    
    const size = bytes / Math.pow(k, i)
    return `${size.toFixed(size < 10 ? 1 : 0)} ${sizes[i]}`
  }

  return {
    // State
    isAuthenticated,
    venmailUrl,
    templates,
    isImportingAttachment,
    isAttachmentDialogOpen,
    attachmentDialogMessage,
    attachmentDialogError,
    contextMenuState,
    isLoading,

    // Methods
    goBackToVenmail,
    handleAttachmentImport,
    showContextMenu,
    hideContextMenu,
    formatGroupName,
    formatFileSize,
  }
}
