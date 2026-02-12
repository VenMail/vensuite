<template>
  <div class="relative inline-block">
    <!-- Main button -->
    <Button 
      :variant="showDropdown ? 'secondary' : 'outline'" 
      size="sm"
      class="pr-2"
      @click="handleAddSlide"
    >
      <Plus class="h-4 w-4 mr-1" />
      {{$t('Commons.button.add_slide')}}
    </Button>
    
    <!-- Dropdown arrow -->
    <Button
      variant="outline"
      size="sm"
      class="ml-[-1px] rounded-l-none border-l-0 pl-2 pr-2"
      @click="toggleDropdown"
    >
      <ChevronDown 
        class="h-4 w-4 transition-transform"
        :class="{ 'rotate-180': showDropdown }"
      />
    </Button>
    
    <!-- Dropdown menu -->
    <div
      v-if="showDropdown"
      class="absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[200px] max-h-[400px] overflow-y-auto"
      @click.stop
    >
      <div class="py-1">
        <!-- Theme-specific templates (if available) -->
        <template v-if="currentThemeTemplateKey && isThemeTemplateLoaded(currentThemeTemplateKey)">
          <div class="px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            🎯 {{ currentThemeLabel }} Templates
          </div>
          <button
            v-for="template in getTemplatesForTheme(currentThemeTemplateKey)"
            :key="template.id"
            class="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
            @click="handleAddThemeTemplate(template)"
          >
            <div class="w-8 h-6 rounded bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-xs">
              {{ template.icon }}
            </div>
            <div class="flex-1">
              <div class="font-medium text-purple-700 dark:text-purple-300">{{ template.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</div>
            </div>
          </button>
          
          <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
        </template>
        
        <!-- Most Used Templates -->
        <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {{$t('Commons.text.most_used')}}
        </div>
        <button
          v-for="templateId in mostUsedTemplates"
          :key="templateId"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          @click="handleAddSlideWithTemplate(getTemplateById(templateId)!)"
        >
          <div class="w-8 h-6 rounded bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs">
            {{ getTemplateIcon(templateId) }}
          </div>
          <div class="flex-1">
            <div class="font-medium">{{ getTemplateById(templateId)?.name }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ getTemplateById(templateId)?.description }}</div>
          </div>
        </button>
        
        <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
        
        <!-- Template categories -->
        <template v-for="category in templateCategories" :key="category.key">
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {{ category.name }}
          </div>
          
          <!-- Templates in category -->
          <button
            v-for="template in categoryTemplates(category.key)"
            :key="template.id"
            class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            @click="handleAddSlideWithTemplate(template)"
          >
            <div class="w-8 h-6 rounded bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs">
              {{ getTemplateIcon(template.id) }}
            </div>
            <div class="flex-1">
              <div class="font-medium">{{ template.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</div>
            </div>
          </button>
        </template>
      </div>
    </div>
    
    <!-- Click outside to close -->
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-40"
      @click="closeDropdown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Plus, ChevronDown } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { SLIDE_TEMPLATES, type SlideTemplate, getTemplateById } from '@/utils/slidevMarkdown';
import { useThemeTemplates } from '@/composables/useThemeTemplates';

const emit = defineEmits<{
  (e: 'add-slide'): void;
  (e: 'add-slide-with-template', template: SlideTemplate): void;
}>();

const props = defineProps<{
  currentTheme?: string;
}>();

const showDropdown = ref(false);

// Theme templates composable
const { 
  loadThemeTemplates, 
  getTemplatesForTheme, 
  isThemeTemplateLoaded 
} = useThemeTemplates();

// Map theme values to template file prefixes and labels
const themeTemplateMap: Record<string, { key: string; label: string }> = {
  'venmail-pitch': { key: 'venmail', label: 'Venmail Pitch' },
  'academic': { key: 'academic', label: 'Academic' },
  'solutions': { key: 'solutions', label: 'Solutions' },
};

const currentThemeTemplateKey = computed(() => {
  return themeTemplateMap[props.currentTheme || 'venmail-pitch']?.key || 'venmail';
});

const currentThemeLabel = computed(() => {
  return themeTemplateMap[props.currentTheme || 'venmail-pitch']?.label || 'Theme';
});

// Load theme templates when component mounts or theme changes
onMounted(async () => {
  const key = currentThemeTemplateKey.value;
  if (key) {
    await loadThemeTemplates(key);
  }
});

watch(() => props.currentTheme, async () => {
  const key = currentThemeTemplateKey.value;
  if (key) {
    await loadThemeTemplates(key);
  }
});

const templateCategories = [
  { key: 'title', name: 'Title Slides' },
  { key: 'content', name: 'Content' },
  { key: 'layout', name: 'Layouts' },
  { key: 'media', name: 'Media' },
  { key: 'data', name: 'Data & Code' },
  { key: 'end', name: 'Closing' }
];

const mostUsedTemplates = [
  'default',    // Standard content slide
  'cover',      // Title slide
  'two-cols',   // Comparison
  'image',      // Full image
  'quote'       // Quote
];

const categoryTemplates = (categoryKey: string) => {
  return SLIDE_TEMPLATES.filter(t => t.category === categoryKey);
};

const getTemplateIcon = (templateId: string): string => {
  const icons: Record<string, string> = {
    'cover': '📄',
    'intro': '👤',
    'section': '📑',
    'default': '📝',
    'center': '🎯',
    'statement': '💬',
    'quote': '❝',
    'fact': '📊',
    'two-cols': '⚖️',
    'two-cols-header': '📋',
    'grid-2x2': '⊞',
    'image': '🖼️',
    'image-left': '🖼️',
    'image-right': '🖼️',
    'video': '🎬',
    'code': '💻',
    'table': '📊',
    'mermaid-flowchart': '🔄',
    'mermaid-sequence': '🔗',
    'mermaid-pie': '🥧',
    'mermaid-timeline': '📅',
    'end': '🙏',
    'cta': '👉'
  };
  return icons[templateId] || '📄';
};

const handleAddSlide = () => {
  emit('add-slide');
  closeDropdown();
};

const handleAddSlideWithTemplate = (template: SlideTemplate) => {
  emit('add-slide-with-template', template);
  closeDropdown();
};

const handleAddThemeTemplate = (themeTemplate: any) => {
  // Convert theme template to SlideTemplate format
  const slideTemplate: SlideTemplate = {
    id: themeTemplate.id,
    name: themeTemplate.name,
    description: themeTemplate.description,
    category: themeTemplate.category as any,
    layout: themeTemplate.frontmatter?.layout || 'default',
    content: themeTemplate.content,
    frontmatter: themeTemplate.frontmatter
  };
  emit('add-slide-with-template', slideTemplate);
  closeDropdown();
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
  showDropdown.value = false;
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!showDropdown.value) return;
  
  if (event.key === 'Escape') {
    closeDropdown();
  }
};

// Register keyboard listener
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>
