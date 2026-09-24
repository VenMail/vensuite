import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SigningSession, SigningField, SigningFieldValue, SigningCompletionResponse } from '@/types/signing';
import {
  getApiErrorMessage,
  retryOnSigningLock,
  SIGNING_SUBMIT_RETRY_DEADLINE_MS,
  signingApi,
} from '@/services/signing';

export const useSigningPlayerStore = defineStore('signing-player', () => {
  const session = ref<SigningSession | null>(null);
  const answers = ref<Record<string, string | boolean>>({});
  const currentPage = ref(0);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const error = ref<string | null>(null);
  const submitError = ref<string | null>(null);
  const isCompleted = ref(false);
  const isAlreadyCompleted = ref(false);
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

  function hasCompletedValue(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim() !== '';
    }

    return false;
  }

  function defaultAnswersForFields(
    fields: SigningField[],
    hydratePersistedValues = false
  ): Record<string, string | boolean> {
    const defaults: Record<string, string | boolean> = {};
    const today = todayLocalDate();

    for (const field of fields) {
      if (hydratePersistedValues && hasCompletedValue(field.value)) {
        defaults[field.id] = field.value as string | boolean;
      } else if (field.type === 'date') {
        defaults[field.id] = typeof field.value === 'string' && field.value.trim() !== ''
          ? field.value
          : today;
      }
    }

    return defaults;
  }

  function sessionIndicatesCompletedSigner(data: SigningSession): boolean {
    const explicitStatus = data.signerStatus
      ?? data.signer_status
      ?? data.signer?.status
      ?? data.status;
    if (typeof explicitStatus === 'string' && explicitStatus.toLowerCase() === 'completed') {
      return true;
    }
    if (data.completed === true) return true;

    // Older backends do not expose signer status, but persist all required
    // values only when completion succeeds. Treat that complete set as the
    // completion signal; partial answers remain in the normal editable flow.
    const required = data.fields.filter(field => field.required);
    return required.length > 0 && required.every(field => hasCompletedValue(field.value));
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
    !isCompleted.value && requiredFields.value.every(f => hasCompletedValue(answers.value[f.id]))
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
    submitError.value = null;

    try {
      const data = await signingApi.fetchSignerSession(token);
      const alreadyCompleted = sessionIndicatesCompletedSigner(data);
      session.value = data;
      answers.value = defaultAnswersForFields(data.fields || [], alreadyCompleted);
      currentPage.value = 0;
      isCompleted.value = alreadyCompleted;
      isAlreadyCompleted.value = alreadyCompleted;
      signedDocumentReady.value = false;
      downloadUrl.value = null;
      signedDocumentStatusUrl.value = null;
      statusPollRun += 1;
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e, 'Failed to load signing session');
    } finally {
      isLoading.value = false;
    }
  }

  function setFieldValue(fieldId: string, value: string | boolean) {
    answers.value = { ...answers.value, [fieldId]: value };
  }

  async function submit(token: string, filledPdfBytes?: Uint8Array | null): Promise<boolean> {
    if (!canSubmit.value) return false;

    isSubmitting.value = true;
    submitError.value = null;

    try {
      const fieldValues: SigningFieldValue[] = Object.entries(answers.value).map(
        ([fieldId, value]) => ({ fieldId, value })
      );

      const completion: SigningCompletionResponse = await retryOnSigningLock(
        () => signingApi.submitCompletion(token, fieldValues, filledPdfBytes),
        SIGNING_SUBMIT_RETRY_DEADLINE_MS
      );

      signedDocumentReady.value = Boolean(completion.signedDocumentReady);
      downloadUrl.value = completion.downloadUrl || null;
      signedDocumentStatusUrl.value = completion.signedDocumentStatusUrl || null;
      isCompleted.value = true;
      isAlreadyCompleted.value = false;

      if (signedDocumentStatusUrl.value && !downloadUrl.value) {
        void pollSignedDocumentStatus(signedDocumentStatusUrl.value);
      }

      return true;
    } catch (e: unknown) {
      submitError.value = getApiErrorMessage(e, 'Failed to submit signatures');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  function clearSubmitError() {
    submitError.value = null;
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
    submitError.value = null;
    isCompleted.value = false;
    isAlreadyCompleted.value = false;
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
    submitError,
    isCompleted,
    isAlreadyCompleted,
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
    clearSubmitError,
    setCurrentPage,
    reset,
  };
});
