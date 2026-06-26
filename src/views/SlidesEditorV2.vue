<template>
  <div class="slides-editor-shell">
    <SlidesTopBar
      :title="title"
      :is-saving="isSaving"
      :has-unsaved="hasUnsaved"
      :is-offline="isOffline"
      :show-share="!!deckId"
      :show-chat="!!deckId && canJoinRealtime"
      :read-only="!canEditDeck"
      :unread-count="unreadCount"
      @back="goBack"
      @title-change="onTitleChange"
      @save="handleManualSave"
      @present="onPresent"
      @share="openShareDialog"
      @toggle-chat="toggleChat"
      @new-deck="onNewDeck"
      @import-pptx="avnacRef?.importPptx()"
      @export-pptx="avnacRef?.exportPptx()"
      @select-all="avnacRef?.selectAll()"
      @zoom="(pct) => avnacRef?.setZoom(pct)"
      @fit="avnacRef?.fitToViewport()"
      @add-text="avnacRef?.addText()"
      @add-image="avnacRef?.addImage()"
      @add-shape="(kind) => avnacRef?.addShape(kind)"
      @insert-smart-object="(kind) => avnacRef?.insertSmartObject(kind)"
      @add-slide="avnacRef?.addSlide()"
      @canvas-size="(size) => avnacRef?.setCanvasSize(size)"
      @duplicate-slide="avnacRef?.duplicateCurrentSlide()"
      @delete-slide="avnacRef?.deleteCurrentSlide()"
      @toggle-notes="showNotes = !showNotes"
      @undo="avnacRef?.undo()"
      @redo="avnacRef?.redo()"
    />

    <main v-if="accessDenied" class="slides-editor-body slides-editor-body--centered">
      <section class="slides-access-state" role="alert">
        <h2>Presentation unavailable</h2>
        <p>We could not open this presentation. It may have been moved, deleted, or your access may have changed.</p>
        <button type="button" @click="goBack">Back to presentations</button>
      </section>
    </main>

    <main v-else class="slides-editor-body">
      <AvnacHost
        ref="avnacRef"
        :initial-slides="initialSlides"
        :persist-id="deckId ?? 'new'"
        :notes="notes"
        :show-notes="showNotes"
        :read-only="!canEditDeck"
        @ready="onEditorReady"
        @change="onSlidesChange"
        @generated-title="onGeneratedTitle"
        @notes-change="onNotesChange"
        @slide-change="onLocalSlideChange"
        @slide-index-change="onLocalSlideIndexChange"
        @slides-mutate="onLocalSlidesMutate"
      />
    </main>

    <!-- Chat Sidebar -->
    <div
      v-if="isChatOpen"
      class="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50 flex flex-col"
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
          <DialogTitle>Share Presentation</DialogTitle>
        </DialogHeader>

        <ShareCard
          :file-id="deckId ?? ''"
          mode="doc"
          :share-link="shareLink"
          :privacy-type="privacyType"
          :members="shareMembersForCard"
          :can-edit-privacy="canEditDeck"
          @close="shareOpen = false"
          @copy-link="copyShareLink"
          @change-privacy="handleChangePrivacy"
          @update-member="handleUpdateMember"
          @remove-member="handleRemoveMember"
          @invite="handleInvite"
        />
      </DialogContent>
    </Dialog>

    <div v-if="showTemplateDialog" class="template-dialog" role="dialog" aria-modal="true" aria-label="Choose deck template">
      <div class="template-dialog__backdrop" @click="showTemplateDialog = false" />
      <section class="template-dialog__panel">
        <header class="template-dialog__header">
          <div>
            <h2>Choose a deck template</h2>
            <p>Start with a realistic slide structure, then edit every object on the canvas.</p>
          </div>
          <button class="template-dialog__close" type="button" aria-label="Close" @click="showTemplateDialog = false">
            <span aria-hidden="true">x</span>
          </button>
        </header>
        <div class="template-grid">
          <button
            v-for="template in AVNAC_DECK_TEMPLATE_OPTIONS"
            :key="template.theme"
            class="template-card"
            type="button"
            @click="startNewDeckFromTemplate(template.theme)"
          >
            <span
              class="template-card__preview"
              :style="{ '--template-accent': template.accent, '--template-surface': template.surface, '--template-text': template.text }"
            >
              <span class="template-card__bar" />
              <span class="template-card__title-line" />
              <span class="template-card__copy-line" />
              <span class="template-card__visual-row">
                <span />
                <span />
                <span />
              </span>
            </span>
            <span class="template-card__body">
              <span class="template-card__title">{{ template.title }}</span>
              <span class="template-card__description">{{ template.description }}</span>
              <span class="template-card__meta">{{ template.slides }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import { useSlidesCollaboration } from '@/composables/useSlidesCollaboration'
import { Share2, XIcon, MessageSquareIcon } from 'lucide-vue-next'
import AvnacHost from '@/components/slides/AvnacHost.vue'
import SlidesTopBar from '@/components/slides/SlidesTopBar.vue'
import ShareCard from '@/components/ShareCard.vue'
import Button from '@/components/ui/button/Button.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import {
  AVNAC_DECK_TEMPLATE_OPTIONS,
  createAvnacSlidesForTheme,
  getAvnacDeckThemeTitle,
  resolveAvnacDeckTheme,
  type AvnacDeckTheme,
} from '@/utils/avnacSlideTemplates'
import { migrateDeckPayload } from '@/utils/slideDeckPayload'
import { cloneAvnacPlain, type AvnacDocumentV1 } from '@avnac/lib/avnac-document'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import {
  serializeSharingInfoString,
  parseSharingInfoString,
  type ShareLevel,
  type ShareLevelLabel,
  type ShareMember,
} from '@/utils/sharing'
type SharingShareMember = ShareMember

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()
const authStore = useAuthStore()

