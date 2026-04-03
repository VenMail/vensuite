<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { useStoryStore } from '@/store/story';
import type { StoryBlockType, StoryLayoutMode } from '@/types/story';
import type { StoryCanvasReturn } from '@/composables/useStoryCanvas';
import {
  Type,
  Heading,
  Image,
  Square,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
  Timer,
  Presentation,
} from 'lucide-vue-next';

const emit = defineEmits<{
  'toggle-timeline': [];
  'present': [];
}>();

const store = useStoryStore();
const canvasRef = inject<Ref<StoryCanvasReturn | null>>('storyCanvas');

const zoomPercent = computed(() => canvasRef?.value?.zoomPercent.value ?? 100);

interface BlockOption {
  type: StoryBlockType;
  label: string;
  icon: typeof Type;
}

const blockOptions: BlockOption[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'heading', label: 'Heading', icon: Heading },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'shape', label: 'Shape', icon: Square },
];

const currentLayout = computed<StoryLayoutMode>(() => {
  return store.currentScene?.layout ?? 'auto-stack';
});

function addBlock(type: StoryBlockType) {
  store.editor.addBlock(type);
}

function toggleLayout() {
  if (!store.currentScene) return;
  const next: StoryLayoutMode = currentLayout.value === 'auto-stack' ? 'freeform' : 'auto-stack';
  store.editor.updateSceneLayout(store.currentSceneIndex, next);
}

function handleZoomIn() {
  canvasRef?.value?.zoomIn();
}

function handleZoomOut() {
  canvasRef?.value?.zoomOut();
}

function fitToScreen() {
  canvasRef?.value?.zoomToFit();
}
</script>

<template>
  <div
    class="h-12 flex items-center justify-center gap-1 px-4
           bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
           border-t border-gray-200 dark:border-gray-800 select-none"
  >
    <!-- Block insertion chips -->
    <div class="flex items-center gap-1">
      <button
        v-for="opt in blockOptions"
        :key="opt.type"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
               font-medium text-gray-600 dark:text-gray-400
               bg-gray-50 dark:bg-gray-800 rounded-full
               border border-gray-200 dark:border-gray-700
               hover:bg-primary-50 hover:text-primary-700
               hover:border-primary-300
               dark:hover:bg-primary-900/30 dark:hover:text-primary-400
               dark:hover:border-primary-700
               transition-all duration-150"
        @click="addBlock(opt.type)"
      >
        <component :is="opt.icon" class="w-3.5 h-3.5" />
        {{ opt.label }}
      </button>
    </div>

    <!-- Separator -->
    <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

    <!-- Layout toggle -->
    <button
      :class="[
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
        'rounded-full border transition-all duration-150',
        currentLayout === 'auto-stack'
          ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
          : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        'hover:shadow-sm',
      ]"
      :title="currentLayout === 'auto-stack' ? 'Switch to Freeform' : 'Switch to Auto Stack'"
      @click="toggleLayout"
    >
      <Layers class="w-3.5 h-3.5" />
      {{ currentLayout === 'auto-stack' ? 'Auto Stack' : 'Freeform' }}
    </button>

    <!-- Separator -->
    <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

    <!-- Zoom controls -->
    <div class="flex items-center gap-1">
      <button
        class="p-1.5 rounded-full text-gray-500 dark:text-gray-400
               hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Zoom out"
        @click="handleZoomOut"
      >
        <ZoomOut class="w-4 h-4" />
      </button>

      <span
        class="min-w-[3rem] text-center text-xs font-medium tabular-nums
               text-gray-600 dark:text-gray-400"
      >
        {{ zoomPercent }}%
      </span>

      <button
        class="p-1.5 rounded-full text-gray-500 dark:text-gray-400
               hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Zoom in"
        @click="handleZoomIn"
      >
        <ZoomIn class="w-4 h-4" />
      </button>

      <button
        class="p-1.5 rounded-full text-gray-500 dark:text-gray-400
               hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Fit to screen"
        @click="fitToScreen"
      >
        <Maximize class="w-4 h-4" />
      </button>
    </div>

    <!-- Separator -->
    <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

    <!-- Timeline toggle -->
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
             font-medium text-gray-600 dark:text-gray-400
             bg-gray-50 dark:bg-gray-800 rounded-full
             border border-gray-200 dark:border-gray-700
             hover:bg-primary-50 hover:text-primary-700
             hover:border-primary-300
             dark:hover:bg-primary-900/30 dark:hover:text-primary-400
             dark:hover:border-primary-700
             transition-all duration-150"
      title="Toggle timeline (Ctrl+T)"
      @click="emit('toggle-timeline')"
    >
      <Timer class="w-3.5 h-3.5" />
      Timeline
    </button>

    <!-- Separator -->
    <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

    <!-- Present button -->
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
             font-medium text-white
             bg-purple-600 rounded-full
             hover:bg-purple-700
             transition-all duration-150"
      title="Present (F5)"
      @click="emit('present')"
    >
      <Presentation class="w-3.5 h-3.5" />
      Present
    </button>
  </div>
</template>
