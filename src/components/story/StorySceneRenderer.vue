<script setup lang="ts">
/**
 * StorySceneRenderer — Renders a single scene's blocks.
 * Supports two layout modes: auto-stack (flex column) and freeform (absolute positioning).
 */
import { computed } from 'vue';
import type { StoryScene, StoryBlock } from '@/types/story';
import type { StoryBlocksReturn } from '@/composables/useStoryBlocks';
import StoryBlockRenderer from './StoryBlockRenderer.vue';

const props = defineProps<{
  scene: StoryScene;
  selectedBlockIds: Set<string>;
  blockInteractions: StoryBlocksReturn;
}>();

const emit = defineEmits<{
  'block-click': [blockId: string, event: MouseEvent];
  'block-mousedown': [blockId: string, event: MouseEvent];
}>();

// ── Sorted blocks by zIndex for freeform mode ────────────────────────────
const sortedBlocks = computed(() =>
  [...props.scene.blocks].sort(
    (a, b) => (a.position.zIndex ?? 0) - (b.position.zIndex ?? 0),
  ),
);

// ── Style builder for individual block wrappers ──────────────────────────
function getBlockWrapperStyle(block: StoryBlock): Record<string, string | number | undefined> {
  const overlay = props.blockInteractions.getBlockOverlayRect(block.id);
  const pos = overlay ?? block.position;
  const s = block.style;

  const base: Record<string, string | number | undefined> = {
    backgroundColor: s.backgroundColor,
    borderRadius: s.borderRadius,
    border: s.border,
    boxShadow: s.boxShadow,
    padding: s.padding,
    overflow: s.overflow,
    backdropFilter: s.backdropFilter,
    mixBlendMode: s.mixBlendMode,
    opacity: block.hidden ? 0.3 : (s.opacity ?? 1),
    transition: 'opacity 0.2s ease',
  };

  // Add background image / gradient
  if (s.backgroundGradient) {
    base.backgroundImage = s.backgroundGradient;
  } else if (s.backgroundImage) {
    base.backgroundImage = `url(${s.backgroundImage})`;
    base.backgroundSize = 'cover';
    base.backgroundPosition = 'center';
  }

  if (props.scene.layout === 'freeform') {
    return {
      ...base,
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
      transform: block.position.rotation
        ? `rotate(${block.position.rotation}deg)`
        : undefined,
      zIndex: block.position.zIndex ?? 0,
      transition: props.blockInteractions.isDragging.value &&
                  props.blockInteractions.dragBlockId.value === block.id
        ? 'none'
        : 'left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease, opacity 0.2s ease',
    };
  }

  // auto-stack mode: flex child, fixed width, auto height
  return {
    ...base,
    width: `${pos.width}px`,
    minHeight: `${pos.height}px`,
    flexShrink: 0,
    transition: 'opacity 0.2s ease, transform 0.15s ease',
  };
}

function isSelected(blockId: string): boolean {
  return props.selectedBlockIds.has(blockId);
}
</script>

<template>
  <!-- Auto-stack layout -->
  <div
    v-if="scene.layout === 'auto-stack'"
    class="story-scene story-scene--auto-stack absolute inset-0 flex flex-col items-center gap-6 overflow-visible"
    :style="{
      paddingTop: '48px',
      paddingBottom: '48px',
    }"
  >
    <div
      v-for="block in sortedBlocks"
      :key="block.id"
      :data-block-id="block.id"
      class="story-block-wrapper relative"
      :style="getBlockWrapperStyle(block)"
      @click="emit('block-click', block.id, $event)"
      @mousedown="emit('block-mousedown', block.id, $event)"
    >
      <StoryBlockRenderer
        :block="block"
        :is-selected="isSelected(block.id)"
        :is-editing="false"
      />
    </div>
  </div>

  <!-- Freeform layout -->
  <div
    v-else
    class="story-scene story-scene--freeform absolute inset-0 overflow-visible"
  >
    <div
      v-for="block in sortedBlocks"
      :key="block.id"
      :data-block-id="block.id"
      class="story-block-wrapper"
      :style="getBlockWrapperStyle(block)"
      @click="emit('block-click', block.id, $event)"
      @mousedown="emit('block-mousedown', block.id, $event)"
    >
      <StoryBlockRenderer
        :block="block"
        :is-selected="isSelected(block.id)"
        :is-editing="false"
      />
    </div>
  </div>
</template>
