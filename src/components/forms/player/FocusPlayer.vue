<template>
  <div
    v-if="currentQuestion"
    class="relative mx-auto my-4 flex min-h-[70vh] w-full max-w-3xl flex-col gap-8 rounded-3xl border px-6 py-8 transition bg-white/95 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-700/70 shadow-xl"
  >
    <div class="space-y-6">
      <div v-if="showProgress" class="space-y-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <span class="text-sm font-semibold uppercase tracking-[0.32em] text-gray-400 dark:text-gray-500">
            Step {{ currentStep }} of {{ totalSteps }}
          </span>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ encouragementMessage }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ Math.round(progressPercent) }}% complete
          </p>
        </div>

        <div class="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            class="h-full bg-gradient-to-r from-[var(--player-accent)] to-[var(--player-accent-strong)] transition-all duration-500 ease-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
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
            @enter="handleEnter"
          />
        </div>
      </Transition>
    </div>

    <div class="mt-auto flex flex-col gap-4 rounded-2xl border px-6 py-5 transition bg-gray-50/80 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 shadow">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ footerMessage }}
        </p>
        <div class="flex items-center gap-3">
          <button
            v-if="allowBack"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 hover:-translate-y-0.5 transition disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSubmitting || !canGoBack"
            @click="handleBack"
          >
            Back
          </button>

          <button
            v-if="showSkip"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 hover:-translate-y-0.5 transition disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSubmitting"
            @click="handleSkip"
          >
            {{$t('Commons.button.skip')}}
          </button>

          <button
            v-if="hasNextQuestion"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:shadow-primary-900/30 dark:hover:bg-primary-600 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900"
            :disabled="isSubmitting || !canProceed"
            @click="handleNext"
          >
            {{$t('Commons.button.next')}}
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:shadow-primary-900/30 dark:hover:bg-primary-600 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900"
            :disabled="isSubmitting || !canProceed"
            @click="emitComplete"
          >
            {{ isSubmitting ? 'Submitting…' : $t('Commons.button.submit_form') }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400"
  >
    <p>{{$t('Forms.Player.FocusPlayer.text.no_questions_available')}}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormDensity, FormLabelPlacement, FormQuestion, TextValidation, FormPhoneQuestion } from '@/types';
import { defaultValidations } from '@/types';

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

const activeValidation = computed<TextValidation | undefined>(() => {
  const q = currentQuestion.value;
  if (!q) return undefined;
  const t = q.type as keyof typeof defaultValidations;
  let base = defaultValidations[t as string];
  const qVal = (q as any).validation as TextValidation | undefined;
  if (q.type === 'phone') {
    const allowIntl = (q as FormPhoneQuestion).allow_international ?? true;
    const phoneRegex = allowIntl ? /^\+?[0-9\s()-]{10,20}$/ : /^[0-9\s()-]{10,15}$/;
    base = { inputType: 'phone', regex: phoneRegex, minLength: allowIntl ? 10 : 10, maxLength: allowIntl ? 20 : 15 } as TextValidation;
  }
  return { ...(base || {}), ...(qVal || {}) } as TextValidation | undefined;
});

const isFormatValid = computed(() => {
  const q = currentQuestion.value;
  const val = answerValue.value;
  if (!q) return false;
  if (val == null || val === '') return !q.required; // empty is valid if not required
  if (typeof val !== 'string') return true; // non-string types handled elsewhere
  const rules = activeValidation.value;
  if (!rules) return true;
  if (rules.minLength && val.length < rules.minLength) return false;
  if (rules.maxLength && val.length > rules.maxLength) return false;
  if (rules.regex && !rules.regex.test(val)) return false;
  return true;
});

const canProceed = computed(() => {
  if (!currentQuestion.value) return false;
  if (currentQuestion.value.required && isAnswerEmpty(currentQuestion.value, answerValue.value)) return false;
  return isFormatValid.value;
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
  if (!canProceed.value) return;
  playerStore.answerQuestion(currentQuestion.value.id, playerStore.getAnswerValue(currentQuestion.value.id));
  if (!playerState.value.currentQuestionId) {
    emitComplete();
  }
};

const handleEnter = () => {
  // In focus (wizard) mode, Enter should attempt to advance if valid
  if (hasNextQuestion.value) {
    handleNext();
  } else {
    if (canProceed.value) emitComplete();
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
</style>
