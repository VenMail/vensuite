<template>
  <div class="flex-1 flex flex-col relative">
    <!-- Toolbar: Preview Only -->
    <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.alt.preview')}}</span>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 min-w-[40px] text-center">{{ zoom }}%</span>
      </div>
    </div>
    
    <!-- Preview Content: Read-Only -->
    <div class="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4">
      <div class="flex items-center justify-center min-h-full">
        <div
          ref="previewRef"
          class="slide-preview-content flex-shrink-0"
          :class="layoutClass"
          :style="previewStyle"
          v-html="renderedContent"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { useMermaid } from '@/composables/useMermaid';

interface Props {
  renderedContent: string;
  layoutClass: string;
  layout?: string;
  background?: string;
  themeBackground?: string;
  themeText?: string;
  themeStyle?: Record<string, string>;
  baseWidth?: number;
  baseHeight?: number;
  fullscreen?: boolean;
  animations?: Map<string, ElementAnimation>;
  zoom?: number;
  arrangeMode?: boolean;
  focusLineRange?: { start: number; end: number } | null;
  selectedLineRange?: { start: number; end: number } | null;
  enableDebugMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  themeBackground: '#ffffff',
  themeText: '#1e293b',
  themeStyle: () => ({}),
  baseWidth: 560,
  baseHeight: 420,
  fullscreen: false,
  animations: () => new Map(),
  zoom: 100,
  arrangeMode: false,
  focusLineRange: null,
  selectedLineRange: null,
  enableDebugMode: false
});

// Refs
const previewRef = ref<HTMLElement | null>(null);
const animationObserver = ref<IntersectionObserver | null>(null);
const elementHandlers = ref<Map<HTMLElement, { click?: EventListener; mouseenter?: EventListener; mouseleave?: EventListener }>>(new Map());

// Track elements currently being manipulated to prevent watch overwrites
const elementsBeingManipulated = ref<Set<string>>(new Set());

// Drag state
const isDragging = ref(false);
const draggedElement = ref<HTMLElement | null>(null);
const dragStartPos = ref({ x: 0, y: 0 });
const elementStartPos = ref({ top: 0, left: 0 });
const currentDragPos = ref({ top: '0%', left: '0%', width: '0px', height: '0px' });

// Resize state
interface ResizeState {
  isResizing: boolean;
  element: HTMLElement | null;
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startTop: number;
  startLeft: number;
  maintainAspectRatio: boolean;
  originalAspectRatio: number;
}

const resizeState = ref<ResizeState>({
  isResizing: false,
  element: null,
  handle: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startTop: 0,
  startLeft: 0,
  maintainAspectRatio: false,
  originalAspectRatio: 1
});

// Sync zoom with prop
const zoom = computed(() => props.zoom || 100);

// Animation interface
interface ElementAnimation {
  enabled: boolean;
  type: string;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll';
  repeat: boolean;
  repeatCount: number | 'infinite';
}

// Composables
const mermaid = useMermaid();

// Import position class application from useSlideRenderer
import { useSlideRenderer } from '@/composables/useSlideRenderer';
const { applyArbitraryPositionClasses } = useSlideRenderer({
  container: previewRef,
  enableArrangeMode: props.arrangeMode,
  enableErrorRecovery: false,
  maxRetries: 1
});

// Computed style for preview with flexible dimensions
const previewStyle = computed(() => {
  const isFullscreen = props.fullscreen;
  
  return {
    width: isFullscreen ? '90vw' : '800px',
    height: isFullscreen ? '85vh' : '600px',
    maxWidth: '100%',
    maxHeight: '100%',
    minWidth: '400px',
    minHeight: '300px',
    transform: `scale(${zoom.value / 100})`,
    transformOrigin: 'center center',
    background: props.background || props.themeBackground || '#ffffff',
    color: props.themeText || '#1e293b',
    padding: isFullscreen ? '48px' : '32px',
    overflow: 'hidden',
    borderRadius: isFullscreen ? '16px' : '8px',
    boxShadow: isFullscreen 
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    ...props.themeStyle
  };
});

// Watch for content changes and render mermaid diagrams
watch(() => props.renderedContent, async () => {
  await nextTick();
  if (previewRef.value) {
    console.log('🔍 DEBUG: Preview content updated, HTML:', previewRef.value.innerHTML.substring(0, 500) + '...');
    
    // Apply position classes first
    applyArbitraryPositionClasses(previewRef.value);
    
    // Add line range data attributes for drag & drop
    if (props.arrangeMode) {
      addLineRangeAttributes();
    }
    
    // CRITICAL FIX: Restore positions for elements being manipulated
    restoreManipulatedElementPositions();
    
    // Render mermaid diagrams
    await mermaid.renderAllDiagrams(previewRef.value);
    applyAnimations();
  }
}, { immediate: true });

// Watch for animations changes
watch(() => props.animations, () => {
  applyAnimations();
}, { deep: true });

