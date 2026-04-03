<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSigningEditorStore } from '@/store/signingEditor';
import { usePdfRenderer } from '@/composables/usePdfRenderer';
import { signingApi } from '@/services/signing';
import PdfPageCanvas from '@/components/signing/PdfPageCanvas.vue';
import SigningFieldOverlay from '@/components/signing/SigningFieldOverlay.vue';
import FieldPalette from '@/components/signing/FieldPalette.vue';
import SignerList from '@/components/signing/SignerList.vue';
import type { SigningFieldType } from '@/types/signing';

const route = useRoute();
const store = useSigningEditorStore();
const pdf = usePdfRenderer();

const signingRequestId = computed(() => route.params.signingRequestId as string);
const token = computed(() => (route.query.token as string) || '');
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const containerWidth = ref(700);
const containerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

// Field counts per signer for the signer list
const fieldCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const f of store.fields) {
    counts[f.signerEmail] = (counts[f.signerEmail] || 0) + 1;
  }
  return counts;
});

const activeSigner = computed(() =>
  store.signers.find(s => s.email === store.activeSignerEmail)
);

// Load signing session on mount
onMounted(async () => {
  try {
    const data = await signingApi.fetchEditorSession(signingRequestId.value, token.value);
    store.initEditor({
      signingRequestId: data.id,
      documentUrl: data.documentUrl,
      documentName: data.documentName,
      fields: data.fields || [],
      signers: data.signers || [],
    });
    await pdf.loadPdf(data.documentUrl);
  } catch (e: any) {
    saveError.value = e?.data?.error || 'Failed to load document';
  }

  // Measure container width
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

// Handle dropping a field from the palette onto a PDF page
function handlePageDrop(e: DragEvent, pageIndex: number) {
  const type = e.dataTransfer?.getData('signing-field-type') as SigningFieldType;
  if (!type) return;

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  store.addField(type, pageIndex, x, y);
}

function handleAddFieldFromPalette(type: SigningFieldType) {
  // Add to center of current page
  store.addField(type, store.currentPage, 40, 40);
}

function handlePageDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
}

async function handleSave() {
  if (store.fields.length === 0) {
    saveError.value = 'Please add at least one signature field';
    return;
  }
  if (store.signers.length === 0) {
    saveError.value = 'Please add at least one signer';
    return;
  }

  isSaving.value = true;
  saveError.value = null;

  try {
    await signingApi.saveFields(
      signingRequestId.value,
      store.fields,
      store.signers.map(s => ({ email: s.email, name: s.name })),
      token.value
    );

    // Notify the opener window (mailer_web composer)
    if (window.opener) {
      window.opener.postMessage({
        type: 'signing-editor-done',
        signingRequestId: signingRequestId.value,
        fieldCount: store.fields.length,
        signerCount: store.signers.length,
      }, window.location.origin);
      window.close();
    } else {
      saveError.value = null;
      alert('Template saved successfully! You can close this tab.');
    }
  } catch (e: any) {
    saveError.value = e?.data?.error || 'Failed to save template';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="signing-editor h-screen flex flex-col bg-gray-100">
    <!-- Top bar -->
    <header class="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm shrink-0">
      <div class="flex items-center gap-3">
        <h1 class="text-sm font-semibold text-gray-800 truncate max-w-xs">
          {{ store.documentName || 'Prepare Document' }}
        </h1>
        <span class="text-xs text-gray-400">{{ store.fields.length }} field(s)</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Zoom -->
        <button class="px-2 py-1 text-xs border rounded hover:bg-gray-50" @click="store.setZoom(store.zoom - 0.1)">-</button>
        <span class="text-xs text-gray-500 w-12 text-center">{{ Math.round(store.zoom * 100) }}%</span>
        <button class="px-2 py-1 text-xs border rounded hover:bg-gray-50" @click="store.setZoom(store.zoom + 0.1)">+</button>

        <div class="w-px h-6 bg-gray-200 mx-2" />

        <!-- Save -->
        <button
          class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          :disabled="isSaving || store.fields.length === 0"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Done' }}
        </button>
      </div>
    </header>

    <div class="flex flex-1 min-h-0">
      <!-- Left sidebar -->
      <aside class="w-56 bg-white border-r p-3 overflow-y-auto shrink-0 space-y-6">
        <SignerList
          :signers="store.signers"
          :active-signer-email="store.activeSignerEmail"
          :field-counts="fieldCounts"
          @select-signer="store.setActiveSigner"
          @add-signer="store.addSigner"
          @remove-signer="store.removeSigner"
        />

        <FieldPalette
          :active-signer-color="activeSigner?.color"
          @add-field="handleAddFieldFromPalette"
        />
      </aside>

      <!-- PDF area -->
      <main ref="containerRef" class="flex-1 overflow-auto p-6">
        <!-- Error -->
        <div v-if="saveError" class="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {{ saveError }}
        </div>

        <!-- Loading -->
        <div v-if="pdf.isLoading.value" class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-500">Loading document...</p>
          </div>
        </div>

        <!-- PDF Pages -->
        <div v-else class="space-y-6 flex flex-col items-center">
          <div
            v-for="page in pdf.pages.value"
            :key="page.pageIndex"
            class="relative"
            @drop="handlePageDrop($event, page.pageIndex)"
            @dragover="handlePageDragOver"
          >
            <PdfPageCanvas
              :image-url="page.imageUrl"
              :page-index="page.pageIndex"
              :container-width="containerWidth * store.zoom"
              :original-width="page.width"
              :original-height="page.height"
            >
              <template #default="{ pageWidth, pageHeight }">
                <SigningFieldOverlay
                  v-for="field in store.fieldsByPage[page.pageIndex] || []"
                  :key="field.id"
                  :field="field"
                  :signer="store.signers.find(s => s.email === field.signerEmail)"
                  :page-width="pageWidth"
                  :page-height="pageHeight"
                  :is-selected="store.selectedFieldId === field.id"
                  @select="store.selectField"
                  @move="store.moveField"
                  @resize="store.resizeField"
                  @delete="store.removeField"
                />
              </template>
            </PdfPageCanvas>

            <!-- Page number -->
            <div class="text-center text-xs text-gray-400 mt-1">
              Page {{ page.pageIndex + 1 }} of {{ pdf.pageCount.value }}
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
