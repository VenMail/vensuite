<script setup lang="ts">
/**
 * StoryTimeline — Collapsible bottom drawer showing a visual animation timeline
 * for the current scene. Tracks per block, bars per animation, playhead scrubber.
 */
import { computed, inject, ref } from 'vue';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
  GripHorizontal,
} from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type { StoryAnimationsReturn } from '@/composables/useStoryAnimations';
import { ANIMATION_PRESETS, type AnimationCategory } from '@/composables/useStoryAnimations';
import type { StoryBlock, StoryAnimation } from '@/types/story';

const emit = defineEmits<{
  close: [];
}>();

const store = inject<StoryStoreReturn>('storyStore')!;
const animations = inject<StoryAnimationsReturn>('storyAnimations')!;
const editor = computed(() => store.editor);

// ── Timeline state ──────────────────────────────────────────────────
const pixelsPerSecond = ref(120);
const timelineScrollRef = ref<HTMLElement | null>(null);

// ── Derived data ────────────────────────────────────────────────────
const currentScene = computed(() => editor.value.currentScene.value);

/** Blocks that have at least one animation */
const animatedBlocks = computed(() => {
  if (!currentScene.value) return [];
  return currentScene.value.blocks.filter(b => b.animations.length > 0);
});

/** Max time across all animations (delay + duration) for ruler width */
const maxTime = computed(() => {
  let max = 2; // minimum 2 seconds
  if (!currentScene.value) return max;
  for (const block of currentScene.value.blocks) {
    for (const anim of block.animations) {
      const end = anim.delay + anim.duration;
      if (end > max) max = end;
    }
  }
  return Math.ceil(max + 1); // add 1s padding
});

const rulerWidth = computed(() => maxTime.value * pixelsPerSecond.value);

// ── Ruler ticks ─────────────────────────────────────────────────────
const rulerTicks = computed(() => {
  const ticks: { x: number; label: string; major: boolean }[] = [];
  const step = pixelsPerSecond.value >= 80 ? 0.5 : 1;
  for (let t = 0; t <= maxTime.value; t += step) {
    ticks.push({
      x: t * pixelsPerSecond.value,
      label: `${t}s`,
      major: t % 1 === 0,
    });
  }
  return ticks;
});

// ── Category colors for bars ────────────────────────────────────────
const barColors: Record<AnimationCategory, string> = {
  entrance: '#3b82f6',
  exit: '#ef4444',
  emphasis: '#f59e0b',
  motion: '#8b5cf6',
};

function getBarColor(anim: StoryAnimation): string {
  const preset = ANIMATION_PRESETS[anim.preset];
  return barColors[preset?.category ?? 'entrance'];
}

