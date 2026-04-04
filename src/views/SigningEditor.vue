<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSigningEditorStore } from '@/store/signingEditor';
import { usePdfRenderer } from '@/composables/usePdfRenderer';
import { signingApi } from '@/services/signing';
import PdfPageCanvas from '@/components/signing/PdfPageCanvas.vue';
import SigningFieldOverlay from '@/components/signing/SigningFieldOverlay.vue';
import FieldPalette from '@/components/signing/FieldPalette.vue';
import SignerList from '@/components/signing/SignerList.vue';
import type { SigningFieldType } from '@/types/signing';

const route = useRoute();
const router = useRouter();
const store = useSigningEditorStore();
const pdf = usePdfRenderer();

const signingRequestId = computed(() => route.params.signingRequestId as string);
const token = computed(() => (route.query.token as string) || '');
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const containerWidth = ref(700);
const containerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function redirectToLogin() {
  router.replace({
    name: 'login',
    query: {
      instant: 'true',
      redirect: route.fullPath,
    },
  });
}

function isAuthFailure(error: any): boolean {
  return error?.status === 401 || error?.status === 419 || error?.status === 403;
}

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

const activeSignerLabel = computed(() => {
  if (!activeSigner.value) {
    return 'No signer selected';
  }

  return `${activeSigner.value.name} - ${activeSigner.value.email}`;
});

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
    if (pdf.error.value) {
      saveError.value = pdf.error.value;
    }
  } catch (e: any) {
    if (isAuthFailure(e)) {
      saveError.value = 'Your session expired. Redirecting to sign in...';
      redirectToLogin();
      return;
    }
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
      let openerOrigin = '*';
      try {
        if (document.referrer) {
          openerOrigin = new URL(document.referrer).origin;
        }
      } catch {
        openerOrigin = '*';
      }

      window.opener.postMessage({
        type: 'signing-editor-done',
        signingRequestId: signingRequestId.value,
        fieldCount: store.fields.length,
        signerCount: store.signers.length,
      }, openerOrigin);
      window.close();
    } else {
      saveError.value = null;
      alert('Template saved successfully! You can close this tab.');
    }
  } catch (e: any) {
    if (isAuthFailure(e)) {
      saveError.value = 'Your session expired. Redirecting to sign in...';
      redirectToLogin();
      return;
    }
    saveError.value = e?.data?.error || 'Failed to save template';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="signing-editor h-screen flex flex-col bg-[#f3efe6] text-slate-900">
    <!-- Top bar -->
    <header class="flex items-center justify-between gap-4 border-b border-stone-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur shrink-0">
      <div class="min-w-0">
        <div class="flex items-center gap-3">
          <h1 class="truncate text-base font-semibold text-slate-900">
          {{ store.documentName || 'Prepare Document' }}
          </h1>
          <span class="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
            {{ store.fields.length }} field(s)
          </span>
        </div>
        <p class="mt-1 text-xs text-stone-500">
          Place fields for each signer, then finish to send signing invitations.
        </p>
      </div>

      <div class="flex items-center gap-3 text-slate-700">
        <div class="hidden rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 md:block">
          {{ activeSignerLabel }}
        </div>

        <!-- Zoom -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg font-semibold leading-none text-slate-700 transition hover:border-stone-400 hover:bg-stone-50"
          aria-label="Zoom out"
          @click="store.setZoom(store.zoom - 0.1)"
        >
          -
        </button>
        <span class="w-14 text-center text-sm font-medium text-stone-600">{{ Math.round(store.zoom * 100) }}%</span>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg font-semibold leading-none text-slate-700 transition hover:border-stone-400 hover:bg-stone-50"
          aria-label="Zoom in"
          @click="store.setZoom(store.zoom + 0.1)"
        >
          +
        </button>

        <div class="mx-2 h-7 w-px bg-stone-200" />

        <!-- Save -->
        <button
          class="inline-flex items-center rounded-xl bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#25563f] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isSaving || store.fields.length === 0"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Done' }}
        </button>
      </div>
    </header>

    <div class="flex flex-1 min-h-0">
      <!-- Left sidebar -->
      <aside class="w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-[#fcfaf6] p-4 space-y-6">
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
        <div v-if="saveError" class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {{ saveError }}
        </div>

        <!-- Loading -->
        <div v-if="pdf.isLoading.value" class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-[#2d6a4f] border-t-transparent animate-spin" />
            <p class="text-sm font-medium text-stone-600">Loading document...</p>
          </div>
        </div>

        <!-- PDF Pages -->
        <div v-else-if="pdf.pages.value.length > 0" class="flex flex-col items-center space-y-6">
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
            <div class="mt-2 text-center text-xs font-medium text-stone-500">
              Page {{ page.pageIndex + 1 }} of {{ pdf.pageCount.value }}
            </div>
          </div>
        </div>

        <div v-else class="mx-auto mt-10 max-w-xl rounded-3xl border border-stone-200 bg-white/80 p-8 text-center shadow-sm">
          <p class="text-lg font-semibold text-slate-900">Your document is ready for field placement</p>
          <p class="mt-2 text-sm leading-6 text-stone-600">
            If the PDF preview does not appear, confirm your Venmail session is active and reload the editor.
          </p>
        </div>
      </main>
    </div>
  </div>
</template>
