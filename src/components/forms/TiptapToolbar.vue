<template>
  <div class="tiptap-toolbar" :class="{ 'is-expanded': isExpanded }">
    <div class="tiptap-toolbar__main">
      <!-- Toggle Expand/Collapse -->
      <button
        class="tiptap-toolbar__crystal-toggle"
        :class="{ 'is-expanded': isExpanded }"
        :title="isExpanded ? 'Collapse toolbar' : 'Expand toolbar'"
        @click="toggleExpanded"
      >
        <span class="crystal-icon">▼</span>
      </button>
      <span class="tiptap-toolbar__divider" />

      <!-- File Section (Expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">File</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button class="tiptap-toolbar__btn" title="Export PDF" @click="handleExport('pdf')">
          📄
        </button>
        <button class="tiptap-toolbar__btn" @click="handleExport('docx')" title="Export Word">
          📝
        </button>
        <button class="tiptap-toolbar__btn" @click="handleExport('html')" title="Export HTML">
          🌐
        </button>
        <button class="tiptap-toolbar__btn" @click="handlePrint" title="Print">
          🖨️
        </button>
      </div>
      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Undo/Redo -->
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          title="Undo (Ctrl+Z)"
          :disabled="!editor?.can().undo()"
          @click="editor?.chain().focus().undo().run()"
        >
          ↶
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Redo (Ctrl+Y)"
          :disabled="!editor?.can().redo()"
          @click="editor?.chain().focus().redo().run()"
        >
          ↷
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Font -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Font</div>
      <div class="tiptap-toolbar__group">
        <select
          class="tiptap-toolbar__select"
          :value="selectedFontFamily"
          title="Font Family"
          @change="onFontFamilyChange"
        >
          <option value="">Default</option>
          <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
            {{ font.label }}
          </option>
        </select>
        <select
          class="tiptap-toolbar__select tiptap-toolbar__select--small"
          :value="selectedFontSize"
          title="Font Size"
          @change="onFontSizeChange"
        >
          <option value="">Auto</option>
          <option v-for="size in fontSizes" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Text Formatting (label only in expanded) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Text Formatting</div>
      <div class="tiptap-toolbar__group">
        <!-- Basic Formatting (Always visible) -->
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('bold') }"
          title="Bold (Ctrl+B)"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('italic') }"
          title="Italic (Ctrl+I)"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('underline') }"
          title="Underline (Ctrl+U)"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <u>U</u>
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('strike') }"
          title="Strikethrough"
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>
        <button
          v-if="isExpanded"
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('code') }"
          title="Inline Code"
          @click="editor?.chain().focus().toggleCode().run()"
        >
          &lt;/&gt;
        </button>
        <span v-if="isExpanded" class="tiptap-toolbar__divider" />

        <!-- Text & Background Colors (Expanded) -->
        <div v-if="isExpanded" class="tiptap-toolbar__section-label">Colors</div>

        <div v-if="isExpanded" class="tiptap-toolbar__color-picker">
          <label title="Text Color" :style="{ borderBottomColor: currentTextColor, borderBottomWidth: '3px', borderBottomStyle: 'solid' }">
            <span class="tiptap-toolbar__color-label" :style="{ color: currentTextColor }">A</span>
            <input 
              type="color" 
              :value="currentTextColor"
              @input="onTextColorChange"
              class="tiptap-toolbar__color-input"
            />
          </label>
        </div>
        <div v-if="isExpanded" class="tiptap-toolbar__color-picker">
          <label title="Background Color" :style="{ backgroundColor: currentBgColor }">
            <span class="tiptap-toolbar__color-label" style="text-decoration: underline;">A</span>
            <input 
              type="color" 
              :value="currentBgColor"
              @input="onBgColorChange"
              class="tiptap-toolbar__color-input"
            />
          </label>
        </div>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- Paragraph (label only in expanded) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Paragraph</div>
      <div class="tiptap-toolbar__group">
        <!-- Text Align (Always visible) -->
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
          title="Align Left"
          @click="editor?.chain().focus().setTextAlign('left').run()"
        >
          ⫴
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
          title="Center"
          @click="editor?.chain().focus().setTextAlign('center').run()"
        >
          ≡
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
          title="Align Right"
          @click="editor?.chain().focus().setTextAlign('right').run()"
        >
          ⫵
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('bulletList') }"
          title="Bullet List"
          @click="editor?.chain().focus().toggleBulletList().run()"
        >
          ☰
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('orderedList') }"
          title="Numbered List"
          @click="editor?.chain().focus().toggleOrderedList().run()"
        >
          ≡
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Page Layout (Expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Page</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <select
          class="tiptap-toolbar__select"
          :value="pageSize || 'a4'"
          title="Page Size"
          @change="onPageSizeChange"
        >
          <option value="a4">A4 (210 × 297mm)</option>
          <option value="a3">A3 (297 × 420mm)</option>
          <option value="letter">Letter (8.5 × 11")</option>
          <option value="legal">Legal (8.5 × 14")</option>
          <option value="card">Card (3.5 × 2")</option>
        </select>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': (pageOrientation || 'portrait') === 'portrait' }"
          @click="handleOrientation('portrait')"
          title="Portrait"
        >
          📄
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': (pageOrientation || 'portrait') === 'landscape' }"
          @click="handleOrientation('landscape')"
          title="Landscape"
        >
          📃
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Headings (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Headings</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
          title="Heading 1"
          @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
          title="Heading 2"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
          title="Heading 3"
          @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 4 }) }"
          title="Heading 4"
          @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
        >
          H4
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 5 }) }"
          title="Heading 5"
          @click="editor?.chain().focus().toggleHeading({ level: 5 }).run()"
        >
          H5
        </button>
        <button
          class="tiptap-toolbar__btn tiptap-toolbar__btn--heading"
          :class="{ 'is-active': editor?.isActive('heading', { level: 6 }) }"
          title="Heading 6"
          @click="editor?.chain().focus().toggleHeading({ level: 6 }).run()"
        >
          H6
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Advanced (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Advanced</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('subscript') }"
          title="Subscript"
          @click="editor?.chain().focus().toggleSubscript().run()"
        >
          X<sub style="font-size: 0.6em;">₂</sub>
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('superscript') }"
          title="Superscript"
          @click="editor?.chain().focus().toggleSuperscript().run()"
        >
          X<sup style="font-size: 0.6em;">²</sup>
        </button>
      </div>

      <span v-if="isExpanded" class="tiptap-toolbar__divider" />

      <!-- Blocks (expanded only) -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">Blocks</div>
      <div v-if="isExpanded" class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('blockquote') }"
          title="Blockquote"
          @click="editor?.chain().focus().toggleBlockquote().run()"
        >
          "
        </button>
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('codeBlock') }"
          title="Code Block"
          @click="editor?.chain().focus().toggleCodeBlock().run()"
        >
          {
        </button>
        <button
          class="tiptap-toolbar__btn"
          title="Horizontal Line"
          @click="editor?.chain().focus().setHorizontalRule().run()"
        >
          ─
        </button>
      </div>

      <span class="tiptap-toolbar__divider" />

      <!-- More -->
      <div v-if="isExpanded" class="tiptap-toolbar__section-label">More</div>
      <div class="tiptap-toolbar__group">
        <button
          class="tiptap-toolbar__btn"
          :class="{ 'is-active': editor?.isActive('taskList') }"
          title="Task List"
          @click="editor?.chain().focus().toggleTaskList().run()"
        >
          ☑
        </button>
        
        <!-- Table Insert with Popover -->
        <div class="tiptap-toolbar__popover-wrapper">
          <button
            class="tiptap-toolbar__btn"
            title="Insert Table"
            @click="toggleTablePopover"
          >
            ⊞
          </button>
          <div v-if="showTablePopover" class="tiptap-toolbar__popover" @click.stop>
            <div class="popover-header">Insert Table</div>
            <div class="popover-body">
              <div class="popover-field">
                <label>Rows:</label>
                <input type="number" v-model.number="tableRows" min="1" max="20" />
              </div>
              <div class="popover-field">
                <label>Columns:</label>
                <input type="number" v-model.number="tableCols" min="1" max="10" />
              </div>
              <div class="popover-field">
                <label>Style:</label>
                <select v-model="tableStyle">
                  <option value="default">Default</option>
                  <option value="striped">Striped Rows</option>
                  <option value="bordered">Bordered</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div class="popover-checkbox">
                <label>
                  <input type="checkbox" v-model="tableWithHeader" />
                  Include header row
                </label>
              </div>
            </div>
            <div class="popover-footer">
              <button class="popover-btn popover-btn-cancel" @click="showTablePopover = false">Cancel</button>
              <button class="popover-btn popover-btn-primary" @click="insertTable">Insert</button>
            </div>
          </div>
        </div>
        
        <!-- Link Insert with Popover -->
        <div class="tiptap-toolbar__popover-wrapper">
          <button
            class="tiptap-toolbar__btn"
            :class="{ 'is-active': editor?.isActive('link') }"
            title="Insert/Edit Link"
            @click="toggleLinkPopover"
          >
            🔗
          </button>
          <div v-if="showLinkPopover" class="tiptap-toolbar__popover" @click.stop>
            <div class="popover-header">{{ linkUrl ? 'Edit' : 'Insert' }} Link</div>
            <div class="popover-body">
              <div class="popover-field">
                <label>URL:</label>
                <input 
                  type="url" 
                  v-model="linkUrl" 
                  placeholder="https://example.com"
                  @keydown.enter="applyLink"
                />
              </div>
              <div class="popover-checkbox">
                <label>
                  <input type="checkbox" v-model="linkOpenInNewTab" />
                  Open in new tab
                </label>
              </div>
            </div>
            <div class="popover-footer">
              <button v-if="editor?.isActive('link')" class="popover-btn popover-btn-danger" @click="removeLink">Remove</button>
              <button class="popover-btn popover-btn-cancel" @click="showLinkPopover = false">Cancel</button>
              <button class="popover-btn popover-btn-primary" @click="applyLink">Apply</button>
            </div>
          </div>
        </div>
        
        <!-- Image Insert with Popover -->
        <div v-if="isExpanded" class="tiptap-toolbar__popover-wrapper">
          <button
            class="tiptap-toolbar__btn"
            title="Insert Image"
            @click="toggleImagePopover"
          >
            🖼️
          </button>
          <div v-if="showImagePopover" class="tiptap-toolbar__popover" @click.stop>
            <div class="popover-header">Insert Image</div>
            <div class="popover-body">
              <div class="popover-field">
                <label>Image URL:</label>
                <input 
                  type="url" 
                  v-model="imageUrl" 
                  placeholder="https://example.com/image.jpg"
                  @keydown.enter="applyImage"
                />
              </div>
              <div class="popover-field">
                <label>Alt Text (optional):</label>
                <input 
                  type="text" 
                  v-model="imageAlt" 
                  placeholder="Description of image"
                />
              </div>
            </div>
            <div class="popover-footer">
              <button class="popover-btn popover-btn-cancel" @click="showImagePopover = false">Cancel</button>
              <button class="popover-btn popover-btn-primary" @click="applyImage">Insert</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Editor } from '@tiptap/vue-3';

