<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  getApiErrorMessage,
  retryOnSigningLock,
  SIGNING_UPLOAD_RETRY_DEADLINE_MS,
  signingApi,
} from '@/services/signing';
import type { SigningField } from '@/types/signing';
import SignatureCapture from './SignatureCapture.vue';

const props = defineProps<{
  field: SigningField;
  value?: string | boolean;
  pageWidth: number;
  pageHeight: number;
  signerName?: string;
  signerToken: string;
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

const isUploading = ref(false);
const uploadError = ref<string | null>(null);
const imageInputId = `signer-image-input-${props.field.id}`;

async function uploadWithRetry(file: File): Promise<{ path: string }> {
  return retryOnSigningLock(
    () => signingApi.uploadSignerImage(props.signerToken, props.field.id, file),
    SIGNING_UPLOAD_RETRY_DEADLINE_MS
  );
}

async function onImageSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  isUploading.value = true;
  uploadError.value = null;
  try {
    const uploaded = await uploadWithRetry(file);
    emit('updateValue', props.field.id, uploaded.path);
  } catch (err: unknown) {
    uploadError.value = getApiErrorMessage(err, 'Upload failed. Please try again.');
  } finally {
    isUploading.value = false;
  }
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

    <!-- Image (signer upload) -->
    <template v-else-if="field.type === 'image'">
      <div class="relative w-full h-full overflow-visible">
        <div class="w-full h-full border-2 border-dashed border-blue-400 rounded bg-blue-50 flex items-center justify-center overflow-hidden focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600">
          <!-- A failed preview load must not clear the uploaded path or block signing. -->
          <img
            v-if="hasValue && typeof value === 'string'"
            :src="signingApi.signerImageUrl(signerToken, field.id)"
            :alt="field.label || 'Uploaded image'"
            class="max-w-full max-h-full object-contain"
          />
          <label
            v-else
            :for="imageInputId"
            class="w-full h-full flex flex-col items-center justify-center gap-1 text-xs font-medium text-blue-700 cursor-pointer peer-focus:ring-2 peer-focus:ring-inset peer-focus:ring-blue-600"
          >
            <span>{{ field.label || 'Upload image' }}</span>
            <span class="text-[10px] font-normal text-blue-600">Click to choose a file</span>
          </label>
          <input
            v-if="!hasValue || typeof value !== 'string'"
            :id="imageInputId"
            type="file"
            accept="image/png,image/jpeg,image/gif"
            class="peer sr-only"
            data-testid="signer-image-input"
            @change="onImageSelected"
          />
        </div>
      </div>
      <p
        v-if="isUploading"
        class="absolute inset-0 flex items-center justify-center rounded bg-white/80 text-xs font-medium text-blue-700"
      >
        Uploading…
      </p>
      <p
        v-if="uploadError"
        role="alert"
        class="absolute left-0 top-full z-20 mt-1 max-h-24 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto whitespace-normal break-words rounded border border-red-200 bg-white/95 px-1.5 py-1 text-[10px] leading-4 text-red-700 shadow-sm"
      >
        {{ uploadError }}
      </p>
    </template>
  </div>
</template>
