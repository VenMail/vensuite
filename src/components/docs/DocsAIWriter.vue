<template>
  <!-- Floating AI toolbar that appears on text selection -->
  <Transition name="ai-fade">
    <div
      v-if="isVisible"
      class="docs-ai-writer fixed z-[60] print:hidden"
      :style="floatingStyle"
    >
      <!-- Compact trigger button (shown when not expanded) -->
      <button
        v-if="!isExpanded"
        class="ai-trigger-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        @click="expand"
      >
        <Sparkles class="h-3.5 w-3.5" />
        <span>AI</span>
      </button>

      <!-- Expanded panel -->
      <div
        v-else
        class="ai-panel w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-500">
              <Sparkles class="h-3 w-3 text-white" />
            </div>
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">AI Writer</span>
          </div>
          <button
            class="p-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-400 transition-colors"
            @click="collapse"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Quick actions (when no custom prompt) -->
        <div v-if="!showPromptInput && !isGenerating && !generatedContent" class="p-2 space-y-1">
          <!-- Context-aware actions -->
          <div v-if="hasSelection" class="grid grid-cols-2 gap-1">
            <button
              v-for="action in selectionActions"
              :key="action.key"
              class="ai-action-btn flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="executeAction(action.key, action.prompt)"
            >
              <component :is="action.icon" class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span>{{ action.label }}</span>
            </button>
          </div>
          <div v-else class="grid grid-cols-2 gap-1">
            <button
              v-for="action in insertActions"
              :key="action.key"
              class="ai-action-btn flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="executeAction(action.key, action.prompt)"
            >
              <component :is="action.icon" class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span>{{ action.label }}</span>
            </button>
          </div>

          <!-- Custom prompt toggle -->
          <button
            class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
            @click="showPromptInput = true"
          >
            <MessageSquare class="h-3.5 w-3.5" />
            <span>Custom instruction...</span>
          </button>
        </div>

        <!-- Custom prompt input -->
        <div v-if="showPromptInput && !isGenerating && !generatedContent" class="p-2">
          <div class="relative">
            <textarea
              ref="promptInputRef"
              v-model="customPrompt"
              placeholder="Tell AI what to write or how to transform the selected text..."
              class="w-full h-20 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              @keydown.enter.ctrl.prevent="submitCustomPrompt"
              @keydown.escape.prevent="showPromptInput = false"
            />
            <div class="flex items-center justify-between mt-2">
              <button
                class="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click="showPromptInput = false"
              >
                Back
              </button>
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                :disabled="!customPrompt.trim()"
                @click="submitCustomPrompt"
              >
                Generate (Ctrl+Enter)
              </button>
            </div>
          </div>
        </div>

        <!-- Generating state with skeleton animation -->
        <div v-if="isGenerating" class="p-3">
          <div class="flex items-center gap-2 mb-3">
            <div class="ai-pulse-dot w-2 h-2 rounded-full bg-violet-500" />
            <span class="text-xs text-violet-600 dark:text-violet-400 font-medium">{{ generatingLabel }}</span>
          </div>

          <!-- Skeleton lines with shimmer -->
          <div class="space-y-2">
            <div v-if="streamedContent" class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
              {{ streamedContent }}<span class="ai-cursor">|</span>
            </div>
            <template v-else>
              <div class="ai-skeleton h-3 rounded-full" :style="{ width: '95%' }" />
              <div class="ai-skeleton h-3 rounded-full" :style="{ width: '80%' }" />
              <div class="ai-skeleton h-3 rounded-full" :style="{ width: '88%' }" />
              <div class="ai-skeleton h-3 rounded-full" :style="{ width: '72%' }" />
              <div class="ai-skeleton h-3 rounded-full" :style="{ width: '60%' }" />
            </template>
          </div>

          <button
            class="mt-3 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
            @click="cancelGeneration"
          >
            Cancel
          </button>
        </div>

        <!-- Generated content preview -->
        <div v-if="generatedContent && !isGenerating" class="p-3">
          <div class="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Preview</div>
          <div
            class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700"
          >
            {{ generatedContent }}
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button
              class="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all"
              @click="acceptContent"
            >
              <Check class="h-3.5 w-3.5 inline mr-1" />
              {{ hasSelection ? 'Replace' : 'Insert' }}
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="regenerate"
            >
              <RefreshCw class="h-3.5 w-3.5 inline mr-1" />
              Retry
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="discardContent"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, type Component, markRaw } from 'vue';
import {
  Sparkles, X, Check, RefreshCw, MessageSquare,
  Wand2, ArrowUpRight, ArrowDownRight, PenLine,
  SpellCheck, Languages, FileText, ListPlus,
  Lightbulb, BookOpen,
} from 'lucide-vue-next';
import type { Editor } from '@tiptap/vue-3';
import { generateDocumentContent, streamDocumentContent, type AIWriteAction } from '@/services/ai';

