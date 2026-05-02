<template>
  <div class="slides-editor-shell">
    <SlidesTopBar
      :title="title"
      :is-saving="isSaving"
      :has-unsaved="hasUnsaved"
      @back="goBack"
      @title-change="onTitleChange"
      @save="handleManualSave"
      @present="onPresent"
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

    <main class="slides-editor-body">
      <AvnacHost
        ref="avnacRef"
        :initial-slides="initialSlides"
        :persist-id="deckId ?? 'new'"
        :notes="notes"
        :show-notes="showNotes"
        @ready="onEditorReady"
        @change="onSlidesChange"
        @notes-change="onNotesChange"
      />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import AvnacHost from '@/components/slides/AvnacHost.vue'
import SlidesTopBar from '@/components/slides/SlidesTopBar.vue'
import {
  createAvnacSlidesForTheme,
  getAvnacDeckThemeTitle,
  resolveAvnacDeckTheme,
} from '@/utils/avnacSlideTemplates'
import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()

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
const shouldCreateTemplateDeck = ref(false)

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
    const payload = { version: 3, title: title.value, slides, notes: notes.value }
    const content = JSON.stringify(payload)
    const routeId = route.params.deckId as string
    const id = deckId.value || (routeId && routeId !== 'new' ? routeId : null)
    if (id) {
      const existing = await fileStore.loadDocument(id, 'pptx') as any
      await fileStore.saveDocument({
        ...(existing ?? {}),
        id,
        content,
        title: title.value,
        name: title.value,
        file_name: `${title.value}.pptx`,
        file_type: 'pptx',
      } as any)
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

function onEditorReady() {
  editorReady.value = true
  if (shouldCreateTemplateDeck.value) {
    shouldCreateTemplateDeck.value = false
    void persistDeck()
  }
}

function onSlidesChange(slides: AvnacDocumentV1[]) {
  // Grow notes array to match slide count
  while (notes.value.length < slides.length) notes.value.push('')
  scheduleSave()
}

function onNotesChange(index: number, text: string) {
  while (notes.value.length <= index) notes.value.push('')
  notes.value[index] = text
  scheduleSave()
}

function onTitleChange(newTitle: string) {
  title.value = newTitle
  document.title = newTitle
  scheduleSave()
}

function goBack() {
  if (hasUnsaved.value) persistDeck()
  router.push('/slides')
}

function onNewDeck() {
  router.push('/slides/new')
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

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
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
      if (raw?.content) {
        const parsed = JSON.parse(raw.content)
        if (parsed?.slides?.length) initialSlides.value = parsed.slides
        if (Array.isArray(parsed?.notes)) notes.value = parsed.notes
        if (parsed?.title) {
          title.value = parsed.title
          document.title = parsed.title
        }
      }
    } catch {
      // start fresh
    }
  }
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  window.removeEventListener('keydown', onKeydown)
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
}

.slides-editor-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-canvas, #f4f4f5);
}
</style>
