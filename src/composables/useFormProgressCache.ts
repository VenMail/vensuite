import { watch, type WatchStopHandle } from 'vue';
import { useFormPlayerStore } from '@/store/formPlayer';
import { debounce } from '@univerjs/core';

const STORAGE_PREFIX = 'VENX_FORM_PROGRESS_';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SAVE_DEBOUNCE_MS = 500;

export interface CachedFormProgress {
  answers: Record<string, unknown>;
  currentQuestionId: string | null;
  seenQuestionIds: string[];
  responseId: string | null;
  formVersion: string | null;
  timestamp: number;
}

const buildKey = (formIdentifier: string): string =>
  `${STORAGE_PREFIX}${formIdentifier}`;

const isFileValue = (value: unknown): boolean =>
  typeof File !== 'undefined' && value instanceof File;

const sanitizeAnswers = (answers: Record<string, unknown>): Record<string, unknown> => {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!isFileValue(value)) {
      clean[key] = value;
    }
  }
  return clean;
};

export const useFormProgressCache = () => {
  const playerStore = useFormPlayerStore();
  const stopHandles: WatchStopHandle[] = [];

  const getFormIdentifier = (): string | null => {
    const slug = playerStore.state.formSlug;
    if (slug) return slug;
    const id = playerStore.state.formDefinition?.id;
    return id ?? null;
  };

  const getFormVersionHash = (): string | null => {
    const def = playerStore.state.formDefinition;
    if (!def) return null;
    const questionIds = (def.questions ?? []).map((q) => q.id).join(',');
    const version = def.version ?? '';
    return `${version}:${questionIds}`;
  };

  const saveProgress = () => {
    const identifier = getFormIdentifier();
    if (!identifier) return;

    const answers = sanitizeAnswers(playerStore.state.answers);
    if (Object.keys(answers).length === 0) return;

    const cached: CachedFormProgress = {
      answers,
      currentQuestionId: playerStore.state.currentQuestionId,
      seenQuestionIds: [...playerStore.state.seenQuestionIds],
      responseId: playerStore.state.responseId,
      formVersion: getFormVersionHash(),
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(buildKey(identifier), JSON.stringify(cached));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  };

  const debouncedSave = debounce(saveProgress, SAVE_DEBOUNCE_MS);

  const loadProgress = (): CachedFormProgress | null => {
    const identifier = getFormIdentifier();
    if (!identifier) return null;

    try {
      const raw = localStorage.getItem(buildKey(identifier));
      if (!raw) return null;

      const cached: CachedFormProgress = JSON.parse(raw);

      // Expired?
      if (Date.now() - cached.timestamp > CACHE_MAX_AGE_MS) {
        clearProgress();
        return null;
      }

      // Form version changed?
      const currentVersion = getFormVersionHash();
      if (currentVersion && cached.formVersion && cached.formVersion !== currentVersion) {
        clearProgress();
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  };

  const hasProgress = (): boolean => {
    const cached = loadProgress();
    return cached !== null && Object.keys(cached.answers).length > 0;
  };

  const restoreProgress = (): boolean => {
    const cached = loadProgress();
    if (!cached || Object.keys(cached.answers).length === 0) return false;

    // Restore answers
    for (const [questionId, value] of Object.entries(cached.answers)) {
      playerStore.setAnswerValue(questionId, value as any);
    }

    // Restore seen questions
    for (const id of cached.seenQuestionIds) {
      if (!playerStore.state.seenQuestionIds.includes(id)) {
        playerStore.state.seenQuestionIds.push(id);
      }
    }

    // Restore current question position
    if (cached.currentQuestionId) {
      playerStore.state.currentQuestionId = cached.currentQuestionId;
    }

    // Restore response ID if we had a draft
    if (cached.responseId) {
      playerStore.state.responseId = cached.responseId;
    }

    // Recalculate progress
    const totalQuestions = playerStore.questions.length;
    playerStore.state.progress = Math.min(
      1,
      Object.keys(playerStore.state.answers).length / Math.max(totalQuestions, 1),
    );

    return true;
  };

  const clearProgress = () => {
    const identifier = getFormIdentifier();
    if (!identifier) return;
    try {
      localStorage.removeItem(buildKey(identifier));
    } catch {
      // Silently ignore
    }
  };

  const startWatching = () => {
    // Watch answers for changes and persist
    stopHandles.push(
      watch(
        () => playerStore.state.answers,
        () => {
          debouncedSave();
        },
        { deep: true },
      ),
    );

    // Watch current question changes
    stopHandles.push(
      watch(
        () => playerStore.state.currentQuestionId,
        () => {
          debouncedSave();
        },
      ),
    );
  };

  const stopWatching = () => {
    stopHandles.forEach((stop) => stop());
    stopHandles.length = 0;
    debouncedSave.cancel();
  };

  return {
    hasProgress,
    loadProgress,
    restoreProgress,
    clearProgress,
    saveProgress,
    startWatching,
    stopWatching,
  };
};
