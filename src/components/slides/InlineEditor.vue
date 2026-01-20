<template>
  <teleport to="body">
    <!-- Floating Toolbar -->
    <div
      v-if="showToolbar"
      ref="toolbarRef"
      class="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl p-3 z-50 flex items-center gap-2"
      :style="toolbarStyle"
      @click.stop
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      <!-- Text Style Controls -->
      <div class="flex items-center gap-1 pr-3 border-r border-gray-300 dark:border-gray-600" role="group" aria-label="Text styles">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.fontWeight === 'bold' }"
          title="Bold (Ctrl+B)"
          aria-label="Bold text"
          :aria-pressed="currentFormat.fontWeight === 'bold'"
          @click="applyFormat('fontWeight', currentFormat.fontWeight === 'bold' ? 'normal' : 'bold')"
        >
          <Bold class="h-4 w-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.fontStyle === 'italic' }"
          title="Italic (Ctrl+I)"
          aria-label="Italic text"
          :aria-pressed="currentFormat.fontStyle === 'italic'"
          @click="applyFormat('fontStyle', currentFormat.fontStyle === 'italic' ? 'normal' : 'italic')"
        >
          <Italic class="h-4 w-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.textDecoration === 'underline' }"
          title="Underline (Ctrl+U)"
          aria-label="Underline text"
          :aria-pressed="currentFormat.textDecoration === 'underline'"
          @click="applyFormat('textDecoration', currentFormat.textDecoration === 'underline' ? 'none' : 'underline')"
        >
          <Underline class="h-4 w-4" />
        </button>
      </div>

      <!-- Text Alignment -->
      <div class="flex items-center gap-1 pr-3 border-r border-gray-300 dark:border-gray-600" role="group" aria-label="Text alignment">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.textAlign === 'left' }"
          title="Align Left"
          aria-label="Align text left"
          :aria-pressed="currentFormat.textAlign === 'left'"
          @click="applyFormat('textAlign', 'left')"
        >
          <AlignLeft class="h-4 w-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.textAlign === 'center' }"
          title="Align Center"
          aria-label="Align text center"
          :aria-pressed="currentFormat.textAlign === 'center'"
          @click="applyFormat('textAlign', 'center')"
        >
          <AlignCenter class="h-4 w-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.textAlign === 'right' }"
          title="Align Right"
          aria-label="Align text right"
          :aria-pressed="currentFormat.textAlign === 'right'"
          @click="applyFormat('textAlign', 'right')"
        >
          <AlignRight class="h-4 w-4" />
        </button>
      </div>

      <!-- Font Size Control -->
      <div class="flex items-center gap-1 pr-3 border-r border-gray-300 dark:border-gray-600" role="group" aria-label="Font size">
        <div class="relative">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm min-w-[32px] min-h-[32px]"
            title="Font Size"
            aria-label="Font size selector"
            :aria-expanded="showFontSizePicker"
            aria-haspopup="true"
            @click="showFontSizePicker = !showFontSizePicker"
          >
            <Type class="h-3 w-3" />
            <span v-if="currentFormat.fontSize">{{ parseInt(currentFormat.fontSize) }}</span>
            <span v-else>16</span>
          </button>
          
          <!-- Font Size Dropdown -->
          <div
            v-if="showFontSizePicker"
            class="font-size-picker absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl p-3 z-[60] w-[180px]"
            @click.stop
            role="menu"
            aria-label="Font size options"
          >
            <div class="space-y-1 mb-3">
              <button
                v-for="size in [12, 14, 16, 18, 20, 24, 32, 48]"
                :key="size"
                class="w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left flex items-center justify-between"
                :class="{ 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300': currentFormat.fontSize === `${size}px` }"
                :title="`Set font size to ${size}px`"
                role="menuitem"
                @click.stop="applyFormat('fontSize', `${size}px`); showFontSizePicker = false;"
              >
                <span>{{ size }}px</span>
                <span v-if="currentFormat.fontSize === `${size}px`" class="text-blue-600 dark:text-blue-300">✓</span>
              </button>
            </div>
            <div class="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <input
                v-model="customFontSize"
                type="number"
                min="8"
                max="200"
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Custom"
                aria-label="Custom font size"
                @keydown.enter="applyCustomFontSize"
                @click.stop
              />
              <button
                class="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors min-h-[32px]"
                title="Apply custom font size"
                @click="applyCustomFontSize"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Color Picker -->
      <div class="flex items-center gap-1" role="group" aria-label="Text color">
        <div class="relative">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 min-w-[32px] min-h-[32px]"
            title="Text Color"
            aria-label="Text color selector"
            :aria-expanded="showColorPicker"
            aria-haspopup="true"
            @click="showColorPicker = !showColorPicker"
          >
            <div class="w-4 h-4 rounded border border-gray-400" :style="{ backgroundColor: currentFormat.color || '#000000' }" />
          </button>
          
          <!-- Color Picker Dropdown -->
          <div
            v-if="showColorPicker"
            class="color-picker absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl p-4 z-50 min-w-[240px]"
            @click.stop
            role="menu"
            aria-label="Color options"
          >
            <div class="grid grid-cols-6 gap-2 mb-3">
              <button
                v-for="color in colors"
                :key="color"
                class="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer"
                :style="{ backgroundColor: color }"
                :title="`Set color to ${color}`"
                :aria-label="`Color ${color}`"
                role="menuitem"
                @click.stop="applyFormat('color', color)"
              />
            </div>
            <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Custom Color</label>
              <input
                v-model="customColor"
                type="color"
                class="w-full h-10 rounded-lg cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                aria-label="Custom color picker"
                @input="applyFormat('color', customColor)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <div class="pl-2 border-l border-gray-300 dark:border-gray-600">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          title="Close (Escape)"
          aria-label="Close formatting toolbar"
          @click="closeEditor"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Inline Editor Overlay -->
    <div
      v-if="editingElement"
      class="fixed inset-0 z-40"
      @click="closeEditor"
    />
    
    <!-- Editable Element -->
    <div
      v-if="editingElement && editorRect"
      class="fixed bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl z-40 overflow-hidden"
      :style="editorStyle"
      @click.stop
    >
      <div class="bg-blue-500 text-white px-3 py-1 text-xs font-medium flex items-center justify-between">
        <span>Editing {{ elementType }}</span>
        <div class="flex items-center gap-2">
          <button
            class="p-0.5 rounded hover:bg-blue-600"
            title="Reset"
            @click="resetContent"
          >
            <RotateCcw class="h-3 w-3" />
          </button>
          <button
            class="p-0.5 rounded hover:bg-blue-600"
            title="Done"
            @click="saveChanges"
          >
            <Check class="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <!-- Content Editor -->
      <div
        ref="editorRef"
        class="p-4 min-w-[200px] min-h-[50px] overflow-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        contenteditable="true"
        :style="contentStyle"
        @input="handleContentChange"
        @keydown="handleKeydown"
        @blur="handleBlur"
        v-html="editingContent"
      />
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type,
  X,
  Check,
  RotateCcw
} from 'lucide-vue-next';

