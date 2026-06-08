import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SigningSession, SigningField, SigningFieldValue } from '@/types/signing';
import { signingApi } from '@/services/signing';

export const useSigningPlayerStore = defineStore('signing-player', () => {
  const session = ref<SigningSession | null>(null);
  const answers = ref<Record<string, string | boolean>>({});
  const currentPage = ref(0);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const error = ref<string | null>(null);
  const isCompleted = ref(false);

  function hasCompletedValue(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim() !== '';
    }

    return false;
  }

  const requiredFields = computed(() =>
    session.value?.fields.filter(f => f.required) || []
  );

  const completedFields = computed(() =>
    session.value?.fields.filter(f => hasCompletedValue(answers.value[f.id])) || []
  );

  const progress = computed(() => {
    const required = requiredFields.value.length;
    if (required === 0) return 1;
    const filled = requiredFields.value.filter(f => hasCompletedValue(answers.value[f.id])).length;
    return filled / required;
  });

  const canSubmit = computed(() =>
    requiredFields.value.every(f => hasCompletedValue(answers.value[f.id]))
  );

  const fieldsByPage = computed(() => {
    const grouped: Record<number, SigningField[]> = {};
    for (const field of session.value?.fields || []) {
      if (!grouped[field.pageIndex]) grouped[field.pageIndex] = [];
      grouped[field.pageIndex].push(field);
    }
    return grouped;
  });

  async function loadSession(token: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await signingApi.fetchSignerSession(token);
      session.value = data;
      answers.value = {};
      currentPage.value = 0;
      isCompleted.value = false;
    } catch (e: any) {
      error.value = e?.data?.error || e?.message || 'Failed to load signing session';
    } finally {
      isLoading.value = false;
    }
  }

  function setFieldValue(fieldId: string, value: string | boolean) {
    answers.value = { ...answers.value, [fieldId]: value };
  }

  async function submit(token: string): Promise<boolean> {
    if (!canSubmit.value) return false;

    isSubmitting.value = true;
    error.value = null;

    try {
      const fieldValues: SigningFieldValue[] = Object.entries(answers.value).map(
        ([fieldId, value]) => ({ fieldId, value })
      );

      await signingApi.submitCompletion(token, fieldValues);
      isCompleted.value = true;
      return true;
    } catch (e: any) {
      error.value = e?.data?.error || e?.message || 'Failed to submit signatures';
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  function setCurrentPage(page: number) {
    currentPage.value = page;
  }

  function reset() {
    session.value = null;
    answers.value = {};
    currentPage.value = 0;
    isLoading.value = false;
    isSubmitting.value = false;
    error.value = null;
    isCompleted.value = false;
  }

  return {
    session,
    answers,
    currentPage,
    isLoading,
    isSubmitting,
    error,
    isCompleted,
    requiredFields,
    completedFields,
    progress,
    canSubmit,
    fieldsByPage,
    loadSession,
    setFieldValue,
    submit,
    setCurrentPage,
    reset,
  };
});
