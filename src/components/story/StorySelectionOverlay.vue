<script setup lang="ts">
/**
 * StorySelectionOverlay — Renders resize handles, rotation controls,
 * and dimension labels over all selected blocks.
 */
import { computed, ref } from 'vue';
import type { StoryBlock } from '@/types/story';
import type { StoryBlocksReturn, ResizeHandle } from '@/composables/useStoryBlocks';
import type { StoryCanvasReturn } from '@/composables/useStoryCanvas';

const props = defineProps<{
  selectedBlocks: StoryBlock[];
  blockInteractions: StoryBlocksReturn;
  canvas: StoryCanvasReturn;
}>();

// ── Handle definitions ───────────────────────────────────────────────────

interface HandleDef {
  id: ResizeHandle;
  /** CSS position offsets (percentage-based within the block outline) */
  top: string;
  left: string;
  cursor: string;
  /** Translate to center the handle on its anchor point */
  transform: string;
}

const handles: HandleDef[] = [
  { id: 'nw', top: '0%',  left: '0%',  cursor: 'nw-resize', transform: 'translate(-50%, -50%)' },
  { id: 'n',  top: '0%',  left: '50%', cursor: 'n-resize',  transform: 'translate(-50%, -50%)' },
  { id: 'ne', top: '0%',  left: '100%',cursor: 'ne-resize', transform: 'translate(-50%, -50%)' },
  { id: 'e',  top: '50%', left: '100%',cursor: 'e-resize',  transform: 'translate(-50%, -50%)' },
  { id: 'se', top: '100%',left: '100%',cursor: 'se-resize', transform: 'translate(-50%, -50%)' },
  { id: 's',  top: '100%',left: '50%', cursor: 's-resize',  transform: 'translate(-50%, -50%)' },
  { id: 'sw', top: '100%',left: '0%',  cursor: 'sw-resize', transform: 'translate(-50%, -50%)' },
  { id: 'w',  top: '50%', left: '0%',  cursor: 'w-resize',  transform: 'translate(-50%, -50%)' },
];

// ── Hover state for rotation handle ──────────────────────────────────────
const hoveredBlockId = ref<string | null>(null);

// ── Block outline positioning ────────────────────────────────────────────
function getOutlineStyle(block: StoryBlock) {
  const overlay = props.blockInteractions.getBlockOverlayRect(block.id);
  const pos = overlay ?? block.position;

  const isActive =
    (props.blockInteractions.isDragging.value && props.blockInteractions.dragBlockId.value === block.id) ||
    (props.blockInteractions.isResizing.value && props.blockInteractions.resizeBlockId.value === block.id);

  return {
    position: 'absolute' as const,
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`,
    transform: block.position.rotation ? `rotate(${block.position.rotation}deg)` : undefined,
    border: '2px solid #3b82f6',
    borderRadius: '1px',
    pointerEvents: 'none' as const,
    transition: isActive ? 'none' : 'left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease',
    zIndex: 9999,
  };
}

// ── Dimension label ──────────────────────────────────────────────────────
function getDimensionLabel(block: StoryBlock): string {
  const overlay = props.blockInteractions.getBlockOverlayRect(block.id);
  const pos = overlay ?? block.position;
  return `${Math.round(pos.width)} \u00d7 ${Math.round(pos.height)}`;
}

// ── Handle interactions ──────────────────────────────────────────────────
function onHandleMouseDown(blockId: string, handle: ResizeHandle, e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
  props.blockInteractions.startResize(blockId, handle, e);
}
</script>

<template>
  <div class="story-selection-overlay pointer-events-none absolute inset-0" style="z-index: 9999">
    <div
      v-for="block in selectedBlocks"
      :key="block.id"
      :style="getOutlineStyle(block)"
      @mouseenter="hoveredBlockId = block.id"
      @mouseleave="hoveredBlockId = null"
    >
      <!-- Resize handles -->
      <div
        v-for="h in handles"
        :key="h.id"
        class="story-handle group pointer-events-auto absolute"
        :style="{
          top: h.top,
          left: h.left,
          transform: h.transform,
          cursor: h.cursor,
          zIndex: 10000,
        }"
        @mousedown="onHandleMouseDown(block.id, h.id, $event)"
      >
        <!-- Handle visual: 8x8 square with shadow -->
        <div
          class="h-2 w-2 rounded-[1px] border border-blue-500 bg-white shadow-sm transition-transform duration-100 group-hover:scale-125"
          :class="[
            h.id.length === 2 ? 'group-hover:shadow-md' : '',
          ]"
        />
      </div>

      <!-- Rotation handle (visible on hover, above top-center) -->
      <div
        v-show="hoveredBlockId === block.id && selectedBlocks.length === 1"
        class="pointer-events-auto absolute flex items-center justify-center"
        :style="{
          top: '-28px',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'grab',
          zIndex: 10000,
        }"
      >
        <!-- Connector line from handle to top edge -->
        <div
          class="absolute left-1/2 -translate-x-1/2"
          :style="{
            top: '14px',
            width: '1px',
            height: '14px',
            backgroundColor: '#3b82f6',
            opacity: 0.4,
          }"
        />
        <!-- Rotation circle -->
        <div
          class="flex h-4 w-4 items-center justify-center rounded-full border border-blue-500 bg-white shadow-sm transition-transform duration-100 hover:scale-110 hover:shadow-md"
        >
          <svg
            class="h-2.5 w-2.5 text-blue-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <path d="M13 3.5A6 6 0 1 0 14.5 8" />
            <path d="M13 1v3h-3" />
          </svg>
        </div>
      </div>

      <!-- Dimension label at bottom center -->
      <div
        class="pointer-events-none absolute left-1/2 -translate-x-1/2"
        :style="{
          top: 'calc(100% + 6px)',
        }"
      >
        <div
          class="whitespace-nowrap rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm"
        >
          {{ getDimensionLabel(block) }}
        </div>
      </div>
    </div>
  </div>
</template>
