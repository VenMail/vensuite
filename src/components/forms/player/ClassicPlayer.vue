<template>
  <div v-if="questionSections.length" class="mx-auto my-4 w-full max-w-4xl px-3 sm:px-5 lg:px-6">
    <header class="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-700">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div class="flex flex-col gap-2.5">
          <span class="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-gray-500 dark:text-gray-400">
            {{ definition?.organization_id ? $t('Commons.text.form_preview') : $t('Commons.text.form_responses') }}
          </span>
          <h1 class="font-serif text-[2.25rem] font-semibold leading-tight text-gray-900 sm:text-[2.6rem] dark:text-gray-100">
            {{ definition?.title || $t('Commons.heading.untitled_form') }}
          </h1>
          <p v-if="definition?.description" class="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            {{ definition?.description }}
          </p>
        </div>
      </div>

      <div v-if="showProgress && totalQuestions" class="mt-1 flex flex-col gap-1">
        <div class="flex items-center justify-between text-[0.6rem] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          <span>{{ answeredCount }} of {{ totalQuestions }} answered</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-gray-200 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-700 dark:to-gray-600">
          <div
            class="h-full bg-gradient-to-r from-[var(--player-accent)] to-[var(--player-accent-strong)] transition-all duration-500 ease-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
    </header>

    <nav v-if="sectionSummaries.length > 1" class="py-3" aria-label="Form sections">
      <ol class="flex flex-wrap gap-3">
        <li
          v-for="(section, idx) in sectionSummaries"
          :key="section.id"
          :class="[
            'flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm text-gray-600 transition hover:border-primary-200 hover:bg-primary-50/80 hover:text-primary-700 dark:text-gray-300 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300',
            section.hasErrors ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-300' : ''
          ]"
        >
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:text-gray-300">
            {{ idx + 1 }}
          </span>
          <div class="flex flex-col gap-0.5">
            <p class="font-semibold text-gray-800 dark:text-gray-100">{{ section.title || `Section ${idx + 1}` }}</p>
            <p class="text-[0.65rem] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
              {{ section.answered }} of {{ section.total }} answered
            </p>
          </div>
        </li>
      </ol>
    </nav>

    <main :class="questionSectionContainerClass">
      <section
        v-for="(section, index) in questionSections"
        :id="`section-${section.id}`"
        :key="section.id"
        :class="[
          'flex flex-col gap-6 border-b border-gray-200 pb-8 last:border-none last:pb-0 dark:border-gray-700',
          sectionStateMap.get(section.id)?.hasErrors ? 'border-b-2 border-rose-400/70 dark:border-rose-500/70' : ''
        ]"
      >
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex max-w-3xl flex-col gap-1.5">
            <span
              v-if="sectionCount > 1"
              class="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500"
            >
              Section {{ index + 1 }}
            </span>
            <h2
              v-if="getSectionTitle(section, index)"
              class="text-xl font-semibold text-gray-900 sm:text-[1.9rem] dark:text-gray-100"
            >
              {{ getSectionTitle(section, index) }}
            </h2>
          </div>
          <span
            v-if="sectionCount > 1"
            class="inline-flex h-8 items-center rounded-full border border-gray-200 px-3 text-[0.65rem] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-300"
          >
            {{ section.questions.length }}
            {{ section.questions.length === 1 ? 'question' : 'questions' }}
          </span>
        </header>

        <p v-if="section.description" class="text-[0.95rem] text-gray-600 dark:text-gray-400">
          {{ section.description }}
        </p>

        <div :class="questionGridClass">
          <article
            v-for="question in section.questions"
            :key="question.id"
            :class="questionCardClass"
          >
            <QuestionRenderer
              :question="question"
              :model-value="playerStore.getAnswerValue(question.id)"
              :label-placement="resolvedLabelPlacement"
              :density="resolvedDensity"
              :disabled="isSubmitting"
              @update:model-value="(value) => updateAnswer(question.id, value)"
            />
          </article>
        </div>
      </section>
    </main>

    <footer
      class="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-col gap-1">
        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {{ canSubmit ? $t('Forms.Player.ClassicPlayer.text.ready_to_submit') : $t('Forms.Player.ClassicPlayer.text.please_complete_required_fields') }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ canSubmit ? $t('Forms.Player.ClassicPlayer.text.review_your_responses_before') : $t('Forms.Player.ClassicPlayer.text.required_fields_are_marked') }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:shadow-primary-900/30 dark:hover:bg-primary-600 dark:focus:ring-primary-400 dark:focus:ring-offset-slate-900"
        :disabled="isSubmitting || !canSubmit"
        @click="emitSubmit"
      >
        <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>{{ isSubmitting ? 'Submitting…' : canSubmit ? $t('Commons.button.submit_form') : $t('Forms.Player.ClassicPlayer.text.complete_required_fields') }}</span>
      </button>
    </footer>
  </div>

  <div
    v-else
    class="mx-auto my-20 max-w-xl rounded-2xl border-2 border-dashed border-gray-300 bg-white px-10 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
  >
    <p>{{$t('Forms.Player.ClassicPlayer.text.no_questions_available_in')}}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormDensity, FormLabelPlacement, FormPage, FormQuestion } from '@/types';

