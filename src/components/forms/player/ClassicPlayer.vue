<template>
  <div v-if="questionSections.length" class="classic-player">
    <header class="classic-heading">
      <h1>{{ definition?.title || $t('Commons.heading.untitled_form') }}</h1>
      <p v-if="definition?.description">{{ definition.description }}</p>
      <div v-if="showProgress && totalQuestions" class="classic-progress">
        <span>{{ answeredCount }} of {{ totalQuestions }} answered</span>
        <progress :value="answeredCount" :max="totalQuestions" aria-label="Form progress" />
      </div>
    </header>

    <section v-for="(section, index) in questionSections" :key="section.id" class="classic-section">
      <header v-if="getSectionTitle(section, index) || section.description">
        <h2 v-if="getSectionTitle(section, index)">{{ getSectionTitle(section, index) }}</h2>
        <p v-if="section.description && section.description !== definition?.description">{{ section.description }}</p>
      </header>
      <div :class="['classic-questions', { 'classic-questions--compact': resolvedDensity === 'compact' }]">
        <div v-for="question in section.questions" :id="`answer-${question.id}`" :key="question.id">
          <QuestionRenderer
            :question="question"
            :model-value="playerStore.getAnswerValue(question.id)"
            :label-placement="resolvedLabelPlacement"
            :density="resolvedDensity"
            :disabled="isSubmitting"
            :show-errors="attempted"
            @update:model-value="(value) => updateAnswer(question.id, value)"
          />
        </div>
      </div>
    </section>

    <footer class="classic-footer">
      <p v-if="submissionError" role="alert">{{ submissionError }}</p>
      <button type="button" :disabled="isSubmitting" @click="emitSubmit">
        {{ isSubmitting ? 'Submitting…' : $t('Commons.button.submit_form') }}
        <ArrowRight v-if="!isSubmitting" :size="17" aria-hidden="true" />
      </button>
    </footer>
  </div>
  <p v-else class="classic-empty">{{ $t('Forms.Player.ClassicPlayer.text.no_questions_available_in') }}</p>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { ArrowRight } from 'lucide-vue-next';
import { getAnswerError, isEmptyAnswer } from '@/utils/formAnswerValidation';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormDensity, FormLabelPlacement, FormPage, FormQuestion } from '@/types';

const props = defineProps<{
  isSubmitting?: boolean;
  submissionError?: string | null;
  labelPlacement?: FormLabelPlacement;
  density?: FormDensity;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
}>();

const playerStore = useFormPlayerStore();
const { state: playerState } = storeToRefs(playerStore);

const isSubmitting = computed(() => props.isSubmitting ?? false);

const resolvedLabelPlacement = computed<FormLabelPlacement>(() => props.labelPlacement ?? 'stacked');
const resolvedDensity = computed<FormDensity>(() => props.density ?? 'comfortable');

type AnswerValue = Parameters<typeof playerStore.answerQuestion>[1];

const navigationSettings = computed(() => playerState.value.formDefinition?.navigation);
const showProgress = computed(() => navigationSettings.value?.show_progress ?? true);

const definition = computed(() => playerState.value.formDefinition ?? null);
const allQuestions = computed<FormQuestion[]>(() => (definition.value?.questions ?? []).filter((question) => playerStore.questionOrder.includes(question.id)));

interface QuestionSection {
  id: string;
  title?: string | null;
  description?: string | null;
  questions: FormQuestion[];
}

const questionSections = computed<QuestionSection[]>(() => {
  const form = definition.value;
  if (!form) return [];

  const map = new Map<string, FormQuestion>();
  allQuestions.value.forEach((question) => {
    if (question?.id) map.set(question.id, question);
  });

  const seen = new Set<string>();
  const sections: QuestionSection[] = (form.pages ?? []).map((page: FormPage, index) => {
    const ids = (page.question_order ?? page.questions?.map((q) => q.id) ?? []).filter(Boolean) as string[];
    const questions = ids.map((id) => {
      seen.add(id);
      return map.get(id);
    }).filter((q): q is FormQuestion => Boolean(q));

    return {
      id: page.id || `page-${index}`,
      title: page.title || form.title || null,
      description: page.description,
      questions,
    };
  });

  const orphanQuestions = allQuestions.value.filter((question) => question?.id && !seen.has(question.id));
  if (orphanQuestions.length) {
    sections.push({
      id: '__unsectioned__',
      title: form.title ?? null,
      description: form.description,
      questions: orphanQuestions,
    });
  }

  if (!sections.length) {
    return [{
      id: '__single__',
      title: form.title ?? null,
      description: form.description,
      questions: allQuestions.value,
    }];
  }

  return sections;
});

