<template>
  <aside class="flex h-full w-full flex-col bg-white/80 backdrop-blur-lg dark:bg-gray-900/80">
    <header class="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{$t('Commons.heading.inspector')}}</h2>
      <Badge v-if="importStatus?.isImporting" variant="secondary" class="gap-1">
        <Loader2 class="h-3 w-3 animate-spin" />
        Importing…
      </Badge>
    </header>

    <div class="flex-1 space-y-6 overflow-y-auto px-5 py-4">
      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{$t('Commons.heading.snapping')}}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{$t('Slides.SlidesInspector.text.control_alignment_helpers_for')}}</p>
          </div>
          <Switch
            :checked="localSettings.smartSnapping"
            :disabled="disabled"
            @update:checked="toggleSmartSnapping"
          />
        </header>

        <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <label class="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700">
            <span class="flex items-center gap-2">
              <Grid class="h-4 w-4 text-purple-500" />
              {{$t('Commons.text.show_grid')}}
            </span>
            <Switch
              :checked="localSettings.showGrid"
              :disabled="disabled"
              @update:checked="toggleGrid"
            />
          </label>

          <label class="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700">
            <span class="flex items-center gap-2">
              <Rows class="h-4 w-4 text-purple-500" />
              {{$t('Commons.text.alignment_guides')}}
            </span>
            <Switch
              :checked="localSettings.showGuides"
              :disabled="disabled"
              @update:checked="toggleGuides"
            />
          </label>

          <div class="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <label class="flex flex-col gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Grid size (px)
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  min="5"
                  max="200"
                  step="1"
                  :disabled="disabled || !localSettings.showGrid"
                  v-model="gridSizeInput"
                />
                <Button variant="secondary" size="sm" :disabled="disabled" @click="resetGridSize">
                  {{$t('Commons.button.reset')}}
                </Button>
              </div>
            </label>
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {{$t('Slides.SlidesInspector.text.use_a_smaller_grid')}}
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{$t('Commons.heading.imports')}}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{$t('Slides.SlidesInspector.text.bring_existing_content_into')}}</p>
          </div>
        </header>

        <div class="grid gap-2">
          <Button variant="outline" class="justify-start gap-2" :disabled="disabled" @click="$emit('import-powerpoint')">
            <Presentation class="h-4 w-4 text-purple-500" />
            {{$t('Commons.button.import_pptx')}}
          </Button>
          <Button variant="outline" class="justify-start gap-2" :disabled="disabled" @click="$emit('import-html')">
            <FileCode class="h-4 w-4 text-purple-500" />
            {{$t('Commons.button.import_html')}}
          </Button>
        </div>

        <div v-if="importStatus" class="rounded-md bg-purple-50 p-3 text-xs text-purple-700 dark:bg-purple-900/20 dark:text-purple-200">
          <p class="font-medium">Status:</p>
          <p v-if="importStatus.isImporting">{{$t('Slides.SlidesInspector.text.processing_your_file')}}</p>
          <p v-else-if="importStatus.lastError">{{ importStatus.lastError }}</p>
          <p v-else>{{$t('Slides.SlidesInspector.text.ready_for_new_imports')}}</p>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <Badge variant="outline" class="gap-1">
            <Sparkles class="h-3 w-3 text-purple-500" />
            {{$t('Commons.text.tips')}}
          </Badge>
          {{$t('Commons.text.smart_layout')}}
        </header>
        <ul class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            {{$t('Commons.text.hold')}} <kbd class="rounded border border-gray-300 bg-gray-100 px-1 text-[10px]">{{$t('Commons.text.shift')}}</kbd> {{$t('Slides.SlidesInspector.text.while_dragging_to_constrain')}}
          </li>
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            {{$t('Slides.SlidesInspector.text.use_alignment_guides_to')}}
          </li>
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            {{$t('Slides.SlidesInspector.text.combine_smart_snapping_with')}}
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { Check, FileCode, Grid, Loader2, Presentation, Rows, Sparkles } from 'lucide-vue-next';
import type { SlideImportStatus, SnapSettings } from '@/types/slides';
import Button from '@/components/ui/button/Button.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import Input from '@/components/ui/input/Input.vue';
import Switch from '@/components/ui/switch/Switch.vue';

const props = defineProps<{
  snapSettings: SnapSettings;
  importStatus?: SlideImportStatus;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-snap-settings', value: Partial<SnapSettings>): void;
  (e: 'import-powerpoint'): void;
  (e: 'import-html'): void;
}>();

const DEFAULT_GRID = 20;
const localSettings = reactive({
  showGrid: props.snapSettings.showGrid,
  showGuides: props.snapSettings.showGuides,
  smartSnapping: props.snapSettings.smartSnapping,
  gridSize: props.snapSettings.gridSize ?? DEFAULT_GRID,
});

const gridSizeInput = ref(localSettings.gridSize);

watch(
  () => props.snapSettings,
  (next) => {
    localSettings.showGrid = next.showGrid;
    localSettings.showGuides = next.showGuides;
    localSettings.smartSnapping = next.smartSnapping;
    localSettings.gridSize = next.gridSize ?? DEFAULT_GRID;
    gridSizeInput.value = localSettings.gridSize;
  },
  { deep: true }
);

watch(gridSizeInput, (value) => {
  if (!localSettings.showGrid) return;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    localSettings.gridSize = numeric;
    emit('update-snap-settings', { gridSize: numeric });
  }
});

function toggleGrid(value: boolean) {
  localSettings.showGrid = value;
  emit('update-snap-settings', { showGrid: value });
}

function toggleGuides(value: boolean) {
  localSettings.showGuides = value;
  emit('update-snap-settings', { showGuides: value });
}

function toggleSmartSnapping(value: boolean) {
  localSettings.smartSnapping = value;
  emit('update-snap-settings', { smartSnapping: value });
}

function resetGridSize() {
  gridSizeInput.value = DEFAULT_GRID;
  localSettings.gridSize = DEFAULT_GRID;
  emit('update-snap-settings', { gridSize: DEFAULT_GRID });
}
</script>
