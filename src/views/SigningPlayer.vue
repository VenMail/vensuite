<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSigningPlayerStore } from '@/store/signingPlayer';
import { usePdfRenderer } from '@/composables/usePdfRenderer';
import { useLibPdf } from '@/composables/useLibPdf';
import { useSavedSignatures } from '@/composables/useSavedSignatures';
import PdfPageCanvas from '@/components/signing/PdfPageCanvas.vue';
import SigningFieldInput from '@/components/signing/SigningFieldInput.vue';
import CompletedSigningField from '@/components/signing/CompletedSigningField.vue';
import SignatureCapture from '@/components/signing/SignatureCapture.vue';

const route = useRoute();
const store = useSigningPlayerStore();
const pdf = usePdfRenderer();
const libpdf = useLibPdf();

const token = computed(() => route.params.token as string);
const containerWidth = ref(700);
const containerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const { savedSignatures } = useSavedSignatures(() => store.session?.signerEmail);
const savedSignatureDismissed = ref(false);
const showSavedSignaturePicker = ref(false);

const suggestedSignature = computed(() => savedSignatures.value[0] ?? null);
const showSavedSignatureBanner = computed(() =>
  !store.isCompleted
  && !savedSignatureDismissed.value
  && store.emptySignatureFields.length > 0
  && suggestedSignature.value !== null
);

function applyRememberedSignature(dataUrl: string) {
  if (store.fillSignatureFields(dataUrl) > 0) {
    savedSignatureDismissed.value = true;
  }
  showSavedSignaturePicker.value = false;
}

