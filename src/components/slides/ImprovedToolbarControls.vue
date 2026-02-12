<template>
  <div class="flex items-center gap-3">
    <!-- Theme Selector -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" class="min-w-[140px] justify-start">
          <Palette class="h-4 w-4 mr-2" />
          {{ currentThemeLabel }}
          <ChevronDown class="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-80" align="start">
        <div class="p-2">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Choose Theme</div>
          <div class="space-y-1">
            <DropdownMenuItem
              v-for="theme in themes"
              :key="theme.value"
              @click="selectTheme(theme.value)"
              class="flex items-center gap-3 p-2 cursor-pointer"
              :class="{ 'bg-blue-50 dark:bg-blue-900/20': currentTheme === theme.value }"
            >
              <div 
                class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                :style="{ background: theme.preview }"
              ></div>
              <div class="flex-1">
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{{ theme.value }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ theme.category }}</div>
              </div>
              <Check v-if="currentTheme === theme.value" class="h-4 w-4 text-blue-500" />
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Layout Selector -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" class="min-w-[140px] justify-start">
          <Layout class="h-4 w-4 mr-2" />
          {{ currentLayoutLabel }}
          <ChevronDown class="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-80" align="start">
        <div class="p-2">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Slide Layout</div>
          <div class="space-y-1">
            <DropdownMenuItem
              v-for="layout in layouts"
              :key="layout.value"
              @click="selectLayout(layout.value)"
              class="flex items-center gap-3 p-2 cursor-pointer"
              :class="{ 'bg-blue-50 dark:bg-blue-900/20': currentLayout === layout.value }"
            >
              <!-- Layout Preview -->
              <div class="w-12 h-8 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0">
                <div class="p-1 h-full flex items-center justify-center">
                  <div class="w-full h-full flex" :class="layout.previewClass">
                    <div v-for="box in layout.boxes" :key="box" class="bg-gray-300 dark:bg-gray-600 rounded-sm" :class="box"></div>
                  </div>
                </div>
              </div>
              <!-- Layout Info -->
              <div class="flex-1">
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ layout.label }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ layout.description }}</div>
              </div>
              <!-- Check indicator -->
              <Check v-if="currentLayout === layout.value" class="h-4 w-4 text-blue-500" />
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Palette, Layout, ChevronDown, Check } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  currentTheme: string;
  currentLayout: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:theme', value: string): void;
  (e: 'update:layout', value: string): void;
}>();

// Available themes with previews — 3 premium themes
const themes = [
  { value: 'venmail-pitch', preview: 'linear-gradient(135deg, #0f172a 0%, #8B5CF6 50%, #10B981 100%)', category: 'Pitch Deck' },
  { value: 'academic', preview: 'linear-gradient(135deg, #1B2A4A 0%, #C9A84C 50%, #FAF7F0 100%)', category: 'Academic' },
  { value: 'solutions', preview: 'linear-gradient(135deg, #1A1A2E 0%, #00D4FF 50%, #7C5CFC 100%)', category: 'Proposal / Demo' },
];

// Layouts with visual previews
const layouts = [
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
];

// Computed properties
const currentThemeLabel = computed(() => {
  const theme = themes.find(t => t.value === props.currentTheme);
  return theme ? theme.category : 'Venmail Pitch';
});

const currentLayoutLabel = computed(() => {
  const layout = layouts.find(l => l.value === props.currentLayout);
  return layout ? layout.label : 'Default';
});

// Methods
function selectTheme(theme: string) {
  emit('update:theme', theme);
}

function selectLayout(layout: string) {
  emit('update:layout', layout);
}
</script>