const props = defineProps<{
  editor: Editor | null | undefined;
  isVisible: boolean;
  selectionRect: { top: number; left: number; bottom: number } | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'content-inserted'): void;
}>();

// State
const isExpanded = ref(false);
const showPromptInput = ref(false);
const customPrompt = ref('');
const isGenerating = ref(false);
const generatedContent = ref('');
const streamedContent = ref('');
const generatingLabel = ref('Generating...');
const promptInputRef = ref<HTMLTextAreaElement | null>(null);
let abortController: AbortController | null = null;
let lastAction: AIWriteAction = 'generate';
let lastPrompt = '';

// Selection state
const hasSelection = computed(() => {
  if (!props.editor) return false;
  const { from, to } = props.editor.state.selection;
  return to - from > 0;
});

const selectedText = computed(() => {
  if (!props.editor || !hasSelection.value) return '';
  const { from, to } = props.editor.state.selection;
  return props.editor.state.doc.textBetween(from, to, ' ');
});

const surroundingContext = computed(() => {
  if (!props.editor) return '';
  const { from, to } = props.editor.state.selection;
  const doc = props.editor.state.doc;
  const contextStart = Math.max(0, from - 500);
  const contextEnd = Math.min(doc.content.size, to + 500);
  return doc.textBetween(contextStart, contextEnd, ' ');
});

// Floating position
const floatingStyle = computed(() => {
  if (!props.selectionRect) return { display: 'none' };
  return {
    top: `${props.selectionRect.bottom + 8}px`,
    left: `${props.selectionRect.left}px`,
  };
});

// Quick actions for selected text
interface AIAction {
  key: AIWriteAction;
  label: string;
  icon: Component;
  prompt?: string;
}

const selectionActions: AIAction[] = [
  { key: 'improve', label: 'Improve writing', icon: markRaw(Wand2) },
  { key: 'fix_grammar', label: 'Fix grammar', icon: markRaw(SpellCheck) },
  { key: 'expand', label: 'Make longer', icon: markRaw(ArrowUpRight) },
  { key: 'shorten', label: 'Make shorter', icon: markRaw(ArrowDownRight) },
  { key: 'rewrite', label: 'Rewrite', icon: markRaw(PenLine) },
  { key: 'change_tone', label: 'Change tone', icon: markRaw(BookOpen) },
  { key: 'summarize', label: 'Summarize', icon: markRaw(FileText) },
  { key: 'translate', label: 'Translate', icon: markRaw(Languages) },
];

const insertActions: AIAction[] = [
  { key: 'generate', label: 'Write content', icon: markRaw(PenLine) },
  { key: 'continue', label: 'Continue writing', icon: markRaw(ArrowUpRight) },
  { key: 'generate', label: 'Brainstorm ideas', icon: markRaw(Lightbulb), prompt: 'Brainstorm ideas related to the document context' },
  { key: 'generate', label: 'Add a list', icon: markRaw(ListPlus), prompt: 'Generate a relevant list based on the document context' },
];

// Actions
function expand() {
  isExpanded.value = true;
  generatedContent.value = '';
  streamedContent.value = '';
  showPromptInput.value = false;
}

function collapse() {
  isExpanded.value = false;
  showPromptInput.value = false;
  customPrompt.value = '';
  generatedContent.value = '';
  streamedContent.value = '';
  isGenerating.value = false;
  cancelGeneration();
  emit('close');
}

