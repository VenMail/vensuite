<template>
  <div v-if="questionSections.length" class="mx-auto my-6 w-full max-w-4xl px-3 sm:px-5 lg:px-6">
    <article
      class="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 transition dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
    >
      <header
        class="border-b border-slate-200 px-5 py-8 sm:px-10 backdrop-blur-md dark:border-slate-800"
      >
        <div class="flex flex-col gap-3">
          <span class="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            {{ definition?.organization_id ? 'Form Preview' : 'Form Response' }}
          </span>
          <h1 class="font-serif text-4xl font-semibold text-slate-900 sm:text-[2.75rem] dark:text-white">
            {{ definition?.title || 'Untitled Form' }}
          </h1>
          <p v-if="definition?.description" class="max-w-3xl text-base text-slate-600 dark:text-slate-400">
            {{ definition?.description }}
          </p>
        </div>

        <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            class="inline-flex items-center justify-center self-end rounded-full border border-slate-300/70 bg-slate-50/90 p-2 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-600/70 dark:bg-slate-800/80 dark:hover:bg-slate-700"
            :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <Sun v-if="isDarkMode" class="h-5 w-5 text-amber-400" />
            <Moon v-else class="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </button>

          <div v-if="showProgress && totalQuestions" class="flex flex-1 flex-col gap-1.5">
            <div class="flex items-center justify-between text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span>{{ answeredCount }} of {{ totalQuestions }} answered</span>
              <span>{{ progressPercent }}%</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-slate-200 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-700 dark:to-slate-600">
              <div
                class="h-full bg-gradient-to-r from-[var(--player-accent)] to-[var(--player-accent-strong)] transition-all duration-500 ease-out"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>
        </div>
      </header>

      <nav
        v-if="sectionSummaries.length > 1"
        class="border-b border-slate-200 bg-white/80 px-5 py-4 sm:px-10 dark:border-slate-800 dark:bg-slate-950/60"
        aria-label="Form sections"
      >
        <ol class="flex flex-wrap gap-3">
          <li
            v-for="(section, idx) in sectionSummaries"
            :key="section.id"
            :class="[
              'flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm text-slate-600 transition hover:border-primary-200 hover:bg-primary-50/80 hover:text-primary-700 dark:text-slate-300 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300',
              section.hasErrors ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-300' : ''
            ]"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500 dark:border-slate-600 dark:text-slate-300">
              {{ idx + 1 }}
            </span>
            <div class="flex flex-col gap-0.5">
              <p class="font-semibold text-slate-800 dark:text-slate-100">{{ section.title || `Section ${idx + 1}` }}</p>
              <p class="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                {{ section.answered }} of {{ section.total }} answered
              </p>
            </div>
          </li>
        </ol>
      </nav>

      <main
        class="flex flex-col gap-7 bg-gradient-to-b from-white via-slate-50 to-white px-5 py-8 sm:px-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
      >
        <section
          v-for="(section, index) in questionSections"
          :id="`section-${section.id}`"
          :key="section.id"
          :class="[
            'flex flex-col gap-8 border-b border-slate-200 pb-10 last:border-none last:pb-0 dark:border-slate-800',
            sectionStateMap.get(section.id)?.hasErrors ? 'border-b-2 border-rose-400/70 dark:border-rose-500/70' : ''
          ]"
        >
          <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex max-w-3xl flex-col gap-1.5">
              <span
                v-if="questionSections.length > 1"
                class="text-[0.6rem] font-semibold uppercase tracking-[0.38em] text-slate-400 dark:text-slate-500"
              >
                Section {{ index + 1 }}
              </span>
              <h2 class="text-2xl font-semibold text-slate-900 sm:text-[2.15rem] dark:text-white">
                {{ section.title || defaultSectionTitle(index) }}
              </h2>
            </div>
            <span
              class="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300"
            >
              {{ section.questions.length }}
              {{ section.questions.length === 1 ? 'question' : 'questions' }}
            </span>
          </header>

          <p v-if="section.description" class="text-sm text-slate-600 dark:text-slate-400">
            {{ section.description }}
          </p>

          <div class="grid gap-6">
            <article
              v-for="question in section.questions"
              :key="question.id"
              class="rounded-2xl border border-slate-200 bg-slate-50/90 p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-primary-500/40"
            >
              <QuestionRenderer
                :question="question"
                :model-value="playerStore.getAnswerValue(question.id)"
                :disabled="isSubmitting"
                @update:model-value="(value) => updateAnswer(question.id, value)"
              />
            </article>
          </div>
        </section>
      </main>

      <footer
        class="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/90 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10 dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div class="flex flex-col gap-1">
          <p class="text-base font-semibold text-slate-800 dark:text-white">
            {{ canSubmit ? 'Ready to submit' : 'Please complete required fields' }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ canSubmit ? 'Review your responses before submitting.' : 'Required fields are marked with *' }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:shadow-primary-900/40 dark:hover:bg-primary-600 dark:focus:ring-primary-400 dark:focus:ring-offset-slate-900"
          :disabled="isSubmitting || !canSubmit"
          @click="emitSubmit"
        >
          <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{{ isSubmitting ? 'Submitting…' : canSubmit ? 'Submit form' : 'Complete required fields' }}</span>
        </button>
      </footer>
    </article>
  </div>

  <div
    v-else
    class="mx-auto my-20 max-w-xl rounded-2xl border-2 border-dashed border-slate-300 bg-white px-10 py-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
  >
    <p>No questions available in this form.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import QuestionRenderer from '@/components/forms/player/QuestionRenderer.vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import type { FormPage, FormQuestion } from '@/types';
import { Moon, Sun } from 'lucide-vue-next';

const props = defineProps<{
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
}>();

const playerStore = useFormPlayerStore();
const { state: playerState } = storeToRefs(playerStore);

const isSubmitting = computed(() => props.isSubmitting ?? false);

const THEME_EVENT = 'theme-change';
const THEME_STORAGE_KEY = 'theme';
const isDarkMode = ref(false);

const applyTheme = (mode: 'light' | 'dark', emitEvent = false, persist = true) => {
  const isDark = mode === 'dark';
  isDarkMode.value = isDark;
  document.documentElement.classList.toggle('dark', isDark);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  if (emitEvent) {
    window.dispatchEvent(new CustomEvent<'light' | 'dark'>(THEME_EVENT, { detail: mode }));
  }
};

const syncThemeFromStorage = () => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored as 'light' | 'dark', false);
  } else {
    applyTheme('light', false, false);
  }
};

const handleExternalTheme = (event: Event) => {
  const detail = (event as CustomEvent<'light' | 'dark'>).detail;
  if (detail === 'light' || detail === 'dark') {
    applyTheme(detail, false);
  }
};

const toggleTheme = () => {
  const mode: 'light' | 'dark' = isDarkMode.value ? 'light' : 'dark';
  applyTheme(mode, true);
};

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

const defaultSectionTitle = (index: number) => {
  const fallback = `Section ${index + 1}`;
  const formTitle = definition.value?.title?.trim();
  return formTitle ? `${formTitle} — ${fallback}` : fallback;
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

onMounted(() => {
  syncThemeFromStorage();
  window.addEventListener(THEME_EVENT, handleExternalTheme as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener(THEME_EVENT, handleExternalTheme as EventListener);
});
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