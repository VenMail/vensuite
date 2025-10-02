<template>
  <div class="ven-editor__toolbar" :class="{ 'is-expanded': isExpanded }">
    <div class="ven-editor__toolbar-main">
      <button
        class="ven-editor__crystal-toggle"
        :class="{ 'is-expanded': isExpanded }"
        :title="isExpanded ? 'Collapse toolbar' : 'Expand toolbar'"
        @click="handleToggleExpanded"
      >
        <span class="crystal-icon">{{ isExpanded ? '▲' : '▼' }}</span>
      </button>
      <span class="ven-editor__toolbar-divider" />

      <!-- File Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">File</div>
      <div class="ven-editor__toolbar-group">
        <button class="ven-editor__toolbar-btn" title="Save (Ctrl+S)" @click="handleSave">
          💾
        </button>
      </div>

      <span class="ven-editor__toolbar-divider" />

      <!-- Clipboard Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">Clipboard</div>
      <div class="ven-editor__toolbar-group">
        <button class="ven-editor__toolbar-btn" title="Undo (Ctrl+Z)" @click="runEditorCommand('undo')">
          ↶
        </button>
        <button class="ven-editor__toolbar-btn" title="Redo (Ctrl+Y)" @click="runEditorCommand('redo')">
          ↷
        </button>
        <template v-if="isExpanded">
          <button class="ven-editor__toolbar-btn" title="Cut (Ctrl+X)" @click="handleCut">
            ✂
          </button>
          <button class="ven-editor__toolbar-btn" title="Copy (Ctrl+C)" @click="handleCopy">
            📄
          </button>
          <button class="ven-editor__toolbar-btn" title="Paste (Ctrl+V)" @click="handlePaste">
            📋
          </button>
        </template>
      </div>

      <span class="ven-editor__toolbar-divider" />

      <!-- Font Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">Font</div>
      <div class="ven-editor__toolbar-group">
        <select
          class="ven-editor__toolbar-select"
          :value="selectedFontFamily"
          title="Font Family"
          @change="onFontFamilyChange"
        >
          <option value="">Default</option>
          <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
            {{ font.label }}
          </option>
        </select>
        <template v-if="isExpanded">
          <select
            class="ven-editor__toolbar-select ven-editor__toolbar-select--small"
            :value="selectedFontSize"
            title="Font Size"
            @change="onFontSizeChange"
          >
            <option value="">Auto</option>
            <option v-for="size in fontSizes" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </template>
      </div>

      <span class="ven-editor__toolbar-divider" />

      <!-- Styles Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">Styles</div>
      <div class="ven-editor__toolbar-group">
        <template v-if="isExpanded">
          <button
            class="ven-editor__toolbar-btn ven-editor__toolbar-btn--heading"
            :class="{ 'is-active': isActive('heading', { level: 1 }) }"
            title="Heading 1"
            @click="setHeading(1)"
          >
            H1
          </button>
          <button
            class="ven-editor__toolbar-btn ven-editor__toolbar-btn--heading"
            :class="{ 'is-active': isActive('heading', { level: 2 }) }"
            title="Heading 2"
            @click="setHeading(2)"
          >
            H2
          </button>
          <button
            class="ven-editor__toolbar-btn ven-editor__toolbar-btn--heading"
            :class="{ 'is-active': isActive('heading', { level: 3 }) }"
            title="Heading 3"
            @click="setHeading(3)"
          >
            H3
          </button>
          <button
            class="ven-editor__toolbar-btn ven-editor__toolbar-btn--heading"
            :class="{ 'is-active': isActive('heading', { level: 4 }) }"
            title="Heading 4"
            @click="setHeading(4)"
          >
            H4
          </button>
        </template>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('bold') }"
          title="Bold (Ctrl+B)"
          @click="toggleMark('bold')"
        >
          <strong>B</strong>
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('italic') }"
          title="Italic (Ctrl+I)"
          @click="toggleMark('italic')"
        >
          <em>I</em>
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('underline') }"
          title="Underline (Ctrl+U)"
          @click="toggleMark('underline')"
        >
          <u>U</u>
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('strike') }"
          title="Strikethrough"
          @click="toggleStrike"
        >
          <s>S</s>
        </button>
      </div>

      <span class="ven-editor__toolbar-divider" />

      <!-- Paragraph Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">Paragraph</div>
      <div class="ven-editor__toolbar-group">
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('bulletList') }"
          title="Bullet List"
          @click="toggleList('bulletList')"
        >
          ☰
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive('orderedList') }"
          title="Numbered List"
          @click="toggleList('orderedList')"
        >
          ≡
        </button>
      </div>

      <span class="ven-editor__toolbar-divider" />

      <div class="ven-editor__toolbar-group">
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive({ textAlign: 'left' }) }"
          title="Align Left"
          @click="setTextAlign('left')"
        >
          ⫴
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive({ textAlign: 'center' }) }"
          title="Center"
          @click="setTextAlign('center')"
        >
          ≡
        </button>
        <button
          class="ven-editor__toolbar-btn"
          :class="{ 'is-active': isActive({ textAlign: 'right' }) }"
          title="Align Right"
          @click="setTextAlign('right')"
        >
          ⫵
        </button>
      </div>

      <!-- Insert Section -->
      <div v-if="isExpanded" class="ven-editor__section-label">Insert</div>
      <div class="ven-editor__toolbar-group">
        <button class="ven-editor__toolbar-btn" title="Insert Quote" @click="toggleBlockquote">
          "
        </button>

        <Dialog v-model:open="isTableDialogOpen">
          <DialogTrigger asChild>
            <button class="ven-editor__toolbar-btn" title="Insert Table">
              ⊞
            </button>
          </DialogTrigger>
          <DialogContent class="ven-editor__dialog" aria-label="Insert table options">
            <DialogHeader>
              <DialogTitle>Insert Table</DialogTitle>
              <DialogDescription>Select the table layout and confirm to insert it into the document.</DialogDescription>
            </DialogHeader>

            <form class="ven-editor__dialog-form" @submit.prevent="submitTable">
              <div class="ven-editor__dialog-grid">
                <label class="ven-editor__dialog-field">
                  <span>Rows</span>
                  <Input v-model.number="tableRows" type="number" min="1" max="20" required />
                </label>
                <label class="ven-editor__dialog-field">
                  <span>Columns</span>
                  <Input v-model.number="tableColumns" type="number" min="1" max="12" required />
                </label>
              </div>

              <label class="ven-editor__dialog-switch">
                <span>Include header row</span>
                <Switch v-model:checked="tableIncludeHeader" />
              </label>

              <p v-if="tableError" class="ven-editor__dialog-error">{{ tableError }}</p>

              <DialogFooter>
                <Button type="button" variant="outline" @click="isTableDialogOpen = false">Cancel</Button>
                <Button type="submit">Insert Table</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog v-model:open="isImageDialogOpen">
          <DialogTrigger asChild>
            <button class="ven-editor__toolbar-btn" title="Insert Image">
              🖼
            </button>
          </DialogTrigger>
          <DialogContent class="ven-editor__dialog" aria-label="Insert image options">
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
              <DialogDescription>Provide the image URL and optional metadata before inserting.</DialogDescription>
            </DialogHeader>

            <form class="ven-editor__dialog-form" @submit.prevent="submitImage">
              <label class="ven-editor__dialog-field">
                <span>Image URL</span>
                <Input v-model="imageUrl" type="url" placeholder="https://example.com/image.png" required />
              </label>
              <label class="ven-editor__dialog-field">
                <span>Alt text</span>
                <Input v-model="imageAlt" placeholder="Describe the image" />
              </label>

              <div class="ven-editor__dialog-grid">
                <label class="ven-editor__dialog-field">
                  <span>Width (px)</span>
                  <Input v-model.number="imageWidth" type="number" min="1" />
                </label>
                <label class="ven-editor__dialog-field">
                  <span>Height (px)</span>
                  <Input v-model.number="imageHeight" type="number" min="1" />
                </label>
              </div>

              <p v-if="imageError" class="ven-editor__dialog-error">{{ imageError }}</p>

              <DialogFooter>
                <Button type="button" variant="outline" @click="isImageDialogOpen = false">Cancel</Button>
                <Button type="submit">Insert Image</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog v-model:open="isLinkDialogOpen">
          <DialogTrigger asChild>
            <button class="ven-editor__toolbar-btn" title="Insert Link">
              🔗
            </button>
          </DialogTrigger>
          <DialogContent class="ven-editor__dialog" aria-label="Insert link options">
            <DialogHeader>
              <DialogTitle>{{ linkDialogTitle }}</DialogTitle>
              <DialogDescription>Attach a hyperlink to the current selection or insert a new link.</DialogDescription>
            </DialogHeader>

            <form class="ven-editor__dialog-form" @submit.prevent="submitLink">
              <label class="ven-editor__dialog-field">
                <span>URL</span>
                <Input v-model="linkUrl" type="url" placeholder="https://example.com" required />
              </label>

              <label class="ven-editor__dialog-switch">
                <span>Open in new tab</span>
                <Switch v-model:checked="linkOpenInNewTab" />
              </label>

              <p v-if="linkError" class="ven-editor__dialog-error">{{ linkError }}</p>

              <DialogFooter>
                <Button type="button" variant="outline" @click="isLinkDialogOpen = false">Cancel</Button>
                <Button type="submit">Apply Link</Button>
                <Button v-if="canRemoveLink" type="button" variant="destructive" @click="removeLink">Remove Link</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <template v-if="isExpanded">
        <span class="ven-editor__toolbar-divider" />

        <!-- Advanced Formatting Section -->
        <div class="ven-editor__section-label">Advanced</div>
        <div class="ven-editor__toolbar-group">
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('subscript') }"
            title="Subscript"
            @click="toggleSubscript"
          >
            X<sub style="font-size: 0.6em;">₂</sub>
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('superscript') }"
            title="Superscript"
            @click="toggleSuperscript"
          >
            X<sup style="font-size: 0.6em;">²</sup>
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('highlight') }"
            title="Highlight"
            @click="toggleHighlight"
          >
            <span style="background: #fef08a; padding: 0 3px; border-radius: 2px;">ab</span>
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('code') }"
            title="Inline Code"
            @click="toggleInlineCode"
          >
            &lt;/&gt;
          </button>
        </div>

        <span class="ven-editor__toolbar-divider" />

        <!-- Colors Section -->
        <div class="ven-editor__section-label">Colors</div>
        <div class="ven-editor__toolbar-group ven-editor__toolbar-group--palette">
          <button
            v-for="color in fontColors"
            :key="color"
            class="ven-editor__color-swatch"
            :style="{ backgroundColor: color }"
            :title="`Font color ${color}`"
            @click="applyFontColor(color)"
          ></button>
        </div>

        <span class="ven-editor__toolbar-divider" />

        <!-- More Options Section -->
        <div class="ven-editor__section-label">More</div>
        <div class="ven-editor__toolbar-group">
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive({ textAlign: 'justify' }) }"
            title="Justify"
            @click="setTextAlign('justify')"
          >
            ≣
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('taskList') }"
            title="Task List"
            @click="toggleTaskList"
          >
            ☑
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': isActive('codeBlock') }"
            title="Code Block"
            @click="toggleCodeBlock"
          >
            {
          </button>
        </div>

        <span class="ven-editor__toolbar-divider" />

        <!-- Math & Symbols Section -->
        <div class="ven-editor__section-label">Math</div>
        <div class="ven-editor__toolbar-group">
          <button class="ven-editor__toolbar-btn" title="Horizontal Line" @click="insertHorizontalRule">
            ─
          </button>
          <button class="ven-editor__toolbar-btn" title="Math Equation" @click="insertMath">
            ∫
          </button>
          <button class="ven-editor__toolbar-btn" title="Math Block" @click="insertMathBlock">
            ∮
          </button>
        </div>

        <span class="ven-editor__toolbar-divider" />

        <!-- Layout Section -->
        <div class="ven-editor__section-label">Layout</div>
        <div class="ven-editor__toolbar-group">
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': pageOrientation === 'portrait' }"
            @click="handleOrientation('portrait')"
            title="Portrait"
          >
            📄
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': pageOrientation === 'landscape' }"
            @click="handleOrientation('landscape')"
            title="Landscape"
          >
            📃
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': pageColumns === 1 }"
            @click="handleColumns(1)"
            title="1 Column"
          >
            ▐
          </button>
          <button
            class="ven-editor__toolbar-btn"
            :class="{ 'is-active': pageColumns === 2 }"
            @click="handleColumns(2)"
            title="2 Columns"
          >
            ▐▐
          </button>
        </div>

        <span class="ven-editor__toolbar-divider" />

        <!-- Export Section -->
        <div class="ven-editor__section-label">Export</div>
        <div class="ven-editor__toolbar-group">
          <button class="ven-editor__toolbar-btn" @click="handleExport('pdf')" title="Export PDF">
            📄
          </button>
          <button class="ven-editor__toolbar-btn" @click="handleExport('docx')" title="Export Word">
            📝
          </button>
          <button class="ven-editor__toolbar-btn" @click="handleExport('html')" title="Export HTML">
            🌐
          </button>
        </div>
      </template>
    </div>
  </div>

  <BubbleMenu
    v-if="editor?.isEditable"
    :editor="editor"
    :update-delay="150"
    :should-show="shouldShowBubbleMenu"
    :tippy-options="{ placement: 'top', offset: [0, 12], animation: 'shift-away', duration: [150, 100] }"
  >
    <div class="ven-editor__bubble-menu" role="toolbar" aria-label="Selection formatting toolbar">
      <button
        class="ven-editor__bubble-btn"
        :class="{ 'is-active': editor?.isActive('bold') }"
        type="button"
        title="Bold"
        @click="toggleMark('bold')"
      >
        B
      </button>
      <button
        class="ven-editor__bubble-btn"
        :class="{ 'is-active': editor?.isActive('italic') }"
        type="button"
        title="Italic"
        @click="toggleMark('italic')"
      >
        I
      </button>
      <button
        class="ven-editor__bubble-btn"
        :class="{ 'is-active': editor?.isActive('underline') }"
        type="button"
        title="Underline"
        @click="toggleMark('underline')"
      >
        U
      </button>
      <button
        class="ven-editor__bubble-btn"
        :class="{ 'is-active': editor?.isActive('code') }"
        type="button"
        title="Inline code"
        @click="toggleInlineCode"
      >
        &lt;/&gt;
      </button>
      <button
        class="ven-editor__bubble-btn"
        :class="{ 'is-active': editor?.isActive('link') }"
        type="button"
        title="Link"
        @click="openLinkDialogFromBubble"
      >
        🔗
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button class="ven-editor__bubble-btn" type="button" title="Selection colors">
            🎨
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="ven-editor__color-menu" align="start">
          <DropdownMenuLabel>Text</DropdownMenuLabel>
          <div class="ven-editor__color-grid">
            <button
              v-for="color in extendedTextColors"
              :key="`bubble-text-${color}`"
              class="ven-editor__color-option"
              :style="{ backgroundColor: color }"
              type="button"
              @click="applyFontColor(color)"
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Highlight</DropdownMenuLabel>
          <div class="ven-editor__color-grid">
            <button
              v-for="color in highlightColors"
              :key="`bubble-highlight-${color}`"
              class="ven-editor__color-option"
              :style="{ backgroundColor: color }"
              type="button"
              @click="applyHighlightColor(color)"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </BubbleMenu>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BubbleMenu } from '@tiptap/vue-3'

