<template>
  <div class="flex-1 flex flex-col relative">
    <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
      <div class="flex items-center gap-2">
        <button
          v-if="selectedElement"
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          title="Smart Font Sizing"
          @click="showSmartFontAdjuster = true"
        >
          <Sparkles class="h-3 w-3" />
          Smart Sizing
        </button>
        <button
          v-if="selectedElement"
          class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
          title="Manual Font Size"
          @click="showFontAdjuster = true"
        >
          <Type class="h-3 w-3" />
          Font Size
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Zoom Out"
          @click="zoomOut"
        >
          <ZoomOut class="h-4 w-4 text-gray-500" />
        </button>
        <span class="text-xs text-gray-500 min-w-[40px] text-center">{{ Math.round(zoom * 100) }}%</span>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Zoom In"
          @click="zoomIn"
        >
          <ZoomIn class="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center p-6 overflow-auto bg-gray-100 dark:bg-gray-950" @click="handleBackgroundClick">
      <!-- Responsive Container with Smart Sizing -->
      <ResponsiveSlideContainer
        ref="responsiveContainerRef"
        :content="currentSlideContent"
        :slide-width="baseWidth"
        :slide-height="baseHeight"
        :padding="32"
        :template="currentLayout"
        :show-warnings="true"
        :show-recommendations="true"
        :show-template-selector="true"
        :show-scaling-controls="false"
        :auto-scaling-enabled="true"
        @template-change="handleTemplateChange"
        @font-size-applied="handleFontSizeApplied"
        @overflow-detected="handleOverflowDetected"
        @content-analyzed="handleContentAnalyzed"
      >
        <template #default="{ templateProfile }">
          <div 
            ref="previewRef"
            class="slide-content h-full overflow-auto"
            :style="{ 
              padding: (32 * zoom) + 'px',
              fontSize: templateProfile ? generateClampValue('body', templateProfile) : 'clamp(14px, 18px, 24px)',
              lineHeight: templateProfile?.constraints.body.lineHeight || 1.6
            }"
            v-html="renderedContent"
            @click="handleElementClick"
            @dblclick="onPreviewDoubleClick"
          />
        </template>
      </ResponsiveSlideContainer>
    </div>
    
    <!-- Legacy Font Size Adjuster -->
    <FontSizeAdjuster
      :show="showFontAdjuster"
      :position="adjusterPosition"
      :current-size="currentFontSize"
      @apply="applyFontSize"
      @close="showFontAdjuster = false"
    />
    
    <!-- Smart Font Size Adjuster -->
    <SmartFontSizeAdjuster
      :show="showSmartFontAdjuster"
      :position="adjusterPosition"
      :current-size="currentFontSize"
      :selected-element="selectedElementType"
      :template-profile="currentTemplateProfile || undefined"
      :content-metrics="currentContentMetrics"
      :sizing-recommendations="currentSizingRecommendations"
      :overflow-detected="currentOverflowDetected"
      @apply="handleSmartFontSizeApplied"
      @apply-recommendation="handleRecommendationApplied"
      @apply-all-recommendations="handleAllRecommendationsApplied"
      @apply-to-all-slides="handleApplyToAllSlides"
      @reset-to-defaults="handleResetToDefaults"
      @close="showSmartFontAdjuster = false"
    />
    
    <!-- Inline Editor -->
    <InlineEditor
      :element="editingElement"
      :element-type="editingElementType"
      :initial-content="editingContent"
      :initial-styles="editingStyles"
      @save="onInlineSave"
      @close="handleInlineClose"
      @realtime-update="onRealtimeUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { ZoomIn, ZoomOut, Type, Sparkles } from 'lucide-vue-next';
import { useMermaid } from '@/composables/useMermaid';
import { useSmartBlockEditing } from '@/composables/useSmartBlockEditing';
import { useSlidesEditor } from '@/composables/useSlidesEditor';
import FontSizeAdjuster from './FontSizeAdjuster.vue';
import SmartFontSizeAdjuster from './SmartFontSizeAdjuster.vue';
import ResponsiveSlideContainer from './ResponsiveSlideContainer.vue';
import InlineEditor from './InlineEditor.vue';
import type { TemplateProfile } from '@/composables/useSmartFontSizing';

interface Props {
  renderedContent: string;
  layoutClass: string;
  background?: string;
  themeBackground?: string;
  themeText?: string;
  themeStyle?: Record<string, string>;
  baseWidth?: number;
  baseHeight?: number;
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  themeBackground: '#ffffff',
  themeText: '#1e293b',
  themeStyle: () => ({}),
  baseWidth: 560,
  baseHeight: 420,
  fullscreen: false
});

