<script setup lang="ts">
/**
 * StoryBlockRenderer — Dispatches to the correct block editor component
 * based on block.type. Shows a selection ring when selected.
 */
import { computed, defineAsyncComponent, type Component } from 'vue';
import type { StoryBlock } from '@/types/story';

const props = defineProps<{
  block: StoryBlock;
  isSelected: boolean;
  isEditing: boolean;
}>();

// ── Lazy-loaded block type components ────────────────────────────────────
const StoryTextBlock = defineAsyncComponent(
  () => import('./blocks/StoryTextBlock.vue'),
);
const StoryImageBlock = defineAsyncComponent(
  () => import('./blocks/StoryImageBlock.vue'),
);
const StoryShapeBlock = defineAsyncComponent(
  () => import('./blocks/StoryShapeBlock.vue'),
);

// ── Component map ────────────────────────────────────────────────────────
const componentMap: Record<string, Component> = {
  text: StoryTextBlock,
  heading: StoryTextBlock,
  image: StoryImageBlock,
  shape: StoryShapeBlock,
};

const resolvedComponent = computed<Component | null>(
  () => componentMap[props.block.type] ?? null,
);

// ── Selection ring classes ───────────────────────────────────────────────
const wrapperClasses = computed(() => [
  'story-block-renderer relative h-full w-full',
  {
    'ring-2 ring-blue-500/60 ring-offset-1': props.isSelected,
  },
]);
</script>

<template>
  <div :class="wrapperClasses" :data-block-type="block.type">
    <!-- Known block type -->
    <component
      :is="resolvedComponent"
      v-if="resolvedComponent"
      :block="block"
      :content="block.content"
      :is-selected="isSelected"
      :is-editing="isEditing"
      class="h-full w-full"
    />

    <!-- Fallback placeholder for unsupported block types -->
    <div
      v-else
      class="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
    >
      <div class="flex flex-col items-center gap-1.5">
        <svg
          class="h-6 w-6 text-gray-300"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h.01M15 9h.01M9 15h6" />
        </svg>
        <span class="font-medium capitalize">{{ block.type }}</span>
      </div>
    </div>
  </div>
</template>
