import { ref, watch } from 'vue';

export interface SavedSignature {
  id: string;
  label: string;
  dataUrl: string; // base64 PNG
  type: 'drawn' | 'typed' | 'uploaded';
  createdAt: number;
}

const STORAGE_KEY = 'vensuite:saved-signatures';
const MAX_SAVED = 12;

function loadFromStorage(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function saveToStorage(signatures: SavedSignature[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signatures));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

const savedSignatures = ref<SavedSignature[]>(loadFromStorage());

watch(savedSignatures, (val) => saveToStorage(val), { deep: true });

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sig_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function saveSignature(dataUrl: string, type: SavedSignature['type'], label?: string): SavedSignature {
  const existing = savedSignatures.value.find((s) => s.dataUrl === dataUrl);
  if (existing) return existing;

  const entry: SavedSignature = {
    id: generateId(),
    label: label || `${type} signature`,
    dataUrl,
    type,
    createdAt: Date.now(),
  };

  savedSignatures.value = [entry, ...savedSignatures.value].slice(0, MAX_SAVED);
  return entry;
}

function deleteSignature(id: string) {
  savedSignatures.value = savedSignatures.value.filter((s) => s.id !== id);
}

function getSignature(id: string): SavedSignature | undefined {
  return savedSignatures.value.find((s) => s.id === id);
}

export function useSavedSignatures() {
  return {
    savedSignatures,
    saveSignature,
    deleteSignature,
    getSignature,
  };
}
