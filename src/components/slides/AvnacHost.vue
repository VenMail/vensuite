<template>
  <div class="avnac-host">
    <!-- Slide strip (left) -->
    <div class="avnac-slide-strip">
      <div class="avnac-slide-strip__list">
        <SlideThumbnail
          v-for="(doc, i) in slides"
          :key="i"
          :doc="doc"
          :index="i"
          :active="i === currentIndex"
          :persist-id="persistId"
          :can-delete="slides.length > 1"
          :is-last="i === slides.length - 1"
          @click="switchSlide(i)"
          @duplicate="duplicateSlideAt(i)"
          @delete="deleteSlideAt(i)"
          @move-up="moveSlide(i, i - 1)"
          @move-down="moveSlide(i, i + 1)"
        />
      </div>
      <div class="avnac-slide-strip__actions">
        <button class="avnac-slide-action-btn" title="Add slide" @click="addSlide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button
          class="avnac-slide-action-btn"
          title="Delete slide"
          :disabled="slides.length <= 1"
          @click="deleteSlide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Canvas editor + notes panel (stacked vertically) -->
    <div class="avnac-host__editor-col">
    <div class="avnac-host__editor">
      <CanvasEditor
        ref="editorRef"
        :initial-document="initialDoc"
        @change="onDocumentChange"
        @ready="onEditorReady"
      >
        <!-- #toolbar — floating selection toolbar -->
        <template #toolbar>
          <CanvasElementToolbar
            @paint-change="onPaintChange"
            @text-format-change="onTextFormatChange"
            @shape-paint-change="onShapePaintChange"
            @corner-radius-change="onCornerRadiusChange"
            @image-corner-radius-change="onImageCornerRadiusChange"
            @stroke-width-change="onStrokeWidthChange"
            @stroke-paint-change="onStrokePaintChange"
            @blur-change="onBlurChange"
            @opacity-change="onOpacityChange"
            @shadow-change="onShadowChange"
            @shadow-toggle="onShadowToggle"
            @delete="onDeleteSelected"
          />
        </template>

        <!-- #sidebar — nav rail + conditional panels -->
        <template #sidebar>
          <div class="avnac-sidebar-stack">
            <EditorLayersPanel
              :open="activePanel === 'layers'"
              :rows="layerRows"
              @close="activePanel = null"
              @select-layer="onSelectLayer"
              @toggle-visible="onToggleVisible"
              @bring-forward="onBringForward"
              @send-backward="onSendBackward"
              @reorder="onReorderLayers"
              @rename-layer="onRenameLayer"
            />
            <EditorImagesPanel
              :open="activePanel === 'images'"
              :on-add-image-from-url="onAddImageFromUrl"
              @close="activePanel = null"
            />
            <EditorUploadsPanel
              :open="activePanel === 'uploads'"
              :on-add-image-from-file="onAddImageFromFile"
              @close="activePanel = null"
            />
            <EditorAppsPanel
              :open="activePanel === 'apps'"
              @close="activePanel = null"
              @template-insert="onTemplateInsert"
            />
            <div v-if="activePanel === 'charts'" class="avnac-side-panel">
              <ChartDataPanel />
            </div>
            <div v-if="activePanel === 'infographics'" class="avnac-side-panel">
              <InfographicPanel @insert="onInsertInfographic" />
            </div>
            <div v-if="activePanel === 'diagrams'" class="avnac-side-panel">
              <DiagramPanel @insert="onInsertDiagram" />
            </div>
            <VectorBoardWorkspace
              v-if="activePanel === 'vector-board'"
              :open="true"
              board-name="Vector Board"
              :document="vectorBoardDoc"
              :on-save="onVectorBoardSave"
              :on-save-and-place="onVectorBoardSaveAndPlace"
              @close="activePanel = null"
              @change="onVectorBoardChange"
            />
            <EditorFloatingSidebar
              :active-panel="activePanel"
              @select-panel="togglePanel"
            />
          </div>
        </template>

        <!-- #bottom-bar — shape tools + zoom + bg + export/import -->
        <template #bottom-bar>
          <div class="avnac-bottom-bar-content">
            <ShapesPopover @pick="onShapePick" />
            <button class="avnac-icon-btn" title="Add text" @click="onAddText">T</button>
            <button class="avnac-icon-btn" title="Add image" @click="onAddImage">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <PaintPopoverControl :value="canvasStore.bgValue" title="Background" @change="onBgChange" />
            <CanvasZoomSlider
              :value="canvasStore.zoomPercent ?? 100"
              :on-fit-request="() => editorRef?.fitToViewport()"
              @change="(v: number) => editorRef?.setZoom(v)"
              @fit-request="() => editorRef?.fitToViewport()"
            />
            <button class="avnac-icon-btn" title="Export PPTX" @click="onExportPptx">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="avnac-icon-btn" title="Import PPTX" @click="onImportPptx">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
        </template>
      </CanvasEditor>

      <div v-if="!ready" class="avnac-host__loading">
        <div class="avnac-host__spinner" />
        <span>Loading editor…</span>
      </div>
    </div>

    <SpeakerNotesPanel
      :model-value="currentNotes"
      :open="props.showNotes"
      @update:model-value="emit('notes-change', currentIndex, $event)"
      @close="emit('notes-change', currentIndex, currentNotes)"
    />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SlideThumbnail from '@/components/slides/SlideThumbnail.vue'