type FontOption = {
  value: string
  label: string
}

const props = defineProps<{
  editor: any
  isExpanded: boolean
  fontFamilies: FontOption[]
  fontSizes: string[]
  fontColors: string[]
  pageOrientation: 'portrait' | 'landscape'
  pageColumns: number
}>()

const emit = defineEmits<{
  (e: 'toggle-expanded'): void
  (e: 'save'): void
  (e: 'change-orientation', value: 'portrait' | 'landscape'): void
  (e: 'change-columns', value: number): void
  (e: 'export', format: string): void
}>()

const {
  editor,
  isExpanded,
  fontFamilies,
  fontSizes,
  fontColors,
  pageOrientation,
  pageColumns,
} = toRefs(props)

const selectedFontFamily = ref('')
const selectedFontSize = ref('')
const isLinkActive = ref(false)

const extendedTextColors = [
  '#111827',
  '#1f2937',
  '#374151',
  '#dc2626',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#10b981',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#94a3b8',
  '#111111',
  '#ffffff',
]

const highlightColors = [
  '#fef08a',
  '#fde68a',
  '#fbcfe8',
  '#bfdbfe',
  '#c4b5fd',
  '#c7d2fe',
  '#bbf7d0',
  '#fecdd3',
  '#fff7ed',
]

