<template>
  <div class="slides-editor-shell">
    <!-- Title bar -->
    <header class="slides-editor-header">
      <div class="slides-editor-header__left">
        <button class="slides-editor-back-btn" @click="goBack" title="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span
          class="slides-editor-title"
          :contenteditable="true"
          spellcheck="false"
          @blur="onTitleBlur"
          @keydown.enter.prevent="($event.target as HTMLElement).blur()"
          ref="titleEl"
        >{{ title }}</span>
        <span v-if="isSaving" class="slides-editor-status">Saving...</span>
        <span v-else-if="hasUnsaved" class="slides-editor-status">Unsaved</span>
        <span v-else-if="lastSavedAt" class="slides-editor-status">Saved</span>
      </div>

      <div class="slides-editor-header__right">
        <button class="slides-editor-btn" @click="handleManualSave" :disabled="isSaving">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save
        </button>
        <button class="slides-editor-btn" @click="shareOpen = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
      </div>
    </header>

    <!-- Avnac editor fills remaining space -->
    <main class="slides-editor-body">
      <AvnacHost
        ref="avnacRef"
        :initial-slides="initialSlides"
        @ready="onEditorReady"
        @change="onSlidesChange"
      />
    </main>

    <!-- Share dialog -->
    <Teleport to="body">
      <div v-if="shareOpen" class="slides-share-overlay" @click.self="shareOpen = false">
        <div class="slides-share-dialog">
          <div class="slides-share-dialog__header">
            <h3>Share Presentation</h3>
            <button @click="shareOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <ShareCard
            mode="doc"
            :share-link="shareLink"
            :privacy-type="privacyType"
            :share-members="shareMembers"
            @change-privacy="handleChangePrivacy"
            @invite="handleInvite"
            @update-member="handleUpdateMember"
            @remove-member="handleRemoveMember"
            @copy-link="copyShareLink"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import ShareCard from '@/components/ShareCard.vue'
import AvnacHost from '@/components/slides/AvnacHost.vue'
import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'
import type { ShareMember, ShareLevel } from '@/utils/sharing'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()

// ─── Refs ─────────────────────────────────────────────────────────────────────

const avnacRef = ref<InstanceType<typeof AvnacHost> | null>(null)
const titleEl = ref<HTMLElement | null>(null)

const title = ref('Untitled Presentation')
const isSaving = ref(false)
const hasUnsaved = ref(false)
const lastSavedAt = ref<Date | null>(null)
const deckId = ref<string | null>(null)
const privacyType = ref(1)
const shareMembers = ref<ShareMember[]>([])
const shareOpen = ref(false)
const editorReady = ref(false)

const initialSlides = ref<AvnacDocumentV1[]>([])

// ─── Computed ─────────────────────────────────────────────────────────────────

const shareLink = computed(() => {
  const id = deckId.value || (route.params.deckId as string)
  if (!id) return ''
  const base = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin
  return `${base}/slides/${id}`
})

// ─── Autosave ─────────────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave() {
  hasUnsaved.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => persistDeck(), 4000)
}

async function persistDeck() {
  if (!editorReady.value || isSaving.value) return
  isSaving.value = true

  try {
    const slides = avnacRef.value?.getSlides() ?? []
    const payload = {
      version: 3 as const,
      title: title.value,
      slides,
    }
    const content = JSON.stringify(payload)
    const id = deckId.value || (route.params.deckId as string)

    if (id) {
      const existing = await fileStore.loadDocument(id, 'pptx') as any
      await fileStore.saveDocument({ ...(existing ?? {}), id, content, name: title.value, file_type: 'pptx' } as any)
    } else {
      const doc = await fileStore.createNewDocument('pptx', title.value, content)
      if (doc?.id) {
        deckId.value = doc.id
        await router.replace(`/slides/${doc.id}`)
      }
    }

    hasUnsaved.value = false
    lastSavedAt.value = new Date()
  } catch {
    toast.error('Failed to save presentation')
  } finally {
    isSaving.value = false
  }
}

async function handleManualSave() {
  if (saveTimer) clearTimeout(saveTimer)
  await persistDeck()
  toast.success('Saved')
}

// ─── Editor events ────────────────────────────────────────────────────────────

function onEditorReady() {
  editorReady.value = true
}

function onSlidesChange(_slides: AvnacDocumentV1[]) {
  scheduleSave()
}

// ─── Title ────────────────────────────────────────────────────────────────────