function getBlockLabel(block: StoryBlock): string {
  return block.name || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)}`;
}

// ── Playhead position ───────────────────────────────────────────────
const playheadX = computed(() => {
  if (!animations) return 0;
  return animations.currentTime.value * pixelsPerSecond.value;
});

// ── Playback controls ───────────────────────────────────────────────
function togglePlay() {
  if (!animations) return;
  if (animations.isPlaying.value) {
    animations.pause();
  } else {
    animations.play();
  }
}

function handleRestart() {
  animations?.restart();
}

// ── Zoom ────────────────────────────────────────────────────────────
function zoomIn() {
  pixelsPerSecond.value = Math.min(pixelsPerSecond.value + 30, 300);
}

function zoomOut() {
  pixelsPerSecond.value = Math.max(pixelsPerSecond.value - 30, 40);
}

// ── Click on ruler to seek ──────────────────────────────────────────
function handleRulerClick(e: MouseEvent) {
  if (!animations || !timelineScrollRef.value) return;
  const rect = timelineScrollRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left + timelineScrollRef.value.scrollLeft;
  const time = x / pixelsPerSecond.value;
  animations.seek(Math.max(0, time));
}

// ── Bar drag for delay adjustment ───────────────────────────────────
let dragAnim: { blockId: string; animId: string; startX: number; startDelay: number } | null = null;

function handleBarMouseDown(blockId: string, anim: StoryAnimation, e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  dragAnim = {
    blockId,
    animId: anim.id,
    startX: e.clientX,
    startDelay: anim.delay,
  };
  window.addEventListener('mousemove', handleBarMouseMove);
  window.addEventListener('mouseup', handleBarMouseUp);
}

function handleBarMouseMove(e: MouseEvent) {
  if (!dragAnim) return;
  const dx = e.clientX - dragAnim.startX;
  const dt = dx / pixelsPerSecond.value;
  const newDelay = Math.max(0, dragAnim.startDelay + dt);
  editor.value.updateAnimation(dragAnim.blockId, dragAnim.animId, {
    delay: Math.round(newDelay * 10) / 10,
  });
}

function handleBarMouseUp() {
  dragAnim = null;
  window.removeEventListener('mousemove', handleBarMouseMove);
  window.removeEventListener('mouseup', handleBarMouseUp);
}
</script>

<template>
  <div class="story-timeline flex flex-col border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <!-- Handle bar -->
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <GripHorizontal class="w-4 h-4 text-gray-300 dark:text-gray-600" />
        <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Timeline</span>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-1">
        <button
          class="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Restart"
          @click="handleRestart"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
        <button
          :class="[
            'p-1 rounded transition-colors',
            animations?.isPlaying.value
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          ]"
          :title="animations?.isPlaying.value ? 'Pause' : 'Play'"
          @click="togglePlay"
        >
          <Pause v-if="animations?.isPlaying.value" class="w-3.5 h-3.5" />
          <Play v-else class="w-3.5 h-3.5" />
        </button>

        <!-- Time display -->
        <span class="text-[10px] font-mono text-gray-400 tabular-nums px-1.5">
          {{ animations?.currentTime.value.toFixed(1) ?? '0.0' }}s
          / {{ animations?.totalDuration.value.toFixed(1) ?? '0.0' }}s
        </span>

        <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        <!-- Zoom -->
        <button
          class="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="zoomOut"
        >
          <ZoomOut class="w-3 h-3" />
        </button>
        <button
          class="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="zoomIn"
        >
          <ZoomIn class="w-3 h-3" />
        </button>

        <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          class="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Close timeline"
          @click="emit('close')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Timeline body -->
    <div class="flex" style="height: 160px">
      <!-- Block labels column -->
      <div class="w-[120px] min-w-[120px] border-r border-gray-100 dark:border-gray-800 overflow-hidden">
        <!-- Ruler spacer -->
        <div class="h-6 border-b border-gray-100 dark:border-gray-800" />
        <!-- Block labels -->
        <div
          v-for="block in animatedBlocks"
          :key="block.id"
          class="h-8 flex items-center px-2 border-b border-gray-50 dark:border-gray-800/50"
        >
          <span class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {{ getBlockLabel(block) }}
          </span>
        </div>
        <!-- Empty state -->
        <div
          v-if="animatedBlocks.length === 0"
          class="flex items-center justify-center h-full"
        >
          <span class="text-[10px] text-gray-400">No animations</span>
        </div>
      </div>

      <!-- Tracks area -->
      <div
        ref="timelineScrollRef"
        class="flex-1 overflow-x-auto overflow-y-auto relative"
        @click="handleRulerClick"
      >
        <div :style="{ width: `${rulerWidth + 40}px`, minHeight: '100%' }" class="relative">
          <!-- Ruler -->
          <div class="h-6 border-b border-gray-100 dark:border-gray-800 relative">
            <div
              v-for="tick in rulerTicks"
              :key="tick.x"
              class="absolute top-0 bottom-0"
              :style="{ left: `${tick.x}px` }"
            >
              <div
                :class="[
                  'absolute bottom-0',
                  tick.major ? 'h-3 w-px bg-gray-300 dark:bg-gray-600' : 'h-1.5 w-px bg-gray-200 dark:bg-gray-700',
                ]"
              />
              <span
                v-if="tick.major"
                class="absolute top-0.5 text-[9px] text-gray-400 tabular-nums"
                :style="{ left: '2px' }"
              >
                {{ tick.label }}
              </span>
            </div>
          </div>

          <!-- Tracks -->
          <div
            v-for="block in animatedBlocks"
            :key="block.id"
            class="h-8 border-b border-gray-50 dark:border-gray-800/50 relative"
          >
            <!-- Animation bars -->
            <div
              v-for="anim in block.animations"
              :key="anim.id"
              class="absolute top-1 h-6 rounded cursor-move select-none
                     flex items-center px-1.5 text-[9px] text-white font-medium
                     shadow-sm hover:shadow transition-shadow"
              :style="{
                left: `${anim.delay * pixelsPerSecond}px`,
                width: `${Math.max(anim.duration * pixelsPerSecond, 20)}px`,
                backgroundColor: getBarColor(anim),
              }"
              :title="`${ANIMATION_PRESETS[anim.preset]?.label ?? anim.preset} — ${anim.duration}s`"
              @mousedown="handleBarMouseDown(block.id, anim, $event)"
            >
              <span class="truncate">
                {{ ANIMATION_PRESETS[anim.preset]?.label ?? anim.preset }}
              </span>
            </div>
          </div>

          <!-- Playhead -->
          <div
            class="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
            :style="{ left: `${playheadX}px` }"
          >
            <!-- Playhead handle -->
            <div
              class="absolute -top-0 -left-[4px] w-[9px] h-3 bg-red-500 rounded-b"
              style="clip-path: polygon(0 0, 100% 0, 50% 100%)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