const isTableDialogOpen = ref(false)
const tableRows = ref('3')
const tableColumns = ref('3')
const tableIncludeHeader = ref(true)
const tableError = ref('')

const isImageDialogOpen = ref(false)
const imageUrl = ref('')
const imageAlt = ref('')
const imageWidth = ref('')
const imageHeight = ref('')
const imageError = ref('')

const isLinkDialogOpen = ref(false)
const linkUrl = ref('')
const linkOpenInNewTab = ref(false)
const linkError = ref('')

const linkDialogTitle = computed(() => (isLinkActive.value ? 'Edit Link' : 'Insert Link'))
const canRemoveLink = computed(() => isLinkActive.value)

const updateFontState = () => {
  if (!editor.value) return
  const attrs = editor.value.getAttributes('textStyle') ?? {}
  selectedFontFamily.value = (attrs.fontFamily as string | undefined) ?? ''
  const rawSize = (attrs.fontSize as string | undefined) ?? ''
  selectedFontSize.value = rawSize.endsWith('pt') ? rawSize.replace(/pt$/, '') : rawSize
  isLinkActive.value = editor.value.isActive?.('link') ?? false
}

watch(
  editor,
  (next, prev) => {
    prev?.off?.('selectionUpdate', updateFontState)
    prev?.off?.('transaction', updateFontState)

    if (next) {
      next.on?.('selectionUpdate', updateFontState)
      next.on?.('transaction', updateFontState)
      updateFontState()
    } else {
      selectedFontFamily.value = ''
      selectedFontSize.value = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  const instance = editor.value
  instance?.off?.('selectionUpdate', updateFontState)
  instance?.off?.('transaction', updateFontState)
})

const resetTableForm = () => {
  tableRows.value = '3'
  tableColumns.value = '3'
  tableIncludeHeader.value = true
  tableError.value = ''
}

const resetImageForm = () => {
  imageUrl.value = ''
  imageAlt.value = ''
  imageWidth.value = ''
  imageHeight.value = ''
  imageError.value = ''
}

const hydrateLinkForm = () => {
  linkError.value = ''
  if (!editor.value) {
    linkUrl.value = ''
    linkOpenInNewTab.value = false
    return
  }

  const attrs = editor.value.getAttributes('link') ?? {}
  linkUrl.value = (attrs.href as string | undefined) ?? ''
  const target = (attrs.target as string | undefined) ?? ''
  linkOpenInNewTab.value = target === '_blank'
}

watch(isTableDialogOpen, (open) => {
  if (open) {
    tableError.value = ''
  } else {
    resetTableForm()
  }
})

watch(isImageDialogOpen, (open) => {
  if (open) {
    imageError.value = ''
  } else {
    resetImageForm()
  }
})

watch(isLinkDialogOpen, (open) => {
  if (open) {
    hydrateLinkForm()
  }
})

const shouldShowBubbleMenu = ({ editor: bubbleEditor, state }: any) => {
  const { selection } = state
  if (!bubbleEditor) return false
  if (selection.empty) return false
  if (!selection.content().size) return false
  if (bubbleEditor.isActive('codeBlock')) return false
  return true
}

const runEditorCommand = (command: 'undo' | 'redo') => {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  chain[command]().run()
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

const toggleStrike = () => {
  editor.value?.chain().focus().toggleStrike().run()
}

const setHeading = (level: number) => {
  editor.value?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
}

const handleCut = () => {
  document.execCommand('cut')
}

const handleCopy = () => {
  document.execCommand('copy')
}

const handlePaste = () => {
  document.execCommand('paste')
}

const toggleList = (listType: 'bulletList' | 'orderedList') => {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  if (listType === 'bulletList') {
    chain.toggleBulletList().run()
  } else {
    chain.toggleOrderedList().run()
  }
}

const setTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

const toggleBlockquote = () => {
  editor.value?.chain().focus().toggleBlockquote().run()
}

const toggleSubscript = () => {
  editor.value?.chain().focus().toggleSubscript().run()
}

const toggleSuperscript = () => {
  editor.value?.chain().focus().toggleSuperscript().run()
}

const toggleHighlight = () => {
  editor.value?.chain().focus().toggleHighlight().run()
}

const toggleTaskList = () => {
  editor.value?.chain().focus().toggleTaskList().run()
}

const toggleCodeBlock = () => {
  editor.value?.chain().focus().toggleCodeBlock().run()
}

const insertHorizontalRule = () => {
  editor.value?.chain().focus().setHorizontalRule().run()
}

const toggleInlineCode = () => {
  editor.value?.chain().focus().toggleCode().run()
}

const onFontFamilyChange = (event: Event) => {
  if (!editor.value) return
  const target = event.target as HTMLSelectElement
  const value = target.value
  const chain = editor.value.chain().focus()

  if (value) {
    chain.setFontFamily(value).run()
  } else {
    const clearFontFamily = chain.unsetFontFamily?.().run?.()
    if (!clearFontFamily) {
      chain.command(({ commands }: { commands: { setFontFamily: (val: string) => void } }) => {
        commands.setFontFamily('')
        return true
      }).run()
    }
  }

  selectedFontFamily.value = value
}

const onFontSizeChange = (event: Event) => {
  if (!editor.value) return
  const target = event.target as HTMLSelectElement
  const value = target.value
  const chain = editor.value.chain().focus()

  if (value) {
    chain.setMark('textStyle', { fontSize: `${value}pt` }).run()
    selectedFontSize.value = value
    return
  }

  chain.command(({ commands, editor: ed }: { commands: any; editor: any }) => {
    const attrs = { ...ed.getAttributes('textStyle') }
    delete attrs.fontSize
    if (Object.keys(attrs).length > 0) {
      return commands.setMark('textStyle', attrs)
    }
    return commands.unsetMark?.('textStyle') ?? commands.command(() => false)
  }).run()

  selectedFontSize.value = ''
}

const applyHighlightColor = (color: string) => {
  if (!editor.value || !color) return
  editor.value.chain().focus().setHighlight({ color }).run()
}

const openLinkDialogFromBubble = () => {
  if (!editor.value) return
  isLinkDialogOpen.value = true
}

const submitTable = () => {
  if (!editor.value) {
    tableError.value = 'Editor is not ready.'
    return
  }

  const rows = Number.parseInt(tableRows.value, 10)
  if (Number.isNaN(rows) || rows < 1 || rows > 20) {
    tableError.value = 'Rows must be between 1 and 20.'
    return
  }

  const cols = Number.parseInt(tableColumns.value, 10)
  if (Number.isNaN(cols) || cols < 1 || cols > 12) {
    tableError.value = 'Columns must be between 1 and 12.'
    return
  }

  editor.value
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: tableIncludeHeader.value })
    .run()

  isTableDialogOpen.value = false
}