const emit = defineEmits<{
  (e: 'update-content', markdown: string): void;
  (e: 'select-element', path: { section?: string; elementType?: string; index?: number }): void;
}>();

// Refs
const zoom = ref(1);
const previewRef = ref<HTMLElement | null>(null);
const responsiveContainerRef = ref<HTMLElement | null>(null);
const showFontAdjuster = ref(false);
const showSmartFontAdjuster = ref(false);
const adjusterPosition = ref({ x: 0, y: 0 });
const currentFontSize = ref('16px');

// Smart sizing state
const currentTemplateProfile = ref<TemplateProfile | null>(null);
const currentContentMetrics = ref<any>(null);
const currentSizingRecommendations = ref<Record<string, string>>({});
const currentOverflowDetected = ref(false);
const selectedElementType = ref<'title' | 'subtitle' | 'body' | 'caption'>('body');

// Get slides editor composable
const slidesEditor = useSlidesEditor();

// Computed
const currentSlideContent = computed(() => slidesEditor.currentSlideContent?.value || '');
const currentLayout = computed(() => slidesEditor.currentLayout?.value || 'default');

// Composables
const mermaid = useMermaid();
const {
  editingElement,
  editingElementType,
  editingContent,
  editingStyles,
  selectedElement,
  handleDoubleClick,
  handleInlineClose,
  handleInlineSave,
  handleRealtimeUpdate,
  setupInteractiveElements,
  cleanup
} = useSmartBlockEditing();

// Watch for content changes and render mermaid diagrams
watch(() => props.renderedContent, async () => {
  await nextTick();
  if (previewRef.value) {
    await mermaid.renderAllDiagrams(previewRef.value);
    // Re-setup interactive elements after content change
    setTimeout(() => {
      setupInteractiveElements(previewRef.value, (e: MouseEvent) => handleDoubleClick(e, previewRef.value, emit));
    }, 100);
  }
}, { immediate: true });

onMounted(async () => {
  await nextTick();
  if (previewRef.value) {
    await mermaid.renderAllDiagrams(previewRef.value);
    setupInteractiveElements(previewRef.value, (e: MouseEvent) => handleDoubleClick(e, previewRef.value, emit));
  }
});

onUnmounted(() => {
  cleanup(previewRef.value, (e: MouseEvent) => handleDoubleClick(e, previewRef.value, emit));
});

function onPreviewDoubleClick(event: MouseEvent) {
  handleDoubleClick(event, previewRef.value, emit);
}

function handleElementClick(event: MouseEvent) {
  event.stopPropagation();
  
  const target = event.target as HTMLElement;
  
  // Find the closest editable element
  const editableElement = target.closest('.editable-element') as HTMLElement;
  
  if (editableElement && previewRef.value?.contains(editableElement)) {
    // Remove previous selection
    if (selectedElement.value) {
      selectedElement.value.classList.remove('selected-element');
    }
    
    // Add selection to clicked element
    editableElement.classList.add('selected-element');
    selectedElement.value = editableElement;
    
    // Determine element type
    const tagName = editableElement.tagName.toLowerCase();
    if (tagName === 'h1') {
      selectedElementType.value = 'title';
    } else if (tagName === 'h2' || tagName === 'h3') {
      selectedElementType.value = 'subtitle';
    } else if (editableElement.classList.contains('caption') || tagName === 'figcaption') {
      selectedElementType.value = 'caption';
    } else {
      selectedElementType.value = 'body';
    }
    
    // Position font adjuster near the element
    const rect = editableElement.getBoundingClientRect();
    
    // For fixed positioning, we need viewport-relative coordinates
    // getBoundingClientRect() already gives us viewport coordinates
    let x = rect.right + 5;
    let y = rect.top;
    
    // Simple viewport bounds checking
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 320; // Smart adjuster is wider
    const popupHeight = 400;
    
    // Adjust if popup would go off the right edge
    if (x + popupWidth > viewportWidth) {
      x = rect.left - popupWidth - 5;
    }
    
    // Adjust if popup would go off the bottom edge
    if (y + popupHeight > viewportHeight) {
      y = rect.bottom - popupHeight;
    }
    
    // Ensure minimum margins
    x = Math.max(10, Math.min(x, viewportWidth - popupWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - popupHeight - 10));
    
    adjusterPosition.value = { x, y };
    
    // Update current font size from computed style
    const computedStyle = window.getComputedStyle(editableElement);
    const fontSize = computedStyle.fontSize;
    currentFontSize.value = fontSize;
    
    // Emit selection event
    emit('select-element', {
      elementType: editableElement.dataset.elementType,
      index: parseInt(editableElement.dataset.elementIndex || '0')
    });
  }
}

