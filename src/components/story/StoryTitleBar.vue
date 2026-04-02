<template>
  <header
    class="h-12 min-h-[48px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 select-none"
  >
    <!-- Left: Back + Title -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        type="button"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Back to stories"
        @click="emit('back')"
      >
        <ArrowLeft class="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      <!-- Inline-editable title -->
      <input
        ref="titleInputRef"
        :value="props.title"
        type="text"
        class="
          bg-transparent border-0 outline-none text-sm font-semibold
          text-gray-900 dark:text-gray-100
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:bg-gray-100 dark:focus:bg-gray-800
          focus:ring-1 focus:ring-purple-400
          rounded px-2 py-1 min-w-[120px] max-w-[320px] truncate
          transition-colors duration-150
        "
        placeholder="Untitled Story"
        @input="onTitleInput"
        @keydown.enter="blurTitle"
        @blur="commitTitle"
      />
    </div>

    <!-- Center: Save status -->
    <div class="flex items-center gap-2 text-xs">
      <template v-if="props.isSaving">
        <Loader2 class="w-3.5 h-3.5 text-gray-400 animate-spin" />
        <span class="text-gray-500 dark:text-gray-400">Saving…</span>
      </template>
      <template v-else-if="props.hasUnsavedChanges">
        <span class="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        <span class="text-amber-600 dark:text-amber-400">Unsaved changes</span>
      </template>
      <template v-else>
        <Check class="w-3.5 h-3.5 text-green-500" />
        <span class="text-gray-500 dark:text-gray-400">Saved</span>
      </template>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1">
      <!-- Undo -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :disabled="!props.canUndo"
        title="Undo (Ctrl+Z)"
        @click="emit('undo')"
      >
        <Undo2 class="w-4 h-4" />
      </Button>

      <!-- Redo -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :disabled="!props.canRedo"
        title="Redo (Ctrl+Shift+Z)"
        @click="emit('redo')"
      >
        <Redo2 class="w-4 h-4" />
      </Button>

      <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <!-- Preview -->
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        title="Preview story"
        @click="emit('preview')"
      >
        <Eye class="w-4 h-4" />
        Preview
      </Button>

      <!-- Share (placeholder) -->
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        title="Share story"
      >
        <Share2 class="w-4 h-4" />
        Share
      </Button>

      <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <!-- Save -->
      <Button
        variant="default"
        size="sm"
        class="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
        :disabled="props.isSaving"
        @click="emit('save')"
      >
        <Save class="w-4 h-4" />
        Save
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Eye,
  Share2,
  Check,
  Loader2,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Props & Emits
// ---------------------------------------------------------------------------
const props = withDefaults(
  defineProps<{
    title: string;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    lastSavedAt?: Date | null;
    canUndo?: boolean;
    canRedo?: boolean;
  }>(),
  {
    lastSavedAt: null,
    canUndo: false,
    canRedo: false,
  },
);

const emit = defineEmits<{
  (e: 'update:title', value: string): void;
  (e: 'save'): void;
  (e: 'back'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'preview'): void;
  (e: 'present'): void;
}>();

// ---------------------------------------------------------------------------
// Title editing
// ---------------------------------------------------------------------------
const titleInputRef = ref<HTMLInputElement | null>(null);
let pendingTitle = props.title;

function onTitleInput(event: Event) {
  pendingTitle = (event.target as HTMLInputElement).value;
}

function blurTitle() {
  titleInputRef.value?.blur();
}

function commitTitle() {
  const trimmed = pendingTitle.trim();
  if (trimmed && trimmed !== props.title) {
    emit('update:title', trimmed);
  }
}
</script>
