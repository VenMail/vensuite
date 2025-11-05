<template>
  <div class="focus-player text-gray-900 dark:text-gray-100" v-if="currentQuestion">
    <div class="focus-player__progress" v-if="showProgress">
      <div class="focus-player__progress-bar w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <div class="h-full bg-primary-600 transition-all" :style="{ width: `${progressPercent}%` }" />
      </div>
      <span class="focus-player__progress-label text-sm text-gray-600 dark:text-gray-300">
        {{ Math.round(progressPercent) }}% completed
      </span>
    </div>

    <QuestionRenderer
      :question="currentQuestion"
      :model-value="answerValue"
      :disabled="isSubmitting"
      @update:model-value="onAnswerInput"
    />

    <div class="focus-player__actions">
      <button
        v-if="allowBack"
        type="button"
        class="focus-player__button rounded-full px-6 py-2 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        :disabled="isSubmitting || !canGoBack"
        @click="handleBack"
      >
        Back
      </button>

      <div class="focus-player__spacer" />

      <button
        v-if="showSkip"
        type="button"
        class="focus-player__button rounded-full px-6 py-2 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        :disabled="isSubmitting"
        @click="handleSkip"
      >
        Skip
      </button>

      <button
        v-if="hasNextQuestion"
        type="button"
        class="focus-player__button focus-player__button--primary rounded-full px-6 py-2 bg-primary-600 border border-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSubmitting || !canProceed"
        @click="handleNext"
      >
        Next
      </button>

      <button
        v-else
        type="button"
        class="focus-player__button focus-player__button--primary rounded-full px-6 py-2 bg-primary-600 border border-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSubmitting || !canProceed"
        @click="emitComplete"
      >
        {{ isSubmitting ? 'Submitting…' : 'Submit' }}
      </button>
    </div>
  </div>

  <div v-else class="focus-player__empty text-gray-600 dark:text-gray-400">
    <p>No questions available.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormQuestion } from '@/types';

defineProps<{
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const playerStore = useFormPlayerStore();
const { currentQuestion, questionOrder, state: playerState } = storeToRefs(playerStore);

const navigationSettings = computed(() => playerState.value.formDefinition?.navigation);
const allowBack = computed(() => navigationSettings.value?.allow_back ?? false);
const allowSkip = computed(() => navigationSettings.value?.allow_skip ?? false);
const showProgress = computed(() => navigationSettings.value?.show_progress ?? true);

const hasNextQuestion = computed(() => {
  if (!currentQuestion.value) return false;
  const ids = questionOrder.value;
  const index = ids.indexOf(currentQuestion.value.id);
  return index !== -1 && index < ids.length - 1;
});

const canGoBack = computed(() => {
  if (!allowBack.value || !currentQuestion.value) return false;
  const ids = questionOrder.value;
  const index = ids.indexOf(currentQuestion.value.id);
  return index > 0;
});

const answerValue = computed(() => {
  if (!currentQuestion.value) return null;
  return playerStore.getAnswerValue(currentQuestion.value.id);
});

const progressPercent = computed(() => {
  const progress = playerState.value.progress ?? 0;
  return Math.round(progress * 100);
});

const showSkip = computed(() => allowSkip.value && hasNextQuestion.value);

const isAnswerEmpty = (question: FormQuestion, value: unknown) => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  if (question.type === 'yesno') return false;
  if (question.type === 'file') return value instanceof File ? false : Array.isArray(value) ? value.length === 0 : !value;
  return false;
};

const canProceed = computed(() => {
  if (!currentQuestion.value) return false;
  if (!currentQuestion.value.required) return true;
  return !isAnswerEmpty(currentQuestion.value, answerValue.value);
});

const setCurrentQuestionId = (targetId: string | null) => {
  playerStore.advanceToQuestion(targetId);
};

const findAdjacentQuestionId = (offset: number) => {
  if (!currentQuestion.value) return null;
  const ids = questionOrder.value;
  const index = ids.indexOf(currentQuestion.value.id);
  if (index === -1) return null;
  return ids[index + offset] ?? null;
};

const onAnswerInput = (value: unknown) => {
  if (!currentQuestion.value) return;
  playerStore.setAnswerValue(currentQuestion.value.id, value as any);
};

const handleNext = () => {
  if (!currentQuestion.value) {
    emitComplete();
    return;
  }
  playerStore.answerQuestion(currentQuestion.value.id, playerStore.getAnswerValue(currentQuestion.value.id));
  if (!playerState.value.currentQuestionId) {
    emitComplete();
  }
};

const handleSkip = () => {
  if (!currentQuestion.value) return;
  const nextId = findAdjacentQuestionId(1);
  setCurrentQuestionId(nextId);
};

const handleBack = () => {
  const previousId = findAdjacentQuestionId(-1);
  if (previousId) {
    setCurrentQuestionId(previousId);
  }
};

const emitComplete = () => {
  emit('complete');
};
</script>

<style scoped>
.focus-player {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.focus-player__progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.focus-player__progress-bar {
  width: 100%;
  height: 0.5rem;
  border-radius: 9999px;
  background: #e5e7eb;
  overflow: hidden;
}

.focus-player__progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.focus-player__progress-label {
  font-size: 0.85rem;
  color: #4b5563;
}

.focus-player__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.focus-player__button {
  border-radius: 9999px;
  padding: 0.6rem 1.5rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #1f2937;
  font-weight: 500;
  transition: background 0.2s ease;
}

.focus-player__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.focus-player__button--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.focus-player__button--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.focus-player__spacer {
  flex: 1 1 auto;
}

.focus-player__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6b7280;
}
</style>
