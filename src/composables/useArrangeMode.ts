import { ref, computed } from 'vue';

interface ArrangeModeState {
  isActive: boolean;
  selectedElement: HTMLElement | null;
  selectedElementId: string | null;
  clipboard: { element: HTMLElement; data: any } | null;
  history: any[];
  historyIndex: number;
}

export function useArrangeMode() {
  const state = ref<ArrangeModeState>({
    isActive: false,
    selectedElement: null,
    selectedElementId: null,
    clipboard: null,
    history: [],
    historyIndex: -1
  });

  function enterArrangeMode() {
    state.value.isActive = true;
    // Save current state
    saveToHistory();
  }

  function exitArrangeMode(save: boolean = true) {
    if (!save && canRevert.value) {
      // Revert to state before entering arrange mode
      revertToSaved();
    }
    state.value.isActive = false;
    state.value.selectedElement = null;
  }

  function selectElement(element: HTMLElement) {
    // Deselect previous
    if (state.value.selectedElement) {
      state.value.selectedElement.classList.remove('selected');
    }
    
    state.value.selectedElement = element;
    state.value.selectedElementId = element.dataset.id || null;
    element.classList.add('selected');
  }

  function deselectElement() {
    if (state.value.selectedElement) {
      state.value.selectedElement.classList.remove('selected');
    }
    state.value.selectedElement = null;
    state.value.selectedElementId = null;
  }

  function deleteSelectedElement() {
    if (!state.value.selectedElement) return;
    
    saveToHistory();
    // Emit delete event
    const lineStart = parseInt(state.value.selectedElement.dataset.lineStart || '0');
    const lineEnd = parseInt(state.value.selectedElement.dataset.lineEnd || '0');
    
    // Remove from DOM
    state.value.selectedElement.remove();
    deselectElement();
    
    return { lineStart, lineEnd };
  }

  function saveToHistory() {
    // Implementation - would save current state
    // For now, just push a placeholder
    state.value.history.push({
      timestamp: Date.now(),
      // ... actual state snapshot
    });
    state.value.historyIndex = state.value.history.length - 1;
  }

  function revertToSaved() {
    // Implementation - would restore to saved state
    if (state.value.history.length > 0) {
      // Restore to previous state
    }
  }

  const canRevert = computed(() => state.value.history.length > 0);

  return {
    state: computed(() => state.value),
    enterArrangeMode,
    exitArrangeMode,
    selectElement,
    deselectElement,
    deleteSelectedElement,
    canRevert
  };
}