const submitImage = () => {
  if (!editor.value) {
    imageError.value = 'Editor is not ready.'
    return
  }

  if (!imageUrl.value) {
    imageError.value = 'Image URL is required.'
    return
  }

  try {
    new URL(imageUrl.value)
  } catch (error) {
    imageError.value = 'Enter a valid image URL.'
    return
  }

  const attrs: Record<string, any> = { src: imageUrl.value.trim() }
  if (imageAlt.value.trim()) attrs.alt = imageAlt.value.trim()
  const width = Number.parseInt(imageWidth.value, 10)
  const height = Number.parseInt(imageHeight.value, 10)
  if (!Number.isNaN(width) && width > 0) attrs.width = width
  if (!Number.isNaN(height) && height > 0) attrs.height = height

  editor.value.chain().focus().setImage(attrs).run()
  isImageDialogOpen.value = false
}

const submitLink = () => {
  if (!editor.value) {
    linkError.value = 'Editor is not ready.'
    return
  }

  if (!linkUrl.value) {
    linkError.value = 'Link URL is required.'
    return
  }

  try {
    new URL(linkUrl.value)
  } catch (error) {
    linkError.value = 'Enter a valid URL.'
    return
  }

  const { empty } = editor.value.state.selection
  if (empty && !isLinkActive.value) {
    linkError.value = 'Select text to apply the link.'
    return
  }

  const attrs: Record<string, any> = { href: linkUrl.value.trim() }
  if (linkOpenInNewTab.value) {
    attrs.target = '_blank'
    attrs.rel = 'noopener noreferrer'
  }

  editor.value.chain().focus().extendMarkRange('link').setLink(attrs).run()
  isLinkDialogOpen.value = false
}

