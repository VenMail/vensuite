<template>
  <div
    v-if="currentQuestion"
    class="focus-player relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-10 rounded-[2.75rem] border border-slate-200 bg-white/95 px-8 py-10 shadow-2xl shadow-slate-200/70 transition dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none"
  >
    <div class="space-y-6">
      <div v-if="showProgress" class="space-y-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <span class="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
            Step {{ currentStep }} of {{ totalSteps }}
          </span>
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {{ encouragementMessage }}
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ Math.round(progressPercent) }}% complete
          </p>
        </div>

        <div class="focus-progress-track relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-primary-500 transition-all duration-500 ease-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>

        <ol class="flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
          <li
            v-for="dot in stepDots"
            :key="dot.id"
            class="flex-1"
          >
            <div
              class="mx-auto flex h-2 w-full max-w-[42px] items-center justify-center rounded-full transition"
              :class="[
                dot.status === 'complete' ? 'bg-primary-500' : dot.status === 'current' ? 'bg-primary-400' : 'bg-slate-200 dark:bg-slate-800',
              ]"
            />
          </li>
        </ol>
      </div>

      <Transition name="focus-slide" mode="out-in">
        <div :key="currentQuestion.id" class="focus-question space-y-6">
          <QuestionRenderer
            :question="currentQuestion"
            :model-value="answerValue"
            :label-placement="labelPlacement"
            :density="density"
            :disabled="isSubmitting"
            @update:model-value="onAnswerInput"
          />
        </div>
      </Transition>
    </div>

    <div class="mt-auto flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ footerMessage }}
        </p>
        <div class="flex items-center gap-3">
          <button
            v-if="allowBack"
            type="button"
            class="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            :disabled="isSubmitting || !canGoBack"
            @click="handleBack"
          >
            Back
          </button>

          <button
            v-if="showSkip"
            type="button"
            class="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            :disabled="isSubmitting"
            @click="handleSkip"
          >
            Skip
          </button>

          <button
            v-if="hasNextQuestion"
            type="button"
            class="inline-flex items-center rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-primary-900/40"
            :disabled="isSubmitting || !canProceed"
            @click="handleNext"
          >
            Next
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-primary-900/40"
            :disabled="isSubmitting || !canProceed"
            @click="emitComplete"
          >
            {{ isSubmitting ? 'Submitting…' : 'Submit form' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400"
  >
    <p>No questions available.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormDensity, FormLabelPlacement, FormQuestion } from '@/types';

const props = defineProps<{
  isSubmitting?: boolean;
  labelPlacement?: FormLabelPlacement;
  density?: FormDensity;
}>();

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const playerStore = useFormPlayerStore();
const { currentQuestion, questionOrder, state: playerState } = storeToRefs(playerStore);

const labelPlacement = computed<FormLabelPlacement>(() => props.labelPlacement ?? 'stacked');
const density = computed<FormDensity>(() => props.density ?? 'comfortable');

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

const totalSteps = computed(() => questionOrder.value.length || (currentQuestion.value ? 1 : 0));

const currentStep = computed(() => {
  if (!currentQuestion.value) return 0;
  const index = questionOrder.value.indexOf(currentQuestion.value.id);
  return index === -1 ? 1 : index + 1;
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

const stepDots = computed(() => {
  return questionOrder.value.map((id, index) => {
    const status = index + 1 < currentStep.value ? 'complete' : index + 1 === currentStep.value ? 'current' : 'pending';
    return {
      id,
      status,
    };
  });
});

const encouragementMessage = computed(() => {
  if (!totalSteps.value) return 'Let’s get started';
  if (progressPercent.value >= 90) return 'Almost there!';
  if (progressPercent.value >= 60) return 'Great progress!';
  if (progressPercent.value >= 30) return 'You’re doing well';
  return 'Let’s get started';
});

const footerMessage = computed(() => {
  if (!currentQuestion.value) return '';
  if (currentQuestion.value.required) {
    return 'This question is required. Provide an answer to continue.';
  }
  if (showSkip.value) {
    return 'You can skip this question or come back later.';
  }
  return 'Provide your answer and use Next when you are ready.';
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
.focus-fade-enter-active,
.focus-fade-leave-active,
.focus-slide-enter-active,
.focus-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}

.focus-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.focus-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.focus-slide-enter-to,
.focus-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.focus-player__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6b7280;
}
</style>
