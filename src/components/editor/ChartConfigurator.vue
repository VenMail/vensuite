<template>
  <Dialog v-model:open="internalOpen">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit Chart' : 'Insert Chart' }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Chart Type -->
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Chart Type</label>
          <select
            v-model="form.chartType"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="doughnut">Doughnut Chart</option>
            <option value="radar">Radar Chart</option>
            <option value="polarArea">Polar Area Chart</option>
          </select>
        </div>

        <!-- Labels -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 p-3">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">Labels</label>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ form.labels.length }}</span>
          </div>
          
          <div class="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
            <div v-for="(_label, i) in form.labels" :key="i" class="flex gap-1.5">
              <input
                v-model="form.labels[i]"
                type="text"
                placeholder="Label"
                class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                @click="form.labels.splice(i, 1)"
                class="px-2.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                ×
              </button>
            </div>
            <p v-if="!form.labels.length" class="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">
              No labels yet
            </p>
          </div>

          <div class="flex gap-1.5">
            <input
              v-model="newLabel"
              type="text"
              placeholder="Add label (e.g. Q1, Jan, Week 1)"
              class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keydown.enter.prevent="addLabel"
            />
            <Button type="button" size="sm" @click="addLabel" :disabled="!newLabel.trim()">
              Add
            </Button>
          </div>
        </div>

        <!-- Datasets -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 p-3">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">Datasets</label>
            <Button type="button" size="sm" variant="ghost" @click="addDataset" class="h-7 text-xs">
              + Add
            </Button>
          </div>

          <div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <div
              v-for="(dataset, i) in form.datasets"
              :key="i"
              class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-2.5"
            >
              <!-- Header Row -->
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="dataset.backgroundColor"
                  type="color"
                  class="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <input
                  v-model="dataset.label"
                  type="text"
                  placeholder="Dataset name"
                  class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  v-if="form.datasets.length > 1"
                  type="button"
                  @click="form.datasets.splice(i, 1)"
                  class="px-2.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  ×
                </button>
              </div>

              <!-- Values -->
              <input
                :value="dataset.data?.join(', ') || ''"
                @input="updateDatasetValues(i, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="Values: 10, 20, 30, 40"
                class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5 text-sm mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <!-- Advanced Options Toggle -->
              <button
                type="button"
                @click="toggleAdvanced(i)"
                class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronDown
                  class="w-3 h-3 transition-transform"
                  :class="{ 'rotate-180': expandedDatasets.has(i) }"
                />
                Advanced
              </button>

              <!-- Advanced Options -->
              <transition name="slide">
                <div v-if="expandedDatasets.has(i)" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div class="grid grid-cols-2 gap-2">
                    <label class="block">
                      <span class="text-xs text-gray-600 dark:text-gray-400">Border Color</span>
                      <input
                        v-model="dataset.borderColor"
                        type="color"
                        class="mt-1 w-full h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                      />
                    </label>
                    <label class="block">
                      <span class="text-xs text-gray-600 dark:text-gray-400">Border Width</span>
                      <input
                        v-model.number="dataset.borderWidth"
                        type="number"
                        min="0"
                        max="10"
                        class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                  
                  <label v-if="form.chartType === 'line'" class="block">
                    <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Curve</span>
                      <span class="font-mono">{{ dataset.tension || 0 }}</span>
                    </div>
                    <input
                      v-model.number="dataset.tension"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      class="w-full h-1.5 accent-blue-500"
                    />
                  </label>
                </div>
              </transition>
            </div>

            <div
              v-if="!form.datasets.length"
              class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">No datasets yet</p>
              <Button type="button" size="sm" @click="addDataset">Add First Dataset</Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!isValid">
          {{ isEditing ? 'Update' : 'Insert' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Button from '@/components/ui/button/Button.vue';
import type { ChartAttrs, ChartDatasetAttr } from '@/extensions/chart';

const props = defineProps<{
  open: boolean;
  initialValue?: Partial<ChartAttrs> | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', value: ChartAttrs): void;
  (e: 'cancel'): void;
}>();

const internalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
});

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

const DEFAULT_DATASET: ChartDatasetAttr = {
  label: 'Series 1',
  data: [12, 19, 3, 5],
  backgroundColor: DEFAULT_COLORS[0],
  borderColor: DEFAULT_COLORS[0],
  borderWidth: 2,
  tension: 0.3,
};

const form = reactive<ChartAttrs>({
  chartType: 'bar',
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [{ ...DEFAULT_DATASET, data: [...DEFAULT_DATASET.data || []] }],
});

const newLabel = ref('');
const expandedDatasets = ref(new Set<number>());

const isEditing = computed(() => !!props.initialValue);
const isValid = computed(() => 
  form.labels.length > 0 && 
  form.datasets.length > 0 && 
  form.datasets.every(ds => ds.data && ds.data.length > 0)
);

function addLabel() {
  const value = newLabel.value.trim();
  if (!value) return;
  form.labels.push(value);
  newLabel.value = '';
}

function addDataset() {
  const index = form.datasets.length;
  const color = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  form.datasets.push({
    label: `Series ${index + 1}`,
    data: [...DEFAULT_DATASET.data || []],
    backgroundColor: color,
    borderColor: color,
    borderWidth: 2,
    tension: 0.3,
  });
  expandedDatasets.value.add(index);
}

function updateDatasetValues(index: number, value: string) {
  const parsed = value
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => !isNaN(v));
  form.datasets[index].data = parsed;
}

function toggleAdvanced(index: number) {
  if (expandedDatasets.value.has(index)) {
    expandedDatasets.value.delete(index);
  } else {
    expandedDatasets.value.add(index);
  }
}

function resetForm() {
  form.chartType = 'bar';
  form.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  form.datasets = [{ ...DEFAULT_DATASET, data: [...DEFAULT_DATASET.data || []] }];
  newLabel.value = '';
  expandedDatasets.value.clear();
}

function loadInitialValue() {
  if (!props.initialValue) {
    resetForm();
    return;
  }

  form.chartType = props.initialValue.chartType || 'bar';
  form.labels = props.initialValue.labels?.length ? [...props.initialValue.labels] : ['Q1', 'Q2', 'Q3', 'Q4'];
  form.datasets = props.initialValue.datasets?.length
    ? props.initialValue.datasets.map((ds, i) => ({
        label: ds.label || `Series ${i + 1}`,
        data: Array.isArray(ds.data) ? [...ds.data] : [],
        backgroundColor: ds.backgroundColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        borderColor: ds.borderColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        borderWidth: ds.borderWidth ?? 2,
        tension: ds.tension ?? 0.3,
      }))
    : [{ ...DEFAULT_DATASET, data: [...DEFAULT_DATASET.data || []] }];

  expandedDatasets.value.clear();
}

function handleSubmit() {
  if (!isValid.value) return;
  emit('submit', {
    chartType: form.chartType,
    labels: [...form.labels],
    datasets: form.datasets.map(ds => ({
      ...ds,
      data: [...ds.data || []],
    })),
  });
  internalOpen.value = false;
}

function handleCancel() {
  emit('cancel');
  internalOpen.value = false;
}

watch(() => props.open, value => {
  if (value) loadInitialValue();
});

watch(() => props.initialValue, () => {
  if (internalOpen.value) loadInitialValue();
});
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>