import SpeakerNotesPanel from '@/components/slides/SpeakerNotesPanel.vue'
import CanvasEditor from '@avnac/components/canvas/CanvasEditor.vue'
import CanvasElementToolbar from '@avnac/components/toolbar/CanvasElementToolbar.vue'
import EditorFloatingSidebar from '@avnac/components/panels/EditorFloatingSidebar.vue'
import EditorLayersPanel from '@avnac/components/panels/EditorLayersPanel.vue'
import EditorImagesPanel from '@avnac/components/panels/EditorImagesPanel.vue'
import EditorUploadsPanel from '@avnac/components/panels/EditorUploadsPanel.vue'
import EditorAppsPanel from '@avnac/components/panels/EditorAppsPanel.vue'
import ChartDataPanel from '@avnac/components/charts/ChartDataPanel.vue'
import InfographicPanel from '@avnac/components/infographics/InfographicPanel.vue'
import DiagramPanel from '@avnac/components/diagrams/DiagramPanel.vue'
import VectorBoardWorkspace from '@avnac/components/panels/VectorBoardWorkspace.vue'
import ShapesPopover from '@avnac/components/toolbar/ShapesPopover.vue'
import CanvasZoomSlider from '@avnac/components/toolbar/CanvasZoomSlider.vue'
import PaintPopoverControl from '@avnac/components/shared/PaintPopoverControl.vue'

import type { EditorLayerRow } from '@avnac/components/panels/EditorLayersPanel.vue'
import type { EditorSidebarPanelId } from '@avnac/lib/editor-sidebar-panel-layout'
import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'
import type { BgValue } from '@avnac/lib/bg-value'
import type { FabricShadowUi } from '@avnac/lib/avnac-fabric-shadow'
import type { TextFormatToolbarValues } from '@avnac/stores/canvas'
import type { AvnacInfographicData } from '@avnac/lib/avnac-infographic'
import type { AvnacDiagramData } from '@avnac/lib/avnac-diagram'
import type { VectorBoardDocument } from '@avnac/lib/avnac-vector-board-document'
import { useCanvasStore } from '@avnac/stores/canvas'
import { emptyVectorBoardDocument } from '@avnac/lib/avnac-vector-board-document'
import { exportDocumentsToPptx } from '@avnac/pptx/export'
import { importPptxFromInput } from '@avnac/pptx/import'
import { loadCanvasGoogleFontsAndRelayout } from '@avnac/lib/avnac-canvas-google-fonts'

interface Props {
  initialSlides?: AvnacDocumentV1[]
  persistId?: string
  notes?: string[]
  showNotes?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialSlides: () => [],
  persistId: 'preview',
  notes: () => [],
  showNotes: false,
})

const emit = defineEmits<{
  (e: 'change', slides: AvnacDocumentV1[]): void
  (e: 'ready'): void
  (e: 'notes-change', index: number, text: string): void
}>()