const removeLink = () => {
  if (!editor.value) return
  editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  isLinkDialogOpen.value = false
}

const isActive = (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
  if (!editor.value) return false
  if (typeof name === 'string') {
    return attrs ? editor.value.isActive(name, attrs) : editor.value.isActive(name)
  }
  return editor.value.isActive(name as any)
}

const handleSave = () => {
  emit('save')
}

const handleToggleExpanded = () => {
  emit('toggle-expanded')
}

const handleOrientation = (value: 'portrait' | 'landscape') => {
  emit('change-orientation', value)
}

const handleColumns = (value: number) => {
  emit('change-columns', value)
}

const handleExport = (format: string) => {
  emit('export', format)
}

const applyFontColor = (color: string) => {
  editor.value?.chain().focus().setColor(color).run()
}

const insertMath = () => {
  editor.value?.chain().focus().insertContent('$x^2$').run()
}

const insertMathBlock = () => {
  editor.value?.chain().focus().insertContent('$$\\int_0^1 x^2 dx$$').run()
}
</script>

<style scoped>
/* Base Toolbar Styles */
.ven-editor__toolbar {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f6f8 100%);
  border-bottom: 1px solid #e5e7eb;
}

.ven-editor__toolbar-main {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  flex-wrap: wrap;
}

