<script setup lang="ts">
import { computed } from 'vue';
import type { SigningField } from '@/types/signing';

const props = defineProps<{
  field: SigningField;
  pageWidth: number;
  pageHeight: number;
}>();

const style = computed(() => ({
  left: `${(props.field.x / 100) * props.pageWidth}px`,
  top: `${(props.field.y / 100) * props.pageHeight}px`,
  width: `${(props.field.width / 100) * props.pageWidth}px`,
  height: `${(props.field.height / 100) * props.pageHeight}px`,
}));

const signatureImage = computed(() => {
  if (props.field.type !== 'signature' && props.field.type !== 'initials') return null;
  const value = props.field.value;
  if (typeof value !== 'string') return null;
  if (/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  if (/^[a-z0-9+/=]{100,}$/i.test(value)) return `data:image/png;base64,${value}`;
  return null;
});

const displayValue = computed(() => {
  if (props.field.type === 'checkbox') return props.field.value === true || props.field.value === 'true' ? '✓' : '';
  if (props.field.type === 'signature' || props.field.type === 'initials') return 'Signed';
  return String(props.field.value ?? '');
});
</script>

<template>
  <div
    class="absolute pointer-events-none z-[1] flex items-center overflow-hidden bg-white text-slate-950"
    :style="style"
    :aria-label="`${field.label || field.type}: completed by ${field.signerEmail}`"
  >
    <img v-if="signatureImage" :src="signatureImage" class="max-w-full max-h-full object-contain" alt="Completed signature" />
    <span v-else class="px-1 text-xs leading-tight">{{ displayValue }}</span>
  </div>
</template>
