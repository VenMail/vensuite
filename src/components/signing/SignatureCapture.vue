<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { VueSignaturePad } from 'vue-signature-pad';

const props = defineProps<{
  modelValue: boolean;
  signerName?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [base64Png: string];
}>();

type CaptureMode = 'draw' | 'type';
const mode = ref<CaptureMode>('draw');
interface SignaturePadInstance {
  clearSignature(): void;
  saveSignature(type?: string): { isEmpty: boolean; data: string };
  resizeCanvas(): void;
}
const signaturePad = ref<SignaturePadInstance | null>(null);
const typedName = ref(props.signerName || '');

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
  emit('save', dataUrl);
  close();
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
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <h3 class="font-semibold text-gray-900">Add Signature</h3>
          <button class="text-gray-400 hover:text-gray-600" @click="close">
            <span class="text-xl">&times;</span>
          </button>
        </div>

        <!-- Mode tabs -->
        <div class="flex border-b">
          <button
            class="flex-1 px-4 py-2 text-sm font-medium transition-colors"
            :class="mode === 'draw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
            @click="mode = 'draw'"
          >
            Draw
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm font-medium transition-colors"
            :class="mode === 'type' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
            @click="mode = 'type'"
          >
            Type
          </button>
        </div>

        <!-- Content -->
        <div class="p-4">
          <!-- Draw mode -->
          <div v-if="mode === 'draw'" class="space-y-3">
            <div class="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50" style="height: 200px;">
              <VueSignaturePad
                ref="signaturePad"
                :options="{ penColor: '#000', minWidth: 1.5, maxWidth: 3 }"
                width="100%"
                height="200px"
              />
            </div>
            <div class="flex justify-between">
              <button
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
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
              class="w-full px-3 py-2 border rounded-lg text-lg"
            />
            <div
              class="h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
            >
              <span class="text-3xl italic font-serif text-gray-800">{{ typedName || 'Your Name' }}</span>
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
        </div>
      </div>
    </div>
  </Teleport>
</template>