const props = defineProps<{
  isSubmitting?: boolean;
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

const questionSectionContainerClass = computed(() => {
  const base = ['flex', 'flex-col'];
  base.push(resolvedDensity.value === 'compact' ? 'gap-4 py-4' : 'gap-8 py-6');
  return base.join(' ');
});

const questionGridClass = computed(() => {
  const base = ['grid'];
  base.push(resolvedDensity.value === 'compact' ? 'gap-4' : 'gap-6');
  return base.join(' ');
});

const questionCardClass = computed(() => {
  const base = ['rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm transition hover:-translate-y-0.5 dark:border-gray-700/70 dark:bg-gray-900/60'];
  if (resolvedDensity.value === 'compact') {
    base.push('px-4 py-3 hover:border-primary-200/60 dark:hover:border-primary-500/30');
  } else {
    base.push('px-5 py-4 hover:border-primary-200/70 dark:hover:border-primary-500/40');
  }
  return base.join(' ');
});

type AnswerValue = Parameters<typeof playerStore.answerQuestion>[1];

const navigationSettings = computed(() => playerState.value.formDefinition?.navigation);
const showProgress = computed(() => navigationSettings.value?.show_progress ?? true);

const definition = computed(() => playerState.value.formDefinition ?? null);
const allQuestions = computed<FormQuestion[]>(() => definition.value?.questions ?? []);

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

const answeredCount = computed(() => {
  return allQuestions.value.filter((question) => !isAnswerEmpty(question, playerStore.getAnswerValue(question.id))).length;
});

const progressPercent = computed(() => {
  if (!totalQuestions.value) return 0;
  return Math.min(100, Math.round((answeredCount.value / totalQuestions.value) * 100));
});

const missingRequiredQuestions = computed(() => {
  return allQuestions.value.filter(
    (question) => question.required && isAnswerEmpty(question, playerStore.getAnswerValue(question.id)),
  );
});

const canSubmit = computed(() => missingRequiredQuestions.value.length === 0);

const sectionSummaries = computed(() => {
  return questionSections.value.map((section) => {
    const answered = section.questions.filter(
      (question) => !isAnswerEmpty(question, playerStore.getAnswerValue(question.id)),
    ).length;
    const hasErrors = section.questions.some(
      (question) => question.required && isAnswerEmpty(question, playerStore.getAnswerValue(question.id)),
    );
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      total: section.questions.length,
      answered,
      hasErrors,
    };
  });
});

const sectionStateMap = computed(() => {
  return new Map(sectionSummaries.value.map((summary) => [summary.id, summary]));
});

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

