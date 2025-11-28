import { defineStore } from "pinia";
import {
  listForms,
  deleteForm as deleteFormApi,
  fetchForm as fetchFormApi,
  fetchResponses as fetchResponsesApi,
  createForm as createFormApi,
  updateForm as updateFormApi,
  publishForm as publishFormApi,
  updateSharingSettings as updateSharingSettingsApi,
  type FetchResponsesParams,
} from "@/services/forms";
import type {
  AppForm,
  FormDefinition,
  FormResponsesPage,
  FormSharingSettings,
} from "@/types";
import { useAuthStore } from "./auth";

interface PaginationState {
  page: number;
  perPage: number;
  hasMore: boolean;
}

interface FormsState {
  allForms: AppForm[];
  recentForms: AppForm[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  formDetailsCache: Record<string, FormDefinition>;
}

const isFormDefinitionLike = (value: unknown): value is FormDefinition => {
  return Boolean(value && typeof value === "object" && "pages" in value);
};

const definitionHasQuestionData = (definition: FormDefinition | undefined): definition is FormDefinition => {
  if (!definition) return false;
  if (Array.isArray(definition.questions) && definition.questions.length > 0) return true;
  if (Array.isArray(definition.pages)) {
    return definition.pages.some((page) => Array.isArray((page as any)?.questions) && ((page as any).questions as unknown[]).length > 0);
  }
  return false;
};

export const useFormStore = defineStore("forms", {
  state: (): FormsState => ({
    allForms: [],
    recentForms: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      perPage: 20,
      hasMore: true,
    },
    formDetailsCache: {},
  }),
  actions: {
    async fetchForms(reset = false) {
      if (this.loading || (!this.pagination.hasMore && !reset)) return;

      if (reset) {
        this.allForms = [];
        this.pagination.page = 1;
        this.pagination.hasMore = true;
      }

      this.loading = true;
      this.error = null;

      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        const forms = await listForms(
          {
            page: this.pagination.page,
            perPage: this.pagination.perPage,
          },
          {
            auth: token ? { token } : undefined,
          },
        );

        if (forms.length < this.pagination.perPage) {
          this.pagination.hasMore = false;
        } else {
          this.pagination.page += 1;
        }

        const hydratedForms = await Promise.all(
          forms.map((form) => this.hydrateFormDefinition(form, token ?? null)),
        );

        const updatedForms = reset ? [] : [...this.allForms];
        hydratedForms.forEach((form) => {
          const existingIndex = updatedForms.findIndex((item) => item.id === form.id);
          if (existingIndex !== -1) {
            updatedForms[existingIndex] = form;
          } else {
            updatedForms.push(form);
          }
        });

        this.allForms = updatedForms;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to load forms";
      } finally {
        this.loading = false;
      }
    },

    async publishForm(id: string): Promise<FormDefinition | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        const form = await publishFormApi(id, {
          auth: token ? { token } : undefined,
        });
        this.updateRecentForms(form as unknown as AppForm);
        this.allForms = this.allForms.map((existing) =>
          existing.id === form.id ? { ...existing, ...(form as unknown as AppForm) } : existing,
        );
        return form;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to publish form.";
        return null;
      }
    },

    async fetchForm(id: string): Promise<FormDefinition | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        return await fetchFormApi(id, {
          auth: token ? { token } : undefined,
        });
      } catch (error: any) {
        this.error = error?.data?.message ?? "Unable to fetch form.";
        return null;
      }
    },

    async createForm(payload: Partial<FormDefinition>): Promise<FormDefinition | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        const form = await createFormApi(payload, {
          auth: token ? { token } : undefined,
        });
        this.updateRecentForms(form as unknown as AppForm);
        return form;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to create form.";
        return null;
      }
    },

    async updateForm(id: string, payload: Partial<FormDefinition>): Promise<FormDefinition | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        const form = await updateFormApi(id, payload, {
          auth: token ? { token } : undefined,
        });
        this.updateRecentForms(form as unknown as AppForm);
        this.allForms = this.allForms.map((existing) =>
          existing.id === form.id ? { ...existing, ...(form as unknown as AppForm) } : existing,
        );
        return form;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to update form.";
        return null;
      }
    },

    async deleteForm(id: string): Promise<boolean> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        await deleteFormApi(id, {
          auth: token ? { token } : undefined,
        });
        this.allForms = this.allForms.filter((file) => file.id !== id);
        this.recentForms = this.recentForms.filter((file) => file.id !== id);
        localStorage.setItem(
          "VENX_RECENT_FORMS",
          JSON.stringify(this.recentForms.map((file) => file.id)),
        );
        return true;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to delete form.";
        return false;
      }
    },

    async fetchResponses(id: string, params: FetchResponsesParams = {}): Promise<FormResponsesPage | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        return await fetchResponsesApi(id, params, {
          auth: token ? { token } : undefined,
        });
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to load responses.";
        return null;
      }
    },

    async hydrateFormDefinition(form: AppForm, token?: string | null): Promise<AppForm> {
      const formId = form.id;
      if (!formId) {
        return form;
      }

      const inlineDefinition = isFormDefinitionLike(form.form) ? form.form : undefined;

      if (definitionHasQuestionData(inlineDefinition)) {
        if (!this.formDetailsCache[formId]) {
          this.formDetailsCache[formId] = inlineDefinition;
        }
        return form;
      }

      const cached = this.formDetailsCache[formId];
      if (cached) {
        return { ...form, form: cached };
      }

      try {
        const detailed = await fetchFormApi(formId, {
          auth: token ? { token } : undefined,
        });
        if (detailed) {
          this.formDetailsCache[formId] = detailed;
          return { ...form, form: detailed };
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to hydrate form definition", error);
      }

      return form;
    },

    updateRecentForms(form: AppForm) {
      const existingIndex = this.recentForms.findIndex((f) => f.id === form.id);
      if (existingIndex !== -1) {
        this.recentForms.splice(existingIndex, 1);
      }
      this.recentForms.unshift(form);
      this.recentForms = this.recentForms.slice(0, 10);

      if (form.id && isFormDefinitionLike(form.form)) {
        this.formDetailsCache[form.id] = form.form;
      }

      localStorage.setItem(
        "VENX_RECENT_FORMS",
        JSON.stringify(this.recentForms.map((f) => f.id)),
      );
    },

    async updateFormSharing(id: string, sharing: Partial<FormSharingSettings>): Promise<FormSharingSettings | null> {
      const authStore = useAuthStore();
      const token = authStore.getToken();

      try {
        const updated = await updateSharingSettingsApi(id, sharing, {
          auth: token ? { token } : undefined,
        });

        this.allForms = this.allForms.map((existing) =>
          existing.id === id
            ? {
                ...existing,
                sharing: {
                  ...(existing.sharing ?? {}),
                  ...updated,
                },
              }
            : existing,
        );

        this.recentForms = this.recentForms.map((existing) =>
          existing.id === id
            ? {
                ...existing,
                sharing: {
                  ...(existing.sharing ?? {}),
                  ...updated,
                },
              }
            : existing,
        );

        const cached = this.formDetailsCache[id];
        if (cached) {
          this.formDetailsCache[id] = {
            ...cached,
            sharing: {
              ...(cached.sharing ?? {}),
              ...updated,
            },
          };
        }

        return updated;
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to update sharing settings.";
        return null;
      }
    },
  },
});