const props = defineProps<{
  editor: Editor | null | undefined;
  pageSize?: string;
  pageOrientation?: 'portrait' | 'landscape';
}>();

const emit = defineEmits<{
  (e: 'export', format: string): void;
  (e: 'update:pageSize', value: string): void;
  (e: 'update:pageOrientation', value: 'portrait' | 'landscape'): void;
}>();

// State
const isExpanded = ref(false);

// Popover states
const showTablePopover = ref(false);
const showLinkPopover = ref(false);
const showImagePopover = ref(false);

// Table insert state
const tableRows = ref(3);
const tableCols = ref(3);
const tableStyle = ref('default');
const tableWithHeader = ref(true);

// Link insert state
const linkUrl = ref('');
const linkOpenInNewTab = ref(true);

// Image insert state
const imageUrl = ref('');
const imageAlt = ref('');

// Font options - Beautiful, print-friendly fonts
const fontFamilies = [
  // Sans-serif fonts - Modern & Professional
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Source Sans 3', label: 'Source Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Verdana', label: 'Verdana' },
  
  // Serif fonts - Excellent for print & academic
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Crimson Text', label: 'Crimson Text' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville' },
  { value: 'PT Serif', label: 'PT Serif' },
  { value: 'EB Garamond', label: 'EB Garamond' },
  { value: 'Spectral', label: 'Spectral' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  
  // Monospace
  { value: 'Courier New', label: 'Courier New' },
];

