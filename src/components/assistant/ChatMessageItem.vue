<template>
  <!-- User message -->
  <div v-if="message.role === 'user'" class="flex flex-col items-end gap-1.5">
    <div
      v-if="message.attachments.length > 0"
      class="flex flex-wrap justify-end gap-1.5"
    >
      <span
        v-for="attachment in message.attachments"
        :key="attachment.id"
        class="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 max-w-[16rem]"
        :title="`${attachment.name} (${attachment.role})`"
      >
        <FileText class="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
        <span class="truncate">{{ attachment.name }}</span>
        <span
          class="rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
        >
          {{ attachment.role }}
        </span>
      </span>
    </div>
    <div
      class="max-w-[85%] rounded-2xl rounded-br-md bg-violet-50 dark:bg-violet-500/15 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words"
    >{{ message.text }}</div>
  </div>

  <!-- Assistant message -->
  <div v-else class="flex flex-col gap-3">
    <div
      v-if="message.text"
      class="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 [&>:first-child]:mt-0 [&>:last-child]:mb-0"
      v-html="renderedText"
    />

    <GeneratedDocCard
      v-for="doc in message.docs"
      :key="doc.id"
      :doc="doc"
      @regenerate="emit('regenerate')"
      @saved="(fileId: string) => emit('doc-saved', doc.id, fileId)"
    />

    <!-- Streaming cursor (only when no doc is mid-stream) -->
    <span
      v-if="showCursor"
      class="inline-block h-4 w-2 rounded-sm bg-violet-500/70 motion-safe:animate-pulse"
      aria-hidden="true"
    />

    <!-- Error state -->
    <div
      v-if="message.status === 'error'"
      class="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3"
    >
      <AlertCircle class="h-4 w-4 flex-shrink-0 text-red-500" />
      <span class="flex-1 text-sm text-red-700 dark:text-red-300">
        Something went wrong while generating this reply.
      </span>
      <Button
        size="sm"
        variant="outline"
        class="h-8 border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20"
        @click="emit('retry')"
      >
        <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FileText, AlertCircle, RefreshCw } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import GeneratedDocCard from './GeneratedDocCard.vue';
import type { ChatMsg } from '@/store/aiChat';

const props = defineProps<{ message: ChatMsg }>();
const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'regenerate'): void;
  (e: 'doc-saved', docId: string, fileId: string): void;
}>();

const showCursor = computed(
  () =>
    props.message.status === 'streaming' &&
    !props.message.docs.some((d) => d.status === 'streaming'),
);

/**
 * Assistant conversational text is mostly plain prose, but the model may emit
 * light HTML. Render as HTML; convert bare newlines to paragraph breaks when
 * the text contains no markup at all.
 */
const renderedText = computed(() => {
  const text = props.message.text;
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return renderMarkdown(text);
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineRender(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const parts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  const listItems: string[] = [];

  const flushList = () => {
    if (!listType) return;
    parts.push(`<${listType}>${listItems.join('')}</${listType}>`);
    listItems.length = 0;
    listType = null;
  };

  for (const line of lines) {
    const hm = /^(#{1,6})\s+(.+)/.exec(line);
    if (hm) {
      flushList();
      parts.push(`<h${hm[1].length}>${inlineRender(hm[2])}</h${hm[1].length}>`);
      continue;
    }
    const ul = /^[ \t]*[*\-]\s+(.+)/.exec(line);
    if (ul) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(`<li>${inlineRender(ul[1])}</li>`);
      continue;
    }
    const ol = /^[ \t]*\d+\.\s+(.+)/.exec(line);
    if (ol) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(`<li>${inlineRender(ol[1])}</li>`);
      continue;
    }
    if (/^[-_]{3,}$/.test(line.trim())) {
      flushList();
      parts.push('<hr>');
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    flushList();
    parts.push(`<p>${inlineRender(line)}</p>`);
  }
  flushList();
  return parts.join('');
}
</script>
