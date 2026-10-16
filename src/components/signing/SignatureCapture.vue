<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { VueSignaturePad } from 'vue-signature-pad';
import { useSavedSignatures } from '@/composables/useSavedSignatures';

const props = defineProps<{
  modelValue: boolean;
  signerName?: string;
  signerEmail?: string;
  initialMode?: CaptureMode;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [base64Png: string];
}>();

type CaptureMode = 'draw' | 'type' | 'upload' | 'saved';
const mode = ref<CaptureMode>('draw');

watch(() => props.modelValue, (open) => {
  if (open && props.initialMode) mode.value = props.initialMode;
});
interface SignaturePadInstance {
  clearSignature(): void;
  saveSignature(type?: string): { isEmpty: boolean; data: string };
  resizeCanvas(): void;
}
const signaturePad = ref<SignaturePadInstance | null>(null);
const typedName = ref(props.signerName || '');
const fileInput = ref<HTMLInputElement | null>(null);
const uploadPreview = ref<string | null>(null);
const uploadError = ref<string | null>(null);

const { savedSignatures, saveSignature, deleteSignature } = useSavedSignatures(
  () => props.signerEmail
);

const hasSavedSignatures = computed(() => savedSignatures.value.length > 0);

function close() {
  emit('update:modelValue', false);
}

function clear() {
  signaturePad.value?.clearSignature();
}

function saveDrawn() {
  if (!signaturePad.value) return;
  const { isEmpty, data } = signaturePad.value.saveSignature('image/png');
  if (isEmpty) return;
  saveSignature(data, 'drawn', `Drawn — ${new Date().toLocaleDateString()}`);
  emit('save', data);
  close();
}

function saveTyped() {
  if (!typedName.value.trim()) return;

  // Render typed name to canvas with script font
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = 'italic 48px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typedName.value, canvas.width / 2, canvas.height / 2);

  const dataUrl = canvas.toDataURL('image/png');
  saveSignature(dataUrl, 'typed', `Typed: ${typedName.value}`);
  emit('save', dataUrl);
  close();
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadError.value = null;

  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please select an image file (PNG, JPG, etc.)';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = 'Image must be under 2MB';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    // Convert to PNG via canvas for consistency
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      uploadPreview.value = canvas.toDataURL('image/png');
    };
    img.onerror = () => {
      uploadError.value = 'Could not load image. Try a different file.';
    };
    img.src = result;
  };
  reader.onerror = () => {
    uploadError.value = 'Failed to read file.';
  };
  reader.readAsDataURL(file);
}

function saveUploaded() {
  if (!uploadPreview.value) return;
  saveSignature(uploadPreview.value, 'uploaded', `Uploaded — ${new Date().toLocaleDateString()}`);
  emit('save', uploadPreview.value);
  close();
}

function useSavedSignature(dataUrl: string) {
  emit('save', dataUrl);
  close();
}

function handleDeleteSaved(id: string, e: Event) {
  e.stopPropagation();
  deleteSignature(id);
}

function triggerFileInput() {
  fileInput.value?.click();
}

onMounted(async () => {
  await nextTick();
  // Resize the signature pad after mount
  if (signaturePad.value) {
    signaturePad.value.resizeCanvas();
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="close"
    >
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 class="font-semibold text-gray-900 dark:text-white">Add Signature</h3>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="close">
            <span class="text-xl">&times;</span>
          </button>
        </div>

        <!-- Mode tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
            :class="mode === 'draw' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="mode = 'draw'"
          >
            Draw
          </button>
          <button
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
            :class="mode === 'type' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="mode = 'type'"
          >
            Type
          </button>
          <button
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
            :class="mode === 'upload' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="mode = 'upload'"
          >
            Upload
          </button>
          <button
            v-if="hasSavedSignatures"
            class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
            :class="mode === 'saved' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="mode = 'saved'"
          >
            Saved
          </button>
        </div>

        <!-- Content -->
        <div class="p-4">
          <!-- Draw mode -->
          <div v-if="mode === 'draw'" class="space-y-3">
            <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800" style="height: 200px;">
              <VueSignaturePad
                ref="signaturePad"
                :options="{ penColor: '#000', minWidth: 1.5, maxWidth: 3 }"
                width="100%"
                height="200px"
              />
            </div>
            <div class="flex justify-between">
              <button
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                @click="clear"
              >
                Clear
              </button>
              <button
                class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                @click="saveDrawn"
              >
                Apply Signature
              </button>
            </div>
          </div>

          <!-- Type mode -->
          <div v-if="mode === 'type'" class="space-y-3">
            <input
              v-model="typedName"
              type="text"
              placeholder="Type your name"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-lg bg-white dark:bg-gray-800 text-slate-950 dark:text-white placeholder:text-slate-500 [color-scheme:light]"
            />
            <div
              class="h-24 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span class="text-3xl italic font-serif text-gray-800 dark:text-gray-200">{{ typedName || 'Your Name' }}</span>
            </div>
            <div class="flex justify-end">
              <button
                class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                :disabled="!typedName.trim()"
                @click="saveTyped"
              >
                Apply Signature
              </button>
            </div>
          </div>

          <!-- Upload mode -->
          <div v-if="mode === 'upload'" class="space-y-3">
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp,image/webp"
              class="hidden"
              @change="handleFileSelect"
            />
            <div
              v-if="!uploadPreview"
              class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors"
              style="height: 200px;"
              @click="triggerFileInput"
            >
              <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-sm text-gray-500 dark:text-gray-400">Click to upload a signature image</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, GIF up to 2MB</p>
            </div>
            <div v-else class="space-y-3">
              <div class="border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden" style="height: 200px;">
                <img :src="uploadPreview" alt="Signature preview" class="max-w-full max-h-full object-contain" />
              </div>
              <div class="flex justify-between">
                <button
                  class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  @click="uploadPreview = null; uploadError = null"
                >
                  Choose different
                </button>
                <button
                  class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  @click="saveUploaded"
                >
                  Apply Signature
                </button>
              </div>
            </div>
            <p v-if="uploadError" class="text-sm text-red-600 dark:text-red-400">{{ uploadError }}</p>
          </div>

          <!-- Saved signatures mode -->
          <div v-if="mode === 'saved'" class="space-y-3">
            <div v-if="!hasSavedSignatures" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No saved signatures yet. Draw, type, or upload one to save it for reuse.
            </div>
            <div v-else class="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              <div
                v-for="sig in savedSignatures"
                :key="sig.id"
                class="relative group border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                @click="useSavedSignature(sig.dataUrl)"
              >
                <img :src="sig.dataUrl" alt="Saved signature" class="w-full h-16 object-contain" />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{{ sig.label }}</p>
                <button
                  class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Delete"
                  @click="handleDeleteSaved(sig.id, $event)"
                >
                  &times;
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500 text-center">Click a signature to use it. Hover to delete.</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
