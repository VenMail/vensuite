<template>
  <teleport v-if="container" :to="container">
    <div
      v-for="(_, idx) in pageCount"
      :key="`page-badge-${idx}`"
      class="page-badge-overlay"
      :style="badgeStyle(idx)"
    >
      <div class="page-badge-content">
        <a
          v-if="href"
          :href="href"
          target="_blank"
          rel="noopener noreferrer"
          :title="linkTitle"
          class="page-badge-link"
          :style="linkStyle"
        >
          {{ label }}
        </a>
        <span v-else class="page-badge-text" :style="linkStyle">
          {{ label }}
        </span>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { usePageBadge } from '@/composables/usePageBadge';

interface Props {
  pageGap: number;
  topOffsetPx?: number;
  rightNudgePx?: number;
  label?: string;
  href?: string;
  firstPageExtraTopPx?: number;
}

const props = withDefaults(defineProps<Props>(), {
  topOffsetPx: 12,
  rightNudgePx: 12,
  label: "Made with ❤️ by 10play",
  href: "https://10play.dev",
  firstPageExtraTopPx: 32,
});

const {
  container,
  pageCount,
  linkTitle,
  badgeStyle,
  linkStyle,
} = usePageBadge(props);
</script>

<style scoped>
.page-badge-overlay {
  box-sizing: border-box;
}

.page-badge-content {
  display: flex;
  justify-content: flex-end;
}

.page-badge-link,
.page-badge-text {
  display: inline-block;
  transition: all 0.2s ease;
}

.page-badge-link:hover {
  background: rgba(255,255,255,1);
  border-color: #d1d5db;
  color: #4b5563;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .page-badge-link,
  .page-badge-text {
    background: rgba(31,41,55,0.9);
    border-color: #4b5563;
    color: #9ca3af;
  }
  
  .page-badge-link:hover {
    background: rgba(31,41,55,1);
    border-color: #6b7280;
    color: #d1d5db;
  }
}
</style>