const editorRef = ref<InstanceType<typeof CanvasEditor> | null>(null)
const ready = ref(false)
const slides = ref<AvnacDocumentV1[]>([])
const currentIndex = ref(0)
const initialDoc = ref<AvnacDocumentV1 | undefined>(undefined)
const activePanel = ref<EditorSidebarPanelId | null>(null)
const canvasStore = useCanvasStore()
const vectorBoardDoc = ref<VectorBoardDocument>(emptyVectorBoardDocument())

const currentNotes = computed(() => props.notes?.[currentIndex.value] ?? '')

let changeTimer: ReturnType<typeof setTimeout> | null = null

function scheduleChange() {
  if (changeTimer) clearTimeout(changeTimer)
  changeTimer = setTimeout(() => {
    emit('change', JSON.parse(JSON.stringify(slides.value)) as AvnacDocumentV1[])
  }, 2000)
}

// ─── Deck-level history ──────────────────────────────────────────────────────
interface DeckSnapshot { slides: AvnacDocumentV1[]; index: number }
const deckUndoStack: DeckSnapshot[] = []
const deckRedoStack: DeckSnapshot[] = []
let lastOpType: 'deck' | 'canvas' = 'canvas'

function pushDeckSnapshot() {
  const current = editorRef.value?.getDocument()
  if (current) slides.value[currentIndex.value] = current
  deckUndoStack.push({ slides: JSON.parse(JSON.stringify(slides.value)), index: currentIndex.value })
  if (deckUndoStack.length > 50) deckUndoStack.shift()
  deckRedoStack.length = 0
  lastOpType = 'deck'
}

function restoreSnapshot(snap: DeckSnapshot) {
  slides.value = snap.slides
  currentIndex.value = snap.index
  if (editorRef.value) {
    void editorRef.value.setDocument(slides.value[snap.index])
    setTimeout(() => editorRef.value?.fitToViewport(), 60)
  }
  scheduleChange()
}

function undo() {
  if (lastOpType === 'deck' && deckUndoStack.length) {
    const current = editorRef.value?.getDocument()
    if (current) slides.value[currentIndex.value] = current
    deckRedoStack.push({ slides: JSON.parse(JSON.stringify(slides.value)), index: currentIndex.value })
    const snap = deckUndoStack.pop()!
    restoreSnapshot(snap)
    // Keep lastOpType = 'deck' so that redo() (which guards on deckRedoStack.length)
    // can still fire deck redo even when undo stack is now empty.
    lastOpType = 'deck'
  } else {
    editorRef.value?.undo()
  }
}

function redo() {
  if (deckRedoStack.length) {
    const current = editorRef.value?.getDocument()
    if (current) slides.value[currentIndex.value] = current
    deckUndoStack.push({ slides: JSON.parse(JSON.stringify(slides.value)), index: currentIndex.value })
    const snap = deckRedoStack.pop()!
    restoreSnapshot(snap)
    lastOpType = 'deck'
  } else {
    editorRef.value?.redo()
  }
}

async function ensureFonts() {
  const canvas = editorRef.value?.fabricCanvas
  const fc = (canvas as any)?.value ?? canvas
  if (!fc) return
  const mod = await import('fabric')
  await loadCanvasGoogleFontsAndRelayout(fc, mod as any)
}

function onEditorReady() {
  ready.value = true
  emit('ready')
  setTimeout(() => {
    editorRef.value?.fitToViewport()
    void ensureFonts()
  }, 50)
}

function onDocumentChange(doc: AvnacDocumentV1) {
  slides.value[currentIndex.value] = doc
  lastOpType = 'canvas'
  scheduleChange()
}

async function switchSlide(index: number) {
  if (index === currentIndex.value) return
  const current = editorRef.value?.getDocument()
  if (current) slides.value[currentIndex.value] = current
  currentIndex.value = index
  const next = slides.value[index]
  if (next && editorRef.value) {
    await editorRef.value.setDocument(next)
    setTimeout(async () => {
      editorRef.value?.fitToViewport()
      await ensureFonts()   // await so canvas re-renders after fonts ready (prevents reflow jump)
    }, 60)
  }
}