const sectionCount = computed(() => questionSections.value.length);

const totalQuestions = computed(() => allQuestions.value.length);

const answeredCount = computed(() =>
  allQuestions.value.filter((question) => !isEmptyAnswer(playerStore.getAnswerValue(question.id))).length,
);
const attempted = ref(false);

const defaultSectionTitle = (index: number): string => `Section ${index + 1}`;

const GENERIC_SECTION_TITLE = /^page\s+\d+$/i;

const getSectionTitle = (section: QuestionSection, index: number): string => {
  const rawTitle = section.title?.trim() ?? '';
  const isGeneric = GENERIC_SECTION_TITLE.test(rawTitle);

  if (sectionCount.value <= 1) {
    if (!rawTitle || isGeneric) return '';
    return rawTitle;
  }

  if (!rawTitle || isGeneric) {
    return defaultSectionTitle(index);
  }

  return rawTitle;
};

const updateAnswer = (questionId: string, value: unknown) => {
  playerStore.setAnswerValue(questionId, value as AnswerValue);
};

const commitAllAnswers = () => {
  questionSections.value.forEach((section) => {
    section.questions.forEach((question) => {
      const value = playerStore.getAnswerValue(question.id) as AnswerValue;
      playerStore.answerQuestion(question.id, value);
    });
  });
};

const emitSubmit = async () => {
  if (isSubmitting.value) return;
  const invalid = allQuestions.value.find((question) =>
    getAnswerError(question, playerStore.getAnswerValue(question.id)),
  );
  if (invalid) {
    attempted.value = true;
    await nextTick();
    const field = document.getElementById(`answer-${invalid.id}`);
    field?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    return;
  }
  commitAllAnswers();
  emit('submit');
};
</script>

<style scoped>
.classic-player {
  width: min(100%, 42rem);
  margin: 0 auto;
  color: var(--player-text-color);
}

.classic-heading, .classic-section, .classic-questions {
  display: grid;
  gap: 1.6rem;
}

.classic-heading {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--player-surface-border);
}
.classic-heading h1 {
  font-family: var(--player-heading-font, inherit);
  font-size: clamp(1.9rem, 5vw, 3rem);
  font-weight: 720;
  letter-spacing: -0.03em;
  line-height: 1.12;
}
.classic-heading p, .classic-section p { line-height: 1.55; }
.classic-heading h1, .classic-section h2 { color: inherit; overflow-wrap: anywhere; }

.classic-progress { display: grid; gap: 0.6rem; font-size: 0.825rem; font-weight: 650; }
.classic-progress progress {
  width: 100%;
  height: 5px;
  overflow: hidden;
  border-radius: 1rem;
  appearance: none;
  border: 0;
  background: var(--player-progress-track);
  color: var(--player-accent);
}

.classic-progress progress::-webkit-progress-bar { background: var(--player-progress-track); }
.classic-progress progress::-webkit-progress-value { background: var(--player-accent); }
.classic-progress progress::-moz-progress-bar { background: var(--player-accent); }

.classic-section { margin-top: 2rem; }
.classic-section + .classic-section { padding-top: 2rem; border-top: 1px solid var(--player-surface-border); }
.classic-section h2 { font-size: 1.25rem; font-weight: 700; }
.classic-questions { gap: 1.85rem; }
.classic-questions--compact { gap: 1.2rem; }
.classic-questions :deep(.form-control) { min-height: 44px; font-size: 1rem; }

.classic-footer {
  display: grid;
  gap: 0.8rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--player-surface-border);
}
.classic-footer button {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  justify-self: start;
  min-height: 44px;
  padding: 0.6rem 0.95rem;
  border-radius: 0.6rem;
  background: var(--player-action-bg, #0f172a);
  color: var(--player-action-text, #fff);
  font-weight: 650;
}
.classic-footer button:hover:not(:disabled) { background: var(--player-action-hover, #24324b); }
.classic-footer button:focus-visible { outline: 2px solid var(--player-accent); outline-offset: 3px; }
.classic-footer button:disabled { opacity: 0.7; cursor: wait; }
.classic-footer p { padding: 0.75rem; border: 1px solid currentColor; border-radius: 0.5rem; }
.classic-empty { padding: 2rem; text-align: center; }
</style>