onMounted(async () => {
  await nextTick();
  if (previewRef.value) {
    // Apply position classes
    applyArbitraryPositionClasses(previewRef.value);
    
    // Add line range data attributes for drag & drop
    if (props.arrangeMode) {
      addLineRangeAttributes();
    }
    
    // Render mermaid diagrams
    await mermaid.renderAllDiagrams(previewRef.value);
    applyAnimations();
    setupScrollObserver();
    
    // Listen for element selection events
    previewRef.value.addEventListener('element-selected', (e: any) => {
      const event = e as CustomEvent;
      // Emit to parent
      const parentEvent = new CustomEvent('preview-element-selected', {
        detail: event.detail
      });
      previewRef.value?.dispatchEvent(parentEvent);
    });
  }
});

// Apply animations to elements
function applyAnimations() {
  if (!previewRef.value || !props.animations) return;
  
  // Clear existing animations and handlers
  const elements = previewRef.value.querySelectorAll('*');
  elements.forEach(el => {
    const element = el as HTMLElement;
    if (element.dataset.animation) {
      element.style.animation = '';
      element.classList.remove('animated-element', 'animation-on-load', 'animation-on-click', 'animation-on-hover', 'animation-on-scroll');
      delete element.dataset.animation;
      
      // Clean up handlers
      const handlers = elementHandlers.value.get(element);
      if (handlers) {
        if (handlers.click) element.removeEventListener('click', handlers.click);
        if (handlers.mouseenter) element.removeEventListener('mouseenter', handlers.mouseenter);
        if (handlers.mouseleave) element.removeEventListener('mouseleave', handlers.mouseleave);
        elementHandlers.value.delete(element);
      }
    }
    
    // Add click handler for element selection
    if (!element.dataset.selectionHandler) {
      element.style.cursor = 'pointer';
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        // Emit selection event to parent
        const event = new CustomEvent('element-selected', {
          detail: { element, type: getElementTypeInfo(element) }
        });
        previewRef.value?.dispatchEvent(event);
      });
      element.dataset.selectionHandler = 'true';
    }
  });
  
  // Apply new animations
  props.animations.forEach((animation, elementId) => {
    if (!animation.enabled) return;
    
    let element: HTMLElement | null = null;
    
    // Try to find element by ID
    element = previewRef.value?.querySelector(`#${elementId}`) as HTMLElement;
    
    // If not found by ID, try other selectors
    if (!element) {
      // Try by data-id attribute
      element = previewRef.value?.querySelector(`[data-id="${elementId}"]`) as HTMLElement;
    }
    
    if (!element) {
      // Try to find by text content (for markdown elements)
      const allElements = previewRef.value?.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div');
      if (allElements) {
        for (const el of allElements) {
          const htmlElement = el as HTMLElement;
          if (htmlElement.textContent?.trim() && elementId.includes('markdown')) {
            // For markdown elements, use a heuristic based on position
            const index = parseInt(elementId.split('-')[1]) || 0;
            if (Array.from(allElements).indexOf(htmlElement) === index) {
              element = htmlElement;
              break;
            }
          }
        }
      }
    }
    
    if (element) {
      applyAnimationToElement(element, animation);
    }
  });
}

// Helper function to get element type info
function getElementTypeInfo(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return `Heading (${tagName})`;
  } else if (tagName === 'p') {
    return 'Paragraph';
  } else if (tagName === 'img') {
    return 'Image';
  } else if (tagName === 'ul' || tagName === 'ol') {
    return 'List';
  } else if (tagName === 'li') {
    return 'List Item';
  } else if (element.classList.contains('mermaid-diagram')) {
    return 'Mermaid Diagram';
  } else if (element.classList.contains('slide-table')) {
    return 'Table';
  } else if (element.classList.contains('code-block')) {
    return 'Code Block';
  } else if (tagName === 'div' || tagName === 'span') {
    return 'Container';
  }
  return 'Element';
}

function applyAnimationToElement(element: HTMLElement, animation: ElementAnimation) {
  if (!animation.enabled) {
    element.style.animation = '';
    element.classList.remove('animated-element', 'animation-on-load', 'animation-on-click', 'animation-on-hover', 'animation-on-scroll');
    return;
  }
  
  const repeatValue = animation.repeat 
    ? animation.repeatCount === 'infinite' 
      ? 'infinite' 
      : animation.repeatCount
    : '1';
  
  // Store animation data
  element.dataset.animation = JSON.stringify(animation);
  
  // Add animation classes
  element.classList.add('animated-element', `animation-${animation.trigger}`);
  
  // Apply animation style
  element.style.animation = `${animation.type} ${animation.duration}ms ${animation.easing} ${animation.delay}ms ${repeatValue}`;
  element.style.animationFillMode = 'both';
  
  // Setup event listeners for triggers
  setupAnimationTriggers(element, animation);
}

