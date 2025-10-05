<template>
  <aside class="flex h-full w-full flex-col bg-white/80 backdrop-blur-lg dark:bg-gray-900/80">
    <header class="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Inspector</h2>
      <Badge v-if="importStatus?.isImporting" variant="secondary" class="gap-1">
        <Loader2 class="h-3 w-3 animate-spin" />
        Importing…
      </Badge>
    </header>

    <div class="flex-1 space-y-6 overflow-y-auto px-5 py-4">
      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Snapping</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Control alignment helpers for precise layouts.</p>
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
              Show grid
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
              Alignment guides
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
                  Reset
                </Button>
              </div>
            </label>
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Use a smaller grid for dense layouts or increase spacing for broader guides.
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Imports</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Bring existing content into your slide deck.</p>
          </div>
        </header>

        <div class="grid gap-2">
          <Button variant="outline" class="justify-start gap-2" :disabled="disabled" @click="$emit('import-powerpoint')">
            <Presentation class="h-4 w-4 text-purple-500" />
            Import PPTX
          </Button>
          <Button variant="outline" class="justify-start gap-2" :disabled="disabled" @click="$emit('import-html')">
            <FileCode class="h-4 w-4 text-purple-500" />
            Import HTML
          </Button>
        </div>

        <div v-if="importStatus" class="rounded-md bg-purple-50 p-3 text-xs text-purple-700 dark:bg-purple-900/20 dark:text-purple-200">
          <p class="font-medium">Status:</p>
          <p v-if="importStatus.isImporting">Processing your file…</p>
          <p v-else-if="importStatus.lastError">{{ importStatus.lastError }}</p>
          <p v-else>Ready for new imports.</p>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <Badge variant="outline" class="gap-1">
            <Sparkles class="h-3 w-3 text-purple-500" />
            Tips
          </Badge>
          Smart layout
        </header>
        <ul class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            Hold <kbd class="rounded border border-gray-300 bg-gray-100 px-1 text-[10px]">Shift</kbd> while dragging to constrain axis.
          </li>
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            Use alignment guides to evenly distribute shapes.
          </li>
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 h-3.5 w-3.5 text-purple-500" />
            Combine smart snapping with grid overlays for pixel-perfect layouts.
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
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
