<template>
  <Transition name="slide-down">
    <div
      v-if="isOpen"
      class="find-replace-bar bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-wrap items-center gap-2 shadow-sm"
    >
      <!-- Find -->
      <div class="flex items-center gap-1">
        <input
          ref="findInputRef"
          v-model="findText"
          type="text"
          placeholder="Find..."
          class="find-input"
          @keydown.enter="searchNext"
          @input="runSearch"
        />
        <button class="find-btn" title="Previous" @click="searchPrev">
          <ChevronUp class="h-4 w-4" />
        </button>
        <button class="find-btn" title="Next" @click="searchNext">
          <ChevronDown class="h-4 w-4" />
        </button>
        <span v-if="navInfo" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {{ navInfo.index + 1 }} / {{ navInfo.count }}
        </span>
      </div>

      <div class="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      <!-- Replace -->
      <div class="flex items-center gap-1">
        <input
          v-model="replaceText"
          type="text"
          placeholder="Replace with..."
          class="find-input"
          @keydown.enter="replaceOne"
        />
        <button class="find-btn" @click="replaceOne">Replace</button>
        <button class="find-btn" @click="replaceAll">Replace All</button>
      </div>

      <button class="ml-auto find-btn" title="Close (Esc)" @click="emit('close')">
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { ChevronUp, ChevronDown, X } from 'lucide-vue-next';

const props = defineProps<{
  editorInstance: any;
  isOpen: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const findInputRef  = ref<HTMLInputElement | null>(null);
const findText      = ref('');
const replaceText   = ref('');
const navInfo       = ref<{ index: number; count: number } | null>(null);

watch(() => props.isOpen, async (open) => {
  if (open) {
    await nextTick();
    findInputRef.value?.focus();
    findInputRef.value?.select();
  } else {
    clearSearch();
  }
});

function runSearch() {
  if (!props.editorInstance) return;
  try {
    props.editorInstance.command.executeSearch(findText.value || null);
    navInfo.value = findText.value
      ? props.editorInstance.command.getSearchNavigateInfo()
      : null;
  } catch {}
}

function searchNext() {
  if (!props.editorInstance) return;
  try {
    props.editorInstance.command.executeSearchNavigateNext();
    navInfo.value = props.editorInstance.command.getSearchNavigateInfo();
  } catch {}
}

function searchPrev() {
  if (!props.editorInstance) return;
  try {
    props.editorInstance.command.executeSearchNavigatePre();
    navInfo.value = props.editorInstance.command.getSearchNavigateInfo();
  } catch {}
}

function replaceOne() {
  if (!props.editorInstance || !findText.value) return;
  try {
    props.editorInstance.command.executeReplace({ oldValue: findText.value, newValue: replaceText.value });
    runSearch();
  } catch {}
}

function replaceAll() {
  if (!props.editorInstance || !findText.value) return;
  try {
    // Replace sequentially until no matches remain
    let info = props.editorInstance.command.getSearchNavigateInfo();
    const max = (info?.count ?? 0) + 1;
    for (let i = 0; i < max; i++) {
      props.editorInstance.command.executeReplace({ oldValue: findText.value, newValue: replaceText.value });
    }
    runSearch();
  } catch {}
}

function clearSearch() {
  try { props.editorInstance?.command?.executeSearch(null); } catch {}
  navInfo.value = null;
  findText.value = '';
}
</script>

<style scoped>
.find-input {
  @apply h-7 px-2 text-sm rounded border border-gray-300 dark:border-gray-600
         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
         focus:outline-none focus:ring-1 focus:ring-blue-400 w-40;
}
.find-btn {
  @apply inline-flex items-center gap-1 px-2 py-1 text-xs rounded
         bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200
         hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.15s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