onMounted(async () => {
  await store.loadSession(token.value);

  if (store.session?.documentUrl) {
    // Fetch PDF once and share with both renderers
    try {
      const response = await fetch(store.session.documentUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const pdfBuffer = await response.arrayBuffer();
      // Slice first — pdfjs may detach/transfer the original ArrayBuffer
      const libPdfBuffer = pdfBuffer.slice(0);
      await pdf.loadPdf(pdfBuffer);
      await libpdf.loadPdf(libPdfBuffer);
    } catch {
      // Fallback: let each renderer load from URL independently
      await pdf.loadPdf(store.session.documentUrl);
      try { await libpdf.loadPdf(store.session.documentUrl); } catch { /* LibPDF optional */ }
    }
  }

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      containerWidth.value = entries[0]?.contentRect.width || 700;
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

const isProcessing = ref(false);

async function handleSubmit() {
  if (isProcessing.value || store.isSubmitting) return;
  isProcessing.value = true;
  // Build field values map for LibPDF
  // Native AcroForm fields (text, checkbox, date) get filled by LibPDF
  // Signature/initials fields get drawn as images by LibPDF
  const nativeFieldValues: Record<string, string | boolean> = {};
  const signatureDraws: Array<{ pageIndex: number; fieldId: string; value: string }> = [];

  if (store.session) {
    for (const field of store.session.fields) {
      const answer = store.answers[field.id];
      if (answer === undefined || answer === '') continue;

      if (field.nativeFieldName && (field.type === 'text' || field.type === 'date' || field.type === 'checkbox')) {
        // Native AcroForm field — fill via LibPDF
        nativeFieldValues[field.nativeFieldName] = answer;
      } else if (field.type === 'signature' || field.type === 'initials') {
        // Signature image — draw on page via LibPDF
        if (typeof answer === 'string' && (answer.startsWith('data:image/') || answer.length > 100)) {
          signatureDraws.push({ pageIndex: field.pageIndex, fieldId: field.id, value: answer });
        }
      } else if (field.type === 'image') {
        // Image values are public-disk paths; the backend burns them into the PDF.
        continue;
      }
    }
  }

  // If we have native fields or signatures, process with LibPDF
  let filledPdfBytes: Uint8Array | null = null;

  if (Object.keys(nativeFieldValues).length > 0 || signatureDraws.length > 0) {
    try {
      // Fill native form fields (mutates pdfDoc in-place)
      if (Object.keys(nativeFieldValues).length > 0) {
        const fillResult = await libpdf.fillForm(nativeFieldValues, { flatten: false });
        if (fillResult === null) {
          console.warn('LibPDF: form is empty or missing, skipping native field fill');
        }
      }

      // Draw signature images on their respective pages (mutates pdfDoc in-place)
      for (const draw of signatureDraws) {
        const field = store.session?.fields.find(f => f.id === draw.fieldId);
        if (!field) continue;

        // Convert percentage coordinates to PDF user space
        const page = libpdf.pdfDoc.value?.getPage(field.pageIndex);
        if (!page) continue;

        const pdfWidth = page.width;
        const pdfHeight = page.height;
        const x = (field.x / 100) * pdfWidth;
        // PDF y is from bottom; field.y is from top
        const y = pdfHeight - ((field.y + field.height) / 100) * pdfHeight;
        const w = (field.width / 100) * pdfWidth;
        const h = (field.height / 100) * pdfHeight;

        // Convert base64 data URL or raw base64 to Uint8Array
        const base64 = draw.value.includes(',')
          ? draw.value.split(',')[1]
          : draw.value;
        if (!base64) continue;
        const binaryStr = atob(base64);
        const imageBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          imageBytes[i] = binaryStr.charCodeAt(i);
        }

        await libpdf.drawImageOnPage(field.pageIndex, imageBytes, { x, y, width: w, height: h });
      }

      // Flatten form fields (bake values into page content) after all fills + draws
      // Always flatten if a form exists — even with only signatures, empty fields should be baked
      const form = libpdf.pdfDoc.value?.getForm();
      if (form && !form.isEmpty) {
        form.flatten();
      }

      filledPdfBytes = await libpdf.save();
    } catch (e: any) {
      console.error('LibPDF fill error:', e);
      // Fall back to normal submit (backend overlay handles all fields)
    }
  }

  // Submit with optional filled PDF
  try {
    const success = await store.submit(token.value, filledPdfBytes);
    if (!success) return;
  } finally {
    isProcessing.value = false;
  }
}

function handleFieldUpdate(fieldId: string, value: string | boolean) {
  store.setFieldValue(fieldId, value);
}
</script>

<template>
  <div class="signing-player min-h-screen bg-gray-100">
    <!-- Top bar -->
    <header v-if="!store.isCompleted" class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
      <div>
        <h1 class="text-sm font-semibold text-gray-800">
          {{ store.session?.documentName || 'Sign Document' }}
        </h1>
        <p class="text-xs text-gray-500">
          Signing as {{ store.session?.signerName || store.session?.signerEmail }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Progress -->
        <div class="flex items-center gap-2">
          <div class="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-600 rounded-full transition-all"
              :style="{ width: `${store.progress * 100}%` }"
            />
          </div>
          <span class="text-xs text-gray-500">
            {{ store.completedFields.length }}/{{ store.requiredFields.length }}
          </span>
        </div>

        <button
          class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!store.canSubmit || store.isSubmitting || isProcessing"
          @click="handleSubmit"
        >
          {{ isProcessing || store.isSubmitting ? 'Submitting...' : 'Complete Signing' }}
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p class="text-sm text-gray-500">Loading document...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="flex items-center justify-center h-64">
      <div class="text-center max-w-md">
        <p class="text-red-600 font-medium mb-2">Unable to load document</p>
        <p class="text-sm text-gray-500">{{ store.error }}</p>
      </div>
    </div>

    <!-- Completed -->
    <div v-else-if="store.isCompleted" class="flex items-center justify-center h-64">
      <div class="text-center max-w-md">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl text-green-600">OK</span>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">
          {{ store.isAlreadyCompleted ? 'Already Signed' : 'Signing Complete' }}
        </h2>
        <p class="text-sm text-gray-500">
          {{ store.isAlreadyCompleted
            ? 'Your completed responses are saved and this signing session is read-only.'
            : 'Thank you for signing this document. All parties will be notified once everyone has signed.'
          }}
        </p>
        <div class="mt-6">
          <a
            v-if="store.downloadUrl"
            :href="store.downloadUrl"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Download signed document
          </a>
          <p v-else-if="store.signedDocumentStatusUrl" class="text-xs text-gray-500">
            Preparing the final signed document...
          </p>
          <p v-else class="text-xs text-gray-500">
            The final signed document will be emailed to all parties once it is ready.
          </p>
        </div>
      </div>
    </div>

    <!-- Document -->
    <main v-else ref="containerRef" class="max-w-4xl mx-auto p-6 space-y-6">
      <div
        v-if="store.submitError"
        role="alert"
        class="mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <p class="min-w-0 flex-1">{{ store.submitError }}</p>
        <button
          type="button"
          aria-label="Dismiss submission error"
          class="shrink-0 rounded px-1 text-lg leading-none text-red-600 hover:text-red-800"
          @click="store.clearSubmitError"
        >
          ×
        </button>
      </div>

      <div
        v-if="showSavedSignatureBanner && suggestedSignature"
        class="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
      >
        <img
          :src="suggestedSignature.dataUrl"
          alt="Remembered signature"
          class="h-10 w-24 object-contain"
        />
        <p class="min-w-0 flex-1 text-sm text-blue-900">
          Use your saved signature <span class="text-blue-700">({{ suggestedSignature.label }})</span>?
        </p>
        <button
          type="button"
          class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          @click="applyRememberedSignature(suggestedSignature.dataUrl)"
        >
          Use my saved signature
        </button>
        <button
          type="button"
          class="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg"
          @click="showSavedSignaturePicker = true"
        >
          Choose another
        </button>
      </div>

      <SignatureCapture
        v-model="showSavedSignaturePicker"
        :signer-email="store.session?.signerEmail"
        initial-mode="saved"
        @save="applyRememberedSignature"
      />

      <div
        v-for="page in pdf.pages.value"
        :key="page.pageIndex"
        class="relative flex justify-center"
      >
        <PdfPageCanvas
          :image-url="page.imageUrl"
          :page-index="page.pageIndex"
          :container-width="containerWidth"
          :original-width="page.width"
          :original-height="page.height"
        >
          <template #default="{ pageWidth, pageHeight }">
            <CompletedSigningField
              v-for="field in store.completedFieldsByPage[page.pageIndex] || []"
              :key="`completed-${field.id}`"
              :field="field"
              :page-width="pageWidth"
              :page-height="pageHeight"
            />
            <SigningFieldInput
              v-for="field in store.fieldsByPage[page.pageIndex] || []"
              :key="field.id"
              :field="field"
              :value="store.answers[field.id]"
              :page-width="pageWidth"
              :page-height="pageHeight"
              :signer-name="store.session?.signerName"
              :signer-email="store.session?.signerEmail"
              :signer-token="token"
              @update-value="handleFieldUpdate"
            />
          </template>
        </PdfPageCanvas>
      </div>

      <!-- Bottom submit button (mobile) -->
      <div class="flex justify-center pb-8">
        <button
          class="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!store.canSubmit || store.isSubmitting || isProcessing"
          @click="handleSubmit"
        >
          {{ isProcessing || store.isSubmitting ? 'Submitting...' : 'Complete Signing' }}
        </button>
      </div>
    </main>
  </div>
</template>
