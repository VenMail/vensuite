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
        
        <!-- Font Size Dropdown -->
        <div class="relative" ref="fontSizeDropdownRef">
          <button
            class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
            title="Font Size"
            @click="showFontSizeDropdown = !showFontSizeDropdown"
          >
            <Type class="h-3.5 w-3.5" />
            <ChevronDown class="h-3 w-3" />
          </button>
          <div
            v-if="showFontSizeDropdown"
            class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1"
          >
            <button
              v-for="size in fontSizes"
              :key="size.value"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              @click="insertFontSize(size.value); showFontSizeDropdown = false"
            >
              <span>{{ size.label }}</span>
              <code class="text-xs text-gray-400">{{ size.syntax }}</code>
            </button>
          </div>
        </div>
        
        <!-- Spacing Dropdown -->
        <div class="relative" ref="spacingDropdownRef">
          <button
            class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
            title="Spacing & Margins"
            @click="showSpacingDropdown = !showSpacingDropdown"
          >
            <Space class="h-3.5 w-3.5" />
            <ChevronDown class="h-3 w-3" />
          </button>
          <div
            v-if="showSpacingDropdown"
            class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1"
          >
            <div class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Padding</div>
            <button
              v-for="spacing in paddingOptions"
              :key="spacing.value"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              @click="insertSpacing('p', spacing.value); showSpacingDropdown = false"
            >
              <span>{{ spacing.label }}</span>
              <code class="text-xs text-gray-400">{{ spacing.class }}</code>
            </button>
            <div class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-t border-gray-200 dark:border-gray-700 mt-1">Margin</div>
            <button
              v-for="spacing in marginOptions"
              :key="spacing.value"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              @click="insertSpacing('m', spacing.value); showSpacingDropdown = false"
            >
              <span>{{ spacing.label }}</span>
              <code class="text-xs text-gray-400">{{ spacing.class }}</code>
            </button>
            <div class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-t border-gray-200 dark:border-gray-700 mt-1">Gap (for grids)</div>
            <button
              v-for="spacing in gapOptions"
              :key="spacing.value"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              @click="insertSpacing('gap', spacing.value); showSpacingDropdown = false"
            >
              <span>{{ spacing.label }}</span>
              <code class="text-xs text-gray-400">{{ spacing.class }}</code>
            </button>
          </div>
        </div>
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
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { 
  Heading, List, Code, Image, Quote, Table,
  GitBranch, LayoutGrid, Link, Palette, StickyNote, ChevronDown,
  Smile, Type, Space
} from 'lucide-vue-next';
import EmojiPickerDialog from './EmojiPickerDialog.vue';

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
}>();

const editorRef = ref<HTMLTextAreaElement | null>(null);
const showNotes = ref(false);
const showEmojiPicker = ref(false);
const showFontSizeDropdown = ref(false);
const showSpacingDropdown = ref(false);
const fontSizeDropdownRef = ref<HTMLElement | null>(null);
const spacingDropdownRef = ref<HTMLElement | null>(null);
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

// Font size options (Slidev/UnoCSS compatible)
const fontSizes = [
  { label: 'Extra Small', value: 'xs', syntax: 'text-xs' },
  { label: 'Small', value: 'sm', syntax: 'text-sm' },
  { label: 'Base', value: 'base', syntax: 'text-base' },
  { label: 'Large', value: 'lg', syntax: 'text-lg' },
  { label: 'Extra Large', value: 'xl', syntax: 'text-xl' },
  { label: '2XL', value: '2xl', syntax: 'text-2xl' },
  { label: '3XL', value: '3xl', syntax: 'text-3xl' },
  { label: '4XL', value: '4xl', syntax: 'text-4xl' },
  { label: '5XL', value: '5xl', syntax: 'text-5xl' },
  { label: '6XL', value: '6xl', syntax: 'text-6xl' },
];

// Padding options
const paddingOptions = [
  { label: 'None', value: '0', class: 'p-0' },
  { label: 'Small', value: '2', class: 'p-2' },
  { label: 'Medium', value: '4', class: 'p-4' },
  { label: 'Large', value: '8', class: 'p-8' },
  { label: 'Extra Large', value: '12', class: 'p-12' },
];

// Margin options
const marginOptions = [
  { label: 'None', value: '0', class: 'm-0' },
  { label: 'Small', value: '2', class: 'm-2' },
  { label: 'Medium', value: '4', class: 'm-4' },
  { label: 'Large', value: '8', class: 'm-8' },
  { label: 'Auto (center)', value: 'auto', class: 'mx-auto' },
];

// Gap options
const gapOptions = [
  { label: 'Small', value: '2', class: 'gap-2' },
  { label: 'Medium', value: '4', class: 'gap-4' },
  { label: 'Large', value: '8', class: 'gap-8' },
  { label: 'Extra Large', value: '12', class: 'gap-12' },
];

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:content', target.value);
}

function handleNotesInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:notes', target.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault();
    insertMarkdown('  ');
  }
}

function handleSelection() {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  selectionStart.value = textarea.selectionStart;
  selectionEnd.value = textarea.selectionEnd;
  selectedText.value = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
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

function insertFontSize(size: string) {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  handleSelection();
  const value = textarea.value;
  
  if (selectedText.value) {
    // Wrap selected text with styled span using Slidev/UnoCSS syntax
    const styledText = `<span class="text-${size}">${selectedText.value}</span>`;
    const newValue = value.substring(0, selectionStart.value) + styledText + value.substring(selectionEnd.value);
    emit('update:content', newValue);
  } else {
    // Insert a placeholder with the class
    const template = `\n<div class="text-${size}">\n\nYour content here\n\n</div>\n`;
    insertMarkdown(template);
  }
}

function insertSpacing(type: string, value: string) {
  const textarea = editorRef.value;
  if (!textarea) return;
  
  handleSelection();
  const content = textarea.value;
  
  let className = '';
  if (type === 'p') className = `p-${value}`;
  else if (type === 'm') className = value === 'auto' ? 'mx-auto' : `m-${value}`;
  else if (type === 'gap') className = `gap-${value}`;
  
  if (selectedText.value) {
    // Wrap selected text
    const styledText = `<div class="${className}">\n${selectedText.value}\n</div>`;
    const newValue = content.substring(0, selectionStart.value) + styledText + content.substring(selectionEnd.value);
    emit('update:content', newValue);
  } else {
    // Insert a block with the class
    const template = `\n<div class="${className}">\n\nYour content here\n\n</div>\n`;
    insertMarkdown(template);
  }
}

// Close dropdowns when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (fontSizeDropdownRef.value && !fontSizeDropdownRef.value.contains(event.target as Node)) {
    showFontSizeDropdown.value = false;
  }
  if (spacingDropdownRef.value && !spacingDropdownRef.value.contains(event.target as Node)) {
    showSpacingDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

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

defineExpose({ focus, editorRef, insertMarkdown, insertFontSize, insertSpacing });
</script>
