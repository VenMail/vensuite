import { computed, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface SavedSignature {
  id: string;
  label: string;
  dataUrl: string; // base64 PNG
  type: 'drawn' | 'typed' | 'uploaded';
  createdAt: number;
}

const LEGACY_STORAGE_KEY = 'vensuite:saved-signatures';
const MAX_SAVED = 12;

const scopeCache = new Map<string, Ref<SavedSignature[]>>();

function storageKeyFor(email: string): string {
  return `${LEGACY_STORAGE_KEY}:${email.trim().toLowerCase()}`;
}

function loadFromStorage(key: string): SavedSignature[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.dataUrl === 'string' && typeof s.id === 'string'
    );
  } catch {
    return [];
  }
}

let legacyPurged = false;

function purgeLegacyKey(): void {
  if (legacyPurged) return;
  legacyPurged = true;
  try {
    // Entries under the old global key cannot be attributed to a signer, and
    // leaving them readable is the shared-device leak this scoping closes.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to purge.
  }
}

function scopeFor(email: string): Ref<SavedSignature[]> {
  const key = storageKeyFor(email);
  const cached = scopeCache.get(key);
  if (cached) return cached;

  purgeLegacyKey();
  const state = ref<SavedSignature[]>(loadFromStorage(key));
  watch(state, (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable: keep the in-memory value.
    }
  }, { deep: true });
  scopeCache.set(key, state);
  return state;
}

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sig_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useSavedSignatures(signerEmail: MaybeRefOrGetter<string | null | undefined>) {
  const scope = computed(() => {
    const email = toValue(signerEmail);
    return email ? scopeFor(email) : null;
  });

  const savedSignatures = computed<SavedSignature[]>(() => scope.value?.value ?? []);

  function saveSignature(
    dataUrl: string,
    type: SavedSignature['type'],
    label?: string
  ): SavedSignature | undefined {
    const state = scope.value;
    if (!state) return undefined;
    const existing = state.value.find((s) => s.dataUrl === dataUrl);
    if (existing) return existing;

    const entry: SavedSignature = {
      id: generateId(),
      label: label || `${type} signature`,
      dataUrl,
      type,
      createdAt: Date.now(),
    };
    state.value = [entry, ...state.value].slice(0, MAX_SAVED);
    return entry;
  }

  function deleteSignature(id: string) {
    const state = scope.value;
    if (!state) return;
    state.value = state.value.filter((s) => s.id !== id);
  }

  function getSignature(id: string): SavedSignature | undefined {
    return savedSignatures.value.find((s) => s.id === id);
  }

  return { savedSignatures, saveSignature, deleteSignature, getSignature };
}