.ven-editor__toolbar.is-expanded .ven-editor__toolbar-main {
  padding: 12px;
  gap: 8px;
}

.ven-editor__section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 8px;
  white-space: nowrap;
}

.ven-editor__toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.ven-editor__toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ven-editor__toolbar-group--palette {
  gap: 4px;
  padding: 0 4px;
}

.ven-editor__color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.15);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.ven-editor__color-swatch:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.2);
}

.ven-editor__toolbar-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #1f2937;
  transition: all 0.2s;
}

.ven-editor__toolbar-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #2563eb;
}

.ven-editor__toolbar-btn.is-active,
.ven-editor__toolbar-btn:focus-visible {
  outline: none;
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.ven-editor__toolbar-btn--heading {
  width: 40px;
  font-weight: 600;
}

.ven-editor__toolbar-select {
  height: 32px;
  padding: 0 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #374151;
  min-width: 140px;
}

.ven-editor__toolbar-select--small {
  min-width: 80px;
}

.ven-editor__toolbar-select:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.ven-editor__toolbar-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* --- Start of Crystal Orb Toggle Styles --- */
.ven-editor__crystal-toggle {
  --orb-size: 40px;
  --glow-color: rgba(155, 170, 233, 0.7);
  --glow-color-expanded: rgba(245, 87, 108, 0.6);

  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Default (collapsed) state background */
  background: radial-gradient(circle at 50% 30%, #a6b8ff, #667eea);
  
  /* Shadows for depth and glow */
  box-shadow: 
    inset 0 0 5px rgba(255, 255, 255, 0.6),
    0 0 8px 2px var(--glow-color),
    0 0 15px 5px rgba(102, 126, 234, 0.2);

  /* Smooth transitions for interactions */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Internal snowy/crystal particles */
.ven-editor__crystal-toggle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: 
    radial-gradient(circle, white 0.2px, transparent 0.5px),
    radial-gradient(circle, rgba(255,255,255,0.8) 0.4px, transparent 1px);
  background-size: 20px 20px, 35px 35px;
  background-position: 0 0, 10px 10px;
  animation: sparkle 20s linear infinite;
  opacity: 0.5;
  z-index: 1;
}

/* Glossy highlight/glare on top */
.ven-editor__crystal-toggle::after {
  content: '';
  position: absolute;
  top: 5%;
  left: 15%;
  width: 70%;
  height: 35%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.05));
  border-radius: 50%;
  filter: blur(2px);
  transform: rotate(-15deg);
  z-index: 2;
}

