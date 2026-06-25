<template>
  <div class="flex h-full min-h-0 bg-white dark:bg-gray-900">
    <ConversationRail
      @new-chat="startNewChat"
      @select="chatStore.setActive"
      @delete="chatStore.deleteConversation"
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Header -->
      <header
        class="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700/70 px-4"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600"
          >
            <Sparkles class="h-4 w-4 text-white" />
          </span>
          <h1 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</h1>
        </div>

        <!-- Mobile: history + new chat -->
        <div class="flex items-center gap-1 lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Conversation history"
              >
                <History class="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-64 max-h-80 overflow-y-auto">
              <DropdownMenuItem
                v-for="convo in chatStore.sortedConversations"
                :key="convo.id"
                class="cursor-pointer"
                :class="convo.id === chatStore.activeId ? 'bg-violet-50 dark:bg-violet-500/15' : ''"
                @click="chatStore.setActive(convo.id)"
              >
                <span class="truncate">{{ convo.title }}</span>
              </DropdownMenuItem>
              <div
                v-if="chatStore.sortedConversations.length === 0"
                class="px-2 py-3 text-center text-xs text-gray-400"
              >
                No conversations yet
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="New chat"
            @click="startNewChat"
          >
            <Plus class="h-4 w-4" />
          </button>
        </div>
      </header>

      <!-- Messages -->
      <div ref="scrollRef" class="relative min-h-0 flex-1 overflow-y-auto" @scroll="onScroll">
        <AssistantEmptyState v-if="!hasMessages" @pick="onWorkflowPick" />

        <div v-else class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
          <ChatMessageItem
            v-for="message in activeMessages"
            :key="message.id"
            :message="message"
            @retry="resend"
            @regenerate="resend"
            @doc-saved="(docId: string, fileId: string) => onDocSaved(message.id, docId, fileId)"
          />
        </div>
      </div>

      <!-- Jump to latest -->
      <div class="relative">
        <Transition
          enter-active-class="motion-safe:transition-all motion-safe:duration-200"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="motion-safe:transition-all motion-safe:duration-150"
          leave-to-class="opacity-0 translate-y-1"
        >
          <button
            v-if="!stickToBottom && isStreaming"
            type="button"
            class="absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Jump to latest message"
            @click="jumpToLatest"
          >
            <ArrowDown class="h-3.5 w-3.5" />
            Jump to latest
          </button>
        </Transition>
      </div>

      <!-- Composer -->
      <div
        class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 backdrop-blur"
      >
        <div class="mx-auto max-w-3xl px-4 py-3">
          <ChatComposer ref="composerRef" :streaming="isStreaming" @send="send" @stop="stop" />
          <p class="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            AI can make mistakes — review generated documents before sharing.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Sparkles, Plus, History, ArrowDown } from 'lucide-vue-next';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/composables/useToast';
import { useFileStore } from '@/store/files';
import { useAiChatStore, type ChatMsg, type ChatAttachment } from '@/store/aiChat';
import { useAiPrefsStore } from '@/store/aiPrefs';
import { streamChat, sendChat, type ChatApiDocument, type ChatPayload } from '@/services/aiChat';
import { createAssistantStreamState, finalizeAssistantMessage } from '@/lib/aiChatStreamState';
import { createVensuiteDocParser } from '@/lib/vensuiteDocStream';
import ConversationRail from '@/components/assistant/ConversationRail.vue';
import ChatComposer from '@/components/assistant/ChatComposer.vue';
import ChatMessageItem from '@/components/assistant/ChatMessageItem.vue';
import AssistantEmptyState from '@/components/assistant/AssistantEmptyState.vue';

const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const chatStore = useAiChatStore();
const aiPrefs = useAiPrefsStore();

const composerRef = ref<InstanceType<typeof ChatComposer> | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const stickToBottom = ref(true);

const streamingMessageId = ref<string | null>(null);
const isStreaming = computed(() => streamingMessageId.value !== null);
let abortController: AbortController | null = null;
let stoppedByUser = false;
let activeParser: ReturnType<typeof createVensuiteDocParser> | null = null;

