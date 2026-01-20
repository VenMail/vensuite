<template>
  <div 
    ref="thumbnailContainer"
    class="slide-thumbnail-renderer"
    :style="containerStyle"
  >
    <!-- Hidden preview pane for rendering -->
    <div 
      ref="previewRef"
      class="slide-preview-content"
      :class="layoutClass"
      :style="previewStyle"
      v-html="renderedContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useMermaid } from '@/composables/useMermaid';
import type { SlidevSlide } from '@/utils/slidevMarkdown';

interface Props {
  slide: SlidevSlide;
  theme?: string;
  width?: number;
  height?: number;
  scale?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 400,
  height: 300,
  scale: 0.5
});

// Refs
const thumbnailContainer = ref<HTMLElement | null>(null);
const previewRef = ref<HTMLElement | null>(null);

// Composables
const mermaid = useMermaid();

// Helper function to extract title from slide content
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return '';
}

// Computed properties
const containerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  position: 'relative' as const,
  overflow: 'hidden',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  background: '#ffffff'
}));

const previewStyle = computed(() => ({
  width: `${props.width / props.scale}px`,
  height: `${props.height / props.scale}px`,
  transform: `scale(${props.scale})`,
  transformOrigin: 'top left',
  background: props.slide.frontmatter?.background || '#ffffff',
  color: '#1e293b',
  padding: '24px',
  overflow: 'hidden',
  borderRadius: '0px',
  margin: '0',
  position: 'absolute' as const,
  top: '0',
  left: '0'
}));

const layoutClass = computed(() => {
  // Map slide layout to CSS class
  const layout = props.slide.frontmatter?.layout;
  switch (layout) {
    case 'two-cols':
      return 'slide-layout-two-cols';
    case 'two-cols-header':
      return 'slide-layout-two-cols-header';
    case 'center':
      return 'slide-layout-center';
    case 'default':
    default:
      return 'slide-layout-default';
  }
});

const renderedContent = computed(() => {
  // This would come from the markdown rendering system
  // For now, we'll use the slide's content directly
  return props.slide.content || '';
});

// Watch for content changes and render mermaid diagrams
watch(() => props.slide, async () => {
  await nextTick();
  if (previewRef.value) {
    await mermaid.renderAllDiagrams(previewRef.value);
  }
}, { immediate: true, deep: true });

onMounted(async () => {
  await nextTick();
  if (previewRef.value) {
    await mermaid.renderAllDiagrams(previewRef.value);
  }
});

// Expose methods for external use
defineExpose({
  thumbnailContainer,
  previewRef,
  generateThumbnail: async (): Promise<string | null> => {
    if (!thumbnailContainer.value) return null;
    
    try {
      // Use html2canvas or similar library to capture the thumbnail
      // For now, return a placeholder
      const canvas = document.createElement('canvas');
      canvas.width = props.width;
      canvas.height = props.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a simple placeholder background
        ctx.fillStyle = props.slide.frontmatter?.background || '#ffffff';
        ctx.fillRect(0, 0, props.width, props.height);
        
        // Add slide title as text (extracted from content)
        ctx.fillStyle = '#1e293b';
        ctx.font = '16px sans-serif';
        const title = extractTitleFromContent(props.slide.content);
        ctx.fillText(title || 'Slide', 20, 30);
        
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
    }
    
    return null;
  }
});
</script>

<style scoped>
.slide-thumbnail-renderer {
  position: relative;
}

.slide-preview-content {
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
}

/* Layout styles for thumbnails */
.slide-preview-content.slide-layout-default {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
}

.slide-preview-content.slide-layout-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.slide-preview-content.slide-layout-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.slide-preview-content.slide-layout-two-cols-header {
  display: flex;
  flex-direction: column;
}

.slide-preview-content.slide-layout-two-cols-header > :first-child {
  margin-bottom: 1rem;
}

.slide-preview-content.slide-layout-two-cols-header > :nth-child(2) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Typography scaling for thumbnails */
.slide-preview-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: inherit;
}

.slide-preview-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: inherit;
}

.slide-preview-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: inherit;
}

.slide-preview-content :deep(p) {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.4rem;
  color: inherit;
}

.slide-preview-content :deep(ul),
.slide-preview-content :deep(ol) {
  margin-left: 1rem;
  margin-bottom: 0.4rem;
}

.slide-preview-content :deep(li) {
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.2rem;
}

.slide-preview-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.75em;
}

.slide-preview-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.25rem;
}

.slide-preview-content :deep(.mermaid-diagram) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  padding: 1rem;
}

.slide-preview-content :deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}

/* UnoCSS/Tailwind utility support (scaled down) */
.slide-preview-content :deep(.text-xs) { font-size: 0.625rem; }
.slide-preview-content :deep(.text-sm) { font-size: 0.75rem; }
.slide-preview-content :deep(.text-base) { font-size: 0.875rem; }
.slide-preview-content :deep(.text-lg) { font-size: 1rem; }
.slide-preview-content :deep(.text-xl) { font-size: 1.125rem; }
.slide-preview-content :deep(.text-2xl) { font-size: 1.25rem; }
.slide-preview-content :deep(.text-3xl) { font-size: 1.5rem; }

.slide-preview-content :deep(.p-1) { padding: 0.25rem; }
.slide-preview-content :deep(.p-2) { padding: 0.5rem; }
.slide-preview-content :deep(.p-4) { padding: 1rem; }

.slide-preview-content :deep(.m-1) { margin: 0.25rem; }
.slide-preview-content :deep(.m-2) { margin: 0.5rem; }
.slide-preview-content :deep(.m-4) { margin: 1rem; }

.slide-preview-content :deep(.gap-1) { gap: 0.25rem; }
.slide-preview-content :deep(.gap-2) { gap: 0.5rem; }
.slide-preview-content :deep(.gap-4) { gap: 1rem; }

.slide-preview-content :deep(.grid) { display: grid; }
.slide-preview-content :deep(.flex) { display: flex; }
.slide-preview-content :deep(.flex-col) { flex-direction: column; }
.slide-preview-content :deep(.items-center) { align-items: center; }
.slide-preview-content :deep(.justify-center) { justify-content: center; }
</style>
