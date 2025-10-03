<template>
  <div class="ven-editor" :class="{ 'ven-editor--readonly': !editable }">
    <header class="ven-editor__chrome" :class="{ 'is-expanded': isRibbonExpanded }">
      <VenEditorToolbar
        :editor="editor"
        :is-expanded="isRibbonExpanded"
        :font-families="fontFamilies"
        :font-sizes="fontSizes"
        :font-colors="fontColors"
        :page-orientation="pageOrientation"
        :page-columns="pageColumns"
        @toggle-expanded="toggleRibbon"
        @save="handleToolbarSave"
        @change-orientation="setOrientation"
        @change-columns="setColumns"
        @export="emit('export', $event)"
      />

      <div v-if="!isRibbonExpanded" class="ven-editor__page-settings">
        <button class="ven-editor__page-settings-toggle" @click="isPageSettingsOpen = !isPageSettingsOpen" :title="isPageSettingsOpen ? 'Hide page settings' : 'Show page settings'">
          <span class="settings-icon">⚙</span>
          <span class="toggle-text">Page Settings</span>
        </button>
        
        <transition name="settings-expand">
          <div v-if="isPageSettingsOpen" class="ven-editor__page-settings-panel">
            <div class="ven-editor__page-settings-controls">
              <div class="ven-editor__setting-group">
                <label class="ven-editor__setting-label">Margin:</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  :value="pageMargins.top"
                  @input="setUniformMargin($event)"
                  class="ven-editor__setting-slider"
                />
                <span class="ven-editor__setting-value">
                  {{ pageMargins.top.toFixed(1) }}in ({{ (pageMargins.top * 2.54).toFixed(1) }}cm)
                </span>
                <div class="ven-editor__preset-buttons">
                  <button @click="setMarginPreset(0.5)" class="ven-editor__preset-btn" :class="{ active: isMarginPreset(0.5) }">Narrow</button>
                  <button @click="setMarginPreset(1)" class="ven-editor__preset-btn" :class="{ active: isMarginPreset(1) }">Normal</button>
                  <button @click="setMarginPreset(1.5)" class="ven-editor__preset-btn" :class="{ active: isMarginPreset(1.5) }">Wide</button>
                  <button @click="setMarginPreset(2)" class="ven-editor__preset-btn" :class="{ active: isMarginPreset(2) }">Extra Wide</button>
                </div>
              </div>
              <div class="ven-editor__setting-group">
                <label class="ven-editor__setting-label">Gap:</label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  :value="pageGap"
                  @input="setPageGap($event)"
                  class="ven-editor__setting-slider"
                />
                <span class="ven-editor__setting-value">
                  {{ pageGap.toFixed(1) }}cm ({{ (pageGap / 2.54).toFixed(2) }}in)
                </span>
                <div class="ven-editor__preset-buttons">
                  <button @click="setGapPreset(0.3)" class="ven-editor__preset-btn" :class="{ active: isGapPreset(0.3) }">Small</button>
                  <button @click="setGapPreset(0.8)" class="ven-editor__preset-btn" :class="{ active: isGapPreset(0.8) }">Normal</button>
                  <button @click="setGapPreset(1.5)" class="ven-editor__preset-btn" :class="{ active: isGapPreset(1.5) }">Large</button>
                  <button @click="setGapPreset(2.5)" class="ven-editor__preset-btn" :class="{ active: isGapPreset(2.5) }">Extra Large</button>
                </div>
              </div>
              <div class="ven-editor__setting-group">
                <label class="ven-editor__setting-label">Padding:</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  :value="pagePadding"
                  @input="setPagePadding($event)"
                  class="ven-editor__setting-slider"
                />
                <span class="ven-editor__setting-value">
                  {{ pagePadding.toFixed(1) }}px ({{ (pagePadding / 37.8).toFixed(1) }}cm)
                </span>
                <div class="ven-editor__preset-buttons">
                  <button @click="setPaddingPreset(2)" class="ven-editor__preset-btn" :class="{ active: isPaddingPreset(2) }">Narrow</button>
                  <button @click="setPaddingPreset(5)" class="ven-editor__preset-btn" :class="{ active: isPaddingPreset(5) }">Normal</button>
                  <button @click="setPaddingPreset(7.5)" class="ven-editor__preset-btn" :class="{ active: isPaddingPreset(7.5) }">Wide</button>
                  <button @click="setPaddingPreset(10)" class="ven-editor__preset-btn" :class="{ active: isPaddingPreset(10) }">Extra Wide</button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </header>
    <div class="ven-editor__workspace">
      <div class="ven-editor__page-container">
        <div class="ven-editor__page-shadow">
          <div class="ven-editor__page" :style="pageStyle">
            <div class="ven-editor__content" :style="contentStyle">
              <div ref="contentElement" class="ven-editor__editor-host" />
              <div v-if="!editor" class="ven-editor__loading">Loading editor...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="ven-editor__status-bar">
      <div class="ven-editor__status-item">Word count: {{ wordCount }}</div>
      <div class="ven-editor__status-item">Characters: {{ characterCount }}</div>
      <div class="ven-editor__status-item">Zoom: {{ (zoom * 100).toFixed(0) }}%</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Mathematics from '@aarkue/tiptap-math-extension'