const activeMessages = computed<ChatMsg[]>(
  () => chatStore.activeConversation?.messages ?? [],
);
const hasMessages = computed(() => activeMessages.value.length > 0);

// ── Conversation management ──────────────────────────────────────────

function startNewChat() {
  stop();
  chatStore.newConversation();
  composerRef.value?.focus();
}

function onWorkflowPick(prompt: string) {
  composerRef.value?.prefill(prompt);
}

function onDocSaved(messageId: string, docId: string, fileId: string) {
  const convoId = chatStore.activeId;
  if (!convoId) return;
  chatStore.updateMessage(convoId, messageId, (msg) => {
    const doc = msg.docs.find((d) => d.id === docId);
    if (doc) doc.savedFileId = fileId;
  });
}

// ── Send / stream flow ───────────────────────────────────────────────

function buildDocumentsPayload(attachments: ChatAttachment[]): ChatApiDocument[] {
  return attachments.map((a) => ({
    name: a.name,
    content: a.html || a.plainText,
    role: a.role,
  }));
}

function send(text: string) {
  if (isStreaming.value) return;
  const convo = chatStore.activeConversation ?? chatStore.newConversation();

  const userMsg: ChatMsg = {
    id: uuidv4(),
    role: 'user',
    text,
    attachments: [...chatStore.draftAttachments],
    docs: [],
    status: 'done',
    createdAt: Date.now(),
  };
  chatStore.appendMessage(convo.id, userMsg);
  chatStore.clearDraftAttachments();
  chatStore.autoTitle(convo.id);

  startAssistantTurn(convo.id, userMsg.attachments);
}

/** Drop the trailing assistant message and regenerate from the last user message. */
function resend() {
  if (isStreaming.value) return;
  const convo = chatStore.activeConversation;
  if (!convo) return;
  const lastUserIndex = [...convo.messages]
    .map((m) => m.role)
    .lastIndexOf('user');
  if (lastUserIndex === -1) return;
  const lastUser = convo.messages[lastUserIndex];
  for (const msg of convo.messages.slice(lastUserIndex + 1)) {
    chatStore.removeMessage(convo.id, msg.id);
  }
  startAssistantTurn(convo.id, lastUser.attachments);
}

async function startAssistantTurn(conversationId: string, attachments: ChatAttachment[]) {
  // History is computed before appending the assistant placeholder so the
  // just-added user message is the final entry.
  const messages = chatStore.apiHistory;
  const documents = buildDocumentsPayload(attachments);
  const selectedModel = aiPrefs.activeModelId;
  const payload: ChatPayload = {
    messages,
    ...(documents.length > 0 ? { documents } : {}),
    ...(selectedModel ? { model: selectedModel } : {}),
  };

  const assistantMsg: ChatMsg = {
    id: uuidv4(),
    role: 'assistant',
    text: '',
    attachments: [],
    docs: [],
    status: 'streaming',
    createdAt: Date.now(),
  };
  chatStore.appendMessage(conversationId, assistantMsg);
  streamingMessageId.value = assistantMsg.id;
  stoppedByUser = false;
  stickToBottom.value = true;

  const update = (mutator: (msg: ChatMsg) => void) =>
    chatStore.updateMessage(conversationId, assistantMsg.id, mutator);

  const makeParser = () => createVensuiteDocParser({
    onText: (t) => update((msg) => { msg.text += t; }),
    onDocStart: (title) =>
      update((msg) => {
        msg.docs.push({ id: uuidv4(), title, html: '', status: 'streaming' });
      }),
    onDocChunk: (html) =>
      update((msg) => {
        const doc = msg.docs[msg.docs.length - 1];
        if (doc) doc.html += html;
      }),
    onDocEnd: () =>
      update((msg) => {
        const doc = msg.docs[msg.docs.length - 1];
        if (doc) doc.status = 'ready';
      }),
  });

  const parserRef = { current: makeParser() };
  activeParser = parserRef.current;
  const streamState = createAssistantStreamState();

  const onStage = (stage: string, label: string) => {
    update((msg) => { msg.stage = { id: stage, label }; });
  };

  const onRevise = () => {
    parserRef.current.flush();
    update((msg) => {
      msg.text = '';
      msg.docs = [];
    });
    parserRef.current = makeParser();
    activeParser = parserRef.current;
    streamState.resetForRevision();
  };

  const finalize = (status: Exclude<ChatMsg['status'], 'streaming'>) => {
    parserRef.current.flush({ completeOpenDocument: status === 'done' });
    activeParser = null;
    update((msg) => {
      finalizeAssistantMessage(msg, status);
    });
    streamingMessageId.value = null;
    abortController = null;
    if (status === 'done') chatStore.autoTitle(conversationId);
  };

  const onError = async (error: Error) => {
    if (stoppedByUser || error.name === 'AbortError') return;
    console.warn('Chat stream failed:', error);
    if (streamState.shouldUseFallback()) {
      // Nothing arrived — try the non-streaming endpoint before giving up.
      try {
        const full = await sendChat(payload);
        streamState.markContentReceived();
        parserRef.current.push(full);
        finalize('done');
        return;
      } catch (fallbackError) {
        console.error('Chat fallback failed:', fallbackError);
      }
    }
    finalize('error');
    toast.error('The assistant could not complete that request');
  };

  try {
    abortController = await streamChat(
      payload,
      (chunk) => {
        streamState.markContentReceived();
        parserRef.current.push(chunk);
      },
      () => finalize('done'),
      (error) => { void onError(error); },
      onStage,
      onRevise,
    );
  } catch (error) {
    void onError(error instanceof Error ? error : new Error('Stream failed'));
  }
}

