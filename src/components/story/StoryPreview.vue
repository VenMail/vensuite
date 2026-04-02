<script setup lang="ts">
/**
 * StoryPreview — Dialog-based lightweight preview of the current story.
 * Shows scenes with read-only block rendering, animation playback, and scene navigation.
 */
import { ref, computed, inject, watch, onBeforeUnmount, nextTick } from 'vue';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Presentation,
} from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { StoryStoreReturn } from '@/store/story';
import { useStoryAnimations } from '@/composables/useStoryAnimations';
import StorySceneRendererReadonly from './StorySceneRendererReadonly.vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'start-presentation': [];
}>();

const store = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => store.editor);

// ── Local scene navigation ──────────────────────────────────────────────
const previewSceneIndex = ref(0);
const previewContainerRef = ref<HTMLElement | null>(null);

const scenes = computed(() => editor.value.scenes.value);
const totalScenes = computed(() => scenes.value.length);
const currentPreviewScene = computed(() => scenes.value[previewSceneIndex.value] ?? null);

const settings = computed(() => editor.value.document.value?.settings);

// Sync initial scene when opening
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    previewSceneIndex.value = editor.value.currentSceneIndex.value;
  } else {
    cleanupAnimations();
  }
});

// ── Viewport scaling ────────────────────────────────────────────────────
const containerWidth = ref(900);
const containerHeight = ref(506); // 16:9 at 900px

const viewportScale = computed(() => {
  const cw = settings.value.canvasWidth;
  const ch = settings.value.canvasHeight;
  return Math.min(
    containerWidth.value / cw,
    containerHeight.value / ch,
  );
});

const viewportStyle = computed(() => ({
  width: `${settings.value.canvasWidth}px`,
  height: `${settings.value.canvasHeight}px`,
  transform: `scale(${viewportScale.value})`,
  transformOrigin: 'top left',
}));

const viewportWrapperStyle = computed(() => ({
  width: `${settings.value.canvasWidth * viewportScale.value}px`,
  height: `${settings.value.canvasHeight * viewportScale.value}px`,
}));

// ── Scene background ────────────────────────────────────────────────────
const sceneBgStyle = computed(() => {
  const bg = currentPreviewScene.value?.background;
  if (!bg) return {};
  if (bg.type === 'solid') return { backgroundColor: bg.value };
  if (bg.type === 'gradient') return { backgroundImage: bg.value };
  if (bg.type === 'image') return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return {};
});

// ── Animation playback ─────────────────────────────────────────────────
const previewAnimations = useStoryAnimations({
  containerRef: previewContainerRef,
  scenes: scenes,
  currentSceneIndex: previewSceneIndex,
});

function playAnimations() {
  nextTick(() => {
    previewAnimations.previewScene();
  });
}

function cleanupAnimations() {
  previewAnimations.cleanup();
}

// ── Scene navigation ────────────────────────────────────────────────────
function prevScene() {
  if (previewSceneIndex.value > 0) {
    cleanupAnimations();
    previewSceneIndex.value--;
  }
}

function nextScene() {
  if (previewSceneIndex.value < totalScenes.value - 1) {
    cleanupAnimations();
    previewSceneIndex.value++;
  }
}

function goToScene(index: number) {
  if (index >= 0 && index < totalScenes.value) {
    cleanupAnimations();
    previewSceneIndex.value = index;
  }
}

// ── Keyboard navigation ────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevScene();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextScene();
  }
}

// ── Cleanup ────────────────────────────────────────────────────────────
onBeforeUnmount(() => {
  cleanupAnimations();
});
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden"
      @keydown="handleKeydown"
    >
      <DialogHeader class="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <DialogTitle class="text-sm font-semibold">
          Preview: {{ store.storyTitle || 'Untitled Story' }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          Preview your story scenes
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col bg-gray-100 dark:bg-gray-900">
        <!-- Scene navigation dots -->
        <div class="flex items-center justify-center gap-1.5 py-3 px-4">
          <button
            v-for="(scene, i) in scenes"
            :key="scene.id"
            :class="[
              'w-2 h-2 rounded-full transition-all duration-200',
              i === previewSceneIndex
                ? 'bg-purple-500 scale-125'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500',
            ]"
            :title="scene.name"
            @click="goToScene(i)"
          />
        </div>

        <!-- Scene viewport -->
        <div class="flex items-center justify-center px-6 pb-3">
          <div class="relative overflow-hidden rounded-lg shadow-lg" :style="viewportWrapperStyle">
            <div
              ref="previewContainerRef"
              class="relative bg-white"
              :style="viewportStyle"
            >
              <!-- Scene background -->
              <div class="absolute inset-0" :style="sceneBgStyle" />

              <!-- Scene content -->
              <StorySceneRendererReadonly
                v-if="currentPreviewScene"
                :key="currentPreviewScene.id"
                :scene="currentPreviewScene"
              />
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              :disabled="previewSceneIndex <= 0"
              @click="prevScene"
            >
              <ChevronLeft class="w-4 h-4" />
            </Button>
            <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums min-w-[4rem] text-center">
              {{ previewSceneIndex + 1 }} / {{ totalScenes }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              :disabled="previewSceneIndex >= totalScenes - 1"
              @click="nextScene"
            >
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1.5 text-xs"
              @click="playAnimations"
            >
              <Play class="w-3.5 h-3.5" />
              Play Animations
            </Button>
            <Button
              size="sm"
              class="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              @click="emit('start-presentation')"
            >
              <Presentation class="w-3.5 h-3.5" />
              Present
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