function createDefaultSlide(): AvnacDocumentV1 {
  return {
    v: 1,
    artboard: { width: 4000, height: 2250 },
    bg: { type: 'solid', color: '#ffffff' } as any,
    fabric: {
      version: '6.6.1',
      objects: [
        {
          type: 'Textbox',
          left: 200,
          top: 220,
          width: 3600,
          fill: '#18181b',
          fontFamily: 'Inter',
          fontSize: 100,
          fontWeight: 'bold',
          textAlign: 'left',
          text: 'Click to add title',
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
        } as any,
        {
          type: 'Textbox',
          left: 200,
          top: 500,
          width: 3600,
          fill: '#71717a',
          fontFamily: 'Inter',
          fontSize: 60,
          fontWeight: 'normal',
          textAlign: 'left',
          text: 'Click to add content',
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
        } as any,
      ],
    },
  }
}

function addSlide() {
  pushDeckSnapshot()
  slides.value.push(createDefaultSlide())
  switchSlide(slides.value.length - 1)
  scheduleChange()
}

function deleteSlide() {
  deleteSlideAt(currentIndex.value)
}

function deleteSlideAt(i: number) {
  if (slides.value.length <= 1) return
  pushDeckSnapshot()
  slides.value.splice(i, 1)
  let nextIdx = currentIndex.value
  if (i === currentIndex.value) {
    nextIdx = Math.min(i, slides.value.length - 1)
  } else if (i < currentIndex.value) {
    nextIdx = currentIndex.value - 1
  }
  currentIndex.value = nextIdx
  const next = slides.value[nextIdx]
  if (next && editorRef.value) {
    editorRef.value.setDocument(next)
    setTimeout(() => editorRef.value?.fitToViewport(), 60)
  }
  scheduleChange()
}

function duplicateSlideAt(i: number) {
  pushDeckSnapshot()
  const dup: AvnacDocumentV1 = JSON.parse(JSON.stringify(slides.value[i]))
  const insertAt = i + 1
  slides.value.splice(insertAt, 0, dup)
  if (i >= currentIndex.value) {
    switchSlide(insertAt)
  } else {
    currentIndex.value = currentIndex.value + 1
  }
  scheduleChange()
}

function moveSlide(from: number, to: number) {
  if (to < 0 || to >= slides.value.length || from === to) return
  pushDeckSnapshot()
  const [moved] = slides.value.splice(from, 1)
  slides.value.splice(to, 0, moved)
  if (from === currentIndex.value) {
    currentIndex.value = to
  } else if (from < currentIndex.value && to >= currentIndex.value) {
    currentIndex.value = currentIndex.value - 1
  } else if (from > currentIndex.value && to <= currentIndex.value) {
    currentIndex.value = currentIndex.value + 1
  }
  scheduleChange()
}

function selectAll() {
  const canvas = getCanvas()
  if (!canvas) return
  import('fabric').then((mod: any) => {
    const objects = canvas.getObjects()
    if (!objects.length) return
    const sel = new mod.ActiveSelection(objects, { canvas })
    canvas.setActiveObject(sel)
    canvas.requestRenderAll()
  })
}

// ─── Sidebar / panels ───────────────────────────────────────────────────────
function togglePanel(id: EditorSidebarPanelId) {
  activePanel.value = activePanel.value === id ? null : id
}

const layerRows = computed<EditorLayerRow[]>(() => {
  const lp = editorRef.value?.layerPanel
  if (!lp) return []
  return lp.layers.value.map((l: any) => ({
    id: l.id as string,
    stackIndex: l.index as number,
    label: (l.label as string) || 'Layer',
    visible: (l.visible as boolean) ?? true,
    selected: (l.selected as boolean) ?? false,
  }))
})

function onAddImageFromUrl(opts: { url: string; onLoad?: () => void }) {
  return editorRef.value?.shapeTools.addImageFromUrl(opts) ?? Promise.resolve(null)
}

function onAddImageFromFile(file: File) {
  return editorRef.value?.shapeTools.addImageFromFile(file)
}

function onTemplateInsert(doc: AvnacDocumentV1) {
  if (!editorRef.value) return
  editorRef.value.setDocument(doc)
  setTimeout(() => editorRef.value?.fitToViewport(), 60)
}

function onVectorBoardChange(doc: VectorBoardDocument) {
  vectorBoardDoc.value = doc
}

