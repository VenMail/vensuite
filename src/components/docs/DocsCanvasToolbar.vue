<template>
  <div
    class="docs-canvas-toolbar bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex flex-col select-none"
  >
    <!-- Primary row -->
    <div class="flex items-center gap-0.5 px-2 py-1 overflow-x-auto scrollbar-thin flex-wrap">

      <!-- History -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Undo (Ctrl+Z)" class="toolbar-btn" @click="cmd('executeUndo')"><Undo2 class="h-4 w-4" /></button>
        <button type="button" title="Redo (Ctrl+Y)" class="toolbar-btn" @click="cmd('executeRedo')"><Redo2 class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Text style -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Bold (Ctrl+B)" :class="['toolbar-btn', rangeStyle.bold && 'toolbar-btn--active']" @click="cmd('executeBold')"><Bold class="h-4 w-4" /></button>
        <button type="button" title="Italic (Ctrl+I)" :class="['toolbar-btn', rangeStyle.italic && 'toolbar-btn--active']" @click="cmd('executeItalic')"><Italic class="h-4 w-4" /></button>
        <button type="button" title="Underline (Ctrl+U)" :class="['toolbar-btn', rangeStyle.underline && 'toolbar-btn--active']" @click="cmd('executeUnderline')"><UnderlineIcon class="h-4 w-4" /></button>
        <button type="button" title="Strikethrough" :class="['toolbar-btn', rangeStyle.strikeout && 'toolbar-btn--active']" @click="cmd('executeStrikeout')"><Strikethrough class="h-4 w-4" /></button>
        <button type="button" title="Superscript" :class="['toolbar-btn', rangeStyle.superscript && 'toolbar-btn--active']" @click="cmd('executeSuperscript')"><Superscript class="h-4 w-4" /></button>
        <button type="button" title="Subscript" :class="['toolbar-btn', rangeStyle.subscript && 'toolbar-btn--active']" @click="cmd('executeSubscript')"><SubscriptIcon class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Font + size -->
      <div class="flex items-center gap-0.5">
        <select class="toolbar-select" :value="rangeStyle.font || 'Arial'" @change="(e) => cmd('executeFont', (e.target as HTMLSelectElement).value)" title="Font family">
          <option v-for="f in FONTS" :key="f" :value="f">{{ f }}</option>
        </select>
        <select class="toolbar-select w-16" :value="rangeStyle.size ?? 16" @change="(e) => cmd('executeSize', Number((e.target as HTMLSelectElement).value))" title="Font size">
          <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}</option>
        </select>
        <button type="button" title="Increase font size" class="toolbar-btn" @click="cmd('executeSizeAdd')"><span class="text-xs font-bold">A+</span></button>
        <button type="button" title="Decrease font size" class="toolbar-btn" @click="cmd('executeSizeMinus')"><span class="text-xs font-bold">A−</span></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Color -->
      <div class="flex items-center gap-0.5">
        <label class="toolbar-color-btn" title="Text color">
          <span class="color-bar" :style="{ background: textColor }" />
          <Type class="h-3.5 w-3.5" />
          <input type="color" class="sr-only" :value="textColor" @input="(e) => applyTextColor((e.target as HTMLInputElement).value)" />
        </label>
        <label class="toolbar-color-btn" title="Highlight color">
          <span class="color-bar" :style="{ background: highlightColor }" />
          <Highlighter class="h-3.5 w-3.5" />
          <input type="color" class="sr-only" :value="highlightColor" @input="(e) => applyHighlight((e.target as HTMLInputElement).value)" />
        </label>
      </div>

      <span class="toolbar-divider" />

      <!-- Alignment -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Align left" :class="['toolbar-btn', (rangeStyle.rowFlex === 'left' || !rangeStyle.rowFlex) && 'toolbar-btn--active']" @click="cmd('executeRowFlex', 'left')"><AlignLeft class="h-4 w-4" /></button>
        <button type="button" title="Align center" :class="['toolbar-btn', rangeStyle.rowFlex === 'center' && 'toolbar-btn--active']" @click="cmd('executeRowFlex', 'center')"><AlignCenter class="h-4 w-4" /></button>
        <button type="button" title="Align right" :class="['toolbar-btn', rangeStyle.rowFlex === 'right' && 'toolbar-btn--active']" @click="cmd('executeRowFlex', 'right')"><AlignRight class="h-4 w-4" /></button>
        <button type="button" title="Justify" :class="['toolbar-btn', rangeStyle.rowFlex === 'between' && 'toolbar-btn--active']" @click="cmd('executeRowFlex', 'between')"><AlignJustify class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Title levels -->
      <div class="flex items-center gap-0.5">
        <select class="toolbar-select w-28" :value="titleLevel" @change="(e) => applyTitle((e.target as HTMLSelectElement).value)" title="Heading level">
          <option value="">Paragraph</option>
          <option value="first">Heading 1</option>
          <option value="second">Heading 2</option>
          <option value="third">Heading 3</option>
          <option value="fourth">Heading 4</option>
        </select>
      </div>

      <span class="toolbar-divider" />

      <!-- Lists -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Bullet list" class="toolbar-btn" @click="cmd('executeList', 'ul')"><List class="h-4 w-4" /></button>
        <button type="button" title="Ordered list" class="toolbar-btn" @click="cmd('executeList', 'ol')"><ListOrdered class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Insert -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Insert table" class="toolbar-btn" @click="insertTable"><TableIcon class="h-4 w-4" /></button>
        <button type="button" title="Insert image" class="toolbar-btn" @click="insertImage"><ImageIcon class="h-4 w-4" /></button>
        <button type="button" title="Insert hyperlink" class="toolbar-btn" @click="insertLink"><Link2 class="h-4 w-4" /></button>
        <button type="button" title="Insert page break" class="toolbar-btn" @click="cmd('executePageBreak')"><Scissors class="h-4 w-4" /></button>
        <button type="button" title="Insert separator" class="toolbar-btn" @click="cmd('executeSeparator')"><Minus class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Find/Replace -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Find (Ctrl+F)" class="toolbar-btn" @click="emit('toggleFindReplace')"><Search class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Export -->
      <div class="flex items-center gap-0.5">
        <button type="button" title="Export PDF" class="toolbar-btn" @click="emit('export', 'pdf')"><FileDown class="h-4 w-4" /></button>
        <button type="button" title="Export Word" class="toolbar-btn" @click="emit('export', 'docx')"><FileText class="h-4 w-4" /></button>
        <button type="button" title="Print" class="toolbar-btn" @click="emit('print')"><Printer class="h-4 w-4" /></button>
      </div>

      <span class="toolbar-divider" />

      <!-- Page settings -->
      <div class="flex items-center gap-0.5">
        <select class="toolbar-select w-24" :value="pageSize" @change="(e) => emit('update:pageSize', (e.target as HTMLSelectElement).value)" title="Page size">
          <option value="a4">A4</option>
          <option value="a3">A3</option>
          <option value="letter">Letter</option>
          <option value="legal">Legal</option>
        </select>
        <button type="button" title="Toggle landscape/portrait" class="toolbar-btn" @click="emit('update:pageOrientation', pageOrientation === 'landscape' ? 'portrait' : 'landscape')"><RotateCcw class="h-4 w-4" /></button>
      </div>

      <!-- Comments (right-aligned) -->
      <div class="ml-auto flex items-center gap-1">
        <button type="button" title="Comments" class="toolbar-btn" @click="emit('toggleComments')">
          <MessageSquare class="h-4 w-4" />
          <span v-if="unreadCount" class="ml-1 text-xs bg-red-500 text-white rounded-full px-1 leading-tight">{{ unreadCount }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Link input dialog -->
  <Teleport to="body">
    <div v-if="showLinkDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showLinkDialog = false">
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-96 border border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Insert Hyperlink</h3>
        <input
          v-model="linkUrl"
          type="url"
          placeholder="https://example.com"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3"
          @keydown.enter="applyLink"
        />
        <div class="flex gap-2 justify-end">
          <button class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" @click="showLinkDialog = false">Cancel</button>
          <button class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="applyLink">Insert</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Undo2, Redo2, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript, Subscript as SubscriptIcon, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Table as TableIcon, Image as ImageIcon,
  Link2, Scissors, Minus, Search, FileDown, FileText, Printer, RotateCcw,
  MessageSquare, Type, Highlighter,
} from 'lucide-vue-next';
import type { CanvasRangeStyle } from '@/composables/useCanvasDocsEditor';


