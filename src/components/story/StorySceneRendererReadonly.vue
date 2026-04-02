<script setup lang="ts">
/**
 * StorySceneRendererReadonly — Read-only renderer for a single scene.
 * Used by StoryPreview and StoryPresenter. No selection, no drag, no events.
 * Sets data-block-id on each wrapper for GSAP animation targeting.
 */
import { computed } from 'vue';
import type { StoryScene, StoryBlock, StoryBlockStyle } from '@/types/story';
import StoryBlockRenderer from './StoryBlockRenderer.vue';

const props = defineProps<{
  scene: StoryScene;
}>();

const sortedBlocks = computed(() =>
  [...props.scene.blocks]
    .filter(b => !b.hidden)
    .sort((a, b) => (a.position.zIndex ?? 0) - (b.position.zIndex ?? 0)),
);

function getBlockWrapperStyle(block: StoryBlock): Record<string, string | number | undefined> {
  const pos = block.position;
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
    opacity: s.opacity ?? 1,
  };

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
      transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
      zIndex: pos.zIndex ?? 0,
    };
  }

  // auto-stack
  return {
    ...base,
    width: `${pos.width}px`,
    minHeight: `${pos.height}px`,
    flexShrink: 0,
  };
}
</script>

<template>
  <!-- Auto-stack layout -->
  <div
    v-if="scene.layout === 'auto-stack'"
    class="absolute inset-0 flex flex-col items-center gap-6 overflow-visible"
    :style="{ paddingTop: '48px', paddingBottom: '48px' }"
  >
    <div
      v-for="block in sortedBlocks"
      :key="block.id"
      :data-block-id="block.id"
      :style="getBlockWrapperStyle(block)"
    >
      <StoryBlockRenderer
        :block="block"
        :is-selected="false"
        :is-editing="false"
        class="h-full w-full"
      />
    </div>
  </div>

  <!-- Freeform layout -->
  <div
    v-else
    class="absolute inset-0 overflow-visible"
  >
    <div
      v-for="block in sortedBlocks"
      :key="block.id"
      :data-block-id="block.id"
      :style="getBlockWrapperStyle(block)"
    >
      <StoryBlockRenderer
        :block="block"
        :is-selected="false"
        :is-editing="false"
        class="h-full w-full"
      />
    </div>
  </div>
</template>