function onInlineSave(content: string, styles: Record<string, string>) {
  handleInlineSave(content, styles, emit);
}

function onRealtimeUpdate(content: string, styles: Record<string, string>) {
  handleRealtimeUpdate(content, styles, emit);
}

function applyFontSize(fontSize: string) {
  if (!selectedElement.value) return;
  
  // Apply font size to the selected element
  selectedElement.value.style.fontSize = fontSize;
  
  // Update current font size for future reference
  currentFontSize.value = fontSize;
  
  // Close the font adjuster
  showFontAdjuster.value = false;
  
  // Get the element's content and current styles
  const content = selectedElement.value.innerHTML || selectedElement.value.textContent || '';
  const computedStyle = window.getComputedStyle(selectedElement.value);
  const styles = {
    fontSize,
    fontWeight: computedStyle.fontWeight,
    fontStyle: computedStyle.fontStyle,
    textDecoration: computedStyle.textDecoration,
    textAlign: computedStyle.textAlign || 'left',
    color: computedStyle.color
  };
  
  // Use the composable's save handler to generate proper markdown
  handleInlineSave(content, styles, emit);
}

function handleBackgroundClick() {
  if (selectedElement.value) {
    selectedElement.value.classList.remove('selected-element');
    selectedElement.value = null;
  }
  showFontAdjuster.value = false;
  showSmartFontAdjuster.value = false;
}

function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.1, 2);
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.1, 0.5);
}

function resetZoom() {
  zoom.value = 1;
}

// Smart sizing handlers
function handleTemplateChange(template: string) {
  slidesEditor.setTheme(template);
}

function handleFontSizeApplied(element: string, size: string) {
  // Apply font size to specific element type
  if (previewRef.value) {
    const elements = previewRef.value.querySelectorAll(element === 'title' ? 'h1' : 
                                                  element === 'subtitle' ? 'h2, h3' : 
                                                  element === 'caption' ? 'caption, figcaption' : 
                                                  'p, li, td');
    elements.forEach(el => {
      (el as HTMLElement).style.fontSize = size;
    });
  }
}

function handleOverflowDetected(detected: boolean) {
  currentOverflowDetected.value = detected;
}

function handleContentAnalyzed(metrics: any) {
  currentContentMetrics.value = metrics;
}

function handleSmartFontSizeApplied(size: string) {
  applyFontSize(size);
}

function handleRecommendationApplied(element: string, size: string) {
  handleFontSizeApplied(element, size);
}

function handleAllRecommendationsApplied() {
  if (currentSizingRecommendations.value && previewRef.value) {
    Object.entries(currentSizingRecommendations.value).forEach(([element, size]) => {
      handleFontSizeApplied(element, size);
    });
  }
}

function handleApplyToAllSlides() {
  // This would apply current font settings to all slides
  console.log('Apply to all slides - functionality to be implemented');
}

function handleResetToDefaults() {
  if (previewRef.value) {
    // Reset all font sizes to default
    const allElements = previewRef.value.querySelectorAll('h1, h2, h3, p, li, td, caption, figcaption');
    allElements.forEach(el => {
      (el as HTMLElement).style.fontSize = '';
    });
  }
}

function generateClampValue(elementType: string, templateProfile: TemplateProfile): string {
  const constraints = templateProfile.constraints[elementType as keyof typeof templateProfile.constraints];
  if (constraints) {
    return `clamp(${constraints.minFontSize}px, ${constraints.idealFontSize}px, ${constraints.maxFontSize}px)`;
  }
  return 'clamp(14px, 18px, 24px)';
}

// Expose functions for external use
defineExpose({ zoomIn, zoomOut, resetZoom, zoom, previewRef, selectedElement });
</script>

<style scoped>
.slide-preview {
  aspect-ratio: 4/3;
}

.slide-content :deep(h1) {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: inherit;
}

.slide-content :deep(h2) {
  font-size: 1.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: inherit;
}

.slide-content :deep(h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: inherit;
}

.slide-content :deep(p) {
  font-size: 1.125rem;
  line-height: 1.75;
  margin-bottom: 0.75rem;
}

.slide-content :deep(ul),
.slide-content :deep(ol) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.slide-content :deep(li) {
  font-size: 1.125rem;
  line-height: 1.75;
}

