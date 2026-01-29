<template>
  <div class="slide-preview-wrapper" ref="previewWrapperRef" :style="previewStyle">
    <div
      ref="previewRef"
      class="slide-preview-content"
      :class="[layoutClass, { 'arrange-mode': arrangeMode }]"
      v-html="renderedContent"
    />
    <!-- Resize handles overlay for selected elements in arrange mode -->
    <template v-if="arrangeMode && resizeTarget && !dragState.active && !resizeState.active">
      <div
        class="resize-handles-overlay"
        :style="resizeOverlayStyle"
      >
        <div
          v-for="h in resizeHandles"
          :key="h.edge"
          class="resize-handle"
          :class="h.edge"
          :data-edge="h.edge"
          @mousedown.prevent="onResizeStart($event, h.edge)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useSlideRenderer } from '@/composables/useSlideRenderer';
import { useMermaid } from '@/composables/useMermaid';
import { getElementTypeInfo } from '@/utils/markdownElementDetector';

interface Props {
  renderedContent: string;
  layout: string;
  background?: string;
  themeBackground?: string;
  themeText?: string;
  themeStyle?: Record<string, any>;
  arrangeMode?: boolean;
  focusLineRange?: { start: number; end: number } | null;
  selectedLineRange?: { start: number; end: number } | null;
  isFullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  background: '#ffffff',
  arrangeMode: false,
  focusLineRange: null,
  selectedLineRange: null,
  isFullscreen: false
});

const emit = defineEmits<{
  'update-element-position': [payload: {
    markdownLineStart: number;
    markdownLineEnd: number;
    position: { top?: string; left?: string };
  }];
  'update-element-size': [payload: {
    markdownLineStart: number;
    markdownLineEnd: number;
    width: number;
    height: number;
  }];
  'preview-element-selected': [detail: {
    element: HTMLElement;
    type: string;
    markdownLineStart?: number;
    markdownLineEnd?: number;
    markdownType?: string;
  }];
}>();

// Refs
const previewRef = ref<HTMLElement | null>(null);
const previewWrapperRef = ref<HTMLElement | null>(null);

// Use composables
const {
  renderedContent,
  applyArbitraryPositionClasses,
  cleanup
} = useSlideRenderer({
  container: previewRef,
  enableArrangeMode: props.arrangeMode
});

const { renderAllDiagrams } = useMermaid();

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

const previewStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: props.background || props.themeBackground || '#ffffff',
  color: props.themeText || '#1e293b',
  padding: props.isFullscreen ? '48px' : '32px',
  overflow: 'hidden',
  borderRadius: props.isFullscreen ? '16px' : '8px',
  boxShadow: props.isFullscreen 
    ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  ...props.themeStyle
}));

// Drag state
interface DragState {
  active: boolean;
  blockEl: HTMLElement | null;
  lineStart: number;
  lineEnd: number;
  startX: number;
  startY: number;
  initialStyle: { position: string; top: string; left: string; transform: string };
  offsetX: number;
  offsetY: number;
}
const dragState = ref<DragState>({
  active: false,
  blockEl: null,
  lineStart: -1,
  lineEnd: -1,
  startX: 0,
  startY: 0,
  initialStyle: { position: '', top: '', left: '', transform: '' },
  offsetX: 0,
  offsetY: 0
});

// Resize state
interface ResizeState {
  active: boolean;
  imgEl: HTMLElement | null;
  lineStart: number;
  lineEnd: number;
  edge: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}
const resizeState = ref<ResizeState>({
  active: false,
  imgEl: null,
  lineStart: -1,
  lineEnd: -1,
  edge: '',
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0
});

const resizeHandles = [
  { edge: 'n' }, { edge: 's' }, { edge: 'e' }, { edge: 'w' },
  { edge: 'ne' }, { edge: 'nw' }, { edge: 'se' }, { edge: 'sw' }
];

const resizeTarget = ref<{ img: HTMLElement; lineStart: number; lineEnd: number } | null>(null);
const resizeOverlayRect = ref<{ top: number; left: number; width: number; height: number } | null>(null);