function setupAnimationTriggers(element: HTMLElement, animation: ElementAnimation) {
  // Get existing handlers
  const handlers = elementHandlers.value.get(element) || {};
  
  // Remove existing listeners
  if (handlers.click) {
    element.removeEventListener('click', handlers.click);
  }
  if (handlers.mouseenter) {
    element.removeEventListener('mouseenter', handlers.mouseenter);
  }
  if (handlers.mouseleave) {
    element.removeEventListener('mouseleave', handlers.mouseleave);
  }
  
  if (animation.trigger === 'onClick') {
    handlers.click = () => {
      element.classList.add('clicked');
      // Restart animation
      element.style.animation = 'none';
      element.offsetHeight; // Trigger reflow
      const repeatValue = animation.repeat 
        ? animation.repeatCount === 'infinite' 
          ? 'infinite' 
          : animation.repeatCount
        : '1';
      element.style.animation = `${animation.type} ${animation.duration}ms ${animation.easing} ${animation.delay}ms ${repeatValue}`;
      element.style.animationFillMode = 'both';
      
      setTimeout(() => {
        element.classList.remove('clicked');
      }, animation.duration + animation.delay);
    };
    element.addEventListener('click', handlers.click);
  } else if (animation.trigger === 'onHover') {
    handlers.mouseenter = () => {
      element.classList.add('hovered');
      // Restart animation
      element.style.animation = 'none';
      element.offsetHeight; // Trigger reflow
      const repeatValue = animation.repeat 
        ? animation.repeatCount === 'infinite' 
          ? 'infinite' 
          : animation.repeatCount
        : '1';
      element.style.animation = `${animation.type} ${animation.duration}ms ${animation.easing} ${animation.delay}ms ${repeatValue}`;
      element.style.animationFillMode = 'both';
    };
    handlers.mouseleave = () => {
      element.classList.remove('hovered');
    };
    element.addEventListener('mouseenter', handlers.mouseenter);
    element.addEventListener('mouseleave', handlers.mouseleave);
  }
  
  // Store handlers
  elementHandlers.value.set(element, handlers);
}

function setupScrollObserver() {
  if (!previewRef.value) return;
  
  // Clean up existing observer
  if (animationObserver.value) {
    animationObserver.value.disconnect();
  }
  
  // Create new intersection observer for scroll-triggered animations
  animationObserver.value = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          element.classList.add('scrolled-into-view');
        } else {
          element.classList.remove('scrolled-into-view');
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  );
  
  // Observe all elements with scroll-triggered animations
  const scrollElements = previewRef.value.querySelectorAll('.animation-on-scroll');
  scrollElements.forEach(el => {
    animationObserver.value?.observe(el);
  });
}

const emit = defineEmits<{
  (e: 'preview-element-selected', detail: any): void;
  (e: 'update-element-position', payload: {
    element: HTMLElement;
    markdownLineStart: number;
    markdownLineEnd: number;
    position: { top: string; left: string };
  }): void;
  (e: 'update-element-size', payload: {
    element: HTMLElement;
    markdownLineStart: number;
    markdownLineEnd: number;
    width: number;
    height: number;
  }): void;
}>();

// Add line range data attributes to elements for drag & drop
function addLineRangeAttributes() {
  if (!previewRef.value) return;
  
  // Get all elements with data-markdown-line-start (already set by renderBlocksToHtml)
  const elements = previewRef.value.querySelectorAll('[data-markdown-line-start]');
  
  elements.forEach((el) => {
    const element = el as HTMLElement;
    
    // Use existing line numbers from markdown parsing
    const lineStart = element.dataset.markdownLineStart;
    const lineEnd = element.dataset.markdownLineEnd;
    
    if (!lineStart || !lineEnd) {
      console.warn('Element missing line numbers:', element);
      return;
    }
    
    // Store for easy access during drag
    element.dataset.lineStart = lineStart;
    element.dataset.lineEnd = lineEnd;
    
    // Make elements draggable in arrange mode
    if (props.arrangeMode) {
      element.classList.add('draggable-element');
      element.style.cursor = 'move';
      
      // Add mousedown handler for dragging
      element.addEventListener('mousedown', (e: MouseEvent) => {
        // Don't trigger drag if clicking on resize handle
        if ((e.target as HTMLElement).classList.contains('resize-handle')) {
          return;
        }
        handleMouseDown(e, element);
      });
      
      // Add resize handles
      addResizeHandles(element);
    }
  });
}

// CRITICAL FIX: Restore positions for elements being manipulated
function restoreManipulatedElementPositions() {
  if (!previewRef.value || elementsBeingManipulated.value.size === 0) return;
  
  elementsBeingManipulated.value.forEach(blockId => {
    const element = previewRef.value?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (element && element.dataset.tempPosition) {
      const pos = JSON.parse(element.dataset.tempPosition);
      element.style.position = 'absolute';
      element.style.top = pos.top;
      element.style.left = pos.left;
      if (pos.width) element.style.width = pos.width;
      if (pos.height) element.style.height = pos.height;
      element.style.zIndex = pos.zIndex || '1000';
    }
  });
}

// Add diagnostic function for debugging
function debugPositionState() {
  if (!previewRef.value) return;
  
  const elements = previewRef.value.querySelectorAll('[data-block-id]');
  console.log('🔍 DEBUG: Total elements:', elements.length);
  
  elements.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    console.log(`🔍 Element ${i}:`, {
      blockId: htmlEl.dataset.blockId,
      lineStart: htmlEl.dataset.lineStart,
      lineEnd: htmlEl.dataset.lineEnd,
      hasPosition: htmlEl.style.position === 'absolute',
      top: htmlEl.style.top,
      left: htmlEl.style.left,
      tempPosition: htmlEl.dataset.tempPosition,
      isManipulated: elementsBeingManipulated.value.has(htmlEl.dataset.blockId || '')
    });
  });
}

