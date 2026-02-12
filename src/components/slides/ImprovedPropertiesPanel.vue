<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ showTemplates ? 'Templates' : 'Layout & Style' }}
        </h3>
        <div class="flex items-center gap-1">
          <button
            @click="showTemplates = !showTemplates"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            :class="showTemplates ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
            :title="showTemplates ? 'Show Layout' : 'Show Templates'"
          >
            <Layout class="h-4 w-4 text-gray-500" />
          </button>
          <button
            @click="$emit('toggle-panel')"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Toggle Properties Panel"
          >
            <Settings class="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
      <!-- Templates View -->
      <template v-if="showTemplates">
        <div class="space-y-4">
          <!-- Venmail Pitch Deck -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div class="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Presentation class="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Venmail Pitch Deck</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Complete presentation with animations</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                <span class="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">7 slides</span>
                <span class="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">Pre-wired motion</span>
                <span class="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">Business</span>
              </div>
            </div>
            <div class="p-2">
              <button
                @click="applyVenmailTemplate"
                class="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Plus class="h-4 w-4" />
                Use This Template
              </button>
            </div>
          </div>

          <!-- Quick Templates -->
          <div>
            <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Quick Templates</h4>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="template in quickTemplates"
                :key="template.id"
                @click="emit('apply-template', template)"
                class="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div class="w-full h-12 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded mb-2 group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800 dark:group-hover:to-blue-700 transition-colors"></div>
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ template.name }}</div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400">{{ template.description }}</div>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Layout & Style View -->
      <template v-else>
        <!-- Current Theme Display -->
        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Current Theme</span>
            <button
              @click="showThemeSelector = !showThemeSelector"
              class="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Change
            </button>
          </div>
          <div class="flex items-center gap-2">
            <div 
              class="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600"
              :style="{ background: currentThemePreview }"
            ></div>
            <div>
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{{ currentTheme }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ getThemeDescription(currentTheme) }}</div>
            </div>
          </div>
        </div>

        <!-- Theme Selector (Hidden by default) -->
        <div v-if="showThemeSelector" class="space-y-2">
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400">Choose Theme</h4>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="theme in availableThemes"
              :key="theme.value"
              @click="selectTheme(theme.value)"
              class="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              :class="currentTheme === theme.value ? 'ring-2 ring-blue-500' : ''"
            >
              <div class="flex items-center gap-2">
                <div 
                  class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                  :style="{ background: theme.preview }"
                ></div>
                <div class="text-left">
                  <div class="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{{ theme.value }}</div>
                  <div class="text-[10px] text-gray-500 dark:text-gray-400">{{ theme.category }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Layout Selector with Visual Preview -->
        <div>
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Slide Layout</h4>
          <div class="space-y-2">
            <button
              v-for="layout in layoutsWithPreview"
              :key="layout.value"
              @click="selectLayout(layout.value)"
              class="w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              :class="currentLayout === layout.value ? 'ring-2 ring-blue-500' : ''"
            >
              <div class="flex items-center gap-3">
                <!-- Layout Preview -->
                <div class="w-12 h-8 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0">
                  <div class="p-1 h-full flex items-center justify-center">
                    <div class="w-full h-full flex" :class="layout.previewClass">
                      <div v-for="box in layout.boxes" :key="box" class="bg-gray-300 dark:bg-gray-600 rounded-sm" :class="box"></div>
                    </div>
                  </div>
                </div>
                <!-- Layout Info -->
                <div class="flex-1 text-left">
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ layout.label }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ layout.description }}</div>
                </div>
                <!-- Check indicator -->
                <div v-if="currentLayout === layout.value" class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check class="h-3 w-3 text-white" />
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Background Options -->
        <div>
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Background</h4>
          <div class="space-y-2">
            <!-- Color Picker -->
            <div class="flex gap-2">
              <input
                :value="background"
                type="color"
                class="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                @input="emit('update:background', ($event.target as HTMLInputElement).value)"
              />
              <input
                :value="background"
                type="text"
                class="flex-1 text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="#ffffff"
                @input="emit('update:background', ($event.target as HTMLInputElement).value)"
              />
            </div>
            
            <!-- Gradient Presets -->
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="gradient in gradientPresets"
                :key="gradient.name"
                @click="emit('update:background', gradient.value)"
                class="w-full h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-105 transition-transform"
                :style="{ background: gradient.value }"
                :title="gradient.name"
              ></button>
            </div>
          </div>
        </div>

        <!-- Transition Effects -->
        <div>
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Slide Transition</h4>
          <select
            :value="transition"
            class="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            @change="emit('update:transition', ($event.target as HTMLSelectElement).value)"
          >
            <option value="slide-left">Slide Left</option>
            <option value="slide-right">Slide Right</option>
            <option value="slide-up">Slide Up</option>
            <option value="slide-down">Slide Down</option>
            <option value="fade">Fade</option>
            <option value="fade-out">Fade Out</option>
            <option value="venmail3d">Venmail 3D</option>
            <option value="none">None</option>
          </select>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings, Layout, Presentation, Plus, Check } from 'lucide-vue-next';