@keyframes sparkle {
    0% { transform: rotate(0deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1.2); }
}

/* Icon inside the orb */
.ven-editor__crystal-toggle .crystal-icon {
  font-size: 1rem;
  color: white;
  position: relative;
  z-index: 3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

/* Hover effect: lift and intensify glow */
.ven-editor__crystal-toggle:hover {
  transform: scale(1.1);
  box-shadow: 
    inset 0 0 6px rgba(255, 255, 255, 0.7),
    0 0 12px 4px var(--glow-color),
    0 0 22px 8px rgba(102, 126, 234, 0.3);
}

/* Active/press effect */
.ven-editor__crystal-toggle:active {
    transform: scale(0.98);
}

/* Expanded state: new colors and rotation */
.ven-editor__crystal-toggle.is-expanded {
  background: radial-gradient(circle at 50% 30%, #f7c5f8, #f5576c);
  transform: rotate(180deg);
  box-shadow: 
    inset 0 0 5px rgba(255, 255, 255, 0.6),
    0 0 8px 2px var(--glow-color-expanded),
    0 0 15px 5px rgba(245, 87, 108, 0.2);
}

.ven-editor__crystal-toggle.is-expanded:hover {
  transform: scale(1.1) rotate(180deg);
  box-shadow: 
    inset 0 0 6px rgba(255, 255, 255, 0.7),
    0 0 12px 4px var(--glow-color-expanded),
    0 0 22px 8px rgba(245, 87, 108, 0.3);
}
/* --- End of Crystal Orb Toggle Styles --- */


.ven-editor__advanced-panel {
  animation: slideDown 0.3s ease;
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}
</style>
