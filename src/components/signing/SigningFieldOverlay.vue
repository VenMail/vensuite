<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SigningField, SigningSigner } from '@/types/signing';

const props = defineProps<{
  field: SigningField;
  signer?: SigningSigner;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  select: [fieldId: string];
  move: [fieldId: string, x: number, y: number];
  resize: [fieldId: string, width: number, height: number];
  delete: [fieldId: string];
}>();

const isDragging = ref(false);
const isResizing = ref(false);
const dragStart = ref({ x: 0, y: 0, fieldX: 0, fieldY: 0 });
const resizeStart = ref({ x: 0, y: 0, fieldW: 0, fieldH: 0 });

const style = computed(() => ({
  left: `${(props.field.x / 100) * props.pageWidth}px`,
  top: `${(props.field.y / 100) * props.pageHeight}px`,
  width: `${(props.field.width / 100) * props.pageWidth}px`,
  height: `${(props.field.height / 100) * props.pageHeight}px`,
  borderColor: props.signer?.color || '#3B82F6',
  backgroundColor: (props.signer?.color || '#3B82F6') + '15',
}));

const fieldIcon = computed(() => {
  switch (props.field.type) {
    case 'signature': return 'S';
    case 'initials': return 'I';
    case 'date': return 'D';
    case 'text': return 'T';
    case 'checkbox': return '~';
    default: return '?';
  }
});

function onMouseDown(e: MouseEvent) {
  if (props.readonly) return;
  e.preventDefault();
  e.stopPropagation();
  emit('select', props.field.id);

  isDragging.value = true;
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    fieldX: props.field.x,
    fieldY: props.field.y,
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', onDragEnd);
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - dragStart.value.x;
  const dy = e.clientY - dragStart.value.y;
  const newX = dragStart.value.fieldX + (dx / props.pageWidth) * 100;
  const newY = dragStart.value.fieldY + (dy / props.pageHeight) * 100;
  emit('move', props.field.id, newX, newY);
}

function onDragEnd() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', onDragEnd);
}

function onResizeMouseDown(e: MouseEvent) {
  if (props.readonly) return;
  e.preventDefault();
  e.stopPropagation();

  isResizing.value = true;
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    fieldW: props.field.width,
    fieldH: props.field.height,
  };

  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', onResizeEnd);
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return;
  const dx = e.clientX - resizeStart.value.x;
  const dy = e.clientY - resizeStart.value.y;
  const newW = resizeStart.value.fieldW + (dx / props.pageWidth) * 100;
  const newH = resizeStart.value.fieldH + (dy / props.pageHeight) * 100;
  emit('resize', props.field.id, newW, newH);
}

function onResizeEnd() {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', onResizeEnd);
}
</script>

<template>
  <div
    class="signing-field-overlay absolute flex items-center justify-center rounded-xl border-2 cursor-move select-none text-xs font-medium transition-shadow"
    :class="{
      'ring-2 ring-offset-1 ring-blue-500 shadow-lg': isSelected,
      'hover:shadow-md': !readonly,
      'cursor-default': readonly,
    }"
    :style="style"
    @mousedown="onMouseDown"
  >
    <span
      class="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/85 px-2 py-1 truncate shadow-sm"
      :style="{ color: signer?.color || '#3B82F6' }"
    >
      <span class="font-bold">{{ fieldIcon }}</span>
      <span v-if="field.label" class="opacity-70">{{ field.label }}</span>
      <span v-else class="opacity-50 capitalize">{{ field.type }}</span>
    </span>

    <!-- Delete button -->
    <button
      v-if="isSelected && !readonly"
      class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-10"
      @mousedown.stop
      @click.stop="emit('delete', field.id)"
    >
      x
    </button>

    <!-- Resize handle -->
    <div
      v-if="!readonly"
      class="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
      :style="{ borderRight: `2px solid ${signer?.color || '#3B82F6'}`, borderBottom: `2px solid ${signer?.color || '#3B82F6'}` }"
      @mousedown="onResizeMouseDown"
    />
  </div>
</template>
