<template>
  <div
    class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10 transition-[border-color,box-shadow]"
  >
    <!-- Attachment chips -->
    <div
      v-if="chatStore.draftAttachments.length > 0 || pendingCount > 0"
      class="flex flex-wrap gap-1.5 px-3 pt-3"
    >
      <button
        v-for="attachment in chatStore.draftAttachments"
        :key="attachment.id"
        type="button"
        class="group flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 pl-2 pr-1 py-1 text-xs text-gray-700 dark:text-gray-200 hover:border-violet-300 dark:hover:border-violet-700 transition-colors max-w-[16rem]"
        :title="roleTooltip(attachment.role)"
        :aria-label="`${attachment.name}, role ${attachment.role}. Click to change role.`"
        @click="chatStore.cycleDraftAttachmentRole(attachment.id)"
      >
        <FileText class="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
        <span class="truncate">{{ attachment.name }}</span>
        <span
          class="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          :class="roleBadgeClass(attachment.role)"
        >
          {{ attachment.role }}
        </span>
        <span
          role="button"
          tabindex="0"
          class="p-0.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors"
          :aria-label="`Remove ${attachment.name}`"
          @click.stop="chatStore.removeDraftAttachment(attachment.id)"
          @keydown.enter.stop="chatStore.removeDraftAttachment(attachment.id)"
        >
          <X class="h-3 w-3" />
        </span>
      </button>

      <!-- In-flight conversions -->
      <span
        v-for="pending in pendingNames"
        :key="pending"
        class="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 max-w-[16rem]"
      >
        <Loader2 class="h-3.5 w-3.5 motion-safe:animate-spin flex-shrink-0" />
        <span class="truncate">{{ pending }}</span>
      </span>
    </div>

    <!-- Textarea -->
    <textarea
      ref="textareaRef"
      v-model="text"
      rows="1"
      class="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
      :style="{ maxHeight: maxTextareaHeight }"
      placeholder="Ask anything about your documents — attach files to work with them"
      aria-label="Message the assistant"
      @input="autogrow"
      @keydown="onKeydown"
    />

    <!-- Bottom row -->
    <div class="flex items-center justify-between px-2.5 pb-2.5 pt-1">
      <div class="flex items-center gap-0.5">
        <!-- Attachment picker -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
              aria-label="Attach documents"
            >
              <Paperclip class="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-56">
            <DropdownMenuItem class="gap-2 cursor-pointer" @click="triggerUpload">
              <Upload class="h-4 w-4 text-gray-500" />
              Upload .docx
            </DropdownMenuItem>
            <DropdownMenuItem class="gap-2 cursor-pointer" @click="isPickerOpen = true">
              <FolderOpen class="h-4 w-4 text-gray-500" />
              Choose from workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Model picker (only shown once models are loaded) -->
        <DropdownMenu v-if="aiPrefs.models.length > 0">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
              :aria-label="`AI model: ${aiPrefs.activeModelLabel}`"
            >
              <span class="font-medium">{{ aiPrefs.activeModelLabel }}</span>
              <span
                class="rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide"
                :class="tierBadgeClass(aiPrefs.activeModelTier)"
              >{{ aiPrefs.activeModelTier }}</span>
              <ChevronDown class="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-56">
            <DropdownMenuItem
              v-for="model in aiPrefs.models"
              :key="model.id"
              class="cursor-pointer gap-2"
              :class="model.id === aiPrefs.activeModelId ? 'bg-violet-50 dark:bg-violet-500/15' : ''"
              @click="aiPrefs.selectModel(model.id)"
            >
              <span class="flex-1">{{ model.label }}</span>
              <span
                class="rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide"
                :class="tierBadgeClass(model.tier)"
              >{{ model.tier }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Send / Stop -->
      <button
        v-if="!streaming"
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        :disabled="!canSend"
        aria-label="Send message"
        @click="submit"
      >
        <ArrowUp class="h-4 w-4" />
      </button>
      <button
        v-else
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm transition-colors hover:bg-gray-700 dark:hover:bg-gray-300"
        aria-label="Stop generating"
        @click="emit('stop')"
      >
        <Square class="h-3 w-3 fill-current" />
      </button>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".docx"
      multiple
      class="hidden"
      aria-hidden="true"
      tabindex="-1"
      @change="onFilesChosen"
    />

  </div>

  <!-- Workspace document picker (Teleport avoids z-index / portal issues) -->
  <Teleport to="body">
    <div
      v-if="isPickerOpen"
      class="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
      @click.self="closePicker"
    >
      <div
        class="fixed left-1/2 top-1/2 z-[201] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-picker-title"
      >
        <div class="flex items-start justify-between px-4 pt-4 pb-2">
          <div>
            <h2 id="ws-picker-title" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Attach from workspace
            </h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Pick a document to use in this conversation.
            </p>
          </div>
          <button
            type="button"
            class="ml-4 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
            @click="closePicker"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="px-4 pb-3">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              v-model="pickerQuery"
              placeholder="Search documents…"
              class="h-9 pl-8 text-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              aria-label="Search workspace documents"
            />
          </div>
        </div>
        <div class="max-h-64 overflow-y-auto border-t border-gray-100 dark:border-gray-700/60 py-1">
          <div
            v-if="isLoadingDocs"
            class="flex items-center justify-center px-4 py-6 gap-2 text-sm text-gray-400 dark:text-gray-500"
          >
            <Loader2 class="h-4 w-4 motion-safe:animate-spin" />
            Loading…
          </div>
          <template v-else>
            <button
              v-for="file in filteredWorkspaceDocs"
              :key="String(file.id)"
              type="button"
              class="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              @click="pickWorkspaceDoc(file)"
            >
              <FileText class="h-4 w-4 text-violet-500 flex-shrink-0" />
              <span class="truncate">{{ file.title || file.file_name }}</span>
            </button>
            <p
              v-if="filteredWorkspaceDocs.length === 0"
              class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500"
            >
              {{ pickerQuery ? 'No documents match your search' : 'No documents in your workspace yet' }}
            </p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, nextTick, onMounted } from 'vue';