async function executeAction(action: AIWriteAction, prompt?: string) {
  lastAction = action;
  lastPrompt = prompt || '';
  generatingLabel.value = getGeneratingLabel(action);
  isGenerating.value = true;
  generatedContent.value = '';
  streamedContent.value = '';

  const request = {
    action,
    prompt: prompt || undefined,
    selectedText: hasSelection.value ? selectedText.value : undefined,
    surroundingContext: surroundingContext.value || undefined,
  };

  try {
    // Try streaming first
    abortController = await streamDocumentContent(
      request,
      (chunk) => { streamedContent.value += chunk; },
      () => {
        generatedContent.value = streamedContent.value;
        isGenerating.value = false;
      },
      async (error) => {
        console.warn('Stream failed, falling back to non-stream:', error);
        // Fallback to non-streaming
        try {
          const result = await generateDocumentContent(request);
          generatedContent.value = result.content || result.html || '';
          streamedContent.value = '';
        } catch (fallbackError) {
          console.error('AI generation failed:', fallbackError);
          generatedContent.value = '';
        }
        isGenerating.value = false;
      },
    );
  } catch (error) {
    console.error('AI generation failed:', error);
    isGenerating.value = false;
  }
}

function submitCustomPrompt() {
  if (!customPrompt.value.trim()) return;
  const action: AIWriteAction = hasSelection.value ? 'rewrite' : 'generate';
  executeAction(action, customPrompt.value.trim());
  showPromptInput.value = false;
}

function cancelGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isGenerating.value = false;
  if (streamedContent.value) {
    generatedContent.value = streamedContent.value;
  }
}

function acceptContent() {
  if (!props.editor || !generatedContent.value) return;

  if (hasSelection.value) {
    // Replace selected text
    const { from, to } = props.editor.state.selection;
    props.editor.chain()
      .focus()
      .setTextSelection({ from, to })
      .insertContent(generatedContent.value)
      .run();
  } else {
    // Insert at cursor
    props.editor.chain()
      .focus()
      .insertContent(generatedContent.value)
      .run();
  }

  emit('content-inserted');
  collapse();
}

function regenerate() {
  executeAction(lastAction, lastPrompt || customPrompt.value || undefined);
}

function discardContent() {
  generatedContent.value = '';
  streamedContent.value = '';
  showPromptInput.value = false;
}

function getGeneratingLabel(action: AIWriteAction): string {
  const labels: Record<AIWriteAction, string> = {
    generate: 'Writing...',
    rewrite: 'Rewriting...',
    expand: 'Expanding...',
    shorten: 'Shortening...',
    improve: 'Improving...',
    fix_grammar: 'Fixing grammar...',
    change_tone: 'Changing tone...',
    translate: 'Translating...',
    summarize: 'Summarizing...',
    continue: 'Continuing...',
  };
  return labels[action] || 'Generating...';
}

// Focus prompt input when shown
watch(showPromptInput, (show) => {
  if (show) nextTick(() => promptInputRef.value?.focus());
});

// Reset when visibility changes
watch(() => props.isVisible, (visible) => {
  if (!visible) {
    isExpanded.value = false;
    showPromptInput.value = false;
    customPrompt.value = '';
    generatedContent.value = '';
    streamedContent.value = '';
    isGenerating.value = false;
  }
});

onUnmounted(() => { cancelGeneration(); });
</script>

<style scoped>
.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: all 150ms ease;
}
.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

/* Skeleton shimmer animation */
.ai-skeleton {
  background: linear-gradient(
    90deg,
    #e5e7eb 25%,
    #f3f4f6 50%,
    #e5e7eb 75%
  );
  background-size: 200% 100%;
  animation: ai-shimmer 1.5s ease-in-out infinite;
}

:root.dark .ai-skeleton,
.dark .ai-skeleton {
  background: linear-gradient(
    90deg,
    #374151 25%,
    #4b5563 50%,
    #374151 75%
  );
  background-size: 200% 100%;
}

@keyframes ai-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Pulsing dot */
.ai-pulse-dot {
  animation: ai-pulse 1.2s ease-in-out infinite;
}

@keyframes ai-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

/* Typing cursor */
.ai-cursor {
  animation: ai-blink 0.8s step-end infinite;
  color: #7c3aed;
  font-weight: 300;
}

@keyframes ai-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Trigger button glow */
.ai-trigger-btn {
  animation: ai-glow 2s ease-in-out infinite alternate;
}

@keyframes ai-glow {
  0% { box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3); }
  100% { box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5); }
}
</style>