const avnacRef = ref<InstanceType<typeof AvnacHost> | null>(null)

const title = ref('Untitled Presentation')
const isSaving = ref(false)
const hasUnsaved = ref(false)
const lastSavedAt = ref<Date | null>(null)
const deckId = ref<string | null>(null)
const editorReady = ref(false)
const initialSlides = ref<AvnacDocumentV1[]>([])
const notes = ref<string[]>([])
const showNotes = ref(false)
const showTemplateDialog = ref(false)
const shouldCreateTemplateDeck = ref(false)
const currentSlideIndex = ref(0)
const shareOpen = ref(false)
const accessDenied = ref(false)
const privacyType = ref<number>(7)
const isOffline = ref(!navigator.onLine)
const shareMembers = ref<Array<{id: string, name: string, email: string, level: string}>>([])
const currentDoc = ref<any | null>(null)
const backendCanEdit = ref<boolean | null>(null)

const canEditDeck = computed(() => {
  if (!deckId.value) return true
  if (backendCanEdit.value !== null) return backendCanEdit.value
  if (typeof currentDoc.value?.can_edit === 'boolean') return currentDoc.value.can_edit
  if (typeof currentDoc.value?.is_owner === 'boolean') return currentDoc.value.is_owner
  if (!currentDoc.value) return false
  return authStore.isAuthenticated
})

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSaveAfterFlight = false
const applyingRemote = ref(false)

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

function hasPendingEditableChanges() {
  return hasUnsaved.value && canEditDeck.value
}

function applyLoadedDeckDoc(doc: any) {
  if (!doc) return
  currentDoc.value = doc
  if (typeof doc.can_edit === 'boolean') backendCanEdit.value = doc.can_edit
  if (typeof doc.privacy_type === 'number') privacyType.value = doc.privacy_type
}

function buildAuthHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra }
  const token = (fileStore as any).getToken?.() || authStore?.getToken?.() || (typeof localStorage !== 'undefined' ? localStorage.getItem('venAuthToken') : null)
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// Collaboration
const collaboration = useSlidesCollaboration({
  deckId: computed(() => deckId.value),
  privacyType,
  canEdit: canEditDeck,
  onRemoteTitleChange: (newTitle) => {
    title.value = newTitle
    document.title = newTitle
  },
  onRemoteSlideChange: (operation) => {
    if (!operation || !avnacRef.value) return
    const data = operation.data ?? operation
    applyingRemote.value = true
    try {
      if (operation.type === 'slide_change' && typeof data.slideIndex === 'number' && data.doc) {
        avnacRef.value.setSlideAt(data.slideIndex, data.doc)
      } else if (operation.type === 'slides_mutate' && Array.isArray(data.slides)) {
        const remoteCurrent = typeof data.currentIndex === 'number' ? data.currentIndex : 0
        avnacRef.value.setSlides(data.slides)
        if (Array.isArray(data.notes)) notes.value = [...data.notes]
        currentSlideIndex.value = Math.min(remoteCurrent, data.slides.length - 1)
      } else if (operation.type === 'notes_change' && typeof data.index === 'number') {
        while (notes.value.length <= data.index) notes.value.push('')
        notes.value[data.index] = data.text ?? ''
      }
    } catch (e) {
      console.warn('Failed to apply remote slide operation:', e)
    } finally {
      setTimeout(() => { applyingRemote.value = false }, 30)
    }
  },
})