const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

const selectedFontFamily = ref('');
const selectedFontSize = ref('');
const currentTextColor = ref('#000000');
const currentBgColor = ref('#ffffff');

// Update font and color state when editor selection changes
const updateFontState = () => {
  if (!props.editor) return;
  const attrs = props.editor.getAttributes('textStyle') ?? {};
  const ff = (attrs.fontFamily ?? attrs['font-family']) as string | undefined;
  const fs = (attrs.fontSize ?? attrs['font-size']) as string | undefined;
  selectedFontFamily.value = ff ?? '';
  const rawSize = fs ?? '';
  selectedFontSize.value = rawSize.endsWith('pt') ? rawSize.replace(/pt$/, '') : rawSize;
  
  // Update text color
  const color = attrs.color as string | undefined;
  if (color) {
    currentTextColor.value = color;
  }
  
  // Update background color from highlight
  const highlightAttrs = props.editor.getAttributes('highlight');
  if (highlightAttrs.color) {
    currentBgColor.value = highlightAttrs.color as string;
  }
};

watch(
  () => props.editor,
  (next, prev) => {
    prev?.off?.('selectionUpdate', updateFontState);
    prev?.off?.('transaction', updateFontState);

    if (next) {
      next.on?.('selectionUpdate', updateFontState);
      next.on?.('transaction', updateFontState);
      updateFontState();
    } else {
      selectedFontFamily.value = '';
      selectedFontSize.value = '';
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  const instance = props.editor;
  instance?.off?.('selectionUpdate', updateFontState);
  instance?.off?.('transaction', updateFontState);
});

function onFontFamilyChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  const chain = props.editor.chain().focus();

  if (value) {
    chain.setFontFamily(value).run();
  } else {
    chain.unsetFontFamily?.().run?.();
  }
  selectedFontFamily.value = value;
  updateFontState();
}

function onFontSizeChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLSelectElement;
  const value = target.value;

  if (value) {
    (props.editor.chain().focus() as any).setFontSize(`${value}pt`).run();
    selectedFontSize.value = value;
  } else {
    (props.editor.chain().focus() as any).unsetFontSize().run();
    selectedFontSize.value = '';
  }
  updateFontState();
}

// Popover toggle functions
function toggleTablePopover() {
  showTablePopover.value = !showTablePopover.value;
  showLinkPopover.value = false;
  showImagePopover.value = false;
}

function toggleLinkPopover() {
  if (!props.editor) return;
  
  const previousUrl = props.editor.getAttributes('link').href;
  linkUrl.value = previousUrl || '';
  
  showLinkPopover.value = !showLinkPopover.value;
  showTablePopover.value = false;
  showImagePopover.value = false;
}

function toggleImagePopover() {
  showImagePopover.value = !showImagePopover.value;
  showTablePopover.value = false;
  showLinkPopover.value = false;
  imageUrl.value = '';
  imageAlt.value = '';
}

// Table insert function
function insertTable() {
  if (!props.editor) return;
  
  props.editor.chain().focus().insertTable({
    rows: tableRows.value,
    cols: tableCols.value,
    withHeaderRow: tableWithHeader.value,
  }).run();
  
  // Apply table style class
  if (tableStyle.value !== 'default') {
    // Add custom class to table (will be styled via CSS)
    const tableNode = props.editor.state.selection.$anchor.node(-1);
    if (tableNode && tableNode.type.name === 'table') {
      props.editor.commands.updateAttributes('table', {
        class: `table-${tableStyle.value}`,
      });
    }
  }
  
  showTablePopover.value = false;
}