.slide-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875em;
}

.slide-content :deep(pre) {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.slide-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.slide-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.slide-content :deep(blockquote) {
  border-left: 4px solid currentColor;
  padding-left: 1rem;
  margin: 1rem 0;
  opacity: 0.8;
  font-style: italic;
}

.slide-content :deep(.two-cols-container) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 100%;
}

.slide-content :deep(.slide-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.slide-content :deep(.slide-table th) {
  background: var(--slidev-primary, #3b82f6);
  color: white;
  padding: 0.75rem 1rem;
  text-align: left;
}

.slide-content :deep(.slide-table td) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.slide-content :deep(.mermaid-diagram) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 0.75rem;
  margin: 1rem 0;
  padding: 2rem;
}

.slide-content :deep(.mermaid-diagram.mermaid-rendered) {
  background: transparent;
  padding: 1rem;
}

.slide-content :deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}

.slide-content :deep(.mermaid-placeholder) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
}

.slide-content :deep(.mermaid-icon) {
  opacity: 0.6;
}

.slide-content :deep(.mermaid-label) {
  font-size: 0.875rem;
  font-weight: 500;
}

.slide-content :deep(.mermaid-error) {
  color: #ef4444;
  padding: 1rem;
  text-align: center;
}

/* UnoCSS/Tailwind text size classes */
.slide-content :deep(.text-xs) { font-size: 0.75rem; line-height: 1rem; }
.slide-content :deep(.text-sm) { font-size: 0.875rem; line-height: 1.25rem; }
.slide-content :deep(.text-base) { font-size: 1rem; line-height: 1.5rem; }
.slide-content :deep(.text-lg) { font-size: 1.125rem; line-height: 1.75rem; }
.slide-content :deep(.text-xl) { font-size: 1.25rem; line-height: 1.75rem; }
.slide-content :deep(.text-2xl) { font-size: 1.5rem; line-height: 2rem; }
.slide-content :deep(.text-3xl) { font-size: 1.875rem; line-height: 2.25rem; }
.slide-content :deep(.text-4xl) { font-size: 2.25rem; line-height: 2.5rem; }
.slide-content :deep(.text-5xl) { font-size: 3rem; line-height: 1; }
.slide-content :deep(.text-6xl) { font-size: 3.75rem; line-height: 1; }

