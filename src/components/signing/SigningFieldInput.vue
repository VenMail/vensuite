<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { SigningField } from '@/types/signing';
import SignatureCapture from './SignatureCapture.vue';

const props = defineProps<{
  field: SigningField;
  value?: string | boolean;
  pageWidth: number;
  pageHeight: number;
  signerName?: string;
}>();

const emit = defineEmits<{
  updateValue: [fieldId: string, value: string | boolean];
}>();

function todayLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const showSignaturePad = ref(false);
const todayValue = todayLocalDate();
const formInputClass = 'w-full h-full px-1 text-xs border-2 border-blue-400 rounded bg-white text-slate-950 placeholder:text-slate-500 dark:text-slate-950 dark:placeholder:text-slate-500 [color-scheme:light]';

const style = computed(() => ({
  left: `${(props.field.x / 100) * props.pageWidth}px`,
  top: `${(props.field.y / 100) * props.pageHeight}px`,
  width: `${(props.field.width / 100) * props.pageWidth}px`,
  height: `${(props.field.height / 100) * props.pageHeight}px`,
}));

const hasValue = computed(() => props.value !== undefined && props.value !== '');

function onSignatureSave(base64: string) {
  emit('updateValue', props.field.id, base64);
}

function onTextChange(e: Event) {
  emit('updateValue', props.field.id, (e.target as HTMLInputElement).value);
}

function onCheckboxChange(e: Event) {
  emit('updateValue', props.field.id, (e.target as HTMLInputElement).checked);
}

function onDateChange(e: Event) {
  emit('updateValue', props.field.id, (e.target as HTMLInputElement).value);
}

onMounted(() => {
  if (props.field.type === 'date' && !hasValue.value) {
    emit('updateValue', props.field.id, todayValue);
  }
});
</script>

<template>
  <div class="signing-field-input absolute" :style="style">
    <!-- Signature / Initials -->
    <template v-if="field.type === 'signature' || field.type === 'initials'">
      <div
        v-if="hasValue && typeof value === 'string'"
        class="w-full h-full border-2 border-blue-400 rounded bg-white cursor-pointer flex items-center justify-center"
        @click="showSignaturePad = true"
      >
        <img :src="value as string" class="max-w-full max-h-full object-contain" alt="Signature" />
      </div>
      <button
        v-else
        class="w-full h-full border-2 border-dashed border-blue-400 rounded bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center text-blue-600 text-xs font-medium"
        @click="showSignaturePad = true"
      >
        {{ field.type === 'signature' ? 'Click to Sign' : 'Click for Initials' }}
      </button>

      <SignatureCapture
        v-model="showSignaturePad"
        :signer-name="signerName"
        @save="onSignatureSave"
      />
    </template>

    <!-- Date -->
    <template v-else-if="field.type === 'date'">
      <input
        type="date"
        :value="(value as string) || todayValue"
        :class="formInputClass"
        @change="onDateChange"
      />
    </template>

    <!-- Text -->
    <template v-else-if="field.type === 'text'">
      <input
        type="text"
        :value="(value as string) || ''"
        :placeholder="field.label || 'Enter text'"
        :class="formInputClass"
        @input="onTextChange"
      />
    </template>

    <!-- Checkbox -->
    <template v-else-if="field.type === 'checkbox'">
      <label class="w-full h-full border-2 border-blue-400 rounded bg-white flex items-center justify-center cursor-pointer">
        <input
          type="checkbox"
          :checked="!!value"
          class="w-4 h-4 accent-blue-600"
          @change="onCheckboxChange"
        />
      </label>
    </template>
  </div>
</template>