// Drag handlers
function handleMouseDown(e: MouseEvent, element: HTMLElement) {
  if (!props.arrangeMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  isDragging.value = true;
  draggedElement.value = element;
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  
  // Get current position
  const rect = element.getBoundingClientRect();
  const containerRect = previewRef.value!.getBoundingClientRect();
  elementStartPos.value = {
    top: rect.top - containerRect.top,
    left: rect.left - containerRect.left
  };
  
  element.classList.add('dragging');
  document.addEventListener('mousemove', throttledMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Performance optimization: throttle mouse move
let mouseMoveThrottleTimer: number | null = null;
let resizeMoveThrottleTimer: number | null = null;

function throttledMouseMove(e: MouseEvent) {
  if (mouseMoveThrottleTimer) return;
  
  mouseMoveThrottleTimer = requestAnimationFrame(() => {
    handleMouseMove(e);
    mouseMoveThrottleTimer = null;
  });
}

function throttledResizeMove(e: MouseEvent) {
  if (resizeMoveThrottleTimer) return;
  
  resizeMoveThrottleTimer = requestAnimationFrame(() => {
    handleResizeMove(e);
    resizeMoveThrottleTimer = null;
  });
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || !draggedElement.value || !previewRef.value) return;
  
  e.preventDefault();
  
  // CRITICAL FIX: Account for zoom
  const zoomFactor = zoom.value / 100;
  const deltaX = (e.clientX - dragStartPos.value.x) / zoomFactor;
  const deltaY = (e.clientY - dragStartPos.value.y) / zoomFactor;
  
  const newTop = elementStartPos.value.top + deltaY;
  const newLeft = elementStartPos.value.left + deltaX;
  
  // Apply position immediately for visual feedback
  draggedElement.value.style.position = 'absolute';
  draggedElement.value.style.top = `${newTop}px`;
  draggedElement.value.style.left = `${newLeft}px`;
  draggedElement.value.style.zIndex = '1000';
  
  // Update current position for tooltip
  const containerRect = previewRef.value.getBoundingClientRect();
  const topPercent = (newTop / containerRect.height * 100).toFixed(1);
  const leftPercent = (newLeft / containerRect.width * 100).toFixed(1);
  currentDragPos.value = { 
    top: `${topPercent}%`, 
    left: `${leftPercent}%`,
    width: '0px',
    height: '0px'
  };
}

function handleMouseUp(e: MouseEvent) {
  if (!isDragging.value || !draggedElement.value || !previewRef.value) return;
  
  e.preventDefault();
  
  const containerRect = previewRef.value.getBoundingClientRect();
  
  // CRITICAL FIX: Account for zoom
  const zoomFactor = zoom.value / 100;
  const deltaX = (e.clientX - dragStartPos.value.x) / zoomFactor;
  const deltaY = (e.clientY - dragStartPos.value.y) / zoomFactor;
  
  const finalTop = elementStartPos.value.top + deltaY;
  const finalLeft = elementStartPos.value.left + deltaX;
  
  const topPercent = (finalTop / containerRect.height * 100).toFixed(1);
  const leftPercent = (finalLeft / containerRect.width * 100).toFixed(1);
  
  // Store temp position on element
  const blockId = draggedElement.value.dataset.blockId || '';
  draggedElement.value.dataset.tempPosition = JSON.stringify({
    top: `${finalTop}px`,
    left: `${finalLeft}px`,
    zIndex: '1000'
  });
  
  // Mark element as being manipulated
  if (blockId) {
    elementsBeingManipulated.value.add(blockId);
  }
  
  const lineStart = parseInt(draggedElement.value.dataset.lineStart || '0');
  const lineEnd = parseInt(draggedElement.value.dataset.lineEnd || '0');
  
  const updatePayload = {
    element: draggedElement.value,
    markdownLineStart: lineStart,
    markdownLineEnd: lineEnd,
    position: {
      top: `${topPercent}%`,
      left: `${leftPercent}%` 
    }
  };
  
  // Emit immediately - no debounce
  emit('update-element-position', updatePayload);
  
  // Remove from manipulated set after markdown updates (3 seconds buffer)
  setTimeout(() => {
    elementsBeingManipulated.value.delete(blockId);
  }, 3000);
  
  draggedElement.value.classList.remove('dragging');
  isDragging.value = false;
  draggedElement.value = null;
  
  document.removeEventListener('mousemove', throttledMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

// ============================================================
// RESIZE HANDLERS
// ============================================================

/**
 * Add resize handles to an element
 */
function addResizeHandles(element: HTMLElement) {
  // Remove existing handles
  element.querySelectorAll('.resize-handle').forEach(h => h.remove());
  
  const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
  
  handles.forEach(handle => {
    const div = document.createElement('div');
    div.className = `resize-handle resize-handle-${handle}`;
    div.dataset.handle = handle;
    
    // Prevent drag from triggering on resize handles
    div.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      handleResizeStart(e, element, handle);
    });
    
    element.appendChild(div);
  });
}

/**
 * Start resize operation
 */
function handleResizeStart(e: MouseEvent, element: HTMLElement, handle: string) {
  if (!props.arrangeMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const rect = element.getBoundingClientRect();
  const containerRect = previewRef.value?.getBoundingClientRect();
  if (!containerRect) return;
  
  // Calculate position relative to container
  const relativeTop = rect.top - containerRect.top;
  const relativeLeft = rect.left - containerRect.left;
  
  // Determine if we should maintain aspect ratio
  const shouldMaintainAspect = e.shiftKey || 
                                element.tagName === 'IMG' ||
                                element.classList.contains('maintain-aspect');
  
  resizeState.value = {
    isResizing: true,
    element,
    handle: handle as any,
    startX: e.clientX,
    startY: e.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
    startTop: relativeTop,
    startLeft: relativeLeft,
    maintainAspectRatio: shouldMaintainAspect,
    originalAspectRatio: rect.width / rect.height
  };
  
  element.classList.add('resizing');
  document.addEventListener('mousemove', throttledResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  
  // Disable text selection during resize
  document.body.style.userSelect = 'none';
}

/**
 * Handle resize mouse move
 */
function handleResizeMove(e: MouseEvent) {
  if (!resizeState.value.isResizing || !resizeState.value.element || !previewRef.value) return;
  
  e.preventDefault();
  
  const { 
    element, 
    handle, 
    startX, 
    startY, 
    startWidth, 
    startHeight,
    startTop,
    startLeft,
    maintainAspectRatio,
    originalAspectRatio 
  } = resizeState.value;
  
  // Account for zoom
  const zoomFactor = zoom.value / 100;
  const deltaX = (e.clientX - startX) / zoomFactor;
  const deltaY = (e.clientY - startY) / zoomFactor;
  
  let newWidth = startWidth;
  let newHeight = startHeight;
  let newTop = startTop;
  let newLeft = startLeft;
  
  // Calculate new dimensions based on handle
  switch (handle) {
    case 'se': // Southeast - bottom right
      newWidth = startWidth + deltaX;
      newHeight = startHeight + deltaY;
      break;
      
    case 'sw': // Southwest - bottom left
      newWidth = startWidth - deltaX;
      newHeight = startHeight + deltaY;
      newLeft = startLeft + deltaX;
      break;
      
    case 'ne': // Northeast - top right
      newWidth = startWidth + deltaX;
      newHeight = startHeight - deltaY;
      newTop = startTop + deltaY;
      break;
      
    case 'nw': // Northwest - top left
      newWidth = startWidth - deltaX;
      newHeight = startHeight - deltaY;
      newTop = startTop + deltaY;
      newLeft = startLeft + deltaX;
      break;
      
    case 'e': // East - right
      newWidth = startWidth + deltaX;
      break;
      
    case 'w': // West - left
      newWidth = startWidth - deltaX;
      newLeft = startLeft + deltaX;
      break;
      
    case 's': // South - bottom
      newHeight = startHeight + deltaY;
      break;
      
    case 'n': // North - top
      newHeight = startHeight - deltaY;
      newTop = startTop + deltaY;
      break;
  }
  
  // Maintain aspect ratio if needed
  if (maintainAspectRatio) {
    if (handle === 'e' || handle === 'w') {
      // Width changed, adjust height
      newHeight = newWidth / originalAspectRatio;
    } else if (handle === 'n' || handle === 's') {
      // Height changed, adjust width
      newWidth = newHeight * originalAspectRatio;
    } else {
      // Corner handles - use the larger change
      const widthChange = Math.abs(newWidth - startWidth);
      const heightChange = Math.abs(newHeight - startHeight);
      
      if (widthChange > heightChange) {
        newHeight = newWidth / originalAspectRatio;
        
        // Adjust top if needed
        if (handle === 'nw' || handle === 'ne') {
          const heightDiff = newHeight - startHeight;
          newTop = startTop - heightDiff;
        }
      } else {
        newWidth = newHeight * originalAspectRatio;
        
        // Adjust left if needed
        if (handle === 'nw' || handle === 'sw') {
          const widthDiff = newWidth - startWidth;
          newLeft = startLeft - widthDiff;
        }
      }
    }
  }
  
  // Apply minimum constraints
  const minWidth = 20;
  const minHeight = 20;
  
  if (newWidth < minWidth) {
    newWidth = minWidth;
    if (maintainAspectRatio) {
      newHeight = newWidth / originalAspectRatio;
    }
  }
  
  if (newHeight < minHeight) {
    newHeight = minHeight;
    if (maintainAspectRatio) {
      newWidth = newHeight * originalAspectRatio;
    }
  }
  
  // Apply maximum constraints (container bounds)
  const containerRect = previewRef.value.getBoundingClientRect();
  const maxWidth = containerRect.width - newLeft;
  const maxHeight = containerRect.height - newTop;
  
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    if (maintainAspectRatio) {
      newHeight = newWidth / originalAspectRatio;
    }
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    if (maintainAspectRatio) {
      newWidth = newHeight * originalAspectRatio;
    }
  }
  
  // Apply new styles
  element.style.width = `${newWidth}px`;
  element.style.height = `${newHeight}px`;
  element.style.top = `${newTop}px`;
  element.style.left = `${newLeft}px`;
  
  // Update position display (if you have a tooltip)
  const topPercent = (newTop / containerRect.height * 100).toFixed(1);
  const leftPercent = (newLeft / containerRect.width * 100).toFixed(1);
  currentDragPos.value = {
    top: `${topPercent}%`,
    left: `${leftPercent}%`,
    width: `${newWidth.toFixed(0)}px`,
    height: `${newHeight.toFixed(0)}px`
  };
}

/**
 * End resize operation
 */
function handleResizeEnd() {
  if (!resizeState.value.isResizing || !resizeState.value.element || !previewRef.value) return;
  
  const element = resizeState.value.element;
  const containerRect = previewRef.value.getBoundingClientRect();
  
  // Get final dimensions and position
  const rect = element.getBoundingClientRect();
  const finalTop = rect.top - containerRect.top;
  const finalLeft = rect.left - containerRect.left;
  const finalWidth = rect.width;
  const finalHeight = rect.height;
  
  // Convert to percentages for markdown
  const topPercent = (finalTop / containerRect.height * 100).toFixed(1);
  const leftPercent = (finalLeft / containerRect.width * 100).toFixed(1);
  
  // Store temp position on element
  const blockId = element.dataset.blockId || '';
  element.dataset.tempPosition = JSON.stringify({
    top: `${finalTop}px`,
    left: `${finalLeft}px`,
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    zIndex: element.style.zIndex || '1000'
  });
  
  // Mark element as being manipulated
  if (blockId) {
    elementsBeingManipulated.value.add(blockId);
  }
  
  const lineStart = parseInt(element.dataset.lineStart || '0');
  const lineEnd = parseInt(element.dataset.lineEnd || '0');
  
  // Emit both position and size updates
  emit('update-element-position', {
    element,
    markdownLineStart: lineStart,
    markdownLineEnd: lineEnd,
    position: {
      top: `${topPercent}%`,
      left: `${leftPercent}%` 
    }
  });
  
  emit('update-element-size', {
    element,
    markdownLineStart: lineStart,
    markdownLineEnd: lineEnd,
    width: Math.round(finalWidth),
    height: Math.round(finalHeight)
  });
  
  // Remove from manipulated set after markdown updates
  setTimeout(() => {
    elementsBeingManipulated.value.delete(blockId);
  }, 3000);
  
  element.classList.remove('resizing');
  resizeState.value.isResizing = false;
  
  // Re-enable text selection
  document.body.style.userSelect = '';
  
  document.removeEventListener('mousemove', throttledResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
}

// Expose functions for external use
defineExpose({ 
  previewRef,
  debugPositionState
});

// Add global debug hook (remove in production)
if (typeof window !== 'undefined') {
  (window as any).debugSlidePosition = debugPositionState;
}
</script>

<style scoped>
.slide-preview-content {
  aspect-ratio: 4/3;
  position: relative;
}

/* Arrange mode styles */
.slide-preview-content :deep(.draggable-element) {
  outline: 2px dashed #3b82f6;
  outline-offset: 2px;
  transition: outline 0.2s ease;
  position: relative;
}

.slide-preview-content :deep(.draggable-element:hover) {
  outline: 2px solid #3b82f6;
  outline-offset: 4px;
}

.slide-preview-content :deep(.draggable-element::before) {
  content: '⋮⋮';
  position: absolute;
  top: -8px;
  left: -8px;
  background: #3b82f6;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.slide-preview-content :deep(.draggable-element:hover::before) {
  opacity: 1;
}

.slide-preview-content :deep(.dragging) {
  opacity: 0.7;
  z-index: 1000 !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  outline: 3px solid #3b82f6 !important;
  cursor: grabbing !important;
}

/* ============================================================ */
/* RESIZE HANDLES */
/* ============================================================ */

.slide-preview-content :deep(.resize-handle) {
  position: absolute;
  background: #3b82f6;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.slide-preview-content :deep(.draggable-element:hover .resize-handle),
.slide-preview-content :deep(.resizing .resize-handle) {
  opacity: 1;
}

/* Corner handles */
.slide-preview-content :deep(.resize-handle-nw) {
  top: -6px;
  left: -6px;
  width: 12px;
  height: 12px;
  cursor: nw-resize;
  border-radius: 3px 0 0 0;
}

.slide-preview-content :deep(.resize-handle-ne) {
  top: -6px;
  right: -6px;
  width: 12px;
  height: 12px;
  cursor: ne-resize;
  border-radius: 0 3px 0 0;
}

.slide-preview-content :deep(.resize-handle-sw) {
  bottom: -6px;
  left: -6px;
  width: 12px;
  height: 12px;
  cursor: sw-resize;
  border-radius: 0 0 0 3px;
}

.slide-preview-content :deep(.resize-handle-se) {
  bottom: -6px;
  right: -6px;
  width: 12px;
  height: 12px;
  cursor: se-resize;
  border-radius: 0 0 3px 0;
}

/* Edge handles */
.slide-preview-content :deep(.resize-handle-n) {
  top: -4px;
  left: 50%;
  width: 32px;
  height: 8px;
  cursor: n-resize;
  transform: translateX(-50%);
  border-radius: 4px 4px 0 0;
}

.slide-preview-content :deep(.resize-handle-s) {
  bottom: -4px;
  left: 50%;
  width: 32px;
  height: 8px;
  cursor: s-resize;
  transform: translateX(-50%);
  border-radius: 0 0 4px 4px;
}

.slide-preview-content :deep(.resize-handle-e) {
  top: 50%;
  right: -4px;
  width: 8px;
  height: 32px;
  cursor: e-resize;
  transform: translateY(-50%);
  border-radius: 0 4px 4px 0;
}

.slide-preview-content :deep(.resize-handle-w) {
  top: 50%;
  left: -4px;
  width: 8px;
  height: 32px;
  cursor: w-resize;
  transform: translateY(-50%);
  border-radius: 4px 0 0 4px;
}

/* Resizing state */
.slide-preview-content :deep(.resizing) {
  opacity: 0.8;
  outline: 2px solid #3b82f6 !important;
  outline-offset: 0px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

/* Override dragging cursor when resizing */
.slide-preview-content :deep(.resizing *) {
  cursor: inherit !important;
}

.slide-preview-content :deep(h1) {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: inherit;
}

.slide-preview-content :deep(h2) {
  font-size: 1.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: inherit;
}

.slide-preview-content :deep(h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: inherit;
}

.slide-preview-content :deep(p) {
  font-size: 1.125rem;
  line-height: 1.75;
  margin-bottom: 0.75rem;
}

.slide-preview-content :deep(ul),
.slide-preview-content :deep(ol) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.slide-preview-content :deep(li) {
  font-size: 1.125rem;
  line-height: 1.75;
}

.slide-preview-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875em;
}

.slide-preview-content :deep(pre) {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.slide-preview-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.slide-preview-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.slide-preview-content :deep(blockquote) {
  border-left: 4px solid currentColor;
  padding-left: 1rem;
  margin: 1rem 0;
  opacity: 0.8;
  font-style: italic;
}

.slide-preview-content :deep(.slide-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.slide-preview-content :deep(.slide-table th) {
  background: var(--slidev-primary, #3b82f6);
  color: white;
  padding: 0.75rem 1rem;
  text-align: left;
}

.slide-preview-content :deep(.slide-table td) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.slide-preview-content :deep(.mermaid-diagram) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 0.75rem;
  margin: 1rem 0;
  padding: 2rem;
}

.slide-preview-content :deep(.mermaid-diagram.mermaid-rendered) {
  background: transparent;
  padding: 1rem;
}

.slide-preview-content :deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}

.slide-preview-content :deep(.mermaid-placeholder) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
}

.slide-preview-content :deep(.mermaid-icon) {
  opacity: 0.6;
}

.slide-preview-content :deep(.mermaid-label) {
  font-size: 0.875rem;
  font-weight: 500;
}

.slide-preview-content :deep(.mermaid-error) {
  color: #ef4444;
  padding: 1rem;
  text-align: center;
}

/* UnoCSS/Tailwind text size classes */
.slide-preview-content :deep(.text-xs) { font-size: 0.75rem; line-height: 1rem; }
.slide-preview-content :deep(.text-sm) { font-size: 0.875rem; line-height: 1.25rem; }
.slide-preview-content :deep(.text-base) { font-size: 1rem; line-height: 1.5rem; }
.slide-preview-content :deep(.text-lg) { font-size: 1.125rem; line-height: 1.75rem; }
.slide-preview-content :deep(.text-xl) { font-size: 1.25rem; line-height: 1.75rem; }
.slide-preview-content :deep(.text-2xl) { font-size: 1.5rem; line-height: 2rem; }
.slide-preview-content :deep(.text-3xl) { font-size: 1.875rem; line-height: 2.25rem; }
.slide-preview-content :deep(.text-4xl) { font-size: 2.25rem; line-height: 2.5rem; }
.slide-preview-content :deep(.text-5xl) { font-size: 3rem; line-height: 1; }
.slide-preview-content :deep(.text-6xl) { font-size: 3.75rem; line-height: 1; }

/* Padding classes */
.slide-preview-content :deep(.p-0) { padding: 0; }
.slide-preview-content :deep(.p-1) { padding: 0.25rem; }
.slide-preview-content :deep(.p-2) { padding: 0.5rem; }
.slide-preview-content :deep(.p-3) { padding: 0.75rem; }
.slide-preview-content :deep(.p-4) { padding: 1rem; }
.slide-preview-content :deep(.p-6) { padding: 1.5rem; }
.slide-preview-content :deep(.p-8) { padding: 2rem; }
.slide-preview-content :deep(.p-12) { padding: 3rem; }
.slide-preview-content :deep(.px-2) { padding-left: 0.5rem; padding-right: 0.5rem; }
.slide-preview-content :deep(.px-4) { padding-left: 1rem; padding-right: 1rem; }
.slide-preview-content :deep(.py-2) { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.slide-preview-content :deep(.py-4) { padding-top: 1rem; padding-bottom: 1rem; }

/* Margin classes */
.slide-preview-content :deep(.m-0) { margin: 0; }
.slide-preview-content :deep(.m-1) { margin: 0.25rem; }
.slide-preview-content :deep(.m-2) { margin: 0.5rem; }
.slide-preview-content :deep(.m-4) { margin: 1rem; }
.slide-preview-content :deep(.m-8) { margin: 2rem; }
.slide-preview-content :deep(.mx-auto) { margin-left: auto; margin-right: auto; }
.slide-preview-content :deep(.my-2) { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.slide-preview-content :deep(.my-4) { margin-top: 1rem; margin-bottom: 1rem; }
.slide-preview-content :deep(.mt-2) { margin-top: 0.5rem; }
.slide-preview-content :deep(.mt-4) { margin-top: 1rem; }
.slide-preview-content :deep(.mt-8) { margin-top: 2rem; }
.slide-preview-content :deep(.mb-2) { margin-bottom: 0.5rem; }
.slide-preview-content :deep(.mb-4) { margin-bottom: 1rem; }

/* Gap classes */
.slide-preview-content :deep(.gap-1) { gap: 0.25rem; }
.slide-preview-content :deep(.gap-2) { gap: 0.5rem; }
.slide-preview-content :deep(.gap-4) { gap: 1rem; }
.slide-preview-content :deep(.gap-8) { gap: 2rem; }
.slide-preview-content :deep(.gap-12) { gap: 3rem; }

/* Grid classes */
.slide-preview-content :deep(.grid) { display: grid; }
.slide-preview-content :deep(.grid-cols-2) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.slide-preview-content :deep(.grid-cols-3) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.slide-preview-content :deep(.grid-cols-4) { grid-template-columns: repeat(4, minmax(0, 1fr)); }

/* Flex classes */
.slide-preview-content :deep(.flex) { display: flex; }
.slide-preview-content :deep(.flex-col) { flex-direction: column; }
.slide-preview-content :deep(.flex-row) { flex-direction: row; }
.slide-preview-content :deep(.items-center) { align-items: center; }
.slide-preview-content :deep(.justify-center) { justify-content: center; }
.slide-preview-content :deep(.justify-between) { justify-content: space-between; }

/* Background colors */
.slide-preview-content :deep(.bg-blue-50) { background-color: #eff6ff; }
.slide-preview-content :deep(.bg-green-50) { background-color: #f0fdf4; }
.slide-preview-content :deep(.bg-yellow-50) { background-color: #fefce8; }
.slide-preview-content :deep(.bg-purple-50) { background-color: #faf5ff; }
.slide-preview-content :deep(.bg-red-50) { background-color: #fef2f2; }
.slide-preview-content :deep(.bg-gray-50) { background-color: #f9fafb; }
.slide-preview-content :deep(.bg-gray-100) { background-color: #f3f4f6; }
.slide-preview-content :deep(.bg-white) { background-color: #ffffff; }

/* Border radius */
.slide-preview-content :deep(.rounded) { border-radius: 0.25rem; }
.slide-preview-content :deep(.rounded-lg) { border-radius: 0.5rem; }
.slide-preview-content :deep(.rounded-xl) { border-radius: 0.75rem; }
.slide-preview-content :deep(.rounded-full) { border-radius: 9999px; }

/* Text alignment */
.slide-preview-content :deep(.text-center) { text-align: center; }
.slide-preview-content :deep(.text-left) { text-align: left; }
.slide-preview-content :deep(.text-right) { text-align: right; }

/* Font weight */
.slide-preview-content :deep(.font-bold) { font-weight: 700; }
.slide-preview-content :deep(.font-semibold) { font-weight: 600; }
.slide-preview-content :deep(.font-medium) { font-weight: 500; }

/* Width/Height */
.slide-preview-content :deep(.w-full) { width: 100%; }
.slide-preview-content :deep(.h-full) { height: 100%; }

/* Two-column layout styles */
.slide-preview-content :deep(.two-cols-container) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  align-items: start; /* Align columns to top */
}

.slide-preview-content :deep(.two-cols-header-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.slide-preview-content :deep(.two-cols-header-container .header-content) {
  margin-bottom: 2rem;
  flex-shrink: 0;
}

.slide-preview-content :deep(.two-cols-header-container .cols-container) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  align-items: start; /* Align columns to top */
}

.slide-preview-content :deep(.col-left),
.slide-preview-content :deep(.col-right) {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem; /* Scrollbar padding */
  /* Ensure proper text alignment */
  text-align: left;
  /* Align content to top */
  align-self: start;
}

/* Ensure content fits within column */
.slide-preview-content :deep(.col-left) *,
.slide-preview-content :deep(.col-right) * {
  max-width: 100%;
  box-sizing: border-box;
}

/* Better list spacing in columns */
.slide-preview-content :deep(.col-left ul),
.slide-preview-content :deep(.col-right ul) {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.slide-preview-content :deep(.col-left li),
.slide-preview-content :deep(.col-right li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

/* Header spacing in columns */
.slide-preview-content :deep(.col-left h2),
.slide-preview-content :deep(.col-right h2) {
  margin-top: 0;
  margin-bottom: 1rem;
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

/* Show element is being tracked */
.slide-preview-content :deep([data-temp-position]) {
  outline: 3px solid #10b981 !important;
  outline-offset: 2px;
}

.slide-preview-content :deep([data-temp-position]::after) {
  content: '✓ Saved';
  position: absolute;
  top: -24px;
  right: -8px;
  background: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none;
  z-index: 10000;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  10%, 90% { opacity: 1; }
}
</style>
