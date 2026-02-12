<template>
  <div
    v-if="currentQuestion"
    class="relative mx-auto my-4 flex min-h-[70vh] w-full max-w-3xl flex-col gap-8 rounded-3xl border px-6 py-8 transition shadow-xl"
    style="background: var(--player-surface, rgba(255,255,255,0.95)); border-color: var(--player-surface-border, rgba(203,213,225,0.5));"
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

        <div class="relative h-2 w-full overflow-hidden rounded-full" style="background: var(--player-progress-track, rgba(226,232,240,0.95));">
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
            :show-shortcut-labels="true"
            @update:model-value="onAnswerInputWithAutoAdvance"
            @enter="handleEnter"
          />
        </div>
      </Transition>
    </div>

    <div class="mt-auto flex flex-col gap-4 rounded-2xl border px-6 py-5 transition shadow" style="background: var(--player-muted-surface, rgba(248,250,252,0.85)); border-color: var(--player-muted-border, rgba(203,213,225,0.6));">
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
            {{$t('Commons.button.back_2')}}
            <kbd class="ml-1 hidden sm:inline-flex items-center rounded border border-gray-300/60 dark:border-gray-600/60 bg-gray-100/60 dark:bg-gray-800/60 px-1.5 py-0.5 text-[10px] font-mono leading-none text-gray-500 dark:text-gray-400">Esc</kbd>
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
            class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            :style="{ background: 'var(--player-accent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--player-accent) 25%, transparent)' }"
            :disabled="isSubmitting || !canProceed"
            @click="handleNext"
          >
            {{$t('Commons.button.next')}}
            <kbd class="ml-1.5 hidden sm:inline-flex items-center rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono leading-none">Enter ↵</kbd>
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            :style="{ background: 'var(--player-accent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--player-accent) 25%, transparent)' }"
            :disabled="isSubmitting || !canProceed"
            @click="emitComplete"
          >
            {{ isSubmitting ? 'Submitting…' : $t('Commons.button.submit_form') }}
            <kbd class="ml-1.5 hidden sm:inline-flex items-center rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono leading-none">Enter ↵</kbd>
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
import { useFormKeyboard } from '@/composables/useFormKeyboard';
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

// Auto-advance for single-choice questions (radio, yesno, rating)
const AUTO_ADVANCE_DELAY = 400;
let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

const onAnswerInputWithAutoAdvance = (value: unknown) => {
  onAnswerInput(value);
  const q = currentQuestion.value;
  if (!q) return;
  const autoAdvanceTypes = ['radio', 'yesno', 'rating'];
  if (autoAdvanceTypes.includes(q.type) && hasNextQuestion.value) {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      handleNext();
    }, AUTO_ADVANCE_DELAY);
  }
};

// Keyboard navigation
const currentQuestionType = computed(() => currentQuestion.value?.type ?? null);
const currentOptionCount = computed(() => {
  const q = currentQuestion.value;
  if (!q) return 0;
  if ('options' in q && Array.isArray((q as any).options)) return (q as any).options.length;
  return 0;
});
const submittingRef = computed(() => props.isSubmitting ?? false);

const handleKeyboardSelectOption = (index: number) => {
  const q = currentQuestion.value;
  if (!q) return;
  const opts = ('options' in q ? (q as any).options : []) as { value: string }[];
  if (index >= opts.length) return;
  const optionValue = opts[index].value;
  if (q.type === 'radio' || q.type === 'select') {
    onAnswerInputWithAutoAdvance(optionValue);
  } else if (q.type === 'checkbox' || q.type === 'tags') {
    const current = Array.isArray(playerStore.getAnswerValue(q.id)) ? [...(playerStore.getAnswerValue(q.id) as string[])] : [];
    const idx = current.indexOf(optionValue);
    if (idx !== -1) current.splice(idx, 1);
    else current.push(optionValue);
    onAnswerInput(current);
  }
};

const handleKeyboardYes = () => {
  onAnswerInputWithAutoAdvance(true);
};

const handleKeyboardNo = () => {
  onAnswerInputWithAutoAdvance(false);
};

useFormKeyboard({
  onNext: () => {
    if (hasNextQuestion.value) handleNext();
    else if (canProceed.value) emitComplete();
  },
  onBack: handleBack,
  onSelectOption: handleKeyboardSelectOption,
  onYes: handleKeyboardYes,
  onNo: handleKeyboardNo,
  questionType: currentQuestionType,
  optionCount: currentOptionCount,
  isSubmitting: submittingRef,
});
</script>

<style scoped>
</style>