function onVectorBoardSave(doc: VectorBoardDocument) {
  vectorBoardDoc.value = doc
}

function onVectorBoardSaveAndPlace(doc: VectorBoardDocument) {
  vectorBoardDoc.value = doc
  activePanel.value = null
}

// ─── Bottom bar / shape insertion ───────────────────────────────────────────
function onShapePick(kind: string) {
  editorRef.value?.shapeTools.addShapeByKind(kind)
}

function onAddText() {
  editorRef.value?.shapeTools.addText()
}

function onAddImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    editorRef.value?.shapeTools.addImageFromFile(file)
  }
  input.click()
}

function onBgChange(v: BgValue) {
  canvasStore.bgValue = v
  // Apply to fabric canvas live
  const canvas = getCanvas()
  if (!canvas) return
  if (v.type === 'solid') {
    canvas.backgroundColor = v.color
  }
  canvas.requestRenderAll()
}

// ─── Toolbar event handlers ─────────────────────────────────────────────────
function getCanvas(): any {
  const fc = editorRef.value?.fabricCanvas
  if (!fc) return null
  return (fc as any).value ?? fc ?? null
}

function onPaintChange(v: BgValue) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  Promise.all([import('@avnac/lib/avnac-fill-paint'), import('fabric')]).then(([{ applyBgValueToFill }, mod]) => {
    applyBgValueToFill(mod, active, v)
    canvas.requestRenderAll()
    canvasStore.selectedPaint = v
  })
}

function onTextFormatChange(partial: Partial<TextFormatToolbarValues>) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject() as any
  if (!active) return

  if (partial.fontFamily !== undefined) active.set('fontFamily', partial.fontFamily)
  if (partial.fontSize !== undefined) active.set('fontSize', partial.fontSize)
  if (partial.bold !== undefined) active.set('fontWeight', partial.bold ? 'bold' : 'normal')
  if (partial.italic !== undefined) active.set('fontStyle', partial.italic ? 'italic' : 'normal')
  if (partial.underline !== undefined) active.set('underline', partial.underline)
  if (partial.textAlign !== undefined) active.set('textAlign', partial.textAlign)
  if (partial.lineHeight !== undefined) active.set('lineHeight', partial.lineHeight)
  if (partial.fillStyle !== undefined) {
    Promise.all([import('@avnac/lib/avnac-fill-paint'), import('fabric')]).then(([{ applyBgValueToFill }, mod]) => {
      applyBgValueToFill(mod, active, partial.fillStyle!)
      canvas.requestRenderAll()
    })
    return
  }
  canvas.requestRenderAll()
}

function onShapePaintChange(v: BgValue) {
  onPaintChange(v)
}

function onCornerRadiusChange(v: number) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject() as any
  if (!active) return
  import('@avnac/lib/fabric-corner-radius').then(({ setSceneCornerRadiusOnRect }) => {
    setSceneCornerRadiusOnRect(active, v)
    canvas.requestRenderAll()
  })
}

function onImageCornerRadiusChange(v: number) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject() as any
  if (!active) return
  Promise.all([import('@avnac/lib/fabric-corner-radius'), import('fabric')]).then(([{ setSceneCornerRadiusOnImage }, mod]) => {
    setSceneCornerRadiusOnImage(active, v, mod)
    canvas.requestRenderAll()
  })
}

function onStrokeWidthChange(v: number) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  const targets = 'multiSelectionStacking' in active ? canvas.getActiveObjects() : [active]
  for (const o of targets) {
    o.set({ strokeWidth: v })
    o.set('dirty', true)
    o.setCoords()
  }
  canvas.requestRenderAll()
  canvasStore.selectionOutlineStrokeWidth = v
}

function onStrokePaintChange(v: BgValue) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  const targets = 'multiSelectionStacking' in active ? canvas.getActiveObjects() : [active]
  Promise.all([import('@avnac/lib/avnac-fill-paint'), import('fabric')]).then(([{ applyBgValueToStroke }, mod]) => {
    for (const o of targets) applyBgValueToStroke(mod, o, v)
    canvas.requestRenderAll()
    canvasStore.selectionOutlineStrokePaint = v
  })
}

