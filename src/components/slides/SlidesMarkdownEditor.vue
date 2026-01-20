<template>
  <div class="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Markdown</span>
      <div class="flex items-center gap-1">
        <!-- Formatting Tools -->
        <button
          v-for="tool in editorTools"
          :key="tool.name"
          class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          :title="tool.title"
          @click="insertMarkdown(tool.template)"
        >
          <component :is="tool.icon" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
        
        <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <!-- Emoji Button -->
        <button
          class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Insert/Replace Emoji (select text first)"
          @click="handleEmojiClick"
        >
          <Smile class="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
    
    <!-- Editor Area -->
    <textarea
      ref="editorRef"
      :value="content"
      class="flex-1 w-full p-4 font-mono text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
      :placeholder="placeholder"
      @input="handleInput"
      @keydown="handleKeydown"
      @select="handleSelection"
      @mouseup="handleSelection"
      @click="emitCursorPositionChange"
    />
    
    <!-- Notes Section -->
    <div class="border-t border-gray-200 dark:border-gray-700">
      <button
        class="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="showNotes = !showNotes"
      >
        <span class="flex items-center gap-2">
          <StickyNote class="h-4 w-4" />
          Presenter Notes
        </span>
        <ChevronDown class="h-4 w-4 transition-transform" :class="{ 'rotate-180': showNotes }" />
      </button>
      <textarea
        v-if="showNotes"
        :value="notes"
        class="w-full h-24 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 resize-none focus:outline-none border-t border-gray-200 dark:border-gray-700"
        placeholder="Add notes for presenter view..."
        @input="handleNotesInput"
      />
    </div>
    
    <!-- Emoji Picker Dialog -->
    <EmojiPickerDialog
      :open="showEmojiPicker"
      :selected-text="selectedText"
      @update:open="showEmojiPicker = $event"
      @select="handleEmojiSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { 
  Heading, List, Code, Image, Quote, Table,
  GitBranch, LayoutGrid, Link, Palette, StickyNote, ChevronDown,
  Smile
} from 'lucide-vue-next';
import EmojiPickerDialog from './EmojiPickerDialog.vue';
import { getElementAtCursor, getCursorPosition, type MarkdownElement } from '@/utils/markdownElementDetector';

interface Props {
  content: string;
  notes: string;
  placeholder?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: `# Slide Title

Write your slide content in Markdown...

- Use **bold** and *italic* for emphasis
- Add code blocks with \`\`\`language
- Insert images with ![alt](url)`
});

const emit = defineEmits<{
  'update:content': [value: string];
  'update:notes': [value: string];
  'insert-markdown': [template: string];
  'cursor-change': [element: MarkdownElement | null];
}>();

const editorRef = ref<HTMLTextAreaElement | null>(null);
const showNotes = ref(false);
const showEmojiPicker = ref(false);
const selectedText = ref('');
const selectionStart = ref(0);
const selectionEnd = ref(0);

const editorTools = [
  { name: 'heading', title: 'Heading', icon: Heading, template: '\n## ' },
  { name: 'list', title: 'Bullet List', icon: List, template: '\n- ' },
  { name: 'code', title: 'Code Block', icon: Code, template: '\n```typescript\n// Your code here\n```\n' },
  { name: 'image', title: 'Image', icon: Image, template: '\n![Description](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600)\n' },
  { name: 'quote', title: 'Quote', icon: Quote, template: '\n> "Your quote here"\n\n— Author' },
  { name: 'table', title: 'Table', icon: Table, template: '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n' },
  { name: 'mermaid', title: 'Diagram', icon: GitBranch, template: '\n```mermaid\nflowchart LR\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action]\n    B -->|No| D[End]\n```\n' },
  { name: 'twocols', title: 'Two Columns', icon: LayoutGrid, template: '\n## Left Column\n\nContent here\n\n::right::\n\n## Right Column\n\nContent here\n' },
  { name: 'link', title: 'Link', icon: Link, template: '\n[Link Text](https://example.com)\n' },
  { name: 'styled', title: 'Styled Text', icon: Palette, template: '\n[Colored text]{style="color: #3b82f6; font-weight: bold"}\n' }
];


function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:content', target.value);
  // Emit cursor position change on input with delay to ensure content is updated
  nextTick(() => {
    emitCursorPositionChange();
  });
}

function handleNotesInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:notes', target.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault();
    insertMarkdown('  ');
    return;
  }
  
  // Emit cursor position change after key is processed
  setTimeout(() => {
    emitCursorPositionChange();
  }, 10);
}

function handleSelection() {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  selectionStart.value = textarea.selectionStart;
  selectionEnd.value = textarea.selectionEnd;
  selectedText.value = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  
  // Emit cursor position change event
  emitCursorPositionChange();
}

function handleEmojiClick() {
  handleSelection();
  showEmojiPicker.value = true;
}

function handleEmojiSelect(emoji: string) {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  const value = textarea.value;
  
  // If text was selected, replace it with emoji
  if (selectedText.value) {
    const newValue = value.substring(0, selectionStart.value) + emoji + value.substring(selectionEnd.value);
    emit('update:content', newValue);
  } else {
    // Insert at cursor
    const newValue = value.substring(0, selectionStart.value) + emoji + value.substring(selectionStart.value);
    emit('update:content', newValue);
  }
  
  nextTick(() => {
    textarea.focus();
    const newPos = selectionStart.value + emoji.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
  });
}


function insertMarkdown(template: string) {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const value = textarea.value;
  
  const newValue = value.substring(0, start) + template + value.substring(start);
  emit('update:content', newValue);
  emit('insert-markdown', template);
  
  nextTick(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + template.length;
  });
}

function focus() {
  editorRef.value?.focus();
}

function emitCursorPositionChange() {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  try {
    const position = getCursorPosition(textarea);
    const element = getElementAtCursor(textarea.value, position.line, position.column);
    
    // Always emit, even if null, to clear selection when cursor is in empty space
    emit('cursor-change', element);
  } catch (error) {
    console.warn('Error detecting cursor position:', error);
    emit('cursor-change', null);
  }
}

defineExpose({ focus, editorRef, insertMarkdown });
</script>