import { ImagePlus } from 'tiptap-image-plus'

import { PaginationPlus } from 'tiptap-pagination-plus';
import VenEditorToolbar from './VenEditorToolbar.vue'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

interface FontOption {
  value: string
  label: string
}

interface EditorSnapshot {
  html: string
  json: unknown
}

interface VenEditorProps {
  modelValue: string
  title?: string
  editable?: boolean
  placeholder?: string
  pagination?: Record<string, unknown>
  zoom?: number
}

const props = withDefaults(
  defineProps<VenEditorProps>(),
  {
    modelValue: '',
    title: 'Untitled document',
    editable: true,
    placeholder: 'Write something…',
    zoom: 1,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:title', value: string): void
  (e: 'ready', editor: Editor): void
  (e: 'focus'): void
  (e: 'blur'): void
  (e: 'transaction', payload: { html: string; json: unknown }): void
  (e: 'save', payload?: EditorSnapshot): void
  (e: 'auto-save', payload: { html: string; json: unknown }): void
  (e: 'export', format: string): void
  (e: 'toggle-expanded'): void
  (e: 'change-orientation', value: 'portrait' | 'landscape'): void
  (e: 'change-columns', value: number): void
}>()

const editor = ref<Editor | null>(null)
const contentElement = ref<HTMLElement | null>(null)
const editable = computed(() => props.editable)
const zoom = computed(() => props.zoom ?? 1)
const isRibbonExpanded = ref(false)

const pageMargins = reactive({ top: 1, bottom: 1, left: 1, right: 1 })
const pageOrientation = ref<'portrait' | 'landscape'>('portrait')
const pageColumns = ref(1)

const latestSnapshot = ref<EditorSnapshot | null>(null)
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
const autoSaveDelay = 2000
const AUTO_SAVE_STORAGE_KEY = 'ven-editor-autosave'

const persistBackup = (snapshot: EditorSnapshot) => {
  if (typeof window === 'undefined') return

  try {
    const payload = {
      ...snapshot,
      timestamp: Date.now(),
      title: props.title,
    }

    window.localStorage?.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Failed to persist Ven editor backup', error)
  }
}

const captureSnapshot = (): EditorSnapshot | null => {
  const instance = editor.value
  if (!instance) return null

  return {
    html: instance.getHTML(),
    json: instance.getJSON(),
  }
}

const emitAutoSave = (snapshot: EditorSnapshot) => {
  emit('auto-save', snapshot)
}

const scheduleAutoSave = () => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  autoSaveTimeout = setTimeout(() => {
    const snapshot = latestSnapshot.value ?? captureSnapshot()
    if (!snapshot) return

    persistBackup(snapshot)
    emitAutoSave(snapshot)
  }, autoSaveDelay)
}

const handleToolbarSave = () => {
  const snapshot = captureSnapshot()
  if (!snapshot) return

  latestSnapshot.value = snapshot
  persistBackup(snapshot)
  emit('save', snapshot)
}

const fontFamilies: FontOption[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'PT Serif', label: 'PT Serif' },
  { value: 'Crimson Text', label: 'Crimson Text' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
]

const fontSizes = [
  '8',
  '9',
  '10',
  '11',
  '12',
  '14',
  '16',
  '18',
  '20',
  '22',
  '24',
  '26',
  '28',
  '36',
  '48',
  '72',
]

const fontColors = [
  '#111827',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#0EA5E9',
  '#6366F1',
  '#EC4899',
  '#6B7280',
]

const pageGap = ref(0.8)
const pagePadding = ref(5)
const isPageSettingsOpen = ref(false)

