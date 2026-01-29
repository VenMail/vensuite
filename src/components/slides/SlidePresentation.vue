<template>
  <div class="slide-presentation" ref="presentationRef">
    <div
      class="slide-content"
      :class="layoutClass"
      :style="slideStyle"
      v-html="renderedContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSlideRenderer } from '@/composables/useSlideRenderer';

interface Props {
  markdown: string;
  layout?: string;
  background?: string;
  textColor?: string;
  width?: string;
  height?: string;
  aspectRatio?: string;
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default',
  background: '#ffffff',
  textColor: '#1e293b',
  width: '100%',
  height: '100%',
  aspectRatio: '4/3'
});

const presentationRef = ref<HTMLElement | null>(null);

// Use the slide renderer composable
const {
  renderedContent,
  renderSlide,
  applyArbitraryPositionClasses,
  cleanup
} = useSlideRenderer({
  container: presentationRef,
  enableArrangeMode: false,
  enableErrorRecovery: true,
  maxRetries: 3
});

// Computed properties
const layoutClass = computed(() => {
  const layoutMap: Record<string, string> = {
    'default': 'slide-layout-default',
    'center': 'slide-layout-center',
    'intro': 'slide-layout-intro',
    'section': 'slide-layout-section',
    'basic': 'slide-layout-basic',
    'big-number': 'slide-layout-big-number',
    'quote': 'slide-layout-quote',
    'two-cols': 'slide-layout-two-cols',
    'two-cols-header': 'slide-layout-two-cols-header',
    'image-right': 'slide-layout-image-right',
    'image-left': 'slide-layout-image-left',
    'full-image': 'slide-layout-full-image',
    'bullet-points': 'slide-layout-bullet-points',
    'numbered-list': 'slide-layout-numbered-list'
  };
  return layoutMap[props.layout] || layoutMap.default;
});

const slideStyle = computed(() => ({
  width: props.width,
  height: props.height,
  aspectRatio: props.aspectRatio,
  background: props.background,
  color: props.textColor,
  padding: '32px',
  overflow: 'hidden',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
}));

// Methods
async function renderCurrentSlide() {
  try {
    await renderSlide(props.markdown);
  } catch (error) {
    console.error('Failed to render slide:', error);
  }
}

// Watch for markdown changes
watch(() => props.markdown, renderCurrentSlide, { immediate: true });

// Lifecycle
onMounted(() => {
  renderCurrentSlide();
});

onUnmounted(() => {
  cleanup();
});

// Expose methods for parent components
defineExpose({
  renderSlide: renderCurrentSlide,
  applyArbitraryPositionClasses
});
</script>

<style scoped>
.slide-presentation {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}

.slide-content {
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}

/* Layout classes */
.slide-layout-default {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.slide-layout-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.slide-layout-intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding-left: 10%;
}

.slide-layout-section {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 10%;
}

.slide-layout-basic {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 5%;
}

.slide-layout-big-number {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.slide-layout-quote {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-style: italic;
}

.slide-layout-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 5%;
}

.slide-layout-two-cols-header {
  display: flex;
  flex-direction: column;
  padding: 5%;
}

.slide-layout-image-right {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 5%;
}

.slide-layout-image-left {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 5%;
}

.slide-layout-full-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.slide-layout-bullet-points {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 5%;
}

.slide-layout-numbered-list {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 5%;
}

/* Typography styles */
:deep(h1) {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: inherit;
}

:deep(h2) {
  font-size: 1.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: inherit;
}

:deep(h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: inherit;
}

:deep(p) {
  font-size: 1.125rem;
  line-height: 1.75;
  margin-bottom: 1rem;
  color: inherit;
}

:deep(ul), :deep(ol) {
  margin-bottom: 1rem;
  color: inherit;
}

:deep(li) {
  margin-bottom: 0.5rem;
  color: inherit;
}

:deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: inherit;
}

:deep(code) {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}

:deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}

:deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

:deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

:deep(th), :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}

:deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

/* Position utilities */
:deep(.absolute) {
  position: absolute;
}

:deep(.relative) {
  position: relative;
}

:deep(.static) {
  position: static;
}

/* Common spacing utilities */
:deep(.text-center) {
  text-align: center;
}

:deep(.text-left) {
  text-align: left;
}

:deep(.text-right) {
  text-align: right;
}

:deep(.font-bold) {
  font-weight: 700;
}

:deep(.font-semibold) {
  font-weight: 600;
}

:deep(.font-medium) {
  font-weight: 500;
}

/* Font families */
:deep(.font-sans) {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.font-serif) {
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
}

:deep(.font-mono) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
