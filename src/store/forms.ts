import { defineStore } from "pinia";
import {
  listForms,
  deleteForm as deleteFormApi,
  fetchForm as fetchFormApi,
  fetchResponses as fetchResponsesApi,
  createForm as createFormApi,
  updateForm as updateFormApi,
  type FetchResponsesParams,
} from "@/services/forms";
import type { AppForm, FormDefinition, FormResponsesPage } from "@/types";
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
}

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

        this.allForms = reset ? forms : [...this.allForms, ...forms];
      } catch (error: any) {
        this.error = error?.data?.message ?? "Failed to load forms";
      } finally {
        this.loading = false;
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

    updateRecentForms(form: AppForm) {
      const existingIndex = this.recentForms.findIndex((f) => f.id === form.id);
      if (existingIndex !== -1) {
        this.recentForms.splice(existingIndex, 1);
      }
      this.recentForms.unshift(form);
      this.recentForms = this.recentForms.slice(0, 10);

      localStorage.setItem(
        "VENX_RECENT_FORMS",
        JSON.stringify(this.recentForms.map((f) => f.id)),
      );
    },
  },
});