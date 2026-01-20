<template>
  <div class="w-96 max-w-96 min-w-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
          {{ panelTitle }}
        </h3>
        <button
          @click="$emit('toggle-panel')"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Toggle Properties Panel"
        >
          <Settings class="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
      <!-- Slide Properties (shown when no element is selected) -->
      <template v-if="!selectedElement && !markdownElement">
        <div class="space-y-4">
          <!-- Slide Layout -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Layout class="h-3 w-3 inline mr-1" />
              Layout
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="layoutOption in layoutOptions"
                :key="layoutOption.value"
                class="p-2 text-xs border rounded transition-colors"
                :class="layout === layoutOption.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="updateLayout(layoutOption.value)"
                :title="layoutOption.description"
              >
                <component :is="layoutOption.icon" class="h-4 w-4 mx-auto mb-1" />
                <div>{{ layoutOption.label }}</div>
              </button>
            </div>
          </div>

          <!-- Slide Background -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Palette class="h-3 w-3 inline mr-1" />
              Background
            </label>
            <div class="space-y-2">
              <!-- Color Picker -->
              <div class="flex items-center gap-2">
                <input
                  :value="slideBackground"
                  type="color"
                  class="h-8 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  @input="updateBackground(($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="slideBackground"
                  type="text"
                  placeholder="#ffffff"
                  class="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  @input="updateBackground(($event.target as HTMLInputElement).value)"
                />
              </div>
              
              <!-- Preset Colors -->
              <div class="grid grid-cols-8 gap-1">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  :style="{ backgroundColor: color }"
                  @click="updateBackground(color)"
                  :title="color"
                />
              </div>
              
              <!-- Gradient Options -->
              <div class="flex items-center gap-2">
                <button
                  class="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="applyGradient('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')"
                >
                  Purple Gradient
                </button>
                <button
                  class="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="applyGradient('linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')"
                >
                  Pink Gradient
                </button>
                <button
                  class="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="applyGradient('linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)')"
                >
                  Blue Gradient
                </button>
              </div>
            </div>
          </div>

          <!-- Slide Transition -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Zap class="h-3 w-3 inline mr-1" />
              Transition
            </label>
            <select
              :value="transition"
              class="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              @change="updateTransition(($event.target as HTMLSelectElement).value)"
            >
              <option value="">None</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="slide-up">Slide Up</option>
              <option value="slide-down">Slide Down</option>
              <option value="fade">Fade</option>
              <option value="scale">Scale</option>
              <option value="flip">Flip</option>
            </select>
          </div>

          <!-- Slide Animation -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Sparkles class="h-3 w-3 inline mr-1" />
              Animation
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="animationEnabled"
                  class="rounded"
                  @change="toggleAnimation(($event.target as HTMLInputElement).checked)"
                />
                <label class="text-xs">Enable animations</label>
              </div>
              
              <div v-if="animationEnabled" class="space-y-2">
                <select
                  :value="animationType"
                  class="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  @change="updateAnimationType(($event.target as HTMLSelectElement).value)"
                >
                  <option value="fadeIn">Fade In</option>
                  <option value="slideInFromLeft">Slide from Left</option>
                  <option value="slideInFromRight">Slide from Right</option>
                  <option value="slideInFromTop">Slide from Top</option>
                  <option value="slideInFromBottom">Slide from Bottom</option>
                  <option value="zoomIn">Zoom In</option>
                  <option value="rotateIn">Rotate In</option>
                </select>
                
                <div>
                  <label class="text-xs text-gray-600 dark:text-gray-400">Duration (ms)</label>
                  <input
                    :value="animationDuration"
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    class="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    @input="updateAnimationDuration(parseInt(($event.target as HTMLInputElement).value))"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Slide Metadata -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Info class="h-3 w-3 inline mr-1" />
              Slide Info
            </label>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">Slide Number:</span>
                <span>{{ currentSlideIndex + 1 }} / {{ totalSlides }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Word Count:</span>
                <span>{{ slideWordCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Character Count:</span>
                <span>{{ slideCharacterCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Line Count:</span>
                <span>{{ slideLineCount }}</span>
              </div>
            </div>
          </div>

          <!-- Slide Timing -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <Clock class="h-3 w-3 inline mr-1" />
              Timing
            </label>
            <div class="space-y-2">
              <div>
                <label class="text-xs text-gray-600 dark:text-gray-400">Auto-advance (seconds)</label>
                <input
                  :value="autoAdvanceTime"
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  placeholder="0 (manual)"
                  class="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  @input="updateAutoAdvance(parseInt(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="skipInPresentation"
                  class="rounded"
                  @change="updateSkipInPresentation(($event.target as HTMLInputElement).checked)"
                />
                <label class="text-xs">Skip in presentation mode</label>
              </div>
            </div>
          </div>

          <!-- Template Application -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <FileText class="h-3 w-3 inline mr-1" />
              Templates
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="template in slideTemplates"
                :key="template.name"
                class="p-2 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                @click="applyTemplate(template)"
              >
                <component :is="template.icon" class="h-4 w-4 mx-auto mb-1" />
                <div>{{ template.name }}</div>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Element Properties (shown when element is selected) -->
      <template v-else-if="selectedElement">
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Element Type</label>
            <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md">
              {{ selectedElementType }}
            </div>
          </div>

          <!-- Element Style Controls -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Styles</label>
            <div class="space-y-2">
              <!-- Font Size -->
              <div>
                <label class="text-xs text-gray-500">Font Size</label>
                <input
                  :value="getElementStyle('fontSize')"
                  type="text"
                  placeholder="16px"
                  class="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  @input="updateElementStyle('fontSize', ($event.target as HTMLInputElement).value)"
                />
              </div>
              
              <!-- Color -->
              <div>
                <label class="text-xs text-gray-500">Color</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="getElementStyle('color')"
                    type="color"
                    class="h-6 w-8 rounded border border-gray-300 dark:border-gray-600"
                    @input="updateElementStyle('color', ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    :value="getElementStyle('color')"
                    type="text"
                    placeholder="#000000"
                    class="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    @input="updateElementStyle('color', ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
              
              <!-- Background Color -->
              <div>
                <label class="text-xs text-gray-500">Background</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="getElementStyle('backgroundColor')"
                    type="color"
                    class="h-6 w-8 rounded border border-gray-300 dark:border-gray-600"
                    @input="updateElementStyle('backgroundColor', ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    :value="getElementStyle('backgroundColor')"
                    type="text"
                    placeholder="#ffffff"
                    class="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    @input="updateElementStyle('backgroundColor', ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Clear Selection -->
          <button
            @click="$emit('clear-selection')"
            class="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </template>

      <!-- Markdown Element Properties -->
      <template v-else-if="markdownElement">
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Element Type</label>
            <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md capitalize">
              {{ markdownElement.type }}
              <span v-if="markdownElement.level" class="text-xs text-gray-500 ml-1">({{ markdownElement.level }})</span>
              <span v-if="markdownElement.language" class="text-xs text-gray-500 ml-1">({{ markdownElement.language }})</span>
            </div>
          </div>

          <!-- Content Preview -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Content</label>
            <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md max-h-32 overflow-y-auto font-mono text-xs">
              {{ markdownElement.content.substring(0, 200) }}{{ markdownElement.content.length > 200 ? '...' : '' }}
            </div>
          </div>

          <!-- Position Info -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Position</label>
            <div class="text-sm px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md">
              Line: {{ markdownElement.startLine + 1 }}{{ markdownElement.endLine > markdownElement.startLine ? `-${markdownElement.endLine + 1}` : '' }}
            </div>
          </div>

          <!-- Element-specific controls -->
          <template v-if="markdownElement.type === 'heading'">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Heading Level</label>
              <div class="flex gap-1">
                <button
                  v-for="level in 6"
                  :key="level"
                  class="flex-1 px-2 py-1.5 text-xs rounded border transition-colors"
                  :class="markdownElement.level === level 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="$emit('update-markdown-element', { ...markdownElement, level })"
                >
                  H{{ level }}
                </button>
              </div>
            </div>
          </template>

          <template v-if="markdownElement.type === 'mermaid' || markdownElement.type === 'code'">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scale</label>
              <div class="space-y-2">
                <input
                  :value="componentScale"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  class="w-full"
                  @input="$emit('update-component-scale', parseFloat(($event.target as HTMLInputElement).value))"
                />
                <div class="flex justify-between text-xs text-gray-500">
                  <span>50%</span>
                  <span class="font-medium">{{ Math.round(componentScale * 100) }}%</span>
                  <span>200%</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Clear Markdown Element -->
          <button
            @click="$emit('clear-markdown-element')"
            class="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 
  Layout, Palette, Zap, Sparkles, Info, Clock, FileText, Settings,
  Square, Columns, AlignLeft, AlignRight, AlignJustify,
  AlignCenter
} from 'lucide-vue-next';
import type { MarkdownElement } from '@/utils/markdownElementDetector';

interface SlideTemplate {
  name: string;
  icon: any;
  data: any;
}

interface Props {
  layout?: string;
  slideBackground?: string;
  transition?: string;
  selectedElement?: HTMLElement | null;
  selectedElementType?: string;
  markdownElement?: MarkdownElement | null;
  componentScale?: number;
  currentSlideIndex?: number;
  totalSlides?: number;
  slideContent?: string;
  animationEnabled?: boolean;
  animationType?: string;
  animationDuration?: number;
  autoAdvanceTime?: number;
  skipInPresentation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default',
  slideBackground: '#ffffff',
  transition: '',
  componentScale: 1,
  currentSlideIndex: 0,
  totalSlides: 1,
  slideContent: '',
  animationEnabled: false,
  animationType: 'fadeIn',
  animationDuration: 500,
  autoAdvanceTime: 0,
  skipInPresentation: false
});

const emit = defineEmits<{
  (e: 'toggle-panel'): void;
  (e: 'update-layout', value: string): void;
  (e: 'update-background', value: string): void;
  (e: 'update-transition', value: string): void;
  (e: 'apply-template', template: SlideTemplate): void;
  (e: 'update-element-style', property: string, value: string): void;
  (e: 'update-component-scale', scale: number): void;
  (e: 'clear-selection'): void;
  (e: 'update-markdown-element', element: MarkdownElement): void;
  (e: 'clear-markdown-element'): void;
  (e: 'toggle-animation', enabled: boolean): void;
  (e: 'update-animation-type', type: string): void;
  (e: 'update-animation-duration', duration: number): void;
  (e: 'update-auto-advance', time: number): void;
  (e: 'update-skip-in-presentation', skip: boolean): void;
}>();

// Computed properties
const panelTitle = computed(() => {
  if (props.markdownElement) return 'Markdown Element';
  if (props.selectedElement) return 'Element Properties';
  return 'Slide Properties';
});

const slideWordCount = computed(() => {
  if (!props.slideContent) return 0;
  return props.slideContent.split(/\s+/).filter(word => word.length > 0).length;
});

const slideCharacterCount = computed(() => {
  return props.slideContent.length;
});

const slideLineCount = computed(() => {
  if (!props.slideContent) return 0;
  return props.slideContent.split('\n').length;
});

// Layout options
const layoutOptions = [
  { value: 'default', label: 'Default', icon: Square, description: 'Standard slide layout' },
  { value: 'center', label: 'Center', icon: AlignCenter, description: 'Centered content' },
  { value: 'columns', label: 'Columns', icon: Columns, description: 'Two column layout' },
  { value: 'left', label: 'Left', icon: AlignLeft, description: 'Left aligned' },
  { value: 'right', label: 'Right', icon: AlignRight, description: 'Right aligned' },
  { value: 'justify', label: 'Justify', icon: AlignJustify, description: 'Justified text' }
];

// Preset colors
const presetColors = [
  '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db',
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

// Slide templates
const slideTemplates: SlideTemplate[] = [
  { name: 'Title', icon: FileText, data: { type: 'title' } },
  { name: 'Content', icon: Layout, data: { type: 'content' } },
  { name: 'Two Column', icon: Columns, data: { type: 'two-column' } },
  { name: 'Quote', icon: FileText, data: { type: 'quote' } }
];

// Methods
function updateLayout(value: string) {
  emit('update-layout', value);
}

function updateBackground(value: string) {
  emit('update-background', value);
}

function applyGradient(gradient: string) {
  emit('update-background', gradient);
}

function updateTransition(value: string) {
  emit('update-transition', value);
}

function applyTemplate(template: SlideTemplate) {
  emit('apply-template', template);
}

function getElementStyle(property: string): string {
  if (!props.selectedElement) return '';
  const styles = getComputedStyle(props.selectedElement);
  return styles.getPropertyValue(property);
}

function updateElementStyle(property: string, value: string) {
  if (!props.selectedElement) return;
  props.selectedElement.style[property as any] = value;
}

function toggleAnimation(enabled: boolean) {
  emit('toggle-animation', enabled);
}

function updateAnimationType(type: string) {
  emit('update-animation-type', type);
}

function updateAnimationDuration(duration: number) {
  emit('update-animation-duration', duration);
}

function updateAutoAdvance(time: number) {
  emit('update-auto-advance', time);
}

function updateSkipInPresentation(skip: boolean) {
  emit('update-skip-in-presentation', skip);
}
</script>
