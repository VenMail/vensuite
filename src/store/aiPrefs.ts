/**
 * AI model preferences store.
 * Fetches available models from /ai/models and persists the user's selection.
 */
import { defineStore } from 'pinia';
import { useAuthStore } from '@/store/auth';

export interface AIModel {
  id: string;
  label: string;
  tier: 'fast' | 'balanced' | 'quality';
  default: boolean;
}

const STORAGE_KEY = 'venAiModel';

export const useAiPrefsStore = defineStore('aiPrefs', {
  state: () => ({
    selectedModel: localStorage.getItem(STORAGE_KEY) as string | null,
    models: [] as AIModel[],
  }),

  getters: {
    /** The model id to send in payloads. null = backend picks its default. */
    activeModelId(state): string | null {
      if (!state.selectedModel || state.models.length === 0) return state.selectedModel;
      return state.models.some((m) => m.id === state.selectedModel)
        ? state.selectedModel
        : null;
    },

    activeModelLabel(state): string {
      const active = state.selectedModel;
      if (active && state.models.length > 0) {
        const found = state.models.find((m) => m.id === active);
        if (found) return found.label;
      }
      return state.models.find((m) => m.default)?.label ?? 'Auto';
    },

    activeModelTier(state): string {
      const active = state.selectedModel;
      if (active && state.models.length > 0) {
        const found = state.models.find((m) => m.id === active);
        if (found) return found.tier;
      }
      return state.models.find((m) => m.default)?.tier ?? 'balanced';
    },
  },

  actions: {
    selectModel(id: string | null) {
      this.selectedModel = id;
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    async fetchModels() {
      try {
        const authStore = useAuthStore();
        const token = authStore.getToken?.() ?? authStore.token;
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

        const response = await fetch(`${API_BASE_URL}/ai/models`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        this.models = Array.isArray(json?.data) ? json.data : [];

        // Drop persisted selection if it's no longer available.
        if (this.selectedModel && !this.models.some((m) => m.id === this.selectedModel)) {
          this.selectedModel = null;
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Failed to load AI models:', error);
      }
    },
  },
});