import {
  Paperclip,
  ArrowUp,
  Square,
  Upload,
  FolderOpen,
  FileText,
  X,
  Loader2,
  Search,
  ChevronDown,
} from 'lucide-vue-next';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from '@/composables/useToast';
import { useFileStore } from '@/store/files';
import { useAiChatStore } from '@/store/aiChat';
import { useAiPrefsStore } from '@/store/aiPrefs';
import { convertDocxSmart } from '@/services/docx';
import type { FileData } from '@/types';

const props = defineProps<{ streaming: boolean }>();
const emit = defineEmits<{
  (e: 'send', text: string): void;
  (e: 'stop'): void;
}>();

const fileStore = useFileStore();
const chatStore = useAiChatStore();
const aiPrefs = useAiPrefsStore();

const text = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isPickerOpen = ref(false);
const pickerQuery = ref('');
const isLoadingDocs = ref(false);
const pendingNames = ref<string[]>([]);
const pendingCount = computed(() => pendingNames.value.length);

function closePicker() {
  isPickerOpen.value = false;
  pickerQuery.value = '';
}

watch(isPickerOpen, async (open) => {
  if (!open) return;
  isLoadingDocs.value = true;
  try {
    await fileStore.loadDocuments();
  } catch {
    // Show whatever is cached on error
  } finally {
    isLoadingDocs.value = false;
  }
});

watchEffect((onCleanup) => {
  if (!isPickerOpen.value) return;
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePicker(); };
  window.addEventListener('keydown', handler);
  onCleanup(() => window.removeEventListener('keydown', handler));
});

// ~8 rows of text-sm (20px line height) + vertical padding.
const maxTextareaHeight = '176px';

