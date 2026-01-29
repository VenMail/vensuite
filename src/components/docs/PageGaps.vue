<template>
  <div
    v-for="(_, idx) in pageCount"
    :key="`page-gap-${idx}`"
    class="page-gap-visual"
    :style="gapStyle(idx)"
  />
</template>

<script setup lang="ts">
// A4 height in pixels (11.69 inches at 96 DPI) - matching DocExCore
const A4_HEIGHT_PX = Math.round(11.69 * 96);

interface Props {
  pageCount: number;
  pageGap: number;
}

const props = withDefaults(defineProps<Props>(), {
  pageCount: 1,
  pageGap: 76,
});

/**
 * Calculate style for individual page gap
 * Based on DocExCore's page gap rendering
 */
const gapStyle = (idx: number) => ({
  position: 'absolute' as const,
  top: `${(idx + 1) * (A4_HEIGHT_PX + props.pageGap) - props.pageGap}px`,
  width: '100%',
  minWidth: '8.27in', // A4 width
  height: `${props.pageGap}px`,
  background: '#f8f9fa',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  pointerEvents: 'none' as const,
  zIndex: 1,
});
</script>

<style scoped>
.page-gap-visual {
  box-sizing: border-box;
}
</style>
