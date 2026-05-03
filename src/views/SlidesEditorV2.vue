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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import AvnacHost from '@/components/slides/AvnacHost.vue'
import SlidesTopBar from '@/components/slides/SlidesTopBar.vue'
import {
  AVNAC_DECK_TEMPLATE_OPTIONS,
  createAvnacSlidesForTheme,
  getAvnacDeckThemeTitle,
  resolveAvnacDeckTheme,
  type AvnacDeckTheme,
} from '@/utils/avnacSlideTemplates'
import { cloneAvnacPlain, type AvnacDocumentV1 } from '@avnac/lib/avnac-document'

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
const showTemplateDialog = ref(false)
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
    const slides = cloneAvnacPlain(avnacRef.value?.getSlides() ?? [])
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
  showTemplateDialog.value = true
}

async function startNewDeckFromTemplate(theme: AvnacDeckTheme) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (hasUnsaved.value) await persistDeck()
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
        if (parsed?.slides?.length) initialSlides.value = cloneAvnacPlain(parsed.slides)
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
