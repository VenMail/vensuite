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
  const signedDocumentReady = ref(false);
  const downloadUrl = ref<string | null>(null);
  const signedDocumentStatusUrl = ref<string | null>(null);
  let statusPollRun = 0;

  function todayLocalDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function defaultAnswersForFields(fields: SigningField[]): Record<string, string | boolean> {
    const defaults: Record<string, string | boolean> = {};
    const today = todayLocalDate();

    for (const field of fields) {
      if (field.type === 'date') {
        defaults[field.id] = typeof field.value === 'string' && field.value.trim() !== ''
          ? field.value
          : today;
      }
    }

    return defaults;
  }

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
      answers.value = defaultAnswersForFields(data.fields || []);
      currentPage.value = 0;
      isCompleted.value = false;
      signedDocumentReady.value = false;
      downloadUrl.value = null;
      signedDocumentStatusUrl.value = null;
      statusPollRun += 1;
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

      const completion = await signingApi.submitCompletion(token, fieldValues);
      signedDocumentReady.value = Boolean(completion.signedDocumentReady);
      downloadUrl.value = completion.downloadUrl || null;
      signedDocumentStatusUrl.value = completion.signedDocumentStatusUrl || null;
      isCompleted.value = true;

      if (signedDocumentStatusUrl.value && !downloadUrl.value) {
        void pollSignedDocumentStatus(signedDocumentStatusUrl.value);
      }

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
    statusPollRun += 1;
    session.value = null;
    answers.value = {};
    currentPage.value = 0;
    isLoading.value = false;
    isSubmitting.value = false;
    error.value = null;
    isCompleted.value = false;
    signedDocumentReady.value = false;
    downloadUrl.value = null;
    signedDocumentStatusUrl.value = null;
  }

  async function pollSignedDocumentStatus(statusUrl: string) {
    const pollRun = ++statusPollRun;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1000 : 1500));

      if (pollRun !== statusPollRun) {
        return;
      }

      try {
        const status = await signingApi.fetchSignedDocumentStatus(statusUrl);
        signedDocumentReady.value = Boolean(status.signedDocumentReady);
        downloadUrl.value = status.downloadUrl || null;

        if (status.signedDocumentReady && status.downloadUrl) {
          return;
        }
      } catch {
        return;
      }
    }
  }

  return {
    session,
    answers,
    currentPage,
    isLoading,
    isSubmitting,
    error,
    isCompleted,
    signedDocumentReady,
    downloadUrl,
    signedDocumentStatusUrl,
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
