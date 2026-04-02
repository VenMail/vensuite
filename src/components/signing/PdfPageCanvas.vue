<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  imageUrl: string;
  pageIndex: number;
  containerWidth: number;
  originalWidth: number;
  originalHeight: number;
}>();

const aspectRatio = computed(() => props.originalHeight / props.originalWidth);
const displayHeight = computed(() => props.containerWidth * aspectRatio.value);
</script>

<template>
  <div
    class="pdf-page relative bg-white shadow-lg"
    :style="{
      width: containerWidth + 'px',
      height: displayHeight + 'px',
    }"
  >
    <img
      :src="imageUrl"
      :alt="`Page ${pageIndex + 1}`"
      class="w-full h-full object-contain pointer-events-none select-none"
      draggable="false"
    />
    <!-- Slot for field overlays -->
    <slot :pageWidth="containerWidth" :pageHeight="displayHeight" />
  </div>
</template>
