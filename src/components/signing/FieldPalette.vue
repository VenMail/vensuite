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
  <div class="field-palette space-y-3">
    <div class="px-1">
      <h3 class="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Fields</h3>
      <p class="mt-1 text-xs leading-5 text-stone-500">
        Drag fields onto the document or tap a field to drop it on the current page.
      </p>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="ft in fieldTypes"
        :key="ft.type"
        class="cursor-grab rounded-2xl border border-stone-200 bg-white px-3 py-3 text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 active:cursor-grabbing"
        :draggable="true"
        @dragstart="onDragStart($event, ft.type)"
        @click="emit('addField', ft.type)"
      >
        <span
          class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
          :style="{ backgroundColor: activeSignerColor || '#3B82F6' }"
        >
          {{ ft.icon }}
        </span>
        <span class="mt-2 block font-semibold text-slate-800">{{ ft.label }}</span>
      </button>
    </div>
  </div>
</template>