const props = defineProps<{
  editorInstance: any;
  rangeStyle: CanvasRangeStyle;
  pageSize: string;
  pageOrientation: string;
  unreadCount?: number;
}>();

const emit = defineEmits<{
  (e: 'export', format: string): void;
  (e: 'print'): void;
  (e: 'toggleComments'): void;
  (e: 'toggleFindReplace'): void;
  (e: 'update:pageSize', val: string): void;
  (e: 'update:pageOrientation', val: string): void;
}>();

const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Inter', 'Roboto'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const textColor      = ref('#000000');
const highlightColor = ref('#FFFF00');
const showLinkDialog = ref(false);
const linkUrl        = ref('');

const titleLevel = computed(() => (props.rangeStyle as any)?.title ?? '');

/** Fire a canvas-editor command with optional payload */
function cmd(name: string, payload?: any) {
  const inst = props.editorInstance;
  if (!inst?.command?.[name]) return;
  try {
    payload !== undefined ? inst.command[name](payload) : inst.command[name]();
  } catch (e) {
    console.warn(`[canvas-toolbar] command ${name} failed`, e);
  }
}

function applyTextColor(color: string) {
  textColor.value = color;
  cmd('executeColor', color);
}

function applyHighlight(color: string) {
  highlightColor.value = color;
  cmd('executeHighlight', color);
}

function applyTitle(level: string) {
  if (!level) {
    cmd('executeTitle', null);
  } else {
    cmd('executeTitle', level);
  }
}

function insertTable() {
  cmd('executeInsertTable', { row: 3, col: 3 });
}

function insertImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result as string;
      cmd('executeImage', { value });
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function insertLink() {
  linkUrl.value = '';
  showLinkDialog.value = true;
}

function applyLink() {
  if (!linkUrl.value) return;
  cmd('executeHyperlink', { value: linkUrl.value, url: linkUrl.value });
  showLinkDialog.value = false;
}
</script>

<style scoped>
.toolbar-divider {
  @apply w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0 inline-block;
}
.toolbar-btn {
  @apply inline-flex items-center justify-center rounded p-1.5 text-gray-600 dark:text-gray-300
         hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white
         transition-colors text-sm;
}
.toolbar-btn--active {
  @apply bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300;
}
.toolbar-select {
  @apply h-7 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
         text-gray-700 dark:text-gray-200 px-1 focus:outline-none focus:ring-1 focus:ring-blue-400;
}
.toolbar-color-btn {
  @apply inline-flex flex-col items-center justify-center rounded p-1.5 cursor-pointer gap-0.5
         text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;
}
.color-bar {
  @apply block w-full h-1 rounded-sm;
}
</style>