// Link functions
function applyLink() {
  if (!props.editor || !linkUrl.value) return;
  
  let finalUrl = linkUrl.value;
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = 'https://' + finalUrl;
  }
  
  const target = linkOpenInNewTab.value ? '_blank' : undefined;
  props.editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl, target }).run();
  
  showLinkPopover.value = false;
  linkUrl.value = '';
}

function removeLink() {
  if (!props.editor) return;
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
  showLinkPopover.value = false;
  linkUrl.value = '';
}

// Image function
function applyImage() {
  if (!props.editor || !imageUrl.value) return;
  
  let finalUrl = imageUrl.value;
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = 'https://' + finalUrl;
  }
  
  props.editor.chain().focus().setImage({ 
    src: finalUrl,
    alt: imageAlt.value || undefined,
  }).run();
  
  showImagePopover.value = false;
  imageUrl.value = '';
  imageAlt.value = '';
}

// Close popovers when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    showTablePopover.value = false;
    showLinkPopover.value = false;
    showImagePopover.value = false;
  });
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function handleExport(format: string) {
  emit('export', format);
}

function handlePrint() {
  window.print();
}

function onPageSizeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:pageSize', target.value);
}

function handleOrientation(orientation: 'portrait' | 'landscape') {
  emit('update:pageOrientation', orientation);
}

function onTextColorChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  props.editor.chain().focus().setColor(color).run();
  currentTextColor.value = color;
}

function onBgColorChange(event: Event) {
  if (!props.editor) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  props.editor.chain().focus().setHighlight({ color }).run();
  currentBgColor.value = color;
}
</script>

<style scoped>
/* Toolbar Styles - Matching VenEditorToolbar */
.tiptap-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f6f8 100%);
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s, border-color 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar {
    background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
    border-bottom-color: #374151;
  }
}

.tiptap-toolbar__main {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  flex-wrap: wrap;
}

.tiptap-toolbar__section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 8px;
  white-space: nowrap;
  transition: color 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__section-label {
    color: #9ca3af;
  }
}

.tiptap-toolbar__divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
  transition: background-color 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__divider {
    background: #374151;
  }
}

.tiptap-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tiptap-toolbar__btn {
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

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__btn {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
}

.tiptap-toolbar__btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #2563eb;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__btn:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
    color: #60a5fa;
  }
}

.tiptap-toolbar__btn.is-active {
  outline: none;
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__btn.is-active {
    border-color: #60a5fa;
    background: #1e3a8a;
    color: #93c5fd;
    box-shadow: 0 2px 6px rgba(96, 165, 250, 0.3);
  }
}

.tiptap-toolbar__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tiptap-toolbar__btn--heading {
  width: 40px;
  font-weight: 600;
}

.tiptap-toolbar__select {
  height: 32px;
  padding: 0 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #374151;
  min-width: 140px;
  cursor: pointer;
  transition: all 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__select {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
}

.tiptap-toolbar__select--small {
  min-width: 80px;
}

.tiptap-toolbar__select:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__select:hover {
    border-color: #6b7280;
    background: #4b5563;
  }
}

.tiptap-toolbar__select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__select:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
  }
}

/* Crystal Toggle Button - Office-style */
.tiptap-toolbar__crystal-toggle {
  --orb-size: 40px;
  --office-blue: #0078d4;
  --office-blue-dark: #005a9e;
  --office-blue-light: #50a0e0;

  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  border: 2px solid #e1e1e1;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg, var(--office-blue-light) 0%, var(--office-blue) 50%, var(--office-blue-dark) 100%);
  
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);

  transition: all 0.2s ease;
}