interface Props {
  element: HTMLElement | null;
  elementType: string;
  initialContent: string;
  initialStyles: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'save', content: string, styles: Record<string, string>): void;
  (e: 'close'): void;
  (e: 'realtime-update', content: string, styles: Record<string, string>): void;
}>();

// Refs
const toolbarRef = ref<HTMLElement | null>(null);
const editorRef = ref<HTMLElement | null>(null);
const editingElement = ref<HTMLElement | null>(null);
const editorRect = ref<DOMRect | null>(null);

// State
const showToolbar = ref(false);
const showColorPicker = ref(false);
const showFontSizePicker = ref(false);
const editingContent = ref('');
const currentFormat = ref<Record<string, string>>({});
const customColor = ref('#000000');
const customFontSize = ref('');
const isUpdatingContent = ref(false);

// Constants
const colors = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
  '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088',
  '#333333', '#666666', '#999999', '#cccccc', '#1e293b', '#475569',
  '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#f8fafc'
];

// Computed
const toolbarStyle = computed(() => {
  if (!editorRect.value) return {};
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth < 1024;
  
  // Responsive sizing
  const toolbarHeight = isMobile ? 60 : isTablet ? 55 : 50;
  const toolbarWidth = isMobile ? Math.min(viewportWidth - 20, 350) : 400;
  
  // Calculate ideal position
  let top = editorRect.value.top - toolbarHeight - 10;
  let left = editorRect.value.left;
  
  // Keep toolbar within viewport bounds
  if (top < 10) {
    // Position below element if not enough space above
    top = editorRect.value.bottom + 10;
  }
  
  if (left + toolbarWidth > viewportWidth - 10) {
    // Align to right edge if toolbar would go off screen
    left = viewportWidth - toolbarWidth - 10;
  }
  
  if (left < 10) {
    left = 10;
  }
  
  // Ensure toolbar doesn't go below viewport on mobile
  if (top + toolbarHeight > viewportHeight - 10) {
    top = Math.max(10, viewportHeight - toolbarHeight - 10);
  }
  
  return {
    top: `${top}px`,
    left: `${left}px`,
    maxWidth: `${viewportWidth - 20}px`,
    maxHeight: isMobile ? '40vh' : 'auto'
  };
});