const paginationExtension = computed(() =>
  PaginationPlus.configure({
    pageHeight: 842,
    pageGap: 20,
    pageBreakBackground: '#F7F7F8',
    pageHeaderHeight: 24,
    pageFooterHeight: 24,
    footerLeft: 'Page {page}',
    marginTop: 30,
    marginBottom: 48,
    contentMarginTop: 24,
    contentMarginBottom: 24,
    ...(props.pagination ?? {}),
  }),
)

const imagePlusExtension = ImagePlus.configure({ inline: false, allowBase64: true })

const pageStyle = computed<Record<string, string>>(() => {
  const baseWidth = pageOrientation.value === 'portrait' ? '8.5in' : '11in'
  const baseHeight = pageOrientation.value === 'portrait' ? '11in' : '8.5in'

  return {
    width: baseWidth,
    minHeight: baseHeight,
    transform: `scale(${zoom.value})`,
  }
})

const contentStyle = computed<Record<string, string>>(() => {
  const columnStyles: Record<string, string> = {
    columnCount: pageColumns.value.toString(),
    columnGap: pageColumns.value === 1 ? '0px' : '48px',
  }

  const baseMargins = {
    paddingTop: `${pageMargins.top}in`,
    paddingBottom: `${pageMargins.bottom}in`,
    paddingLeft: `${pageMargins.left}in`,
    paddingRight: `${pageMargins.right}in`,
  }

  return {
    ...baseMargins,
    ...columnStyles,
  }
})

const createEditor = async () => {
  await nextTick()
  if (!contentElement.value) return

  const instance = new Editor({
    element: contentElement.value,
    content: props.modelValue,
    editable: editable.value,
    extensions: [
      StarterKit.configure({
        history: { depth: 100 },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({ placeholder: props.placeholder }),
      CharacterCount.configure(),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),

      paginationExtension.value,
      imagePlusExtension,
    ],
    onUpdate({ editor }) {
      const snapshot: EditorSnapshot = {
        html: editor.getHTML(),
        json: editor.getJSON(),
      }

      latestSnapshot.value = snapshot
      emit('update:modelValue', snapshot.html)
      emit('transaction', snapshot)
      scheduleAutoSave()
    },
    onFocus() {
      emit('focus')
    },
    onBlur() {
      emit('blur')
    },
  })

  editor.value = instance
  emit('ready', instance)
}

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = null
})

watch(
  () => props.modelValue,
  (next) => {
    const editorInstance = editor.value
    if (!editorInstance) return
    const current = editorInstance.getHTML()
    if (next === current) return
    
    // Support both HTML and JSON content
    try {
      if (next.trim().startsWith('{') || next.trim().startsWith('[')) {
        // Try to parse as JSON
        const parsed = JSON.parse(next)
        editorInstance.commands.setContent(parsed, false)
      } else {
        // Treat as HTML
        editorInstance.commands.setContent(next, false)
      }
    } catch {
      // If JSON parse fails, treat as HTML
      editorInstance.commands.setContent(next, false)
    }
  },
)

watch(editable, (value) => {
  editor.value?.setEditable(value)
})

watch(pageMargins, (next) => {
  next.top = clampMargin(next.top)
  next.bottom = clampMargin(next.bottom)
  next.left = clampMargin(next.left)
  next.right = clampMargin(next.right)
}, { deep: true })

watch(pageColumns, (value) => {
  if (value < 1) pageColumns.value = 1
  if (value > 3) pageColumns.value = 3
})

const toggleRibbon = () => {
  isRibbonExpanded.value = !isRibbonExpanded.value
}

const setOrientation = (value: 'portrait' | 'landscape') => {
  pageOrientation.value = value
}

const setColumns = (value: number) => {
  pageColumns.value = Math.min(Math.max(value, 1), 3)
}

const clampMargin = (value: number) => {
  if (Number.isNaN(value)) return 1
  return Math.min(Math.max(value, 0), 5)
}

const setUniformMargin = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  pageMargins.top = value
  pageMargins.bottom = value
  pageMargins.left = value
  pageMargins.right = value
}

const setMarginPreset = (value: number) => {
  pageMargins.top = value
  pageMargins.bottom = value
  pageMargins.left = value
  pageMargins.right = value
}

const isMarginPreset = (value: number) => {
  return pageMargins.top === value && pageMargins.bottom === value && 
         pageMargins.left === value && pageMargins.right === value
}