function onBlurChange(v: number) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  const clamped = Math.max(0, Math.min(100, Math.round(v)))
  if ('multiSelectionStacking' in active) {
    for (const o of canvas.getActiveObjects()) {
      o.set({ avnacBlur: clamped } as any)
      o.set('dirty', true)
    }
  } else {
    active.set({ avnacBlur: clamped } as any)
    active.set('dirty', true)
  }
  canvas.requestRenderAll()
  canvasStore.selectionBlurPct = v
}

function onOpacityChange(v: number) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  active.set('opacity', v / 100)
  canvas.requestRenderAll()
  canvasStore.selectionOpacityPct = v
}

function onShadowChange(v: FabricShadowUi) {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  Promise.all([import('@avnac/lib/avnac-fabric-shadow'), import('fabric')]).then(([{ buildFabricShadow }, mod]) => {
    const sh = buildFabricShadow(mod, v)
    const targets = 'multiSelectionStacking' in active ? canvas.getActiveObjects() : [active]
    for (const o of targets) o.set('shadow', sh)
    canvas.requestRenderAll()
    canvasStore.selectionShadowUi = v
  })
}

function onShadowToggle() {
  const canvas = getCanvas()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!active) return
  const newActive = !canvasStore.selectionShadowActive
  Promise.all([import('@avnac/lib/avnac-fabric-shadow'), import('fabric')]).then(([{ buildFabricShadow }, mod]) => {
    const sh = newActive ? buildFabricShadow(mod, canvasStore.selectionShadowUi) : null
    const targets = 'multiSelectionStacking' in active ? canvas.getActiveObjects() : [active]
    for (const o of targets) o.set('shadow', sh)
    canvas.requestRenderAll()
    canvasStore.selectionShadowActive = newActive
  })
}

function onDeleteSelected() {
  const canvas = getCanvas()
  if (!canvas) return
  import('@avnac/lib/fabric-remove-selection').then(({ removeActiveObjectFromCanvas }) => {
    removeActiveObjectFromCanvas(canvas)
    canvas.requestRenderAll()
    canvasStore.clearSelection()
  })
}

// ─── Layer panel operations ─────────────────────────────────────────────────
function onSelectLayer(stackIndex: number) {
  editorRef.value?.layerPanel.selectByIndex(stackIndex)
}
function onToggleVisible(stackIndex: number) {
  editorRef.value?.layerPanel.toggleVisible(stackIndex)
}
function onBringForward(stackIndex: number) {
  editorRef.value?.layerPanel.bringForward(stackIndex)
}
function onSendBackward(stackIndex: number) {
  editorRef.value?.layerPanel.sendBackward(stackIndex)
}
function onReorderLayers(fromIndex: number, toIndex: number) {
  const lp = editorRef.value?.layerPanel
  if (!lp) return
  const rows = [...lp.layers.value]
  const [moved] = rows.splice(fromIndex, 1)
  rows.splice(toIndex, 0, moved)
  lp.reorderById(rows.map((r: any) => r.id as string))
}
function onRenameLayer(stackIndex: number, name: string) {
  editorRef.value?.layerPanel.renameLayer(stackIndex, name)
}

// ─── PPTX import / export (current slide only at this stage) ────────────────
async function onExportPptx() {
  // Persist current first
  const current = editorRef.value?.getDocument()
  if (current) slides.value[currentIndex.value] = current
  await exportDocumentsToPptx(JSON.parse(JSON.stringify(slides.value)))
}

async function onImportPptx() {
  try {
    const docs = await importPptxFromInput()
    if (!docs.length) return
    slides.value = JSON.parse(JSON.stringify(docs))
    currentIndex.value = 0
    initialDoc.value = slides.value[0]
    if (editorRef.value) {
      await editorRef.value.setDocument(slides.value[0])
      setTimeout(() => editorRef.value?.fitToViewport(), 60)
    }
    scheduleChange()
  } catch (err) {
    console.error('[avnac] PPTX import failed', err)
  }
}

