<template>
  <div v-if="currentPage" class="classic-player text-gray-900 dark:text-gray-100">
    <header class="classic-player__header" v-if="currentPage.title || currentPage.description">
      <h2 v-if="currentPage.title" class="text-gray-900 dark:text-gray-100">{{ currentPage.title }}</h2>
      <p v-if="currentPage.description" class="text-gray-600 dark:text-gray-300">{{ currentPage.description }}</p>
    </header>

    <div class="classic-player__progress" v-if="showProgress">
      <div class="classic-player__progress-bar w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <div class="h-full bg-primary-600 transition-all" :style="{ width: `${progressPercent}%` }" />
      </div>
      <span class="classic-player__progress-label text-sm text-gray-600 dark:text-gray-300">
        Page {{ activePageIndex + 1 }} of {{ totalPages }}
      </span>
    </div>

    <section class="classic-player__questions">
      <QuestionRenderer
        v-for="question in currentPage.questions"
        :key="question.id"
        :question="question"
        :model-value="playerStore.getAnswerValue(question.id)"
        :disabled="isSubmitting"
        @update:model-value="(value) => updateAnswer(question.id, value)"
      />
    </section>

    <footer class="classic-player__actions">
      <button
        v-if="allowBack"
        type="button"
        class="classic-player__button rounded-full px-6 py-2 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        :disabled="isSubmitting || !hasPreviousPage"
        @click="handleBack"
      >
        Back
      </button>

      <div class="classic-player__spacer" />

      <button
        v-if="allowSkip && hasNextPage"
        type="button"
        class="classic-player__button rounded-full px-6 py-2 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        :disabled="isSubmitting"
        @click="handleSkip"
      >
        Skip
      </button>

      <button
        v-if="hasNextPage"
        type="button"
        class="classic-player__button classic-player__button--primary rounded-full px-6 py-2 bg-primary-600 border border-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSubmitting || !canProceed"
        @click="handleNext"
      >
        Next
      </button>

      <button
        v-else
        type="button"
        class="classic-player__button classic-player__button--primary rounded-full px-6 py-2 bg-primary-600 border border-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSubmitting || !canProceed"
        @click="emitSubmit"
      >
        {{ isSubmitting ? 'Submitting…' : 'Submit' }}
      </button>
    </footer>
  </div>
  <div v-else class="classic-player__empty text-gray-600 dark:text-gray-400">
    <p>No questions available.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormPage, FormQuestion } from '@/types';

const props = defineProps<{
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
}>();

const playerStore = useFormPlayerStore();
const { state: playerState } = storeToRefs(playerStore);

const isSubmitting = computed(() => props.isSubmitting ?? false);

type AnswerValue = Parameters<typeof playerStore.answerQuestion>[1];

const navigationSettings = computed(() => playerState.value.formDefinition?.navigation);
const allowBack = computed(() => navigationSettings.value?.allow_back ?? false);
const allowSkip = computed(() => navigationSettings.value?.allow_skip ?? false);
const showProgress = computed(() => navigationSettings.value?.show_progress ?? true);

interface PageBlock {
  id: string;
  title?: string;
  description?: string;
  questionIds: string[];
  questions: FormQuestion[];
}

const pages = computed<PageBlock[]>(() => {
  const definition = playerState.value.formDefinition;
  if (!definition) return [];

  const allQuestions = definition.questions ?? [];
  const questionMap = new Map<string, FormQuestion>();
  allQuestions.forEach((question) => {
    if (question?.id) questionMap.set(question.id, question);
  });

  const usedIds = new Set<string>();
  const pageBlocks: PageBlock[] = (definition.pages ?? []).map((page: FormPage) => {
    const ids = (page.question_order ?? page.questions?.map((q) => q.id) ?? []).filter(Boolean) as string[];
    ids.forEach((id) => usedIds.add(id));
    const questions = ids
      .map((id) => questionMap.get(id))
      .filter((q): q is FormQuestion => Boolean(q));

    return {
      id: page.id,
      title: page.title,
      description: page.description,
      questionIds: questions.map((q) => q.id),
      questions,
    };
  });

  const orphanQuestions = allQuestions.filter((question) => question?.id && !usedIds.has(question.id));
  if (orphanQuestions.length) {
    pageBlocks.push({
      id: '__orphan__',
      title: undefined,
      description: undefined,
      questionIds: orphanQuestions.map((q) => q.id),
      questions: orphanQuestions,
    });
  }

  if (!pageBlocks.length) {
    return [
      {
        id: '__single__',
        title: definition.title,
        description: definition.description,
        questionIds: allQuestions.map((q) => q.id),
        questions: allQuestions,
      },
    ];
  }

  return pageBlocks;
});

