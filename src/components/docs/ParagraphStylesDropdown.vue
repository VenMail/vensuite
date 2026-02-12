<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 min-w-[100px]"
        title="Paragraph style"
      >
        <span class="truncate">{{ activeStyleLabel }}</span>
        <ChevronDown class="h-3 w-3 opacity-60 flex-shrink-0" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-64 p-1">
      <button
        v-for="style in paragraphStyles"
        :key="style.key"
        class="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        :class="{ 'bg-blue-50 dark:bg-blue-900/30': style.key === activeStyleKey }"
        @click="applyStyle(style)"
      >
        <span
          class="flex-1 truncate"
          :class="style.previewClass"
        >
          {{ style.label }}
        </span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {{ style.shortcut }}
        </span>
      </button>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Editor } from '@tiptap/vue-3';

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

interface ParagraphStyle {
  key: string;
  label: string;
  previewClass: string;
  shortcut: string;
  apply: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

const paragraphStyles: ParagraphStyle[] = [
  {
    key: 'paragraph',
    label: 'Normal text',
    previewClass: 'text-sm text-gray-700 dark:text-gray-200',
    shortcut: 'Ctrl+Alt+0',
    apply: (e) => e.chain().focus().setParagraph().run(),
    isActive: (e) => e.isActive('paragraph') && !e.isActive('heading'),
  },
  {
    key: 'title',
    label: 'Title',
    previewClass: 'text-xl font-bold text-gray-900 dark:text-gray-100',
    shortcut: '',
    apply: (e) => e.chain().focus().toggleHeading({ level: 1 }).setFontSize?.('26pt').run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
  },
  {
    key: 'subtitle',
    label: 'Subtitle',
    previewClass: 'text-base font-medium text-gray-500 dark:text-gray-400',
    shortcut: '',
    apply: (e) => e.chain().focus().toggleHeading({ level: 2 }).setFontSize?.('15pt').run(),
    isActive: (_e) => false, // Subtitle is a special case
  },
  {
    key: 'heading1',
    label: 'Heading 1',
    previewClass: 'text-lg font-bold text-gray-900 dark:text-gray-100',
    shortcut: 'Ctrl+Alt+1',
    apply: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
  },
  {
    key: 'heading2',
    label: 'Heading 2',
    previewClass: 'text-base font-semibold text-gray-800 dark:text-gray-200',
    shortcut: 'Ctrl+Alt+2',
    apply: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    key: 'heading3',
    label: 'Heading 3',
    previewClass: 'text-sm font-semibold text-gray-700 dark:text-gray-300',
    shortcut: 'Ctrl+Alt+3',
    apply: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive('heading', { level: 3 }),
  },
  {
    key: 'heading4',
    label: 'Heading 4',
    previewClass: 'text-sm font-medium text-gray-600 dark:text-gray-400',
    shortcut: 'Ctrl+Alt+4',
    apply: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
    isActive: (e) => e.isActive('heading', { level: 4 }),
  },
];

const activeStyleKey = computed(() => {
  if (!props.editor) return 'paragraph';
  for (const style of paragraphStyles) {
    if (style.isActive(props.editor)) return style.key;
  }
  return 'paragraph';
});

const activeStyleLabel = computed(() => {
  const style = paragraphStyles.find(s => s.key === activeStyleKey.value);
  return style?.label || 'Normal text';
});

function applyStyle(style: ParagraphStyle) {
  if (!props.editor) return;
  style.apply(props.editor);
}
</script>
