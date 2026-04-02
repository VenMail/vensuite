<script setup lang="ts">
import type { SigningFieldType } from '@/types/signing';

defineProps<{
  activeSignerColor?: string;
}>();

const emit = defineEmits<{
  addField: [type: SigningFieldType];
}>();

const fieldTypes: Array<{ type: SigningFieldType; label: string; icon: string }> = [
  { type: 'signature', label: 'Signature', icon: 'S' },
  { type: 'initials', label: 'Initials', icon: 'I' },
  { type: 'date', label: 'Date', icon: 'D' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'checkbox', label: 'Checkbox', icon: '~' },
];

function onDragStart(e: DragEvent, type: SigningFieldType) {
  e.dataTransfer?.setData('signing-field-type', type);
  e.dataTransfer!.effectAllowed = 'copy';
}
</script>

<template>
  <div class="field-palette space-y-2">
    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Fields</h3>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="ft in fieldTypes"
        :key="ft.type"
        class="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing text-xs"
        :draggable="true"
        @dragstart="onDragStart($event, ft.type)"
        @click="emit('addField', ft.type)"
      >
        <span
          class="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold text-white"
          :style="{ backgroundColor: activeSignerColor || '#3B82F6' }"
        >
          {{ ft.icon }}
        </span>
        <span class="text-gray-700">{{ ft.label }}</span>
      </button>
    </div>
  </div>
</template>
