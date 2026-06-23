<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSigningPlayerStore } from '@/store/signingPlayer';
import { usePdfRenderer } from '@/composables/usePdfRenderer';
import PdfPageCanvas from '@/components/signing/PdfPageCanvas.vue';
import SigningFieldInput from '@/components/signing/SigningFieldInput.vue';

const route = useRoute();
const store = useSigningPlayerStore();
const pdf = usePdfRenderer();

const token = computed(() => route.params.token as string);
const containerWidth = ref(700);
const containerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  await store.loadSession(token.value);

  if (store.session?.documentUrl) {
    await pdf.loadPdf(store.session.documentUrl);
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

async function handleSubmit() {
  const success = await store.submit(token.value);
  if (!success) return;
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
          :disabled="!store.canSubmit || store.isSubmitting"
          @click="handleSubmit"
        >
          {{ store.isSubmitting ? 'Submitting...' : 'Complete Signing' }}
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
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Signing Complete</h2>
        <p class="text-sm text-gray-500">
          Thank you for signing this document. All parties will be notified once everyone has signed.
        </p>
        <div class="mt-6">
          <a
            v-if="store.downloadUrl"
            :href="store.downloadUrl"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Download signed document
          </a>
          <p v-else class="text-xs text-gray-500">
            The final signed document will be emailed to all parties once it is ready.
          </p>
        </div>
      </div>
    </div>

    <!-- Document -->
    <main v-else ref="containerRef" class="max-w-4xl mx-auto p-6 space-y-6">
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
            <SigningFieldInput
              v-for="field in store.fieldsByPage[page.pageIndex] || []"
              :key="field.id"
              :field="field"
              :value="store.answers[field.id]"
              :page-width="pageWidth"
              :page-height="pageHeight"
              :signer-name="store.session?.signerName"
              @update-value="handleFieldUpdate"
            />
          </template>
        </PdfPageCanvas>
      </div>

      <!-- Bottom submit button (mobile) -->
      <div class="flex justify-center pb-8">
        <button
          class="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!store.canSubmit || store.isSubmitting"
          @click="handleSubmit"
        >
          {{ store.isSubmitting ? 'Submitting...' : 'Complete Signing' }}
        </button>
      </div>
    </main>
  </div>
</template>