import { SLIDE_TEMPLATES, type SlideTemplate } from '@/utils/slidevMarkdown';

interface Props {
  layout: string;
  background: string;
  transition: string;
  currentTheme: string;
  currentLayout: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle-panel'): void;
  (e: 'update:layout', value: string): void;
  (e: 'update:background', value: string): void;
  (e: 'update:transition', value: string): void;
  (e: 'update:theme', value: string): void;
  (e: 'apply-template', template: SlideTemplate): void;
}>();

// UI State
const showTemplates = ref(false);
const showThemeSelector = ref(false);

// Available themes with previews
const availableThemes = [
  { value: 'venmail-pitch', preview: 'linear-gradient(135deg, #0f172a 0%, #8B5CF6 50%, #10B981 100%)', category: 'Pitch Deck' },
  { value: 'academic', preview: 'linear-gradient(135deg, #1B2A4A 0%, #C9A84C 50%, #FAF7F0 100%)', category: 'Academic' },
  { value: 'solutions', preview: 'linear-gradient(135deg, #1A1A2E 0%, #00D4FF 50%, #7C5CFC 100%)', category: 'Proposal / Demo' },
];

// Layouts with visual previews
const layoutsWithPreview = computed(() => [
  {
    value: 'default',
    label: 'Default',
    description: 'Standard centered layout',
    previewClass: 'justify-center items-center',
    boxes: ['w-3/4 h-3/4']
  },
  {
    value: 'cover',
    label: 'Cover',
    description: 'Full screen hero layout',
    previewClass: 'justify-center items-center',
    boxes: ['w-full h-full']
  },
  {
    value: 'center',
    label: 'Center',
    description: 'Content centered on screen',
    previewClass: 'justify-center items-center',
    boxes: ['w-2/3 h-2/3']
  },
  {
    value: 'two-cols',
    label: 'Two Columns',
    description: 'Side by side content',
    previewClass: 'justify-between items-center',
    boxes: ['w-5/12 h-3/4', 'w-5/12 h-3/4']
  },
  {
    value: 'image-right',
    label: 'Image Right',
    description: 'Text with image on right',
    previewClass: 'justify-between items-center',
    boxes: ['w-1/2 h-3/4', 'w-5/12 h-3/4']
  },
]);

// Gradient presets
const gradientPresets = [
  { name: 'Sunset', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
];

// Quick templates
const quickTemplates = computed(() => [
  ...SLIDE_TEMPLATES.filter(t => t.category === 'title').slice(0, 2),
  ...SLIDE_TEMPLATES.filter(t => t.category === 'content').slice(0, 2),
]);

// Computed properties
const currentThemePreview = computed(() => {
  const theme = availableThemes.find(t => t.value === props.currentTheme);
  return theme?.preview || availableThemes[0].preview;
});

// Methods
function selectTheme(theme: string) {
  emit('update:theme', theme);
  showThemeSelector.value = false;
}

function selectLayout(layout: string) {
  emit('update:layout', layout);
}

function applyVenmailTemplate() {
  // This would apply the complete Venmail pitch deck
  window.location.href = '/slides/new?template=venmail-pitch-deck';
}

function getThemeDescription(theme: string): string {
  const themeObj = availableThemes.find(t => t.value === theme);
  return themeObj?.category || 'Custom theme';
}
</script>