// ─── Insert infographic / diagram ───────────────────────────────────────────
// Helpers to create child objects. Shape children are non-interactive (structural).
// Textbox children are selectable+evented so they can be double-clicked to edit text.
function onInsertInfographic(data: AvnacInfographicData) {
  const canvas = getCanvas()
  if (!canvas) return
  Promise.all([import('@avnac/lib/avnac-infographic-render'), import('fabric')]).then(([{ renderInfographic }, mod]) => {
    const specs = renderInfographic(data)
    const children: any[] = []
    for (const s of specs) {
      if (s.type === 'Rect') {
        children.push(new (mod as any).Rect({ left: s.left, top: s.top, width: s.width, height: s.height, fill: s.fill ?? '#ccc', rx: s.rx ?? 0, ry: s.ry ?? 0, strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Polygon' && s.points) {
        children.push(new (mod as any).Polygon(s.points, { fill: s.fill ?? '#ccc', strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Ellipse') {
        children.push(new (mod as any).Ellipse({ left: s.left, top: s.top, rx: s.rx ?? s.width / 2, ry: s.ry ?? s.height / 2, fill: s.fill ?? '#ccc', strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Circle') {
        children.push(new (mod as any).Circle({ left: s.left, top: s.top, radius: s.radius ?? 10, fill: s.fill ?? '#ccc', strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Textbox' && s.text) {
        // Textbox children are editable — selectable + evented so double-click enters editing
        children.push(new (mod as any).Textbox(s.text, { left: s.left, top: s.top, width: s.width, fontSize: s.fontSize ?? 12, fontWeight: s.fontWeight ?? 'normal', textAlign: s.textAlign ?? 'left', fill: s.fill ?? '#262626', selectable: true, evented: true }))
      }
    }
    const doc = editorRef.value?.getDocument()
    const artW = doc?.artboard.width ?? 4000
    const artH = doc?.artboard.height ?? 2250
    const group = new (mod as any).Group(children, {
      left: artW / 2, top: artH / 2,
      originX: 'center', originY: 'center',
      subTargetCheck: true,   // allow clicking through to textbox children
      avnacShape: { kind: 'infographic', template: data.template },
      avnacInfographic: data,
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
  })
}

function onInsertDiagram(data: AvnacDiagramData) {
  const canvas = getCanvas()
  if (!canvas) return
  Promise.all([import('@avnac/lib/avnac-diagram-render'), import('fabric')]).then(([{ renderDiagram }, mod]) => {
    const specs = renderDiagram(data)
    const children: any[] = []
    for (const s of specs) {
      if (s.type === 'Rect') {
        children.push(new (mod as any).Rect({ left: s.left, top: s.top, width: s.width, height: s.height, fill: s.fill ?? '#4472c4', rx: s.rx ?? 0, ry: s.ry ?? 0, strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Polygon' && s.points) {
        children.push(new (mod as any).Polygon(s.points, { fill: s.fill ?? '#ccc', strokeWidth: 0, selectable: false, evented: false }))
      } else if (s.type === 'Textbox' && s.text) {
        // Textbox children are editable
        children.push(new (mod as any).Textbox(s.text, { left: s.left, top: s.top, width: s.width, fontSize: s.fontSize ?? 12, fontWeight: s.fontWeight ?? 'bold', textAlign: s.textAlign ?? 'center', fill: s.fill ?? '#ffffff', selectable: true, evented: true }))
      } else if (s.type === 'Line' && s.x1 !== undefined) {
        children.push(new (mod as any).Line([s.x1, s.y1!, s.x2!, s.y2!], { stroke: s.stroke ?? '#888', strokeWidth: s.strokeWidth ?? 1.5, selectable: false, evented: false }))
      }
    }
    const doc2 = editorRef.value?.getDocument()
    const artW2 = doc2?.artboard.width ?? 4000
    const artH2 = doc2?.artboard.height ?? 2250
    const group = new (mod as any).Group(children, {
      left: artW2 / 2, top: artH2 / 2,
      originX: 'center', originY: 'center',
      subTargetCheck: true,   // allow clicking through to textbox children
      avnacShape: { kind: 'diagram' },
      avnacDiagram: data,
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
  })
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
function onGlobalKeydown(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey)) return
  const target = e.target as HTMLElement
  // Don't intercept text inputs
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  if ((target as HTMLElement).isContentEditable) return
  // CanvasEditor handles undo/redo when the canvas area is focused
  if (target.closest?.('.avnac-editor')) return
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
  if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); return }
}

onMounted(() => {
  const initial = props.initialSlides?.length ? props.initialSlides : []
  if (initial.length > 0) {
    slides.value = JSON.parse(JSON.stringify(initial))
    initialDoc.value = slides.value[0]
  } else {
    const def = createDefaultSlide()
    slides.value = [def]
    initialDoc.value = def
  }
  window.addEventListener('keydown', onGlobalKeydown, true)
})

onBeforeUnmount(() => {
  if (changeTimer) clearTimeout(changeTimer)
  window.removeEventListener('keydown', onGlobalKeydown, true)
})

defineExpose({
  getSlides(): AvnacDocumentV1[] {
    const current = editorRef.value?.getDocument()
    if (current) slides.value[currentIndex.value] = current
    return JSON.parse(JSON.stringify(slides.value))
  },
  setSlides(docs: AvnacDocumentV1[]) {
    if (!docs.length) return
    slides.value = JSON.parse(JSON.stringify(docs))
    currentIndex.value = 0
    initialDoc.value = slides.value[0]
    editorRef.value?.setDocument(slides.value[0])
    setTimeout(() => editorRef.value?.fitToViewport(), 60)
  },
  addSlide,
  duplicateCurrentSlide: () => duplicateSlideAt(currentIndex.value),
  deleteCurrentSlide: deleteSlide,
  exportPptx: onExportPptx,
  importPptx: onImportPptx,
  addText: onAddText,
  addImage: onAddImage,
  addShape: onShapePick,
  selectAll,
  setZoom: (pct: number) => editorRef.value?.setZoom(pct),
  fitToViewport: () => editorRef.value?.fitToViewport(),
  undo,
  redo,
})
</script>

<style scoped>
.avnac-host {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  background: var(--bg-canvas, #f4f4f5);
}

.avnac-slide-strip {
  display: flex;
  flex-direction: column;
  width: 88px;
  flex-shrink: 0;
  border-right: 1px solid var(--border, #e4e4e7);
  background: var(--surface, #fff);
  overflow: hidden;
}

.avnac-slide-strip__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}


.avnac-slide-strip__actions {
  display: flex;
  border-top: 1px solid var(--border, #e4e4e7);
  padding: 4px 6px;
  gap: 4px;
}

.avnac-slide-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--fg-muted, #71717a);
}

.avnac-slide-action-btn:hover:not(:disabled) {
  background: var(--bg-subtle, #f4f4f5);
  color: var(--fg, #18181b);
}

.avnac-slide-action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.avnac-host__editor-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.avnac-host__editor {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.avnac-host__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #71717a;
  font-size: 14px;
  background: var(--bg-canvas, #f4f4f5);
  z-index: 100;
}

.avnac-host__spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid #e4e4e7;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: avnac-spin 0.7s linear infinite;
}

@keyframes avnac-spin {
  to { transform: rotate(360deg); }
}
</style>

<!-- Non-scoped CSS — applies to slot children rendered into CanvasEditor -->
<style>
.avnac-host {
  --accent: #6366f1;
  --accent-subtle: #eef2ff;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-subtle: #fafafa;
  --bg-subtle: #f4f4f5;
  --bg-canvas: #f4f4f5;
  --border: rgba(0,0,0,0.08);
  --border-default: #e4e4e7;
  --text: #0a0a0a;
  --text-muted: #525252;
  --text-subtle: #737373;
  --fg: #18181b;
  --fg-default: #262626;
  --fg-muted: #71717a;
  --fg-subtle: #a1a1aa;
  --hover: #f5f5f5;
}

.avnac-sidebar-stack {
  display: flex;
  gap: 8px;
  padding: 12px;
  align-items: flex-start;
  pointer-events: none;
}
.avnac-sidebar-stack > * {
  pointer-events: auto;
}

.avnac-side-panel {
  min-width: 260px;
  max-width: 320px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: var(--surface-raised, #fff);
  border: 1px solid var(--border-default, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.avnac-bottom-bar-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
}

.avnac-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--border-default, #e0e0e0);
  background: var(--surface-raised, #fff);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: var(--fg-default, #262626);
}
.avnac-icon-btn:hover {
  background: var(--bg-subtle, #f0f0f0);
}
</style>
