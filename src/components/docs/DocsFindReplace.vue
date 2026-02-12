<template>
  <Transition name="slide-down">
    <div
      v-if="isOpen"
      class="fixed top-[52px] right-4 z-50 w-[380px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl print:hidden"
    >
      <!-- Find row -->
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <Search class="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          ref="findInputRef"
          v-model="searchTerm"
          type="text"
          placeholder="Find in document..."
          class="flex-1 h-7 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
          @keydown.enter.prevent="findNext"
          @keydown.escape.prevent="close"
          @input="onSearchInput"
        />
        <span v-if="searchTerm" class="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap tabular-nums">
          {{ currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0 }}/{{ totalMatches }}
        </span>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-30"
          :disabled="totalMatches === 0"
          title="Previous (Shift+Enter)"
          @click="findPrev"
        >
          <ChevronUp class="h-3.5 w-3.5" />
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-30"
          :disabled="totalMatches === 0"
          title="Next (Enter)"
          @click="findNext"
        >
          <ChevronDown class="h-3.5 w-3.5" />
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          :class="{ '!text-blue-600 dark:!text-blue-400 bg-blue-50 dark:bg-blue-900/30': caseSensitive }"
          title="Match case"
          @click="caseSensitive = !caseSensitive; performSearch()"
        >
          <span class="text-xs font-bold">Aa</span>
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title="Toggle replace"
          @click="showReplace = !showReplace"
        >
          <ArrowDownUp class="h-3.5 w-3.5" :class="{ 'text-blue-600 dark:text-blue-400': showReplace }" />
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title="Close (Esc)"
          @click="close"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Replace row -->
      <Transition name="slide-down">
        <div v-if="showReplace" class="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <Replace class="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            v-model="replaceTerm"
            type="text"
            placeholder="Replace with..."
            class="flex-1 h-7 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
            @keydown.enter.prevent="replaceNext"
            @keydown.escape.prevent="close"
          />
          <button
            class="px-2 py-1 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30"
            :disabled="totalMatches === 0"
            @click="replaceNext"
          >
            Replace
          </button>
          <button
            class="px-2 py-1 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30"
            :disabled="totalMatches === 0"
            @click="replaceAll"
          >
            All
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Search, ChevronUp, ChevronDown, X, ArrowDownUp, Replace } from 'lucide-vue-next';
import type { Editor } from '@tiptap/vue-3';

const props = defineProps<{
  editor: Editor | null | undefined;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const findInputRef = ref<HTMLInputElement | null>(null);
const searchTerm = ref('');
const replaceTerm = ref('');
const caseSensitive = ref(false);
const showReplace = ref(false);
const totalMatches = ref(0);
const currentMatchIndex = ref(-1);

// Decorations for highlighting matches
let matchRanges: Array<{ from: number; to: number }> = [];

function onSearchInput() {
  performSearch();
}

function performSearch() {
  if (!props.editor || !searchTerm.value) {
    clearHighlights();
    totalMatches.value = 0;
    currentMatchIndex.value = -1;
    matchRanges = [];
    return;
  }

  const doc = props.editor.state.doc;
  const term = searchTerm.value;
  const flags = caseSensitive.value ? 'g' : 'gi';
  const regex = new RegExp(escapeRegex(term), flags);

  matchRanges = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let match;
    while ((match = regex.exec(node.text)) !== null) {
      matchRanges.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      });
    }
  });

  totalMatches.value = matchRanges.length;

  if (matchRanges.length > 0) {
    // Find the closest match to current cursor position
    const cursorPos = props.editor.state.selection.from;
    let closest = 0;
    for (let i = 0; i < matchRanges.length; i++) {
      if (matchRanges[i].from >= cursorPos) { closest = i; break; }
    }
    currentMatchIndex.value = closest;
    scrollToMatch(closest);
  } else {
    currentMatchIndex.value = -1;
    clearHighlights();
  }
}

function findNext() {
  if (totalMatches.value === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value;
  scrollToMatch(currentMatchIndex.value);
}

function findPrev() {
  if (totalMatches.value === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value - 1 + totalMatches.value) % totalMatches.value;
  scrollToMatch(currentMatchIndex.value);
}

function scrollToMatch(index: number) {
  if (!props.editor || index < 0 || index >= matchRanges.length) return;
  const range = matchRanges[index];
  props.editor.chain()
    .setTextSelection({ from: range.from, to: range.to })
    .scrollIntoView()
    .run();
}

function replaceNext() {
  if (!props.editor || totalMatches.value === 0 || currentMatchIndex.value < 0) return;
  const range = matchRanges[currentMatchIndex.value];
  props.editor.chain()
    .setTextSelection({ from: range.from, to: range.to })
    .insertContent(replaceTerm.value)
    .run();
  performSearch();
}

function replaceAll() {
  if (!props.editor || totalMatches.value === 0) return;
  // Replace from end to start to preserve positions
  const sorted = [...matchRanges].sort((a, b) => b.from - a.from);
  const chain = props.editor.chain();
  for (const range of sorted) {
    chain.setTextSelection({ from: range.from, to: range.to }).insertContent(replaceTerm.value);
  }
  chain.run();
  performSearch();
}

function clearHighlights() {
  // Highlights handled via selection, no extra cleanup needed
}

function close() {
  clearHighlights();
  searchTerm.value = '';
  replaceTerm.value = '';
  totalMatches.value = 0;
  currentMatchIndex.value = -1;
  matchRanges = [];
  emit('close');
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Focus input when opened
watch(() => props.isOpen, (open) => {
  if (open) {
    nextTick(() => {
      findInputRef.value?.focus();
      findInputRef.value?.select();
    });
  }
});

// Re-search when editor content changes
watch(() => props.editor?.state.doc, () => {
  if (props.isOpen && searchTerm.value) {
    performSearch();
  }
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 150ms ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
