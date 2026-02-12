<template>
  <div class="color-swatch-picker" @mousedown.stop>
    <!-- Preset swatches grid -->
    <div class="grid grid-cols-10 gap-0.5 p-2">
      <button
        v-for="color in presetColors"
        :key="color"
        class="w-5 h-5 rounded-sm border border-gray-200 dark:border-gray-600 hover:scale-125 hover:z-10 transition-transform cursor-pointer relative"
        :class="{ 'ring-2 ring-blue-500 ring-offset-1': modelValue === color }"
        :style="{ backgroundColor: color }"
        :title="color"
        @click="selectColor(color)"
      >
        <Check v-if="modelValue === color" class="h-3 w-3 absolute inset-0 m-auto" :class="isLightColor(color) ? 'text-gray-700' : 'text-white'" />
      </button>
    </div>

    <!-- Recent colors -->
    <div v-if="recentColors.length > 0" class="px-2 pb-1">
      <div class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Recent</div>
      <div class="flex gap-0.5">
        <button
          v-for="color in recentColors"
          :key="'recent-' + color"
          class="w-5 h-5 rounded-sm border border-gray-200 dark:border-gray-600 hover:scale-125 transition-transform cursor-pointer"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="selectColor(color)"
        />
      </div>
    </div>

    <!-- Divider + custom color -->
    <div class="border-t border-gray-100 dark:border-gray-700 px-2 py-1.5 flex items-center gap-2">
      <label class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <div class="w-5 h-5 rounded-sm border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden" :style="customPreviewStyle">
          <Plus v-if="!customColor" class="h-3 w-3 text-gray-400" />
        </div>
        Custom
        <input
          type="color"
          :value="customColor || modelValue || '#000000'"
          class="sr-only"
          @input="onCustomColorInput"
        />
      </label>

      <!-- Remove color button -->
      <button
        v-if="allowNone"
        class="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
        @click="$emit('update:modelValue', ''); $emit('remove')"
      >
        <Ban class="h-3 w-3" />
        None
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check, Plus, Ban } from 'lucide-vue-next';

withDefaults(defineProps<{
  modelValue: string;
  allowNone?: boolean;
}>(), {
  allowNone: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', color: string): void;
  (e: 'remove'): void;
}>();

const customColor = ref('');

// Google Docs-style color palette (10 columns × 5 rows)
const presetColors = [
  // Row 1: Pure/bright
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  // Row 2: Saturated
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  // Row 3: Medium
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  // Row 4: Light
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  // Row 5: Dark
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
];

const MAX_RECENT = 8;
const recentColors = ref<string[]>([]);

function selectColor(color: string) {
  emit('update:modelValue', color);
  addToRecent(color);
}

function onCustomColorInput(event: Event) {
  const color = (event.target as HTMLInputElement).value;
  customColor.value = color;
  emit('update:modelValue', color);
  addToRecent(color);
}

function addToRecent(color: string) {
  if (presetColors.includes(color)) return;
  recentColors.value = [color, ...recentColors.value.filter(c => c !== color)].slice(0, MAX_RECENT);
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const customPreviewStyle = computed(() => {
  if (customColor.value) return { backgroundColor: customColor.value };
  return {};
});
</script>
