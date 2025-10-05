<template>
  <div class="slides-toolbar bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm" :class="{ 'opacity-90': !isExpanded }">
    <div class="flex flex-wrap items-center gap-3 px-5 py-3">
      <button
        class="slides-toolbar__toggle bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white rounded-full p-2 shadow-md hover:shadow-lg transition-transform"
        :class="{ 'rotate-180': !isExpanded }"
        :title="isExpanded ? 'Collapse toolbar' : 'Expand toolbar'"
        @click="toggleExpanded"
      >
        <ChevronDown class="h-4 w-4" />
      </button>

      <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />

      <div class="flex items-center gap-2">
        <button
          :class="buttonClass"
          title="New slide"
          @click="emitAdd()"
        >
          <Plus class="h-4 w-4" />
        </button>
        <DropdownMenu v-if="templates.length > 1">
          <DropdownMenuTrigger as-child>
            <button
              :class="buttonClass"
              title="Choose template"
            >
              <ChevronDown class="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="min-w-[220px]">
            <DropdownMenuItem
              v-for="template in templates"
              :key="template.slug"
              @click="selectTemplate(template.slug)"
            >
              <Check class="mr-2 h-4 w-4" :class="template.slug === selectedTemplateSlug ? 'opacity-100' : 'opacity-0'" />
              <div class="flex flex-col">
                <span class="text-sm font-medium">{{ template.title }}</span>
                <span v-if="template.description" class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          :class="buttonClass"
          :disabled="!activePageId"
          title="Duplicate slide"
          @click="emitDuplicate"
        >
          <Copy class="h-4 w-4" />
        </button>
        <button
          :class="[buttonClass, 'text-red-500 hover:text-red-600']"
          :disabled="pages.length <= 1 || !activePageId"
          title="Delete slide"
          @click="emitDelete"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>

      <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />

      <div class="flex items-center gap-2">
        <button
          :class="buttonClass"
          :disabled="activeIndex <= 0"
          title="Move up"
          @click="emitMove('up')"
        >
          <ArrowUp class="h-4 w-4" />
        </button>
        <button
          :class="buttonClass"
          :disabled="activeIndex === pages.length - 1 || activeIndex === -1"
          title="Move down"
          @click="emitMove('down')"
        >
          <ArrowDown class="h-4 w-4" />
        </button>
        <div class="text-sm font-medium text-gray-600 dark:text-gray-300" v-if="activeIndex !== -1">
          Slide {{ activeIndex + 1 }} of {{ pages.length }}
        </div>
      </div>

      <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />

      <div class="flex items-center gap-2" v-if="isExpanded">
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>Grid</span>
          <input
            :class="numberInputClass"
            type="number"
            min="5"
            max="200"
            step="1"
            :value="localGridSize"
            @input="onGridInput"
          />
        </label>
        <label :class="switchLabelClass">
          <input class="h-4 w-4 accent-purple-600" type="checkbox" :checked="snapSettings.showGrid" @change="toggleSnap('showGrid', $event)" />
          <span>Show grid</span>
        </label>
        <label :class="switchLabelClass">
          <input class="h-4 w-4 accent-purple-600" type="checkbox" :checked="snapSettings.showGuides" @change="toggleSnap('showGuides', $event)" />
          <span>Guides</span>
        </label>
        <label :class="switchLabelClass">
          <input class="h-4 w-4 accent-purple-600" type="checkbox" :checked="snapSettings.smartSnapping" @change="toggleSnap('smartSnapping', $event)" />
          <span>Smart snap</span>
        </label>
      </div>

      <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" v-if="isExpanded" />

      <div class="flex items-center gap-2" v-if="isExpanded">
        <button :class="buttonClass" title="Import PowerPoint" @click="emitImportPptx">
          <FileInput class="h-4 w-4" />
        </button>
        <button :class="buttonClass" title="Import HTML" @click="emitImportHtml">
          <FileUp class="h-4 w-4" />
        </button>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        <button :class="buttonClass" title="Export as PDF" :disabled="isSaving" @click="emitExport('pdf')">
          <FileDown class="h-4 w-4" />
        </button>
        <button :class="buttonClass" title="Export as PPTX" :disabled="isSaving" @click="emitExport('pptx')">
          <Presentation class="h-4 w-4" />
        </button>
        <button :class="buttonClass" title="Export thumbnails" :disabled="isSaving" @click="emitExport('images')">
          <ImageDown class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="isExpanded" class="w-full border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-5 py-2">
      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span v-if="isSaving" class="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <Loader2 class="h-3 w-3 animate-spin" />
          Saving deck…
        </span>
        <span v-else class="flex items-center gap-1">
          <Sparkles class="h-3 w-3 text-purple-500" />
          Use smart snapping to align shapes to center and equal spacing.
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FileDown,
  FileInput,
  FileUp,
  ImageDown,
  Loader2,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
} from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SlidePage, SlideTemplateSummary, SnapSettings } from '@/types/slides';

const props = defineProps<{
  pages: SlidePage[];
  activePageId: string | null;
  snapSettings: SnapSettings;
  isSaving?: boolean;
  disabled?: boolean;
  templates: SlideTemplateSummary[];
  selectedTemplateSlug: string;
}>();

const emit = defineEmits<{
  (e: 'add-page', templateSlug?: string): void;
  (e: 'duplicate-page', pageId?: string | null): void;
  (e: 'delete-page', pageId?: string | null): void;
  (e: 'move-page', direction: 'up' | 'down', pageId?: string | null): void;
  (e: 'select-page', pageId: string): void;
  (e: 'update-snap-settings', settings: Partial<SnapSettings>): void;
  (e: 'import-powerpoint'): void;
  (e: 'import-html'): void;
  (e: 'export', format: 'pdf' | 'pptx' | 'images'): void;
  (e: 'change-template', slug: string): void;
}>();

const isExpanded = ref(true);
const localGridSize = ref(props.snapSettings.gridSize ?? 20);

const buttonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-purple-300';
const switchLabelClass = 'inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';
const numberInputClass = 'w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-purple-400';

watch(
  () => props.snapSettings.gridSize,
  (value) => {
    if (typeof value === 'number' && value !== localGridSize.value) {
      localGridSize.value = value;
    }
  }
);

const activeIndex = computed(() => {
  if (!props.activePageId) return -1;
  return props.pages.findIndex((page) => page.id === props.activePageId);
});

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function emitAdd(templateSlug?: string) {
  if (props.disabled) return;
  const slug = templateSlug || props.selectedTemplateSlug;
  emit('add-page', slug);
}

function selectTemplate(slug: string) {
  emit('change-template', slug);
}

function emitDuplicate() {
  if (props.disabled) return;
  emit('duplicate-page', props.activePageId);
}

function emitDelete() {
  if (props.disabled) return;
  emit('delete-page', props.activePageId);
}

function emitMove(direction: 'up' | 'down') {
  if (props.disabled) return;
  emit('move-page', direction, props.activePageId);
}

function emitImportPptx() {
  emit('import-powerpoint');
}

function emitImportHtml() {
  emit('import-html');
}

function emitExport(format: 'pdf' | 'pptx' | 'images') {
  emit('export', format);
}

function toggleSnap(key: keyof SnapSettings, event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update-snap-settings', { [key]: target.checked });
}

function onGridInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value);
  if (Number.isFinite(value)) {
    localGridSize.value = value;
    emit('update-snap-settings', { gridSize: value });
  }
}
</script>