function onTitleBlur(e: Event) {
  const newTitle = (e.target as HTMLElement).innerText.trim() || 'Untitled Presentation'
  if (newTitle !== title.value) {
    title.value = newTitle
    document.title = newTitle
    scheduleSave()
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function goBack() {
  if (hasUnsaved.value) persistDeck()
  router.push('/slides')
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

async function copyShareLink() {
  if (shareLink.value) {
    await navigator.clipboard.writeText(shareLink.value)
    toast.success('Link copied')
  }
}

async function handleChangePrivacy(newPrivacy: number) {
  privacyType.value = newPrivacy
  const id = deckId.value || (route.params.deckId as string)
  if (!id) return
  try {
    const doc = await fileStore.loadDocument(id, 'pptx')
    if (doc) await fileStore.saveToAPI({ ...doc, privacy_type: newPrivacy })
    toast.success('Privacy updated')
  } catch {
    toast.error('Failed to update privacy')
  }
}

async function handleInvite(payload: { email: string; shareLevel: ShareLevel; label: string; note?: string }) {
  if (shareMembers.value.some(m => m.email === payload.email)) {
    toast.error('Already has access')
    return
  }
  shareMembers.value.push({ email: payload.email, shareLevel: payload.shareLevel, status: 'pending' })
  await _persistSharing()
  toast.success(`Invited ${payload.email}`)
}

async function handleUpdateMember(payload: { email: string; shareLevel: ShareLevel; label: string }) {
  const m = shareMembers.value.find(m => m.email === payload.email)
  if (m) m.shareLevel = payload.shareLevel
  await _persistSharing()
}

async function handleRemoveMember(payload: { email: string }) {
  shareMembers.value = shareMembers.value.filter(m => m.email !== payload.email)
  await _persistSharing()
}

async function _persistSharing() {
  const id = deckId.value || (route.params.deckId as string)
  if (!id) return
  try {
    const doc = await fileStore.loadDocument(id, 'pptx')
    if (doc) {
      const sharing = shareMembers.value.map(m => `${m.email}:${m.shareLevel}`).join(',')
      await fileStore.saveToAPI({ ...doc, sharing_info: sharing })
    }
  } catch {
    toast.error('Failed to update sharing')
  }
}

// ─── Load on mount ────────────────────────────────────────────────────────────

async function loadDeck(id: string) {
  try {
    const doc = await fileStore.loadDocument(id, 'pptx')
    if (!doc) return

    title.value = (doc as any).name || 'Untitled Presentation'
    document.title = title.value
    privacyType.value = (doc as any).privacy_type ?? 1

    const raw = (doc as any).content
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (parsed?.version === 3 && Array.isArray(parsed.slides)) {
          initialSlides.value = parsed.slides
        }
      } catch { /* ignore malformed */ }
    }

    const sharingInfo = (doc as any).sharing_info ?? (doc as any).sharing
    if (typeof sharingInfo === 'string' && sharingInfo) {
      shareMembers.value = sharingInfo.split(',').map((entry: string) => {
        const [email, level] = entry.split(':')
        return { email: email.trim(), shareLevel: (level?.trim() || 'v') as ShareLevel, status: 'accepted' as const }
      }).filter((m: ShareMember) => m.email)
    }
  } catch {
    toast.error('Failed to load presentation')
  }
}

onMounted(async () => {
  const id = route.params.deckId as string | undefined

  if (id) {
    await loadDeck(id)
    deckId.value = id
  }
  // AvnacHost creates a default slide when initialSlides is empty
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (hasUnsaved.value) persistDeck()
})
</script>

<style scoped>
.slides-editor-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: #f3f4f6;
}

.slides-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 48px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  gap: 8px;
}

.slides-editor-header__left,
.slides-editor-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slides-editor-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  flex-shrink: 0;
}
.slides-editor-back-btn:hover { background: #f3f4f6; color: #111827; }

.slides-editor-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  outline: none;
  border-radius: 4px;
  padding: 2px 6px;
  min-width: 40px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slides-editor-title:focus {
  background: #f9fafb;
  outline: 2px solid #d14424;
  outline-offset: 0;
}

.slides-editor-status {
  font-size: 12px;
  color: #9ca3af;
}

.slides-editor-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}
.slides-editor-btn:hover { background: #f9fafb; border-color: #d1d5db; }
.slides-editor-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.slides-editor-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Share overlay */
.slides-share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slides-share-dialog {
  background: #fff;
  border-radius: 12px;
  width: 480px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden;
}

.slides-share-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.slides-share-dialog__header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.slides-share-dialog__header button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
}
.slides-share-dialog__header button:hover { background: #f3f4f6; color: #111827; }
</style>
