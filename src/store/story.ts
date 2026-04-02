/**
 * Story Store
 * Coordinates between StoryTeller editor and persistence composables
 * and provides unified state management via Pinia
 */

import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import { useStoryEditor } from '../composables/useStoryEditor';
import { useStoryPersistence } from '../composables/useStoryPersistence';

export const useStoryStore = defineStore('story', () => {
  // Create a callback ref to avoid circular dependency
  const markDirtyCallback = ref<() => void>(() => {});

  // Core composables
  const editor = useStoryEditor({
    onDocumentChange: () => markDirtyCallback.value(),
  });
  const persistence = useStoryPersistence({ editor });

  // Set the actual callback after persistence is created
  markDirtyCallback.value = () => persistence.markDirty();

  // Delegate computed properties
  const currentScene = computed(() => editor.currentScene.value);
  const totalScenes = computed(() => editor.totalScenes.value);
  const hasUnsavedChanges = computed(() => persistence.hasUnsavedChanges.value);

  // Scene operations
  function selectScene(index: number) {
    editor.selectScene(index);
  }

  function addScene(name?: string) {
    return editor.addScene(name);
  }

  function duplicateScene(index: number) {
    return editor.duplicateScene(index);
  }

  function deleteScene(index: number) {
    return editor.deleteScene(index);
  }

  function moveScene(fromIndex: number, toIndex: number) {
    return editor.moveScene(fromIndex, toIndex);
  }

  // Persistence operations
  async function saveStory() {
    return persistence.persistStory();
  }

  async function loadStory(id: string) {
    return persistence.loadStory(id);
  }

  function setTitle(title: string) {
    persistence.setTitle(title);
  }

  function updateVisibility(value: number) {
    return persistence.updateVisibility(value);
  }

  function initializeNewStory() {
    persistence.initializeNewStory();
  }

  function markDirty() {
    persistence.markDirty();
  }

  // Auto-save management
  function startAutosave() {
    persistence.setupNetworkListeners();
  }

  function stopAutosave() {
    persistence.cancelAutosave();
    persistence.cleanupNetworkListeners();
  }

  return {
    // State
    scenes: editor.scenes,
    currentSceneIndex: editor.currentSceneIndex,
    currentScene,
    totalScenes,
    hasUnsavedChanges,

    // Persistence state
    storyTitle: persistence.storyTitle,
    isSaving: persistence.isSaving,
    lastSavedAt: persistence.lastSavedAt,
    shareLink: persistence.shareLink,
    privacyType: persistence.privacyType,
    shareMembers: persistence.shareMembers,

    // Scene operations
    selectScene,
    addScene,
    duplicateScene,
    deleteScene,
    moveScene,

    // Persistence
    saveStory,
    loadStory,
    setTitle,
    updateVisibility,
    initializeNewStory,
    markDirty,
    startAutosave,
    stopAutosave,

    // Direct access to composables if needed
    // markRaw prevents Pinia's reactive() from deeply unwrapping nested refs,
    // preserving .value semantics for components that access editor/persistence properties
    editor: markRaw(editor),
    persistence: markRaw(persistence),
  };
});

export type StoryStoreReturn = ReturnType<typeof useStoryStore>;