const resizeOverlayStyle = computed(() => {
  const r = resizeOverlayRect.value;
  if (!r) return { display: 'none' };
  return {
    position: 'absolute' as const,
    top: `${r.top}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    pointerEvents: 'none' as const,
    zIndex: 1000
  };
});

// Helper functions
function getBlockFromTarget(el: HTMLElement): { el: HTMLElement; lineStart: number; lineEnd: number } | null {
  const blockEl = el.closest('[data-markdown-line-start]') as HTMLElement | null;
  if (!blockEl) return null;
  const lineStart = parseInt(blockEl.getAttribute('data-markdown-line-start') ?? '-1', 10);
  const lineEnd = parseInt(blockEl.getAttribute('data-markdown-line-end') ?? '-1', 10);
  if (lineStart < 0 || lineEnd < 0) return null;
  return { el: blockEl, lineStart, lineEnd };
}

function updateResizeOverlayRect() {
  if (!previewRef.value || !previewWrapperRef.value || !resizeTarget.value) {
    resizeOverlayRect.value = null;
    return;
  }
  const element = resizeTarget.value.img;
  const wrapper = previewWrapperRef.value;
  const rect = element.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();
  resizeOverlayRect.value = {
    top: rect.top - wrapperRect.top,
    left: rect.left - wrapperRect.left,
    width: rect.width,
    height: rect.height
  };
}

// Event handlers
function onArrangeMouseDown(e: MouseEvent) {
  if (!props.arrangeMode || !previewRef.value) return;
  const target = e.target as HTMLElement;
  
  // Check if clicking on a resize handle
  if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
    return;
  }
  
  const selected = target.closest('[data-markdown-line-start]') as HTMLElement | null;
  if (!selected) return;
  
  // Select the element if not already selected
  if (!selected.classList.contains('element-selected')) {
    document.querySelectorAll('.element-selected')?.forEach((el) => {
      el.classList.remove('element-selected');
    });
    selected.classList.add('element-selected');
    
    // Dispatch selection event
    const markdownLineStart = parseInt(selected.getAttribute('data-markdown-line-start') ?? '-1', 10);
    const markdownLineEnd = parseInt(selected.getAttribute('data-markdown-line-end') ?? '-1', 10);
    const event = new CustomEvent('preview-element-selected', {
      detail: {
        element: selected,
        type: getElementTypeInfo(selected),
        markdownLineStart: markdownLineStart >= 0 ? markdownLineStart : undefined,
        markdownLineEnd: markdownLineEnd >= 0 ? markdownLineEnd : undefined,
        markdownType: selected.getAttribute('data-markdown-type') || undefined
      }
    });
    previewRef.value?.dispatchEvent(event);
  }
  
  const block = getBlockFromTarget(selected);
  if (!block) return;
  e.preventDefault();
  e.stopPropagation();
  
  // Store offset and start drag
  const rect = block.el.getBoundingClientRect();
  const elementCenterX = rect.left + rect.width / 2;
  const elementCenterY = rect.top + rect.height / 2;
  const offsetX = e.clientX - elementCenterX;
  const offsetY = e.clientY - elementCenterY;
  
  dragState.value = {
    active: true,
    blockEl: block.el,
    lineStart: block.lineStart,
    lineEnd: block.lineEnd,
    startX: e.clientX,
    startY: e.clientY,
    initialStyle: {
      position: block.el.style.position,
      top: block.el.style.top,
      left: block.el.style.left,
      transform: block.el.style.transform
    },
    offsetX,
    offsetY
  };
  
  document.addEventListener('mousemove', onArrangeMouseMove);
  document.addEventListener('mouseup', onArrangeMouseUp);
}

let dragRAF: number | null = null;
function onArrangeMouseMove(e: MouseEvent) {
  if (!dragState.value.active || !previewRef.value || !dragState.value.blockEl) return;
  if (dragRAF !== null) cancelAnimationFrame(dragRAF);
  dragRAF = requestAnimationFrame(() => {
    dragRAF = null;
    const state = dragState.value;
    if (!state.active || !state.blockEl || !previewRef.value) return;
    
    const slideContent = previewRef.value.querySelector('.slide-preview-content') as HTMLElement;
    const slideRect = slideContent?.getBoundingClientRect() || previewRef.value.getBoundingClientRect();
    
    const newCenterX = e.clientX - state.offsetX;
    const newCenterY = e.clientY - state.offsetY;
    
    const leftPct = ((newCenterX - slideRect.left) / slideRect.width) * 100;
    const topPct = ((newCenterY - slideRect.top) / slideRect.height) * 100;
    
    state.blockEl.style.position = 'absolute';
    state.blockEl.style.left = `${Math.max(0, Math.min(100, leftPct))}%`;
    state.blockEl.style.top = `${Math.max(0, Math.min(100, topPct))}%`;
    state.blockEl.style.transform = 'translate(-50%, -50%)';
    state.blockEl.style.transformOrigin = 'center center';
  });
}

function onArrangeMouseUp() {
  if (!dragState.value.active) return;
  if (dragRAF !== null) {
    cancelAnimationFrame(dragRAF);
    dragRAF = null;
  }
  document.removeEventListener('mousemove', onArrangeMouseMove);
  document.removeEventListener('mouseup', onArrangeMouseUp);
  
  const state = dragState.value;
  if (state.blockEl && previewRef.value) {
    const slideContent = previewRef.value.querySelector('.slide-preview-content') as HTMLElement;
    const slideRect = slideContent?.getBoundingClientRect() || previewRef.value.getBoundingClientRect();
    const rect = state.blockEl.getBoundingClientRect();
    
    const leftPct = ((rect.left + rect.width / 2 - slideRect.left) / slideRect.width) * 100;
    const topPct = ((rect.top + rect.height / 2 - slideRect.top) / slideRect.height) * 100;
    
    const finalLeft = Math.max(0, Math.min(100, leftPct));
    const finalTop = Math.max(0, Math.min(100, topPct));
    
    emit('update-element-position', {
      markdownLineStart: state.lineStart,
      markdownLineEnd: state.lineEnd,
      position: {
        top: `${Math.round(finalTop)}%`,
        left: `${Math.round(finalLeft)}%`
      }
    });
  }
  
  dragState.value = { ...dragState.value, active: false, blockEl: null };
}

function onResizeStart(e: MouseEvent, edge: string) {
  if (!resizeTarget.value || !previewRef.value) return;
  e.preventDefault();
  e.stopPropagation();
  const element = resizeTarget.value.img;
  const rect = element.getBoundingClientRect();
  resizeState.value = {
    active: true,
    imgEl: element,
    lineStart: resizeTarget.value.lineStart,
    lineEnd: resizeTarget.value.lineEnd,
    edge,
    startX: e.clientX,
    startY: e.clientY,
    startWidth: rect.width,
    startHeight: rect.height
  };
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
}

let resizeRAF: number | null = null;
function onResizeMove(e: MouseEvent) {
  if (!resizeState.value.active || !resizeState.value.imgEl) return;
  if (resizeRAF !== null) cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    resizeRAF = null;
    const st = resizeState.value;
    if (!st.active || !st.imgEl) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    let newWidth = st.startWidth;
    let newHeight = st.startHeight;
    if (st.edge.includes('e')) newWidth = Math.max(50, st.startWidth + dx);
    if (st.edge.includes('w')) newWidth = Math.max(50, st.startWidth - dx);
    if (st.edge.includes('s')) newHeight = Math.max(50, st.startHeight + dy);
    if (st.edge.includes('n')) newHeight = Math.max(50, st.startHeight - dy);
    st.imgEl.style.width = `${newWidth}px`;
    st.imgEl.style.height = `${newHeight}px`;
  });
}

function onResizeEnd() {
  if (!resizeState.value.active) return;
  if (resizeRAF !== null) {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = null;
  }
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  const st = resizeState.value;
  if (st.imgEl) {
    const rect = st.imgEl.getBoundingClientRect();
    if (st.imgEl.tagName === 'IMG') {
      emit('update-element-size', {
        markdownLineStart: st.lineStart,
        markdownLineEnd: st.lineEnd,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }
  }
  resizeState.value = { ...resizeState.value, active: false, imgEl: null };
}

// Watchers
watch(() => props.renderedContent, async () => {
  await nextTick();
  if (previewRef.value) {
    // Render Mermaid diagrams
    await renderAllDiagrams(previewRef.value);
    applyArbitraryPositionClasses(previewRef.value);
  }
}, { immediate: true });

watch(() => [props.arrangeMode, props.selectedLineRange], async () => {
  const arrange = props.arrangeMode;
  const range = props.selectedLineRange;
  
  if (!arrange || !range || !previewRef.value) {
    resizeTarget.value = null;
    resizeOverlayRect.value = null;
    return;
  }
  await nextTick();
  const blockEl = previewRef.value.querySelector(
    `[data-markdown-line-start="${range.start}"]`
  ) as HTMLElement | null;
  if (!blockEl) {
    resizeTarget.value = null;
    resizeOverlayRect.value = null;
    return;
  }
  
  const lineEnd = parseInt(blockEl.getAttribute('data-markdown-line-end') ?? String(range.end), 10);
  resizeTarget.value = { 
    img: blockEl as HTMLElement,
    lineStart: range.start, 
    lineEnd 
  };
  updateResizeOverlayRect();
}, { immediate: true });

watch(resizeTarget, () => {
  if (resizeTarget.value) updateResizeOverlayRect();
}, { flush: 'post' });

// Lifecycle
onMounted(async () => {
  await nextTick();
  if (previewRef.value) {
    // Render Mermaid diagrams
    await renderAllDiagrams(previewRef.value);
    
    // Add mousedown listener for arrange mode
    if (props.arrangeMode) {
      previewRef.value.addEventListener('mousedown', onArrangeMouseDown);
      
      // Set up MutationObserver for arrange mode
      const observer = new MutationObserver(() => {
        if (previewRef.value) {
          setTimeout(() => applyArbitraryPositionClasses(previewRef.value), 10);
        }
      });
      
      observer.observe(previewRef.value, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
      
      (previewRef.value as any)._mutationObserver = observer;
    }
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.slide-preview-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slide-preview-content {
  aspect-ratio: 4/3;
  width: 100%;
  height: 100%;
}

/* Positioned blocks */
.slide-preview-content :deep(.absolute) {
  position: absolute;
}
.slide-preview-content :deep(.relative) {
  position: relative;
}
.slide-preview-content :deep(.static) {
  position: static;
}

/* Element selection feedback */
.slide-preview-content :deep(.element-selected) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
  background-color: rgba(59, 130, 246, 0.05);
}

.slide-preview-content :deep(.element-selected:hover) {
  background-color: rgba(59, 130, 246, 0.1);
}

/* Arrange mode styles */
.slide-preview-content.arrange-mode :deep([data-markdown-line-start]) {
  cursor: move;
}

.slide-preview-content.arrange-mode :deep(.element-selected) {
  cursor: move;
}

.slide-preview-content.arrange-mode :deep(.element-selected::after) {
  content: 'Drag to move';
  position: absolute;
  top: -1.5rem;
  left: 0;
  font-size: 10px;
  font-weight: 500;
  color: #3b82f6;
  white-space: nowrap;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.95);
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.dark .slide-preview-content.arrange-mode :deep(.element-selected::after) {
  background: rgba(30, 41, 59, 0.95);
  color: #60a5fa;
}

/* Resize handles */
.resize-handles-overlay {
  box-sizing: border-box;
  pointer-events: none;
  z-index: 1000;
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border: 1px solid #1d4ed8;
  border-radius: 2px;
  cursor: pointer;
  pointer-events: auto;
  z-index: 1001;
}

.resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.resize-handle.e { right: -5px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
.resize-handle.w { left: -5px; top: 50%; transform: translateY(-50%); cursor: w-resize; }
.resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
.resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
.resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
.resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }

.dark .resize-handle {
  background: #60a5fa;
  border-color: #3b82f6;
}
</style>
