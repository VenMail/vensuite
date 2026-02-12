<template>
  <div 
    class="docs-status-bar fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between h-7 px-3 text-[11px] border-t print:hidden select-none"
    :class="statusBarClasses"
  >
    <!-- Left section -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Page info -->
      <span v-if="pageCount > 0" class="text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {{ $t('Commons.text.page') }} {{ currentPage }} / {{ pageCount }}
      </span>

      <!-- Word count -->
      <button
        class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap transition-colors"
        @click="showWordCountDetail = !showWordCountDetail"
        :title="wordCountDetailText"
      >
        {{ wordCount }} {{ $t('Commons.text.words') }}
      </button>

      <!-- Character count (shown on click) -->
      <span v-if="showWordCountDetail" class="text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {{ charCount }} {{ $t('Commons.text.characters') }}
      </span>

      <!-- Current heading context -->
      <span v-if="currentHeading" class="text-gray-400 dark:text-gray-500 truncate max-w-[200px]" :title="currentHeading">
        {{ currentHeading }}
      </span>
    </div>

    <!-- Right section -->
    <div class="flex items-center gap-3">
      <!-- Editor mode badge -->
      <span 
        v-if="editorMode !== 'editing'"
        class="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
        :class="editorMode === 'viewing' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'"
      >
        {{ editorMode === 'viewing' ? $t('Commons.text.view_only') : $t('Commons.text.suggesting') }}
      </span>

      <!-- Zoom control -->
      <div class="flex items-center gap-1">
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          @click="$emit('zoom-out')"
          title="Zoom out (Ctrl+-)"
        >
          <Minus class="h-3 w-3" />
        </button>
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-w-[36px] text-center transition-colors"
          @click="$emit('reset-zoom')"
          :title="`Zoom: ${zoom}%`"
        >
          {{ zoom }}%
        </button>
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          @click="$emit('zoom-in')"
          title="Zoom in (Ctrl+=)"
        >
          <Plus class="h-3 w-3" />
        </button>
      </div>

      <!-- Save status -->
      <span class="whitespace-nowrap" :class="saveStatusClass">
        <template v-if="isOffline">
          <WifiOff class="h-3 w-3 inline mr-0.5" />
          {{ $t('Commons.text.offline') }}
        </template>
        <template v-else-if="isSaving">
          <Loader2 class="h-3 w-3 inline mr-0.5 animate-spin" />
          {{ $t('Commons.text.saving') }}
        </template>
        <template v-else-if="hasUnsavedChanges">
          <Circle class="h-2 w-2 inline mr-0.5 fill-current" />
          {{ $t('Commons.text.unsaved') }}
        </template>
        <template v-else>
          <Check class="h-3 w-3 inline mr-0.5" />
          {{ $t('Commons.text.saved') }}
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Minus, Plus, Loader2, Check, Circle, WifiOff } from 'lucide-vue-next';
import { useTranslation } from '@/composables/useTranslation';

const { t: $t } = useTranslation();

const props = defineProps<{
  wordCount: number;
  charCount: number;
  pageCount: number;
  currentPage: number;
  currentHeading: string;
  zoom: number;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isOffline: boolean;
  editorMode: 'editing' | 'viewing' | 'suggesting';
}>();

defineEmits<{
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'reset-zoom'): void;
}>();

const showWordCountDetail = ref(false);

const wordCountDetailText = computed(() =>
  `${props.wordCount} words, ${props.charCount} characters`
);

const statusBarClasses = computed(() => [
  'bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700 backdrop-blur-sm',
]);

const saveStatusClass = computed(() => {
  if (props.isOffline) return 'text-amber-500 dark:text-amber-400';
  if (props.isSaving) return 'text-blue-500 dark:text-blue-400';
  if (props.hasUnsavedChanges) return 'text-amber-500 dark:text-amber-400';
  return 'text-gray-400 dark:text-gray-500';
});
</script>