const editorStyle = computed(() => {
  if (!editorRect.value) return {};
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minWidth = 300;
  const minHeight = 100;
  
  let width = Math.max(editorRect.value.width, minWidth);
  let height = Math.max(editorRect.value.height, minHeight);
  let left = editorRect.value.left;
  let top = editorRect.value.top;
  
  // Keep editor within viewport bounds
  if (left + width > viewportWidth - 20) {
    left = viewportWidth - width - 20;
  }
  
  if (left < 10) {
    left = 10;
  }
  
  if (top + height > viewportHeight - 20) {
    top = viewportHeight - height - 20;
  }
  
  if (top < 10) {
    top = 10;
  }
  
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`
  };
});

const contentStyle = computed(() => {
  const styles: Record<string, string> = {
    fontSize: currentFormat.value.fontSize || '16px',
    fontWeight: currentFormat.value.fontWeight || 'normal',
    fontStyle: currentFormat.value.fontStyle || 'normal',
    textDecoration: currentFormat.value.textDecoration || 'none',
    textAlign: currentFormat.value.textAlign || 'left',
    color: currentFormat.value.color || '#000000',
    outline: 'none',
    minHeight: '50px'
  };
  
  return styles;
});

// Watchers
watch(() => props.element, (newElement, oldElement) => {
  if (newElement && newElement !== oldElement) {
    startEditing(newElement);
  } else if (!newElement) {
    closeEditor();
  }
});

// Methods
function startEditing(element: HTMLElement) {
  editingElement.value = element;
  editorRect.value = element.getBoundingClientRect();
  editingContent.value = props.initialContent;
  
  // Initialize current format from element styles
  updateFormatFromElement(element);
  
  showToolbar.value = true;
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus();
      // Place cursor at the end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.value);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}

function closeEditor() {
  showToolbar.value = false;
  showColorPicker.value = false;
  editingElement.value = null;
  editorRect.value = null;
  emit('close');
}

function applyFormat(property: string, value: string) {
  if (!editorRef.value) return;
  
  // Save current selection
  const selection = window.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  
  // Update format state
  currentFormat.value[property] = value;
  
  // Apply style to editor
  editorRef.value.style[property as any] = value;
  
  // Restore selection
  if (range && selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  // Keep focus on editor
  editorRef.value.focus();
  
  // Emit real-time update
  emit('realtime-update', editingContent.value, currentFormat.value);
}

function handleContentChange(event: Event) {
  if (isUpdatingContent.value) return;
  
  const target = event.target as HTMLElement;
  const newContent = target.innerHTML;
  
  if (editingContent.value !== newContent) {
    editingContent.value = newContent;
    
    // Update format state based on current cursor position
    updateFormatFromSelection();
    
    // Emit real-time update to parent
    emit('realtime-update', editingContent.value, currentFormat.value);
  }
}

function handleKeydown(event: KeyboardEvent) {
  // Handle keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault();
        applyFormat('fontWeight', currentFormat.value.fontWeight === 'bold' ? 'normal' : 'bold');
        break;
      case 'i':
        event.preventDefault();
        applyFormat('fontStyle', currentFormat.value.fontStyle === 'italic' ? 'normal' : 'italic');
        break;
      case 'u':
        event.preventDefault();
        applyFormat('textDecoration', currentFormat.value.textDecoration === 'underline' ? 'none' : 'underline');
        break;
    }
  } else if (event.key === 'Escape') {
    closeEditor();
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    saveChanges();
  }
}

function handleBlur(event: FocusEvent) {
  // Don't close on blur if toolbar or dropdowns are being used
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (relatedTarget && (toolbarRef.value?.contains(relatedTarget) || relatedTarget.closest('.font-size-picker') || relatedTarget.closest('.color-picker'))) {
    return;
  }
  
  // Small delay to allow toolbar clicks to register
  setTimeout(() => {
    const activeEl = document.activeElement as HTMLElement;
    if (!toolbarRef.value?.contains(activeEl) && activeEl !== editorRef.value) {
      saveChanges();
    }
  }, 150);
}

function resetContent() {
  editingContent.value = props.initialContent;
  if (editorRef.value) {
    editorRef.value.innerHTML = props.initialContent;
  }
}

function applyCustomFontSize() {
  if (customFontSize.value) {
    applyFormat('fontSize', `${customFontSize.value}px`);
    customFontSize.value = '';
    showFontSizePicker.value = false;
  }
}

function updateFormatFromElement(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element);
  currentFormat.value = {
    fontSize: computedStyle.fontSize,
    fontWeight: normalizeFontWeight(computedStyle.fontWeight),
    fontStyle: computedStyle.fontStyle,
    textDecoration: normalizeTextDecoration(computedStyle.textDecoration),
    textAlign: computedStyle.textAlign || 'left',
    color: rgbToHex(computedStyle.color) || computedStyle.color
  };
  customColor.value = currentFormat.value.color || '#000000';
}

function updateFormatFromSelection() {
  if (!editorRef.value) return;
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  let node = range.startContainer;
  
  // Get the element node (not text node)
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement || node;
  }
  
  const element = node as HTMLElement;
  if (element && editorRef.value.contains(element)) {
    const computedStyle = window.getComputedStyle(element);
    currentFormat.value = {
      fontSize: computedStyle.fontSize,
      fontWeight: normalizeFontWeight(computedStyle.fontWeight),
      fontStyle: computedStyle.fontStyle,
      textDecoration: normalizeTextDecoration(computedStyle.textDecoration),
      textAlign: computedStyle.textAlign || 'left',
      color: rgbToHex(computedStyle.color) || computedStyle.color
    };
    customColor.value = currentFormat.value.color || '#000000';
  }
}

function normalizeFontWeight(weight: string): string {
  const numWeight = parseInt(weight);
  if (numWeight >= 600) return 'bold';
  return 'normal';
}

function normalizeTextDecoration(decoration: string): string {
  if (decoration.includes('underline')) return 'underline';
  return 'none';
}

function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb;
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function handleSelectionChange() {
  if (editorRef.value && document.activeElement === editorRef.value) {
    updateFormatFromSelection();
  }
}

function saveChanges() {
  const styles = { ...currentFormat.value };
  emit('save', editingContent.value, styles);
  closeEditor();
}

// Close on escape key and click outside
function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showToolbar.value) {
    closeEditor();
  }
}

function handleGlobalClick(event: MouseEvent) {
  // Close if clicking outside toolbar and editor
  const target = event.target as HTMLElement;
  if (showToolbar.value && 
      !toolbarRef.value?.contains(target) && 
      !editorRef.value?.contains(target) &&
      !target.closest('.font-size-picker') &&
      !target.closest('.color-picker')) {
    closeEditor();
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('selectionchange', handleSelectionChange);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  document.removeEventListener('click', handleGlobalClick);
  document.removeEventListener('selectionchange', handleSelectionChange);
});
</script>

<style scoped>
/* Ensure proper z-index layering */
.fixed {
  z-index: 50;
}

/* Smooth transitions and hover states */
.transition-colors {
  transition: all 0.2s ease;
}

/* Touch-friendly button sizing */
@media (max-width: 768px) {
  .fixed button {
    min-width: 44px !important;
    min-height: 44px !important;
    padding: 12px !important;
  }
  
  .color-picker {
    min-width: 280px !important;
  }
}

/* Content editor styles */
[contenteditable] {
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.5;
}

[contenteditable]:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

/* Enhanced color picker styles */
input[type="color"] {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  transition: transform 0.2s ease;
}

input[type="color"]:hover {
  transform: scale(1.05);
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 8px;
}

/* Dropdown animations and fixed sizing */
.font-size-picker {
  animation: dropdownFadeIn 0.2s ease;
  width: 180px !important;
  min-width: 180px !important;
  max-width: 180px !important;
}

.color-picker {
  animation: dropdownFadeIn 0.2s ease;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .fixed {
    border-width: 2px;
  }
  
  button:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .transition-colors,
  input[type="color"],
  .font-size-picker,
  .color-picker {
    transition: none;
    animation: none;
  }
}
</style>