const emitSubmit = () => {
  commitAllAnswers();
  emit('submit');
};
</script>

<style scoped>
.classic-player {
  margin: 2.5rem auto 4rem;
  width: min(100%, 960px);
  padding: 0 clamp(1.25rem, 4vw, 2.5rem);
}

.classic-shell {
  border-radius: 2.75rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), #fff 48%, rgba(255, 255, 255, 0.92));
  box-shadow: 0 60px 80px -60px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.classic-shell:hover {
  box-shadow: 0 70px 120px -70px rgba(15, 23, 42, 0.55);
}

.dark .classic-shell {
  border-color: rgba(100, 116, 139, 0.45);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.98));
  box-shadow: 0 60px 80px -60px rgba(8, 47, 73, 0.4);
}

.classic-header {
  position: relative;
  padding: clamp(2rem, 5vw, 3rem) clamp(2rem, 5vw, 4rem) clamp(1.5rem, 4vw, 2.5rem);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.dark .classic-header {
  border-bottom-color: rgba(148, 163, 184, 0.2);
}

.classic-header__meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.classic-kicker {
  font-size: 0.65rem;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: #64748b;
}

.dark .classic-kicker {
  color: #e2e8f0;
}

.classic-title {
  font-family: 'Playfair Display', 'Georgia', serif;
  font-size: clamp(2.35rem, 4vw, 3rem);
  font-weight: 600;
  color: #0f172a;
}

.dark .classic-title {
  color: #f8fafc;
}

.classic-subtitle {
  font-size: 1rem;
  max-width: 48ch;
  color: #475569;
}

.dark .classic-subtitle {
  color: #cbd5f5;
}

.classic-header__tools {
  margin-top: clamp(1.25rem, 3vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.classic-theme-toggle {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 0.4rem 0.55rem;
  background: rgba(248, 250, 252, 0.9);
  transition: transform 0.2s ease, background 0.2s ease;
}

.classic-theme-toggle:hover {
  transform: translateY(-2px);
  background: rgba(226, 232, 240, 0.95);
}

.dark .classic-theme-toggle {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.9);
}

.dark .classic-theme-toggle:hover {
  background: rgba(51, 65, 85, 0.9);
}

.classic-progress {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.classic-progress__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #64748b;
}

.dark .classic-progress__meta {
  color: #e2e8f0;
}

.classic-progress__track {
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0.35));
}

.dark .classic-progress__track {
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.25), rgba(148, 163, 184, 0.4));
}

.classic-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, var(--player-accent), var(--player-accent-strong));
  transition: width 0.4s ease;
}

.classic-outline {
  padding: clamp(1.5rem, 4vw, 2.75rem) clamp(2rem, 5vw, 3.5rem);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.85);
}

.dark .classic-outline {
  border-bottom-color: rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.8);
}

.classic-outline__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.classic-outline__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 1.25rem;
  border: 1px solid transparent;
  padding: 0.5rem 1.1rem;
  font-size: 0.85rem;
  color: #475569;
  background: rgba(248, 250, 252, 0.9);
  transition: all 0.2s ease;
}

.classic-outline__item:hover {
  border-color: rgba(37, 99, 235, 0.25);
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.9);
}

.dark .classic-outline__item {
  color: #cbd5f5;
  background: rgba(46, 59, 82, 0.8);
}

.dark .classic-outline__item:hover {
  border-color: rgba(96, 165, 250, 0.45);
  background: rgba(30, 64, 175, 0.45);
}

.classic-outline__item--alert {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(254, 226, 226, 0.8);
  color: #b91c1c;
}

.dark .classic-outline__item--alert {
  border-color: rgba(248, 113, 113, 0.6);
  background: rgba(127, 29, 29, 0.6);
  color: rgba(254, 202, 202, 0.95);
}