function stop() {
  if (!isStreaming.value) return;
  stoppedByUser = true;
  abortController?.abort();
  abortController = null;
  const convoId = chatStore.activeId;
  const msgId = streamingMessageId.value;
  streamingMessageId.value = null;
  if (convoId && msgId) {
    // Flush any buffered parser tail before finalising so trailing
    // text/document chunks are not lost (up to 14 chars can remain).
    activeParser?.flush({ completeOpenDocument: true });
    activeParser = null;
    chatStore.updateMessage(convoId, msgId, (msg) => {
      finalizeAssistantMessage(msg, 'done');
    });
    chatStore.autoTitle(convoId);
  }
}

// ── Auto-scroll ──────────────────────────────────────────────────────

function onScroll() {
  const el = scrollRef.value;
  if (!el) return;
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  const el = scrollRef.value;
  if (el) el.scrollTo({ top: el.scrollHeight, behavior });
}

function jumpToLatest() {
  stickToBottom.value = true;
  scrollToBottom('smooth');
}

// Re-pin on any content growth while stuck to the bottom.
const contentSignature = computed(() =>
  activeMessages.value.reduce(
    (acc, m) => acc + m.text.length + m.docs.reduce((a, d) => a + d.html.length, 0),
    activeMessages.value.length * 7,
  ),
);

watch(contentSignature, () => {
  if (stickToBottom.value) nextTick(() => scrollToBottom());
});

watch(
  () => chatStore.activeId,
  () => {
    stickToBottom.value = true;
    nextTick(() => scrollToBottom());
  },
);

// ── Lifecycle ────────────────────────────────────────────────────────

onMounted(() => {
  document.title = 'Assistant — VenSuite';

  aiPrefs.fetchModels().catch(() => {});

  // Make workspace documents available to the attachment picker.
  if (fileStore.allFiles.length === 0) {
    fileStore.loadDocuments().catch((error: unknown) => {
      console.warn('Failed to load workspace documents:', error);
    });
  }

  if (!chatStore.activeConversation) {
    if (chatStore.conversations.length > 0) {
      chatStore.setActive(chatStore.sortedConversations[0].id);
    } else {
      chatStore.newConversation();
    }
  }

  const promptParam = route.query.prompt;
  if (typeof promptParam === 'string' && promptParam.trim()) {
    composerRef.value?.prefill(promptParam);
    // Drop the param so refreshes don't re-prefill.
    router.replace({ query: { ...route.query, prompt: undefined } });
  } else {
    composerRef.value?.focus();
  }

  nextTick(() => scrollToBottom());
});

onBeforeUnmount(() => {
  abortController?.abort();
});
</script>