const canSend = computed(
  () =>
    (text.value.trim().length > 0 || chatStore.draftAttachments.length > 0) &&
    !props.streaming &&
    pendingCount.value === 0,
);

const workspaceDocs = computed<FileData[]>(() =>
  fileStore.allFiles.filter((f) => !f.is_folder && f.file_type === 'docx'),
);

const filteredWorkspaceDocs = computed<FileData[]>(() => {
  const q = pickerQuery.value.trim().toLowerCase();
  if (!q) return workspaceDocs.value;
  return workspaceDocs.value.filter((f) =>
    (f.title || f.file_name || '').toLowerCase().includes(q),
  );
});

function roleTooltip(role: 'primary' | 'reference' | 'context'): string {
  const descriptions: Record<string, string> = {
    primary: 'Primary — the main document to create or update.',
    reference: 'Reference — material the assistant should follow (e.g. an RFP).',
    context: 'Context — background information only.',
  };
  return `${descriptions[role]} Click to change role.`;
}

function roleBadgeClass(role: 'primary' | 'reference' | 'context'): string {
  switch (role) {
    case 'primary':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300';
    case 'reference':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case 'fast':
      return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
    case 'quality':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
  }
}

// ── Composer text handling ───────────────────────────────────────────

function autogrow() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    submit();
  }
}

function submit() {
  if (!canSend.value) return;
  const value = text.value.trim();
  text.value = '';
  nextTick(autogrow);
  emit('send', value);
}

function prefill(value: string) {
  text.value = value;
  nextTick(() => {
    autogrow();
    focusInput();
  });
}

function focusInput() {
  textareaRef.value?.focus();
}

defineExpose({ prefill, focus: focusInput });

// ── Attachments ──────────────────────────────────────────────────────

function triggerUpload() {
  fileInputRef.value?.click();
}

async function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  await Promise.all(files.map((file) => attachUpload(file)));
}

async function attachUpload(file: File) {
  pendingNames.value.push(file.name);
  try {
    const result = await convertDocxSmart(file, file.name);
    chatStore.addDraftAttachment({
      id: uuidv4(),
      name: file.name,
      html: result.html,
      plainText: result.plainText,
    });
  } catch (error) {
    console.error('Failed to convert uploaded document:', error);
    toast.error(`Could not read ${file.name}`);
  } finally {
    pendingNames.value = pendingNames.value.filter((n) => n !== file.name);
  }
}

/** Detect whether a stored content string is HTML (vs canvas/VTable JSON). */
function looksLikeHtml(content: string): boolean {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  return /<[a-z!/][\s\S]*>/i.test(trimmed);
}

function stripTags(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body?.textContent || '').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

async function pickWorkspaceDoc(meta: FileData) {
  closePicker();
  const name = meta.title || meta.file_name || 'Document';
  const id = String(meta.id);
  if (chatStore.draftAttachments.some((a) => a.sourceFileId === id)) {
    toast.info('That document is already attached');
    return;
  }
  pendingNames.value.push(name);
  try {
    let content = meta.content || '';
    if (!content) {
      const loaded = await fileStore.loadDocument(id, 'docx');
      content = loaded?.content || '';
    }
    let html = '';
    if (content && looksLikeHtml(content)) {
      html = content;
    } else {
      // Download-only / unconverted doc — convert from the source binary.
      const converted = await fileStore.convertUploadedFile({ appFileId: id, target: 'docx' });
      html = converted?.content || '';
    }
    if (!html) {
      toast.error('That document has no readable content');
      return;
    }
    chatStore.addDraftAttachment({
      id: uuidv4(),
      name,
      html,
      plainText: stripTags(html),
      sourceFileId: id,
    });
  } catch (error) {
    console.error('Failed to resolve picked document:', error);
    toast.error('Could not load that document');
  } finally {
    pendingNames.value = pendingNames.value.filter((n) => n !== name);
  }
}

onMounted(() => {
  autogrow();
});
</script>
