<template>
  <div class="ven-editor" :class="{ 'ven-editor--readonly': !editable }">
    <header class="ven-editor__toolbar shadow-sm">
      <div class="ven-editor__title-group">
        <input
          v-model="titleInput"
          class="ven-editor__title"
          :readonly="!editable"
          placeholder="Untitled document"
          @keydown.stop
        />
        <div class="ven-editor__meta">
          <span class="ven-editor__menu">File</span>
          <span class="ven-editor__menu">Edit</span>
          <span class="ven-editor__menu">View</span>
          <span class="ven-editor__menu">Insert</span>
          <span class="ven-editor__menu">Format</span>
          <span class="ven-editor__menu">Tools</span>
        </div>
      </div>
      <div class="ven-editor__controls">
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive('undo') }"
          type="button"
          @click="runCommand('undo')"
        >
          ⟲
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive('redo') }"
          type="button"
          @click="runCommand('redo')"
        >
          ⟳
        </button>
        <span class="ven-editor__divider" />
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive('bold') }"
          type="button"
          @mousedown.prevent
          @click="toggleMark('bold')"
        >
          B
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive('italic') }"
          type="button"
          @mousedown.prevent
          @click="toggleMark('italic')"
        >
          I
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive('underline') }"
          type="button"
          @mousedown.prevent
          @click="toggleMark('underline')"
        >
          U
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive({ textAlign: 'left' }) }"
          type="button"
          @click="setTextAlign('left')"
        >
          ⬉
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive({ textAlign: 'center' }) }"
          type="button"
          @click="setTextAlign('center')"
        >
          ⬈
        </button>
        <button
          class="ven-editor__control"
          :class="{ 'is-active': isActive({ textAlign: 'right' }) }"
          type="button"
          @click="setTextAlign('right')"
        >
          ⬊
        </button>
      </div>
    </header>

    <div class="ven-editor__workspace">
      <div class="ven-editor__page-container">
        <div class="ven-editor__page-shadow">
          <div class="ven-editor__page" :style="pageStyle">
            <EditorContent v-if="editor" :editor="editor as Editor" />
            <div v-else class="ven-editor__loading">Loading editor...</div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { PaginationTable } from 'tiptap-table-plus'
import { ImagePlus } from 'tiptap-image-plus'

const props = withDefaults(
  defineProps<{
    modelValue: string
    title?: string
    editable?: boolean
    placeholder?: string
    pagination?: Record<string, unknown>
    zoom?: number
  }>(),
  {
    modelValue: '',
    title: 'Untitled document',
    editable: true,
    placeholder: 'Write something…',
    pagination: () => ({}),
    zoom: 1,
  },
)

const imagePlusExtension = ImagePlus.configure({ inline: false, allowBase64: true })

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:title', value: string): void
  (e: 'ready', editor: Editor): void
  (e: 'focus'): void
  (e: 'blur'): void
  (e: 'transaction', payload: { html: string; json: unknown }): void
}>()

const editor = ref<Editor | null>(null)
const titleInput = ref(props.title)
const editable = computed(() => props.editable)
const zoom = computed(() => props.zoom)

const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable

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

const pageStyle = computed<Record<string, string>>(() => ({
  transform: `scale(${zoom.value})`,
}))

const initializeEditor = () => {
  const instance = new Editor({
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
      FontFamily,
      Underline,
      Link.configure({ openOnClick: false }),
      TablePlus,
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,
      paginationExtension.value,
      imagePlusExtension,
    ],
    onUpdate({ editor }) {
      const html = editor.getHTML()
      emit('update:modelValue', html)
      emit('transaction', { html, json: editor.getJSON() })
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
  initializeEditor()
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
    editorInstance.commands.setContent(next, false)
  },
)

watch(editable, (value) => {
  editor.value?.setEditable(value)
})

watch(
  () => props.title,
  (value) => {
    if (value !== titleInput.value) {
      titleInput.value = value
    }
  },
)

watch(titleInput, (value) => {
  emit('update:title', value)
})

const isActive = (name: string | Record<string, unknown>) => {
  if (!editor.value) return false
  if (typeof name === 'string') {
    switch (name) {
      case 'undo':
        return false
      case 'redo':
        return false
      default:
        return editor.value.isActive(name)
    }
  }
  return editor.value.isActive(name as any)
}

const toggleMark = (mark: 'bold' | 'italic' | 'underline') => {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  switch (mark) {
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'underline':
      chain.toggleUnderline().run()
      break
  }
}

const setTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

const runCommand = (command: 'undo' | 'redo') => {
  if (!editor.value) return
  editor.value.chain().focus()[command]().run()
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

.ven-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #ffffffcc;
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.ven-editor__title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ven-editor__title {
  font-size: 1rem;
  font-weight: 600;
  background: transparent;
  border: none;
  outline: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  min-width: 16rem;
}

.ven-editor__title:focus {
  background: rgba(0, 0, 0, 0.05);
}

.ven-editor__meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #606f7b;
}

.ven-editor__menu {
  cursor: pointer;
}

.ven-editor__controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ven-editor__control {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  color: #2f3a4a;
  transition: background 0.2s, color 0.2s;
}

.ven-editor__control:hover {
  background: rgba(15, 23, 42, 0.08);
}

.ven-editor__control.is-active {
  background: rgba(37, 99, 235, 0.15);
  color: #1d4ed8;
}

.ven-editor__divider {
  width: 1px;
  height: 18px;
  background: rgba(148, 163, 184, 0.6);
  margin: 0 0.5rem;
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
  background: transparent;
  padding: 2rem 0;
}

.ven-editor__page {
  width: 8.5in;
  min-height: 11in;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  margin: 0 auto;
  padding: 1.5in 1.25in 1.75in;
  transform-origin: top center;
  transition: transform 0.2s ease;
}

.ven-editor__page :deep(p) {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0.5rem 0;
}

.ven-editor__loading {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.ven-editor__status-bar {
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  color: #475569;
  background: #ffffff;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.ven-editor__status-item {
  white-space: nowrap;
}

.ven-editor--readonly .ven-editor__title {
  cursor: default;
}
</style>
