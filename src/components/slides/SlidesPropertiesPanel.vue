<template>
  <div class="w-96 max-w-96 min-w-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">Slide Properties</h3>
    </div>
    <div class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
      <!-- Layout -->
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Layout</label>
        <select
          :value="layout"
          class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
          @change="emit('update:layout', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="l in layouts" :key="l.value" :value="l.value">
            {{ l.label }}
          </option>
        </select>
      </div>

      <!-- Background -->
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background</label>
        <div class="flex gap-2">
          <input
            :value="background"
            type="color"
            class="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            @input="emit('update:background', ($event.target as HTMLInputElement).value)"
          />
          <input
            :value="background"
            type="text"
            class="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            placeholder="#ffffff"
            @input="emit('update:background', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Transition -->
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transition</label>
        <select
          :value="transition"
          class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
          @change="emit('update:transition', ($event.target as HTMLSelectElement).value)"
        >
          <option value="slide-left">Slide Left</option>
          <option value="slide-right">Slide Right</option>
          <option value="slide-up">Slide Up</option>
          <option value="fade">Fade</option>
          <option value="fade-out">Fade Out</option>
          <option value="none">None</option>
        </select>
      </div>

      <!-- Class -->
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CSS Class</label>
        <input
          :value="slideClass"
          type="text"
          class="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
          placeholder="e.g., text-center"
          @input="emit('update:class', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Quick Templates -->
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Quick Templates</label>
        
        <!-- Template Categories -->
        <div class="space-y-3">
          <!-- Title Templates -->
          <div>
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Title</span>
            <div class="grid grid-cols-2 gap-1 mt-1">
              <button
                v-for="template in titleTemplates"
                :key="template.id"
                class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                :title="template.description"
                @click="emit('apply-template', template)"
              >
                {{ template.name }}
              </button>
            </div>
          </div>
          
          <!-- Content Templates -->
          <div>
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Content</span>
            <div class="grid grid-cols-2 gap-1 mt-1">
              <button
                v-for="template in contentTemplates"
                :key="template.id"
                class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                :title="template.description"
                @click="emit('apply-template', template)"
              >
                {{ template.name }}
              </button>
            </div>
          </div>
          
          <!-- Layout Templates -->
          <div>
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Layout</span>
            <div class="grid grid-cols-2 gap-1 mt-1">
              <button
                v-for="template in layoutTemplates"
                :key="template.id"
                class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                :title="template.description"
                @click="emit('apply-template', template)"
              >
                {{ template.name }}
              </button>
            </div>
          </div>
          
          <!-- Data Templates -->
          <div>
            <span class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Data & Diagrams</span>
            <div class="grid grid-cols-2 gap-1 mt-1">
              <button
                v-for="template in dataTemplates"
                :key="template.id"
                class="p-1.5 text-[10px] text-left bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                :title="template.description"
                @click="emit('apply-template', template)"
              >
                {{ template.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Theme Colors Preview -->
      <div v-if="themeColors">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Theme Colors</label>
        <div class="flex gap-1 flex-wrap">
          <div 
            class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" 
            :style="{ background: themeColors.primary }"
            title="Primary"
            @click="emit('update:background', themeColors.primary)"
          />
          <div 
            class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" 
            :style="{ background: themeColors.secondary }"
            title="Secondary"
            @click="emit('update:background', themeColors.secondary)"
          />
          <div 
            class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" 
            :style="{ background: themeColors.accent }"
            title="Accent"
            @click="emit('update:background', themeColors.accent)"
          />
          <div 
            class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" 
            :style="{ background: themeColors.background }"
            title="Background"
            @click="emit('update:background', themeColors.background)"
          />
          <div 
            class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600" 
            :style="{ background: themeColors.text }"
            title="Text"
          />
        </div>
        <p v-if="themeDescription" class="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
          {{ themeDescription }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 
  SLIDEV_LAYOUTS, 
  SLIDE_TEMPLATES,
  type SlideTemplate,
  type ThemeColors
} from '@/utils/slidevMarkdown';

interface Props {
  layout: string;
  background: string;
  transition: string;
  slideClass: string;
  themeColors?: ThemeColors;
  themeDescription?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:layout', value: string): void;
  (e: 'update:background', value: string): void;
  (e: 'update:transition', value: string): void;
  (e: 'update:class', value: string): void;
  (e: 'apply-template', template: SlideTemplate): void;
}>();

const layouts = SLIDEV_LAYOUTS;

const titleTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'title').slice(0, 4)
);

const contentTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'content').slice(0, 4)
);

const layoutTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'layout').slice(0, 4)
);

const dataTemplates = computed(() => 
  SLIDE_TEMPLATES.filter(t => t.category === 'data').slice(0, 4)
);
</script>
