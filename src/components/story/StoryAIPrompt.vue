<script setup lang="ts">
/**
 * StoryAIPrompt — AI-first story generation dialog.
 * Shows on new stories, lets users describe their story and generates scenes.
 */
import { ref, computed } from 'vue';
import { Sparkles, Wand2, FileText, X, Loader2 } from 'lucide-vue-next';
import { generateStory, type AIGenerateStoryResponse } from '@/services/ai';
import { Button } from '@/components/ui/button';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'generated': [data: AIGenerateStoryResponse];
  'skip': [];
}>();

const prompt = ref('');
const sceneCount = ref(5);
const style = ref('modern');
const isGenerating = ref(false);
const error = ref<string | null>(null);

const styleOptions = [
  { value: 'modern', label: 'Modern & Clean' },
  { value: 'bold', label: 'Bold & Vibrant' },
  { value: 'minimal', label: 'Minimal & Elegant' },
  { value: 'dark', label: 'Dark & Dramatic' },
  { value: 'playful', label: 'Playful & Creative' },
  { value: 'corporate', label: 'Corporate & Professional' },
];

const canGenerate = computed(() => prompt.value.trim().length >= 5 && !isGenerating.value);

async function handleGenerate() {
  if (!canGenerate.value) return;
  isGenerating.value = true;
  error.value = null;

  try {
    const result = await generateStory(prompt.value.trim(), {
      sceneCount: sceneCount.value,
      style: style.value,
    });
    emit('generated', result);
    emit('update:open', false);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Generation failed. Please try again.';
  } finally {
    isGenerating.value = false;
  }
}

function handleSkip() {
  emit('skip');
  emit('update:open', false);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handleGenerate();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="handleSkip"
      >
        <div
          class="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                 border border-gray-200 dark:border-gray-700 overflow-hidden"
          @keydown="handleKeydown"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center">
                <Sparkles class="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Create with AI
                </h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Describe your story and we'll generate it for you
                </p>
              </div>
            </div>
            <button
              class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
                     dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              @click="handleSkip"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 space-y-4">
            <!-- Prompt textarea -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                What story do you want to tell?
              </label>
              <textarea
                v-model="prompt"
                rows="4"
                class="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       resize-none transition-shadow"
                placeholder="e.g., A pitch deck for our AI startup that highlights our unique technology, team, and market opportunity..."
                autofocus
              />
            </div>

            <!-- Options row -->
            <div class="flex gap-4">
              <!-- Scene count -->
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Scenes
                </label>
                <select
                  v-model="sceneCount"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option :value="3">3 scenes</option>
                  <option :value="5">5 scenes</option>
                  <option :value="7">7 scenes</option>
                  <option :value="10">10 scenes</option>
                </select>
              </div>

              <!-- Style -->
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Style
                </label>
                <select
                  v-model="style"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option
                    v-for="opt in styleOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Error -->
            <div
              v-if="error"
              class="px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                     rounded-lg border border-red-200 dark:border-red-800"
            >
              {{ error }}
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800
                      bg-gray-50/50 dark:bg-gray-800/30">
            <button
              class="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400
                     hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              @click="handleSkip"
            >
              <FileText class="w-4 h-4" />
              Start from blank
            </button>

            <Button
              class="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700
                     hover:to-pink-700 text-white shadow-lg shadow-purple-500/20"
              :disabled="!canGenerate"
              @click="handleGenerate"
            >
              <Loader2 v-if="isGenerating" class="w-4 h-4 animate-spin" />
              <Wand2 v-else class="w-4 h-4" />
              {{ isGenerating ? 'Generating...' : 'Generate Story' }}
            </Button>
          </div>

          <!-- Keyboard hint -->
          <div
            v-if="!isGenerating"
            class="text-center pb-3 text-[10px] text-gray-400 dark:text-gray-500"
          >
            Press <kbd class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">Ctrl+Enter</kbd> to generate
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