const setPageGap = (event: Event) => {
  const target = event.target as HTMLInputElement
  pageGap.value = parseFloat(target.value)
}

const setGapPreset = (value: number) => {
  pageGap.value = value
}

const isGapPreset = (value: number) => {
  return Math.abs(pageGap.value - value) < 0.01
}

const setPagePadding = (event: Event) => {
  const target = event.target as HTMLInputElement
  pagePadding.value = parseFloat(target.value)
}

const setPaddingPreset = (value: number) => {
  pagePadding.value = value
}

const isPaddingPreset = (value: number) => {
  return Math.abs(pagePadding.value - value) < 0.01
}

const wordCount = computed(() => {
  const storage = (editor.value?.storage?.characterCount as any)
  return storage?.words?.() ?? 0
})

const characterCount = computed(() => {
  const storage = (editor.value?.storage?.characterCount as any)
  return storage?.characters?.() ?? 0
})
</script>

<style scoped>
.ven-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  color: #1f2933;
}

.ven-editor--readonly {
  background: #f3f4f6;
}

.ven-editor__chrome {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.ven-editor__chrome.is-expanded {
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.08);
}

.ven-editor__page-settings {
  background: linear-gradient(180deg, #fafbfc 0%, #f5f6f8 100%);
  border-top: 1px solid #e5e7eb;
}

.ven-editor__page-settings-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.ven-editor__page-settings-toggle:hover {
  background: rgba(59, 130, 246, 0.05);
  color: #3b82f6;
}

.settings-icon {
  font-size: 1rem;
}

.toggle-text {
  flex: 1;
  text-align: left;
}

.caret-icon {
  font-size: 0.625rem;
  transition: transform 0.3s ease;
}

.caret-icon.is-open {
  transform: rotate(180deg);
}

.ven-editor__page-settings-panel {
  padding: 0 20px 16px;
  overflow: hidden;
}

.settings-expand-enter-active,
.settings-expand-leave-active {
  transition: all 0.3s ease;
}

.settings-expand-enter-from,
.settings-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.settings-expand-enter-to,
.settings-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

.ven-editor__page-settings-controls {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.ven-editor__setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.ven-editor__setting-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.ven-editor__setting-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.ven-editor__setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.ven-editor__setting-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.ven-editor__setting-value {
  font-size: 0.75rem;
  color: #374151;
  font-weight: 500;
}

.ven-editor__preset-buttons {
  display: flex;
  gap: 4px;
}

.ven-editor__preset-btn {
  padding: 4px 12px;
  font-size: 0.6875rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #6b7280;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.ven-editor__preset-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.ven-editor__preset-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.ven-editor__workspace {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  padding: 2rem 0 4rem;
}

.ven-editor__page-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.ven-editor__page-shadow {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.02) 100%);
  padding: 2.5rem 3.5rem;
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.ven-editor__page {
  background: #ffffff;
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.1), 0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
  border-radius: 12px;
  overflow: hidden;
  transform-origin: top center;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.ven-editor__content {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  font-size: 1rem;
  line-height: 1.6;
  color: #111827;
  position: relative;
}

.ven-editor__editor-host {
  min-height: 100%;
}

.ven-editor__content :deep(p) {
  margin: 0.5rem 0;
}

/* Table styles */
.ven-editor__content :deep(table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
}

.ven-editor__content :deep(td),
.ven-editor__content :deep(th) {
  min-width: 60px;
  min-height: 32px;
  border: 2px solid #d1d5db;
  padding: 0px 12px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
  background-clip: padding-box;
}

.ven-editor__content :deep(th) {
  font-weight: 600;
  text-align: left;
  background-color: #f3f4f6;
}

.ven-editor__content :deep(.selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: '';
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
}

.ven-editor__content :deep(.column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #3b82f6;
  pointer-events: none;
}

.ven-editor__content :deep(.tableWrapper) {
  padding: 1rem 0;
  overflow-x: auto;
}

.ven-editor__content :deep(.resize-cursor) {
  cursor: ew-resize;
  cursor: col-resize;
}

.ven-editor__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #64748b;
  pointer-events: none;
}

.ven-editor__status-bar {
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.8125rem;
  color: #6b7280;
  background: linear-gradient(90deg, rgba(249, 250, 251, 0.9) 0%, rgba(243, 244, 246, 0.95) 100%);
  border-top: 1px solid #e5e7eb;
}

.ven-editor__status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