/* Padding classes */
.slide-content :deep(.p-0) { padding: 0; }
.slide-content :deep(.p-1) { padding: 0.25rem; }
.slide-content :deep(.p-2) { padding: 0.5rem; }
.slide-content :deep(.p-3) { padding: 0.75rem; }
.slide-content :deep(.p-4) { padding: 1rem; }
.slide-content :deep(.p-6) { padding: 1.5rem; }
.slide-content :deep(.p-8) { padding: 2rem; }
.slide-content :deep(.p-12) { padding: 3rem; }
.slide-content :deep(.px-2) { padding-left: 0.5rem; padding-right: 0.5rem; }
.slide-content :deep(.px-4) { padding-left: 1rem; padding-right: 1rem; }
.slide-content :deep(.py-2) { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.slide-content :deep(.py-4) { padding-top: 1rem; padding-bottom: 1rem; }

/* Margin classes */
.slide-content :deep(.m-0) { margin: 0; }
.slide-content :deep(.m-1) { margin: 0.25rem; }
.slide-content :deep(.m-2) { margin: 0.5rem; }
.slide-content :deep(.m-4) { margin: 1rem; }
.slide-content :deep(.m-8) { margin: 2rem; }
.slide-content :deep(.mx-auto) { margin-left: auto; margin-right: auto; }
.slide-content :deep(.my-2) { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.slide-content :deep(.my-4) { margin-top: 1rem; margin-bottom: 1rem; }
.slide-content :deep(.mt-2) { margin-top: 0.5rem; }
.slide-content :deep(.mt-4) { margin-top: 1rem; }
.slide-content :deep(.mt-8) { margin-top: 2rem; }
.slide-content :deep(.mb-2) { margin-bottom: 0.5rem; }
.slide-content :deep(.mb-4) { margin-bottom: 1rem; }

/* Gap classes */
.slide-content :deep(.gap-1) { gap: 0.25rem; }
.slide-content :deep(.gap-2) { gap: 0.5rem; }
.slide-content :deep(.gap-4) { gap: 1rem; }
.slide-content :deep(.gap-8) { gap: 2rem; }
.slide-content :deep(.gap-12) { gap: 3rem; }

/* Grid classes */
.slide-content :deep(.grid) { display: grid; }
.slide-content :deep(.grid-cols-2) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.slide-content :deep(.grid-cols-3) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.slide-content :deep(.grid-cols-4) { grid-template-columns: repeat(4, minmax(0, 1fr)); }

/* Flex classes */
.slide-content :deep(.flex) { display: flex; }
.slide-content :deep(.flex-col) { flex-direction: column; }
.slide-content :deep(.flex-row) { flex-direction: row; }
.slide-content :deep(.items-center) { align-items: center; }
.slide-content :deep(.justify-center) { justify-content: center; }
.slide-content :deep(.justify-between) { justify-content: space-between; }

/* Background colors */
.slide-content :deep(.bg-blue-50) { background-color: #eff6ff; }
.slide-content :deep(.bg-green-50) { background-color: #f0fdf4; }
.slide-content :deep(.bg-yellow-50) { background-color: #fefce8; }
.slide-content :deep(.bg-purple-50) { background-color: #faf5ff; }
.slide-content :deep(.bg-red-50) { background-color: #fef2f2; }
.slide-content :deep(.bg-gray-50) { background-color: #f9fafb; }
.slide-content :deep(.bg-gray-100) { background-color: #f3f4f6; }
.slide-content :deep(.bg-white) { background-color: #ffffff; }

/* Border radius */
.slide-content :deep(.rounded) { border-radius: 0.25rem; }
.slide-content :deep(.rounded-lg) { border-radius: 0.5rem; }
.slide-content :deep(.rounded-xl) { border-radius: 0.75rem; }
.slide-content :deep(.rounded-full) { border-radius: 9999px; }

/* Text alignment */
.slide-content :deep(.text-center) { text-align: center; }
.slide-content :deep(.text-left) { text-align: left; }
.slide-content :deep(.text-right) { text-align: right; }

/* Font weight */
.slide-content :deep(.font-bold) { font-weight: 700; }
.slide-content :deep(.font-semibold) { font-weight: 600; }
.slide-content :deep(.font-medium) { font-weight: 500; }

/* Width/Height */
.slide-content :deep(.w-full) { width: 100%; }
.slide-content :deep(.h-full) { height: 100%; }

/* Interactive editing styles */
.slide-content :deep(.editable-element) {
  transition: all 0.2s ease;
  border-radius: 4px;
  position: relative;
}

.slide-content :deep(.editable-element:hover) {
  background-color: rgba(59, 130, 246, 0.05);
  outline: 1px dashed rgba(59, 130, 246, 0.3);
  cursor: pointer;
}

.slide-content :deep(.editable-element:active) {
  background-color: rgba(59, 130, 246, 0.1);
}

.slide-content :deep(.selected-element) {
  background-color: rgba(59, 130, 246, 0.1) !important;
  outline: 2px solid rgba(59, 130, 246, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Double-click hint */
.slide-content :deep(.editable-element)::after {
  content: '✎';
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: rgba(59, 130, 246, 0.9);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  font-weight: bold;
  z-index: 10;
}

.slide-content :deep(.editable-element:hover)::after {
  opacity: 1;
}

/* Enhanced hover effect */
.slide-content :deep(.editable-element:hover) {
  background-color: rgba(59, 130, 246, 0.08) !important;
  outline: 2px dashed rgba(59, 130, 246, 0.4) !important;
  cursor: pointer !important;
  transform: scale(1.01);
  transition: all 0.2s ease;
}

/* Make all text elements more obviously editable */
.slide-content :deep(h1):hover,
.slide-content :deep(h2):hover,
.slide-content :deep(h3):hover,
.slide-content :deep(h4):hover,
.slide-content :deep(h5):hover,
.slide-content :deep(h6):hover,
.slide-content :deep(p):hover,
.slide-content :deep(li):hover,
.slide-content :deep(span):hover,
.slide-content :deep(strong):hover,
.slide-content :deep(em):hover {
  background-color: rgba(59, 130, 246, 0.05);
  outline: 1px dashed rgba(59, 130, 246, 0.3);
  border-radius: 4px;
}

/* Two-column layout styles */
.slide-content :deep(.two-cols-container) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 100%;
}

.slide-content :deep(.two-cols-header-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.slide-content :deep(.two-cols-header-container .header-content) {
  margin-bottom: 2rem;
}

.slide-content :deep(.two-cols-header-container .cols-container) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  flex: 1;
}

.slide-content :deep(.col-left),
.slide-content :deep(.col-right) {
  min-height: 0;
}
</style>