const {
  userId,
  userName,
  isConnected: wsConnected,
  isJoined,
  chatMessages,
  isChatOpen,
  unreadCount,
  newChatMessage,
  textareaHeight,
  chatInput,
  chatMessagesContainer,
  replyingTo,
  collaborators,
  canJoinRealtime,
  initializeWebSocketAndJoinDeck,
  leaveDeck,
  broadcastTitle,
  broadcastSlideOperation,
  startPresenceHeartbeat,
  updateSlideIndex,
  sendChatMessage,
  handleChatEnterKey,
  adjustTextareaHeight,
  scrollToBottom,
  formatDate,
  replyToMessage,
  cancelReply,
  getReplyUserName,
  getReplyContent,
  toggleChat,
} = collaboration

const shareLink = computed(() => {
  if (!deckId.value) return ''
  const origin = import.meta.env.VITE_SHARE_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/share/slide/${deckId.value}`
})

const shareMembersForCard = computed<ShareMember[]>(() => {
  return shareMembers.value.map(m => ({
    email: m.email,
    name: m.name,
    shareLevel: (m.level === 'write' ? 'e' : m.level === 'comment' ? 'c' : 'v') as ShareLevel,
  }))
})

function getCurrentSlideIndex() {
  return currentSlideIndex.value
}

function handleOnline() {
  isOffline.value = false
  if (hasUnsaved.value && canEditDeck.value) {
    void persistDeck()
  }
}
function handleOffline() {
  isOffline.value = true
}

function scheduleSave() {
  if (!canEditDeck.value) return
  hasUnsaved.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => persistDeck(), 4000)
}

async function persistDeck(): Promise<boolean> {
  if (!editorReady.value) return false
  if (!canEditDeck.value) {
    hasUnsaved.value = false
    return false
  }
  if (isSaving.value) {
    pendingSaveAfterFlight = true
    return false
  }
  isSaving.value = true
  try {
    const slides = cloneAvnacPlain(avnacRef.value?.getSlides() ?? [])
    const payload = { version: 3, title: title.value, slides, notes: notes.value }
    const content = JSON.stringify(payload)
    const routeId = route.params.deckId as string
    const id = deckId.value || (routeId && routeId !== 'new' ? routeId : null)
    if (id) {
      const base = currentDoc.value ?? (await fileStore.loadDocument(id, 'pptx') as any) ?? {}
      const result = await fileStore.saveDocument({
        ...base,
        id,
        content,
        title: title.value,
        file_name: `${title.value}.pptx`,
        file_type: 'pptx',
      } as any)
      if (!result?.document) throw new Error('Presentation save returned no document')
      applyLoadedDeckDoc(result.document)
    } else {
      const doc = await fileStore.createNewDocument('pptx', title.value, content)
      if (!doc?.id) throw new Error('Presentation create returned no document id')
      deckId.value = doc.id
      applyLoadedDeckDoc(doc)
      hasUnsaved.value = false
      lastSavedAt.value = new Date()
      await router.replace(`/slides/${doc.id}`)
    }
    hasUnsaved.value = false
    lastSavedAt.value = new Date()
    return true
  } catch {
    toast.error('Failed to save presentation')
    return false
  } finally {
    isSaving.value = false
    if (pendingSaveAfterFlight) {
      pendingSaveAfterFlight = false
      void persistDeck()
    }
  }
}

async function handleManualSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (isSaving.value) {
    pendingSaveAfterFlight = true
    while (isSaving.value) {
      await new Promise(r => setTimeout(r, 60))
    }
  }
  const ok = await persistDeck()
  if (ok) toast.success('Saved')
}

function onEditorReady() {
  editorReady.value = true
  if (shouldCreateTemplateDeck.value) {
    shouldCreateTemplateDeck.value = false
    void persistDeck()
  }
}

function onSlidesChange(slides: AvnacDocumentV1[]) {
  while (notes.value.length < slides.length) notes.value.push('')
  if (notes.value.length > slides.length) notes.value.length = slides.length
  if (currentSlideIndex.value >= slides.length) {
    currentSlideIndex.value = Math.max(0, slides.length - 1)
  }
  if (!applyingRemote.value && canEditDeck.value) scheduleSave()
}

function onLocalSlideChange(index: number, doc: AvnacDocumentV1) {
  if (applyingRemote.value) return
  onLocalSlideIndexChange(index)
  if (canEditDeck.value && canJoinRealtime.value && isJoined.value) {
    broadcastSlideOperation({ type: 'slide_change', data: { slideIndex: index, doc: cloneAvnacPlain(doc) } })
  }
}

function onLocalSlideIndexChange(index: number) {
  if (applyingRemote.value) return
  if (currentSlideIndex.value !== index) {
    currentSlideIndex.value = index
    updateSlideIndex(index)
  }
}

function onLocalSlidesMutate(op: { type: string; from?: number; to?: number; index?: number }) {
  if (applyingRemote.value) return
  if (!canEditDeck.value) return
  if (op.type === 'delete' && typeof op.index === 'number') {
    if (op.index < notes.value.length) notes.value.splice(op.index, 1)
  } else if (op.type === 'duplicate' && typeof op.from === 'number' && typeof op.to === 'number') {
    const src = notes.value[op.from] ?? ''
    notes.value.splice(op.to, 0, src)
  } else if (op.type === 'move' && typeof op.from === 'number' && typeof op.to === 'number') {
    if (op.from < notes.value.length) {
      const [moved] = notes.value.splice(op.from, 1)
      notes.value.splice(op.to, 0, moved ?? '')
    }
  } else if (op.type === 'add') {
    notes.value.push('')
  }
  if (canJoinRealtime.value && isJoined.value) {
    const slides = cloneAvnacPlain(avnacRef.value?.getSlides() ?? [])
    broadcastSlideOperation({
      type: 'slides_mutate',
      data: {
        slides,
        notes: [...notes.value],
        currentIndex: currentSlideIndex.value,
        op,
      },
    })
  }
  scheduleSave()
}

function onNotesChange(index: number, text: string) {
  if (!canEditDeck.value) return
  while (notes.value.length <= index) notes.value.push('')
  notes.value[index] = text
  if (!applyingRemote.value) {
    if (canJoinRealtime.value && isJoined.value) {
      broadcastSlideOperation({ type: 'notes_change', data: { index, text } })
    }
    scheduleSave()
  }
}

function onTitleChange(newTitle: string) {
  if (!canEditDeck.value) return
  title.value = newTitle
  document.title = newTitle
  scheduleSave()
  broadcastTitle(newTitle)
}

function onGeneratedTitle(generatedTitle: string) {
  if (!canEditDeck.value) return
  const currentTitle = title.value.trim().toLowerCase()
  const isGenericTitle = !currentTitle || ['untitled', 'untitled presentation', 'new presentation'].includes(currentTitle)
  if (!isGenericTitle) return
  onTitleChange(generatedTitle)
}

function openShareDialog() {
  if (!deckId.value) return
  shareOpen.value = true
  loadSharingData()
}

function shareLevelToLevel(s: ShareLevel): string {
  return s === 'e' ? 'write' : s === 'c' ? 'comment' : 'view'
}

function levelToShareLevel(level: string): ShareLevel {
  return (level === 'write' ? 'e' : level === 'comment' ? 'c' : 'v')
}

function membersToSharingMembers(): SharingShareMember[] {
  return shareMembers.value.map(m => ({ email: m.email, name: m.name, shareLevel: levelToShareLevel(m.level) }))
}

async function loadSharingData() {
  if (!deckId.value) return
  try {
    const doc = await fileStore.loadDocument(deckId.value, 'pptx') as any
    applyLoadedDeckDoc(doc)
    const sharingRaw = doc?.sharing_info ?? doc?.sharing
    if (typeof sharingRaw === 'string') {
      const parsed = parseSharingInfoString(sharingRaw)
      shareMembers.value = parsed.map(m => ({ id: m.email, email: m.email, name: m.name ?? m.email.split('@')[0], level: shareLevelToLevel(m.shareLevel) }))
    } else if (sharingRaw && typeof sharingRaw === 'object') {
      const info = sharingRaw as { privacy_type?: number; members?: any[] }
      if (typeof info.privacy_type === 'number') privacyType.value = info.privacy_type
      if (Array.isArray(info.members)) {
        shareMembers.value = info.members.map(m => ({
          id: m.email ?? m.id,
          email: m.email,
          name: m.name ?? m.email?.split('@')[0] ?? '',
          level: m.level ?? shareLevelToLevel(m.shareLevel ?? 'v'),
        }))
      }
    }
  } catch (error) {
    console.warn('Failed to load sharing data:', error)
  }
}

async function patchFile(body: Record<string, any>) {
  if (!deckId.value) return
  await axios.patch(`${FILES_ENDPOINT}/${deckId.value}`, body, { headers: buildAuthHeaders({ 'Content-Type': 'application/json' }) })
}

async function handleChangePrivacy(newPrivacy: number) {
  if (!canEditDeck.value) return
  if (!deckId.value) return
  const prev = privacyType.value
  privacyType.value = newPrivacy
  try {
    await patchFile({ privacy_type: newPrivacy })
    toast.success(`Privacy updated to ${newPrivacy === 7 ? 'Private' : 'Public'}`)
  } catch (e) {
    privacyType.value = prev
    toast.error('Failed to update privacy')
  }
}

async function handleUpdateMember(payload: {email: string, shareLevel: ShareLevel, label: ShareLevelLabel}) {
  if (!canEditDeck.value) return
  const member = shareMembers.value.find(m => m.email === payload.email)
  if (member) {
    member.level = shareLevelToLevel(payload.shareLevel)
  } else {
    shareMembers.value.push({ id: payload.email, email: payload.email, name: payload.email.split('@')[0], level: shareLevelToLevel(payload.shareLevel) })
  }
  try {
    await patchFile({ sharing_info: serializeSharingInfoString(membersToSharingMembers()) })
    toast.success('Member permissions updated')
  } catch (e) {
    await loadSharingData()
    toast.error('Failed to update member')
  }
}

async function handleRemoveMember(payload: {email: string}) {
  if (!canEditDeck.value) return
  const previous = [...shareMembers.value]
  shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
  try {
    await patchFile({ sharing_info: serializeSharingInfoString(membersToSharingMembers()) })
    toast.success('Member removed')
  } catch (e) {
    shareMembers.value = previous
    toast.error('Failed to remove member')
  }
}

async function handleInvite(payload: {email: string, shareLevel: ShareLevel, label: ShareLevelLabel, note?: string}) {
  if (!canEditDeck.value) return
  if (shareMembers.value.some(m => m.email === payload.email)) {
    toast.error('This person already has access')
    return
  }
  const newMember = {
    id: payload.email,
    email: payload.email,
    name: payload.email.split('@')[0],
    level: shareLevelToLevel(payload.shareLevel),
  }
  shareMembers.value.push(newMember)
  try {
    await patchFile({ sharing_info: serializeSharingInfoString(membersToSharingMembers()) })
    toast.success(`Invitation sent to ${payload.email}`)
  } catch (e) {
    shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
    toast.error('Failed to invite member')
  }
}

function copyShareLink() {
  navigator.clipboard.writeText(shareLink.value)
  toast.success('Link copied to clipboard')
}

async function goBack() {
  if (hasPendingEditableChanges()) {
    const saved = await persistDeck()
    if (!saved) return
  }
  router.push('/slides')
}

function onNewDeck() {
  showTemplateDialog.value = true
}

async function startNewDeckFromTemplate(theme: AvnacDeckTheme) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (hasPendingEditableChanges()) {
    const saved = await persistDeck()
    if (!saved) return
  }
  const slides = createAvnacSlidesForTheme(theme)
  deckId.value = null
  initialSlides.value = slides
  notes.value = slides.map(() => '')
  title.value = getAvnacDeckThemeTitle(theme)
  document.title = title.value
  showTemplateDialog.value = false
  await router.replace('/slides/new')
  avnacRef.value?.setSlides(slides)
  hasUnsaved.value = true
  await persistDeck()
  toast.success('Template deck created')
}

function onPresent() {
  avnacRef.value?.present()
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'n') {
    e.preventDefault()
    showNotes.value = !showNotes.value
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!hasPendingEditableChanges()) return
  void persistDeck()
  e.preventDefault()
  e.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!hasPendingEditableChanges()) return true
  const saved = await persistDeck()
  if (saved) return true
  return window.confirm('Presentation changes could not be saved. Leave this page anyway?')
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  document.title = title.value
  const template = route.params.template as string | undefined
  if (template) {
    const theme = resolveAvnacDeckTheme(template)
    const slides = createAvnacSlidesForTheme(theme)
    initialSlides.value = slides
    notes.value = slides.map(() => '')
    title.value = getAvnacDeckThemeTitle(theme)
    document.title = title.value
    shouldCreateTemplateDeck.value = true
    return
  }

  const id = route.params.deckId as string | undefined
  if (id && id !== 'new') {
    deckId.value = id
    try {
      const raw = await fileStore.loadDocument(id, 'pptx') as any
      applyLoadedDeckDoc(raw)
      const migrated = migrateDeckPayload(raw?.content)
      if (migrated.slides.length) initialSlides.value = migrated.slides
      if (migrated.notes.length || migrated.slides.length) notes.value = migrated.notes
      if (migrated.title) {
        title.value = migrated.title
        document.title = migrated.title
      }
      const sharingRaw = raw?.sharing_info ?? raw?.sharing
      if (typeof sharingRaw === 'string') {
        const parsed = parseSharingInfoString(sharingRaw)
        shareMembers.value = parsed.map(m => ({ id: m.email, email: m.email, name: m.name ?? m.email.split('@')[0], level: shareLevelToLevel(m.shareLevel) }))
      } else if (sharingRaw && typeof sharingRaw === 'object') {
        const info = sharingRaw as { privacy_type?: number; members?: any[] }
        if (typeof info.privacy_type === 'number') privacyType.value = info.privacy_type
        if (Array.isArray(info.members)) {
          shareMembers.value = info.members.map((m: any) => ({
            id: m.email ?? m.id,
            email: m.email,
            name: m.name ?? m.email?.split('@')[0] ?? '',
            level: m.level ?? shareLevelToLevel(m.shareLevel ?? 'v'),
          }))
        }
      }
    } catch (e) {
      console.warn('Failed to load deck:', e)
      accessDenied.value = true
    }

    if (canJoinRealtime.value) {
      initializeWebSocketAndJoinDeck()
      setTimeout(() => {
        startPresenceHeartbeat(getCurrentSlideIndex)
      }, 1000)
    }
  }
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  leaveDeck()
})
</script>

<style scoped>
.slides-editor-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-canvas, #f4f4f5);
  color: #18181b;
  color-scheme: light;
}

.slides-editor-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-canvas, #f4f4f5);
  color-scheme: light;
}

.slides-editor-body--centered {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.slides-access-state {
  width: min(420px, 100%);
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.slides-access-state h2 {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 650;
  color: #111827;
}

.slides-access-state p {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}

.slides-access-state button {
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: #6366f1;
  color: #fff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.slides-access-state button:hover {
  background: #4f46e5;
}

.template-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  color: #111827;
  color-scheme: light;
}

.template-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
}

.template-dialog__panel {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(1040px, calc(100vw - 48px));
  max-height: min(760px, calc(100vh - 48px));
  transform: translate(-50%, -50%);
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.template-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.template-dialog__header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
}

.template-dialog__header p {
  margin: 6px 0 0;
  max-width: 620px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.45;
}

.template-dialog__close {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 21px;
  line-height: 1;
}

.template-dialog__close:hover {
  background: #f9fafb;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  max-height: calc(min(760px, 100vh - 48px) - 96px);
  overflow-y: auto;
  padding: 20px 24px 24px;
}

.template-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  text-align: left;
  cursor: pointer;
  color-scheme: light;
}

.template-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.12);
  transform: translateY(-1px);
}

.template-card__preview {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 6px;
  background: var(--template-surface);
  border: 1px solid rgba(15, 23, 42, 0.08);
  position: relative;
}

.template-card__bar,
.template-card__title-line,
.template-card__copy-line {
  position: absolute;
  left: 11%;
  border-radius: 999px;
}

.template-card__bar {
  top: 14%;
  width: 24%;
  height: 4%;
  background: var(--template-accent);
}

.template-card__title-line {
  top: 34%;
  width: 62%;
  height: 9%;
  background: var(--template-text);
}

.template-card__copy-line {
  top: 49%;
  width: 44%;
  height: 5%;
  background: color-mix(in srgb, var(--template-text) 45%, transparent);
}

.template-card__visual-row {
  position: absolute;
  left: 11%;
  right: 11%;
  bottom: 15%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6%;
}

.template-card__visual-row span {
  height: 24px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--template-accent) 84%, white);
}

.template-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 0 2px 2px;
}

.template-card__title {
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}

.template-card__description {
  min-height: 50px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.35;
}

.template-card__meta {
  color: #4f46e5;
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .template-dialog__panel {
    width: calc(100vw - 24px);
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
