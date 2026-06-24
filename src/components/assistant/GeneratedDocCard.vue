<template>
  <div
    class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center gap-2.5 px-4 py-3">
      <span
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"
      >
        <FileText class="h-4 w-4 text-white" />
      </span>
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {{ doc.title }}
      </span>
      <span
        v-if="doc.status === 'streaming'"
        class="flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-violet-500 motion-safe:animate-pulse" />
        Writing…
      </span>
      <span
        v-else-if="doc.status === 'ready'"
        class="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
      >
        <Check class="h-3 w-3" />
        Ready
      </span>
      <span
        v-else
        class="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300"
      >
        <AlertCircle class="h-3 w-3" />
        Incomplete
      </span>
    </div>

    <!-- Preview -->
    <div class="relative border-t border-gray-100 dark:border-gray-700/60">
      <div
        ref="previewRef"
        class="prose prose-sm dark:prose-invert max-w-none px-4 py-3 text-gray-900 dark:text-gray-100"
        :class="expanded ? 'max-h-[60vh] overflow-y-auto' : 'max-h-56 overflow-hidden'"
        v-html="doc.html || placeholderHtml"
      />
      <div
        v-if="!expanded"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"
      />
      <button
        type="button"
        class="absolute bottom-2 right-3 rounded-md bg-white/90 dark:bg-gray-800/90 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors"
        :aria-label="expanded ? 'Collapse preview' : 'Expand preview'"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Collapse' : 'Expand' }}
      </button>
    </div>

    <!-- Actions -->
    <div
      v-if="doc.status === 'ready'"
      class="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-700/60 px-4 py-2.5"
    >
      <Button
        v-if="doc.savedFileId"
        size="sm"
        class="h-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
        @click="openSaved"
      >
        <ExternalLink class="mr-1.5 h-3.5 w-3.5" />
        Open document
      </Button>
      <Button
        v-else
        size="sm"
        class="h-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
        :disabled="creating"
        @click="openInEditor"
      >
        <Loader2 v-if="creating" class="mr-1.5 h-3.5 w-3.5 motion-safe:animate-spin" />
        <FileText v-else class="mr-1.5 h-3.5 w-3.5" />
        Open in editor
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 text-gray-500 dark:text-gray-300"
        @click="copyHtml"
      >
        <Copy class="mr-1.5 h-3.5 w-3.5" />
        Copy
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 text-gray-500 dark:text-gray-300"
        @click="emit('regenerate')"
      >
        <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
        Regenerate
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Check, Copy, RefreshCw, ExternalLink, Loader2, AlertCircle } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import { toast } from '@/composables/useToast';
import { useFileStore } from '@/store/files';
import type { GeneratedDoc } from '@/store/aiChat';

const props = defineProps<{ doc: GeneratedDoc }>();
const emit = defineEmits<{
  (e: 'regenerate'): void;
  (e: 'saved', fileId: string): void;
}>();

const router = useRouter();
const fileStore = useFileStore();

const expanded = ref(false);
const creating = ref(false);
const previewRef = ref<HTMLElement | null>(null);

const placeholderHtml = '<p class="text-gray-400">Waiting for content…</p>';

// Keep streaming previews pinned to the latest content.
watch(
  () => props.doc.html,
  () => {
    if (props.doc.status !== 'streaming') return;
    nextTick(() => {
      const el = previewRef.value;
      if (el && expanded.value) el.scrollTop = el.scrollHeight;
    });
  },
);

async function openInEditor() {
  if (!props.doc.html || creating.value) return;
  creating.value = true;
  try {
    const created = await fileStore.createNewDocument('docx', props.doc.title, props.doc.html);
    if (created?.id) {
      emit('saved', String(created.id));
      toast.success('Document created');
      router.push(`/docs/${created.id}`);
    } else {
      toast.error('Failed to create document');
    }
  } catch (error) {
    console.error('Failed to create document:', error);
    toast.error('Failed to create document');
  } finally {
    creating.value = false;
  }
}

function openSaved() {
  if (props.doc.savedFileId) router.push(`/docs/${props.doc.savedFileId}`);
}

async function copyHtml() {
  try {
    const plain = new DOMParser().parseFromString(props.doc.html, 'text/html').body?.textContent || '';
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([props.doc.html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    toast.success('Copied to clipboard');
  } catch (error) {
    console.error('Copy failed:', error);
    toast.error('Could not copy document');
  }
}
</script>
