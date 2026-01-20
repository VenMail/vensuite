<template>
  <div class="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    <div class="p-3 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Slides</h3>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      <div
        v-for="(slide, index) in slides"
        :key="slide.id"
        class="slide-thumbnail group relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden"
        :class="{
          'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800': index === currentSlideIndex,
          'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': index !== currentSlideIndex
        }"
        @click="$emit('select-slide', index)"
      >
        <!-- Thumbnail Preview -->
        <div 
          class="aspect-[4/3] bg-white dark:bg-gray-800 p-2 text-[6px] leading-tight overflow-hidden"
          v-html="getSlidePreview(slide)"
        />
        
        <!-- Slide Number Badge -->
        <div class="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          {{ index + 1 }}
        </div>

        <!-- Actions Overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
          <div class="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-t-md shadow-lg">
            <button
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Duplicate"
              @click.stop="$emit('duplicate-slide', index)"
            >
              <Copy class="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Move Up"
              :disabled="index === 0"
              @click.stop="$emit('move-slide', index, 'up')"
            >
              <ChevronUp class="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Move Down"
              :disabled="index === slides.length - 1"
              @click.stop="$emit('move-slide', index, 'down')"
            >
              <ChevronDown class="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              title="Delete"
              :disabled="slides.length <= 1"
              @click.stop="$emit('delete-slide', index)"
            >
              <Trash2 class="h-3 w-3 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <!-- Add Slide Button -->
      <button
        class="w-full aspect-[4/3] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        @click="$emit('add-slide')"
      >
        <Plus class="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-vue-next';
import { parseMarkdownToHtml, type SlidevSlide } from '@/utils/slidevMarkdown';

interface Props {
  slides: SlidevSlide[];
  currentSlideIndex: number;
}

defineProps<Props>();

defineEmits<{
  'select-slide': [index: number];
  'duplicate-slide': [index: number];
  'move-slide': [index: number, direction: 'up' | 'down'];
  'delete-slide': [index: number];
  'add-slide': [];
}>();

function getSlidePreview(slide: SlidevSlide): string {
  const html = parseMarkdownToHtml(slide.content);
  return html.substring(0, 500);
}
</script>

<style scoped>
.slide-thumbnail:hover .slide-actions {
  opacity: 1;
}
</style>