const activePageIndex = ref(0);

const syncActivePage = () => {
  const currentQuestionId = playerState.value.currentQuestionId;
  if (!currentQuestionId) return;
  const idx = pages.value.findIndex((page) => page.questionIds.includes(currentQuestionId));
  if (idx !== -1) {
    activePageIndex.value = idx;
  }
};

watch(
  () => playerState.value.currentQuestionId,
  () => syncActivePage(),
);

watch(
  () => pages.value,
  () => {
    if (activePageIndex.value >= pages.value.length) {
      activePageIndex.value = Math.max(0, pages.value.length - 1);
    }
    syncActivePage();
  },
  { immediate: true },
);

onMounted(() => {
  syncActivePage();
});

const currentPage = computed(() => pages.value[activePageIndex.value]);
const totalPages = computed(() => pages.value.length);
const hasNextPage = computed(() => activePageIndex.value < pages.value.length - 1);
const hasPreviousPage = computed(() => activePageIndex.value > 0);

const progressPercent = computed(() => {
  if (!pages.value.length) return 0;
  return ((activePageIndex.value + 1) / pages.value.length) * 100;
});

const currentPageQuestions = computed(() => currentPage.value?.questions ?? []);

const isAnswerEmpty = (question: FormQuestion, value: unknown) => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  if (question.type === 'yesno') return false;
  if (question.type === 'file') {
    if (value instanceof File) return false;
    if (Array.isArray(value)) return value.length === 0;
    return !value;
  }
  return false;
};

const canProceed = computed(() => {
  return currentPageQuestions.value.every((question) => {
    if (!question.required) return true;
    const value = playerStore.getAnswerValue(question.id);
    return !isAnswerEmpty(question, value);
  });
});

const pageFirstQuestionId = (index: number) => pages.value[index]?.questionIds?.[0] ?? null;

const updateAnswer = (questionId: string, value: unknown) => {
  playerStore.setAnswerValue(questionId, value as AnswerValue);
};

const commitPageAnswers = () => {
  currentPageQuestions.value.forEach((question) => {
    const value = playerStore.getAnswerValue(question.id) as AnswerValue;
    playerStore.answerQuestion(question.id, value);
  });
};

const goToPage = (index: number) => {
  activePageIndex.value = index;
  const firstId = pageFirstQuestionId(index);
  if (firstId) {
    playerStore.advanceToQuestion(firstId);
  } else {
    playerStore.advanceToQuestion(null);
  }
};

const handleNext = () => {
  if (!hasNextPage.value) {
    emitSubmit();
    return;
  }
  commitPageAnswers();
  goToPage(activePageIndex.value + 1);
};

const handleBack = () => {
  if (!hasPreviousPage.value) return;
  goToPage(activePageIndex.value - 1);
};

const handleSkip = () => {
  if (!hasNextPage.value) return;
  goToPage(activePageIndex.value + 1);
};

const emitSubmit = () => {
  commitPageAnswers();
  emit('submit');
};
</script>

<style scoped>
.classic-player {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.classic-player__header {
  text-align: center;
}

.classic-player__header h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.classic-player__header p {
  margin-top: 0.5rem;
  color: #4b5563;
}

.classic-player__progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.classic-player__progress-bar {
  width: 100%;
  height: 0.5rem;
  border-radius: 9999px;
  background: #e5e7eb;
  overflow: hidden;
}

.classic-player__progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.classic-player__progress-label {
  font-size: 0.85rem;
  color: #4b5563;
}

.classic-player__questions {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.classic-player__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.classic-player__button {
  border-radius: 9999px;
  padding: 0.6rem 1.5rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #1f2937;
  font-weight: 500;
  transition: background 0.2s ease;
}

.classic-player__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.classic-player__button--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.classic-player__button--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.classic-player__spacer {
  flex: 1 1 auto;
}

.classic-player__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6b7280;
}
</style>