.classic-outline__index {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.dark .classic-outline__index {
  border-color: rgba(148, 163, 184, 0.45);
  color: #e2e8f0;
}

.classic-outline__copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.classic-outline__title {
  font-weight: 600;
  color: #0f172a;
}

.dark .classic-outline__title {
  color: #f8fafc;
}

.classic-outline__meta {
  font-size: 0.55rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #64748b;
}

.dark .classic-outline__meta {
  color: #e2e8f0;
}

.classic-body {
  padding: clamp(2rem, 5vw, 3.25rem) clamp(2rem, 5vw, 4rem) clamp(2.25rem, 5vw, 3.25rem);
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 5vw, 3.5rem);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.95));
}

.dark .classic-body {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94));
}

.classic-section {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  padding-bottom: clamp(1.75rem, 4vw, 3rem);
}

.classic-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.dark .classic-section {
  border-bottom-color: rgba(148, 163, 184, 0.2);
}

.classic-section--alert {
  border-bottom: 2px solid rgba(248, 113, 113, 0.65);
}

.dark .classic-section--alert {
  border-bottom-color: rgba(252, 165, 165, 0.6);
}

.classic-section__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .classic-section__header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}

.classic-section__heading {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-width: 52ch;
}

.classic-section__eyebrow {
  font-size: 0.6rem;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  font-weight: 600;
  color: #94a3b8;
}

.dark .classic-section__eyebrow {
  color: #e2e8f0;
}

.classic-section__title {
  font-size: clamp(1.75rem, 3.5vw, 2.35rem);
  font-weight: 600;
  color: #0f172a;
}

.dark .classic-section__title {
  color: #f8fafc;
}

.classic-section__count {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 9999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.dark .classic-section__count {
  border-color: rgba(148, 163, 184, 0.45);
  color: #e2e8f0;
}

.classic-section__description {
  font-size: 0.95rem;
  color: #475569;
}

.dark .classic-section__description {
  color: #cbd5f5;
}

.classic-question-list {
  display: grid;
  gap: clamp(1.25rem, 3vw, 2rem);
}

.classic-question {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1.75rem;
  padding: clamp(1.25rem, 3vw, 1.9rem);
  background: rgba(248, 250, 252, 0.95);
  box-shadow: 0 12px 30px -20px rgba(15, 23, 42, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.classic-question:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 45px -25px rgba(15, 23, 42, 0.45);
}

.dark .classic-question {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(30, 41, 59, 0.85);
  box-shadow: none;
}

.dark .classic-question:hover {
  box-shadow: 0 18px 32px -22px rgba(15, 118, 110, 0.3);
}

.classic-footer {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 3vw, 1.75rem);
  padding: clamp(2rem, 5vw, 3rem) clamp(2rem, 5vw, 4rem) clamp(2.5rem, 5vw, 3.5rem);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.92);
}

.dark .classic-footer {
  border-top-color: rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.85);
}

@media (min-width: 640px) {
  .classic-footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.classic-footer__copy {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.classic-footer__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}

.dark .classic-footer__title {
  color: #f8fafc;
}

.classic-footer__meta {
  font-size: 0.75rem;
  color: #475569;
}

.dark .classic-footer__meta {
  color: #cbd5f5;
}

.classic-footer__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  border: none;
  padding: 0.75rem 1.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--player-accent), var(--player-accent-strong));
  box-shadow: 0 12px 35px -18px rgba(37, 99, 235, 0.55);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.classic-footer__button:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 45px -18px rgba(37, 99, 235, 0.65);
}

.classic-footer__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.dark .classic-footer__button {
  box-shadow: 0 12px 30px -18px rgba(30, 64, 175, 0.6);
}

.empty-state {
  margin: 4rem auto;
  max-width: 32rem;
  border-radius: 2rem;
  border: 2px dashed rgba(148, 163, 184, 0.4);
  background: rgba(248, 250, 252, 0.9);
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.dark .empty-state {
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
}
</style>