.tiptap-toolbar__crystal-toggle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  right: 4px;
  height: 40%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  z-index: 1;
}

.tiptap-toolbar__crystal-toggle .crystal-icon {
  font-size: 0.875rem;
  color: white;
  position: relative;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.tiptap-toolbar__crystal-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--office-blue);
  box-shadow: 
    0 4px 8px rgba(0, 120, 212, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.tiptap-toolbar__crystal-toggle:active {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.tiptap-toolbar__crystal-toggle.is-expanded {
  background: linear-gradient(135deg, #e74856 0%, #d13438 50%, #a72828 100%);
  border-color: #d13438;
  transform: rotate(180deg);
  box-shadow: 
    0 2px 4px rgba(215, 52, 56, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tiptap-toolbar__crystal-toggle.is-expanded:hover {
  transform: translateY(-1px) rotate(180deg);
  box-shadow: 
    0 4px 8px rgba(215, 52, 56, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.tiptap-toolbar.is-expanded .tiptap-toolbar__main {
  padding: 12px;
  gap: 8px;
}

/* Color Picker Styles */
.tiptap-toolbar__color-picker {
  position: relative;
  display: inline-flex;
}

.tiptap-toolbar__color-picker label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__color-picker label {
    background: #374151;
    border-color: #4b5563;
  }
}

.tiptap-toolbar__color-picker label:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__color-picker label:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
}

.tiptap-toolbar__color-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1f2937;
  pointer-events: none;
  position: relative;
  z-index: 1;
  transition: color 0.2s;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__color-label {
    color: #e5e7eb;
  }
}

.tiptap-toolbar__color-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  top: 0;
  left: 0;
}

/* Popover Styles */
.tiptap-toolbar__popover-wrapper {
  position: relative;
  display: inline-block;
}

.tiptap-toolbar__popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  z-index: 1000;
  animation: popoverSlideIn 0.2s ease;
}

@media (prefers-color-scheme: dark) {
  .tiptap-toolbar__popover {
    background: #1f2937;
    border-color: #374151;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
}

@keyframes popoverSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popover-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1f2937;
}

@media (prefers-color-scheme: dark) {
  .popover-header {
    border-bottom-color: #374151;
    color: #f9fafb;
  }
}

.popover-body {
  padding: 16px;
}

.popover-field {
  margin-bottom: 12px;
}

.popover-field:last-child {
  margin-bottom: 0;
}

.popover-field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

@media (prefers-color-scheme: dark) {
  .popover-field label {
    color: #d1d5db;
  }
}

.popover-field input[type="text"],
.popover-field input[type="url"],
.popover-field input[type="number"],
.popover-field select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1f2937;
  background: white;
  transition: all 0.15s;
}

@media (prefers-color-scheme: dark) {
  .popover-field input[type="text"],
  .popover-field input[type="url"],
  .popover-field input[type="number"],
  .popover-field select {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
}

.popover-field input:focus,
.popover-field select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

@media (prefers-color-scheme: dark) {
  .popover-field input:focus,
  .popover-field select:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }
}

.popover-checkbox {
  margin-top: 12px;
}

.popover-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

@media (prefers-color-scheme: dark) {
  .popover-checkbox label {
    color: #d1d5db;
  }
}

.popover-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.popover-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (prefers-color-scheme: dark) {
  .popover-footer {
    border-top-color: #374151;
  }
}

.popover-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.popover-btn-cancel {
  background: transparent;
  color: #6b7280;
  border-color: #d1d5db;
}

.popover-btn-cancel:hover {
  background: #f3f4f6;
  color: #374151;
}

@media (prefers-color-scheme: dark) {
  .popover-btn-cancel {
    color: #9ca3af;
    border-color: #4b5563;
  }
  
  .popover-btn-cancel:hover {
    background: #374151;
    color: #e5e7eb;
  }
}

.popover-btn-primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.popover-btn-primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.popover-btn-danger {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.popover-btn-danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
</style>
