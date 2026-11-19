<template>
  <section v-if="currentQuestion" class="focus-player">
    <div v-if="showProgress" class="focus-progress">
      <span>Question {{ currentStep }} of {{ totalSteps }}</span>
      <progress :value="currentStep" :max="totalSteps" aria-label="Form progress" />
    </div>

    <div
      :key="currentQuestion.id"
      ref="questionStep"
      class="focus-question"
      role="group"
      tabindex="-1"
      :aria-labelledby="`question-${currentQuestion.id}-label`"
    >
      <QuestionRenderer
        :question="currentQuestion"
        :model-value="answerValue"
        :label-placement="labelPlacement"
        :density="density"
        :disabled="isSubmitting"
        :show-errors="attempted"
        @update:model-value="updateAnswer"
        @enter="handleNext"
      />
    </div>

    <p v-if="submissionError" role="alert" class="focus-error">{{ submissionError }}</p>
    <div class="focus-actions">
      <button v-if="canGoBack" type="button" class="focus-button" :disabled="isSubmitting" @click="handleBack">
        <ArrowLeft :size="17" aria-hidden="true" />
        {{ $t('Commons.button.back_2') }}
      </button>
      <button type="button" class="focus-button focus-button--primary" :disabled="isSubmitting" @click="handleNext">
        {{ isSubmitting ? 'Submitting…' : showSkip ? $t('Commons.button.skip') : hasNextQuestion ? $t('Commons.button.next') : $t('Commons.button.submit_form') }}
        <ArrowRight v-if="!isSubmitting" :size="17" aria-hidden="true" />
      </button>
    </div>
  </section>

  <p v-else class="focus-empty">{{ $t('Forms.Player.FocusPlayer.text.no_questions_available') }}</p>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ArrowLeft, ArrowRight } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import { getAnswerError, isEmptyAnswer } from '@/utils/formAnswerValidation';
import type { FormDensity, FormLabelPlacement } from '@/types';

const props = defineProps<{
  isSubmitting?: boolean;
  submissionError?: string | null;
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
const showProgress = computed(() => navigationSettings.value?.show_progress ?? true);
const currentIndex = computed(() => questionOrder.value.indexOf(currentQuestion.value?.id ?? ''));
const currentStep = computed(() => Math.max(1, currentIndex.value + 1));
const totalSteps = computed(() => Math.max(currentStep.value, questionOrder.value.length));
const hasNextQuestion = computed(() => currentIndex.value >= 0 && currentIndex.value < questionOrder.value.length - 1);
const canGoBack = computed(() => (navigationSettings.value?.allow_back ?? true) && currentIndex.value > 0);
const answerValue = computed(() => currentQuestion.value ? playerStore.getAnswerValue(currentQuestion.value.id) : null);
const showSkip = computed(() =>
  navigationSettings.value?.allow_skip && hasNextQuestion.value && !currentQuestion.value?.required
  && currentQuestion.value?.type !== 'calculated' && isEmptyAnswer(answerValue.value),
);

const attempted = ref(false);
const questionStep = ref<HTMLElement | null>(null);
watch(() => currentQuestion.value?.id, () => { attempted.value = false; });
watch(questionStep, (step) => step?.focus(), { flush: 'post' });

const focusQuestion = () => questionStep.value?.focus();
onMounted(focusQuestion);

const updateAnswer = (value: unknown) => {
  if (!currentQuestion.value) return;
  playerStore.setAnswerValue(currentQuestion.value.id, value as Parameters<typeof playerStore.setAnswerValue>[1]);
};

const handleNext = () => {
  const question = currentQuestion.value;
  if (!question || props.isSubmitting) return;
  if (getAnswerError(question, answerValue.value)) {
    attempted.value = true;
    questionStep.value?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    return;
  }

  playerStore.answerQuestion(question.id, answerValue.value);
  if (!playerState.value.currentQuestionId) {
    // Keep the last answer available until submission succeeds, including when
    // a rule ends the form early and the request has to be retried.
    playerStore.advanceToQuestion(question.id);
    emit('complete');
  }
};

const handleBack = () => {
  if (canGoBack.value) playerStore.advanceToQuestion(questionOrder.value[currentIndex.value - 1]);
};
</script>

<style scoped>
.focus-player {
  display: grid;
  width: min(100%, 46rem);
  margin: 0 auto;
  padding: clamp(1.4rem, 5vw, 3.25rem);
  gap: clamp(1.6rem, 5vw, 2.6rem);
  border: 1px solid var(--player-surface-border);
  border-radius: 1.25rem;
  background: var(--player-surface);
  color: var(--player-text-color);
  box-shadow: var(--player-muted-elevation);
}

.focus-progress {
  display: grid;
  gap: 0.65rem;
  font-size: 0.825rem;
  font-weight: 650;
}

.focus-progress progress {
  width: 100%;
  height: 5px;
  appearance: none;
  overflow: hidden;
  border: 0;
  border-radius: 1rem;
  background: var(--player-progress-track);
  color: var(--player-accent);
}
.focus-progress progress::-webkit-progress-bar { background: var(--player-progress-track); }
.focus-progress progress::-webkit-progress-value { background: var(--player-accent); }
.focus-progress progress::-moz-progress-bar { background: var(--player-accent); }

.focus-question:focus { outline: none; }
.focus-question :deep(.question-label) {
  font-family: var(--player-heading-font, inherit);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 720;
  letter-spacing: -0.028em;
  line-height: 1.2;
}
.focus-question :deep(.form-control) { min-height: 3.25rem; font-size: 1.0625rem; }

.focus-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.focus-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.6rem 0.95rem;
  border: 1px solid var(--player-surface-border);
  border-radius: 0.6rem;
  color: inherit;
  font-weight: 650;
}
.focus-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--player-accent) 9%, var(--player-surface));
}
.focus-button--primary {
  margin-inline-start: auto;
  border-color: transparent;
  background: var(--player-action-bg, #0f172a);
  color: var(--player-action-text, #fff);
}
.focus-button--primary:hover:not(:disabled) { background: var(--player-action-hover, #24324b); }
.focus-button:focus-visible { outline: 2px solid var(--player-accent); outline-offset: 3px; }
.focus-button:disabled { opacity: 0.7; cursor: wait; }
.focus-error { padding: 0.75rem; border: 1px solid currentColor; border-radius: 0.5rem; font-size: 0.9rem; }
.focus-empty { padding: 2rem; text-align: center; }

.focus-question { animation: question-enter 150ms ease-out; }
@keyframes question-enter {
  from { opacity: 0.85; transform: translateY(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .focus-question { animation: none; }
}
</style>
