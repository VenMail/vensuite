<script setup lang="ts">
/**
 * StoryCanvas — Main visual editing surface for the StoryTeller module.
 * DOM-based canvas with zoom/pan via CSS transforms, grid overlay,
 * scene rendering, and selection overlay.
 */
import { ref, computed, inject } from 'vue';
import { useStoryCanvas } from '@/composables/useStoryCanvas';
import { useStoryBlocks } from '@/composables/useStoryBlocks';
import type { StoryStoreReturn } from '@/store/story';
import type { StorySettings, StoryBlock } from '@/types/story';
import { createDefaultSettings } from '@/types/story';
import StorySceneRenderer from './StorySceneRenderer.vue';
import StorySelectionOverlay from './StorySelectionOverlay.vue';

// ── Store ────────────────────────────────────────────────────────────────
const storyStore = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => storyStore.editor);

// ── Element refs ─────────────────────────────────────────────────────────
const canvasContainerRef = ref<HTMLElement | null>(null);
const canvasInnerRef = ref<HTMLElement | null>(null);

// ── Derived refs for composable wiring ───────────────────────────────────
const settings = computed<StorySettings>(() => {
  return editor.value.document.value?.settings ?? createDefaultSettings();
});
const currentBlocks = computed<StoryBlock[]>(() => {
  return editor.value.currentScene.value?.blocks ?? [];
});

// ── Canvas viewport composable ───────────────────────────────────────────
const canvas = useStoryCanvas({
  containerRef: canvasContainerRef,
  canvasRef: canvasInnerRef,
  settings,
  blocks: currentBlocks,
});

// ── Block interaction composable ─────────────────────────────────────────
const blockInteractions = useStoryBlocks({
  canvas,
  getBlock: (id: string) => editor.value.getBlock(id),
  updateBlockPosition: (id, pos) => editor.value.updateBlockPosition(id, pos),
  blocks: () => currentBlocks.value,
});

// ── Selection ────────────────────────────────────────────────────────────
function handleCanvasClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    target === canvasInnerRef.value ||
    target === canvasContainerRef.value ||
    target.classList.contains('story-canvas__grid')
  ) {
    editor.value.stopEditing();
    editor.value.deselectAll();
  }
}

function handleBlockClick(blockId: string, e: MouseEvent) {
  e.stopPropagation();
  if (editor.value.editingBlockId.value && editor.value.editingBlockId.value !== blockId) {
    editor.value.stopEditing();
  }
  editor.value.selectBlock(blockId, e.shiftKey);
}

function handleBlockDblClick(blockId: string, e: MouseEvent) {
  e.stopPropagation();
  editor.value.startEditing(blockId);
}

function handleStopEditing() {
  editor.value.stopEditing();
}

function handleBlockMouseDown(blockId: string, e: MouseEvent) {
  if (e.button !== 0 || canvas.isSpaceHeld.value) return;
  if (editor.value.editingBlockId.value === blockId) return;
  const block = editor.value.getBlock(blockId);
  if (!block || block.locked) return;
  if (!editor.value.selectedBlockIds.value.has(blockId)) {
    editor.value.selectBlock(blockId, e.shiftKey);
  }
  blockInteractions.startDrag(blockId, e);
}

// ── Canvas inner styles ──────────────────────────────────────────────────
const canvasInnerStyle = computed(() => ({
  width: `${canvas.canvasWidth.value}px`,
  height: `${canvas.canvasHeight.value}px`,
  transform: canvas.canvasTransform.value,
  transformOrigin: canvas.canvasTransformOrigin.value,
}));

// ── Smart guide rendering ────────────────────────────────────────────────
const smartGuideLines = computed(() =>
  canvas.activeGuides.value.map((guide) => {
    if (guide.orientation === 'vertical') {
      return {
        key: `v-${guide.position}`,
        style: {
          position: 'absolute' as const,
          left: `${guide.position}px`,
          top: '0',
          width: '1px',
          height: '100%',
          backgroundColor: guide.type === 'center' ? '#8b5cf6' : '#3b82f6',
          pointerEvents: 'none' as const,
          zIndex: 9998,
        },
      };
    }
    return {
      key: `h-${guide.position}`,
      style: {
        position: 'absolute' as const,
        top: `${guide.position}px`,
        left: '0',
        height: '1px',
        width: '100%',
        backgroundColor: guide.type === 'center' ? '#8b5cf6' : '#3b82f6',
        pointerEvents: 'none' as const,
        zIndex: 9998,
      },
    };
  }),
);

// ── Provide block interactions to children (selection overlay etc.) ───────
defineExpose({ canvas, blockInteractions, canvasInnerRef });
</script>

<template>
  <div
    ref="canvasContainerRef"
    class="story-canvas relative h-full w-full overflow-hidden select-none"
    :style="{
      backgroundColor: '#f0f0f0',
      cursor: canvas.cursorStyle.value,
    }"
    @click="handleCanvasClick"
  >
    <!-- Grid overlay (rendered in the container coordinate space) -->
    <div
      v-if="canvas.grid.visible && canvas.grid.enabled"
      class="story-canvas__grid pointer-events-none absolute inset-0"
      :style="canvas.gridBackgroundStyle.value"
    />

    <!-- Inner canvas (scaled + panned) -->
    <div
      ref="canvasInnerRef"
      class="story-canvas__inner absolute origin-top-left"
      :style="canvasInnerStyle"
    >
      <!-- White canvas surface -->
      <div
        class="absolute inset-0 bg-white"
        :style="{
          boxShadow: '0 2px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          borderRadius: '2px',
        }"
      />

      <!-- Scene content -->
      <StorySceneRenderer
        v-if="editor.currentScene.value"
        :scene="editor.currentScene.value"
        :selected-block-ids="editor.selectedBlockIds.value"
        :editing-block-id="editor.editingBlockId.value"
        :block-interactions="blockInteractions"
        @block-click="handleBlockClick"
        @block-dblclick="handleBlockDblClick"
        @block-mousedown="handleBlockMouseDown"
        @stop-editing="handleStopEditing"
      />

      <!-- Smart guide lines -->
      <div
        v-for="guide in smartGuideLines"
        :key="guide.key"
        :style="guide.style"
      />

      <!-- Selection overlay (resize/rotate handles) -->
      <StorySelectionOverlay
        :selected-blocks="editor.selectedBlocks.value"
        :block-interactions="blockInteractions"
        :canvas="canvas"
      />
    </div>
  </div>
</template>
