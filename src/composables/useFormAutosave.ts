import { ref, watch, computed, type WatchStopHandle } from "vue";
import { updateForm } from "@/services/forms";
import { useFormEditorStore } from "@/store/formEditor";
import { useFormSettingsStore } from "@/store/formSettings";
import { toast } from "@/composables/useToast";
import type { FormDefinition } from "@/types";
import { debounce } from "@univerjs/core";
import { t } from '@/i18n';

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface AutosaveOptions {
  organizationId?: string;
  authToken?: string | null;
}

export const useFormAutosave = (options: AutosaveOptions = {}) => {
  const editorStore = useFormEditorStore();
  const settingsStore = useFormSettingsStore();

  const isEnabled = ref(true);
  const stopHandles: WatchStopHandle[] = [];
  const hasHydrated = ref(false);
  const isApplyingServerState = ref(false);
  const isSaving = computed(() => editorStore.state.isSaving);
  const lastSavedAt = computed(() => editorStore.state.lastSavedAt);
  const lastError = computed(() => editorStore.state.lastError);

  const getPayload = (): Partial<FormDefinition> => {
    const formId = editorStore.state.formId;
    const definition: Partial<FormDefinition> = {
      id: formId ?? undefined,
      version: editorStore.state.version ?? undefined,
      organization_id: editorStore.state.organizationId ?? undefined,
      layout_mode: settingsStore.state.layoutMode,
      settings: settingsStore.state.settings,
      header: settingsStore.state.header,
      typography: settingsStore.state.typography,
      theme: settingsStore.state.theme,
      navigation: settingsStore.state.navigation,
      welcome_screen: settingsStore.state.welcomeScreen,
      completion_screen: settingsStore.state.completionScreen,
      sharing: settingsStore.state.sharing,
      security: settingsStore.state.security,
      payment: settingsStore.state.payment,
      logic_rules: editorStore.state.logicRules.allIds.map(
        (id) => editorStore.state.logicRules.byId[id],
      ),
      pages: editorStore.state.pages.allIds.map((id) => editorStore.state.pages.byId[id]),
    };

    return definition;
  };

  const performSave = async () => {
    if (!isEnabled.value) return;
    const formId = editorStore.state.formId;
    if (!formId) return;

    try {
      editorStore.markSaving(true);
      editorStore.markError(" ");
      const payload = getPayload();
      const response = await updateForm(formId, payload, {
        auth: options.authToken ? { token: options.authToken } : undefined,
        idempotencyKey: `form-save-${formId}`,
      });
      isApplyingServerState.value = true;
      editorStore.setForm(response);
      settingsStore.hydrateFromDefinition(response);
      editorStore.markSaved(new Date().toISOString());
      isApplyingServerState.value = false;
      toast.success("Changes saved");
    } catch (error: any) {
      editorStore.markError(error?.data?.message ?? "Failed to autosave");
      if (error?.status === 409) {
        toast.error("This form was updated elsewhere. Reload to continue editing.");
        isEnabled.value = false;
      } else {
        toast.error(t('Composables.UseFormAutosave.toast.autosave_failed_retry_or'));
      }
    } finally {
      editorStore.markSaving(false);
    }
  };

  const debouncedSave = debounce(performSave, AUTOSAVE_DEBOUNCE_MS);

  const startWatching = () => {
    stopHandles.push(
      watch(
        () => editorStore.state.pages,
        () => {
          if (!hasHydrated.value || isApplyingServerState.value) return;
          editorStore.state.dirty = true;
          debouncedSave();
        },
        { deep: true },
      ),
    );

    stopHandles.push(
      watch(
        () => editorStore.state.questions,
        () => {
          if (!hasHydrated.value || isApplyingServerState.value) return;
          editorStore.state.dirty = true;
          debouncedSave();
        },
        { deep: true },
      ),
    );

    stopHandles.push(
      watch(
        () => editorStore.state.logicRules,
        () => {
          if (!hasHydrated.value || isApplyingServerState.value) return;
          editorStore.state.dirty = true;
          debouncedSave();
        },
        { deep: true },
      ),
    );

    stopHandles.push(
      watch(
        () => settingsStore.state,
        () => {
          if (!hasHydrated.value || isApplyingServerState.value) return;
          settingsStore.state.dirty = true;
          debouncedSave();
        },
        { deep: true },
      ),
    );
  };

  const stopWatching = () => {
    stopHandles.forEach((stop) => stop());
    stopHandles.length = 0;
    debouncedSave.cancel();
  };

  const toggleAutosave = (enabled: boolean) => {
    isEnabled.value = enabled;
    if (!enabled) {
      stopWatching();
    } else if (stopHandles.length === 0) {
      startWatching();
    }
  };

  const flush = async () => {
    await debouncedSave.flush();
  };

  const prime = () => {
    hasHydrated.value = true;
  };

  startWatching();

  return {
    isEnabled,
    isSaving,
    lastSavedAt,
    lastError,
    toggleAutosave,
    stopWatching,
    flush,
    prime,
  };
};
