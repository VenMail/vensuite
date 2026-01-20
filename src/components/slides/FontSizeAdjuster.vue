<template>
  <div
    v-if="show"
    class="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 z-50"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="flex items-center gap-2 mb-2">
      <Type class="h-4 w-4 text-gray-500" />
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Font Size</span>
    </div>
    
    <!-- Quick preset buttons -->
    <div class="flex gap-1 mb-2">
      <button
        v-for="preset in presets"
        :key="preset.value"
        class="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
        @click="applyFontSize(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>
    
    <!-- Custom input -->
    <div class="flex items-center gap-2">
      <input
        ref="inputRef"
        v-model="customSize"
        type="number"
        min="8"
        max="200"
        class="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="32"
        @keydown.enter="applyCustomSize"
        @keydown.esc="emit('close')"
      />
      <span class="text-xs text-gray-500">px</span>
      <button
        class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        @click="applyCustomSize"
      >
        Apply
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Type } from 'lucide-vue-next';

interface Props {
  show: boolean;
  position: { x: number; y: number };
  currentSize?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'apply', size: string): void;
  (e: 'close'): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const customSize = ref('');

const presets = [
  { label: '12px', value: '12px' },
  { label: '16px', value: '16px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
  { label: '48px', value: '48px' },
];

watch(() => props.show, async (show) => {
  if (show) {
    await nextTick();
    inputRef.value?.focus();
    
    // Extract number from current size if available
    if (props.currentSize) {
      const match = props.currentSize.match(/(\d+)/);
      if (match) {
        customSize.value = match[1];
      }
    }
  }
});

function applyFontSize(size: string) {
  emit('apply', size);
  emit('close');
}

function applyCustomSize() {
  if (customSize.value) {
    emit('apply', `${customSize.value}px`);
    emit('close');
  }
}
</script>
