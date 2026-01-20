/**
 * Enhanced Slide Store with Export Pipeline Integration
 * Coordinates between all slide-related composables and provides unified state management
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSlidesEditor } from '../composables/useSlidesEditor';
import { useSlidePersistence } from '../composables/useSlidePersistence';
import { usePresenter } from '../composables/usePresenter';
import { useSlideExport, type ExportOptions } from '../composables/useSlideExportPipeline';

export const useSlidesStore = defineStore('slides', () => {
  // Create a callback ref to avoid circular dependency
  const markDirtyCallback = ref<() => void>(() => {});
  
  // Core composables
  const editor = useSlidesEditor({ 
    onSlideChange: () => markDirtyCallback.value()
  });
  const persistence = useSlidePersistence({ editor });
  const presenter = usePresenter({ editor });
  
  // Set the actual callback after persistence is created
  markDirtyCallback.value = () => persistence.markDirty();
  
  // Export state
  const isExporting = ref(false);
  const exportProgress = ref(0);
  const exportError = ref<string | null>(null);

  // Computed properties
  const currentSlide = computed(() => editor.currentSlide);
  const totalSlides = computed(() => editor.slides.value.length);
  const hasUnsavedChanges = computed(() => persistence.hasUnsavedChanges.value);
  const isPresenting = computed(() => presenter.isPresenting.value);

  // Slide operations
  function selectSlide(index: number) {
    editor.selectSlide(index);
  }

  function previousSlide() {
    editor.previousSlide();
  }

  function nextSlide() {
    editor.nextSlide();
  }

  function addSlide() {
    const newSlide = editor.addSlide();
    // markDirty() called by editor operation - no duplicate needed
    return newSlide;
  }

  function duplicateSlide(index: number) {
    const duplicate = editor.duplicateSlide(index);
    // markDirty() called by editor operation - no duplicate needed
    return duplicate;
  }

  function deleteSlide(index: number) {
    const success = editor.deleteSlide(index);
    // markDirty() called by editor operation - no duplicate needed
    return success;
  }

  function moveSlide(index: number, direction: 'up' | 'down') {
    const success = editor.moveSlide(index, direction);
    // markDirty() called by editor operation - no duplicate needed
    return success;
  }

  // Content operations
  function updateSlideContent(content: string) {
    editor.updateSlideContent(content);
    // markDirty() called by editor operation - no duplicate needed
  }

  function updateSlideNotes(notes: string) {
    editor.updateSlideNotes(notes);
    // markDirty() called by editor operation - no duplicate needed
  }

  // Theme and layout operations
  function setTheme(theme: string) {
    editor.setTheme(theme);
    // markDirty() called by editor operation - no duplicate needed
  }

  function setLayout(layout: string) {
    editor.setLayout(layout);
    // markDirty() called by editor operation - no duplicate needed
  }

  function setBackground(background: string) {
    editor.setBackground(background);
    // markDirty() called by editor operation - no duplicate needed
  }

  // Presentation operations
  function startPresentation() {
    presenter.startPresentation();
  }

  function exitPresentation() {
    presenter.exitPresentation();
  }

  function toggleTimer() {
    presenter.toggleTimer();
  }

  function resetTimer() {
    presenter.resetTimer();
  }

  function toggleDrawing() {
    presenter.toggleDrawing();
  }

  function clearDrawings() {
    presenter.clearCurrentDrawings();
  }

  // Enhanced export operations with Mermaid rendering
  async function exportSlides(options: ExportOptions) {
    isExporting.value = true;
    exportProgress.value = 0;
    exportError.value = null;

    try {
      const exportPipeline = useSlideExport(editor);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        exportProgress.value = Math.min(exportProgress.value + 10, 90);
      }, 200);

      await exportPipeline.exportSlides(options);
      
      clearInterval(progressInterval);
      exportProgress.value = 100;
      
      // Reset progress after a delay
      setTimeout(() => {
        exportProgress.value = 0;
        isExporting.value = false;
      }, 2000);
      
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed';
      isExporting.value = false;
      exportProgress.value = 0;
      throw error;
    }
  }

  // Quick export methods
  async function exportToPdf(title?: string) {
    return exportSlides({
      format: 'pdf',
      title: title || persistence.deckTitle.value,
      theme: editor.currentTheme.value,
      includeNotes: true,
      optimizeForPrint: true
    });
  }

  async function exportToPptx(title?: string) {
    return exportSlides({
      format: 'pptx',
      title: title || persistence.deckTitle.value,
      theme: editor.currentTheme.value,
      includeNotes: true
    });
  }

  async function exportToHtml(title?: string) {
    return exportSlides({
      format: 'html',
      title: title || persistence.deckTitle.value,
      theme: editor.currentTheme.value,
      includeNotes: false
    });
  }

  // Persistence operations
  async function saveDeck() {
    return persistence.persistDeck();
  }

  async function loadDeck(id: string) {
    return persistence.loadDeck(id);
  }

  function setTitle(title: string) {
    persistence.setTitle(title);
  }

  function updateVisibility(value: number) {
    return persistence.updateVisibility(value);
  }

  function initializeNewDeck() {
    persistence.initializeNewDeck();
  }

  function importFromPowerPoint(file: File) {
    return persistence.importFromPowerPoint(file);
  }

  function importFromHtml(file: File) {
    return persistence.importFromHtml(file);
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

  // Utility methods
  function reset() {
    editor.reset();
    // markDirty() called by editor operation - no duplicate needed
  }

  function goToSlide(index: number) {
    editor.goToSlide(index);
  }

  function goToFirst() {
    editor.goToFirst();
  }

  function goToLast() {
    editor.goToLast();
  }

  // Getters for template and layout options
  const availableThemes = computed(() => editor.themes);
  const availableLayouts = computed(() => editor.layouts);
  const currentTheme = computed(() => editor.currentTheme);
  const currentLayout = computed(() => editor.currentLayout);

  return {
    // State
    slides: editor.slides,
    currentSlideIndex: editor.currentSlideIndex,
    currentSlide,
    totalSlides,
    currentTheme,
    currentLayout,
    isPresenting,
    hasUnsavedChanges,
    isExporting,
    exportProgress,
    exportError,
    availableThemes,
    availableLayouts,
    
    // Persistence state
    deckTitle: persistence.deckTitle,
    isSaving: persistence.isSaving,
    lastSavedAt: persistence.lastSavedAt,
    shareLink: persistence.shareLink,
    privacyType: persistence.privacyType,
    shareMembers: persistence.shareMembers,
    
    // Slide operations
    selectSlide,
    previousSlide,
    nextSlide,
    addSlide,
    duplicateSlide,
    deleteSlide,
    moveSlide,
    goToSlide,
    goToFirst,
    goToLast,
    
    // Content operations
    updateSlideContent,
    updateSlideNotes,
    
    // Theme and layout
    setTheme,
    setLayout,
    setBackground,
    
    // Presentation
    startPresentation,
    exitPresentation,
    toggleTimer,
    resetTimer,
    toggleDrawing,
    clearDrawings,
    
    // Enhanced Export with Mermaid support
    exportSlides,
    exportToPdf,
    exportToPptx,
    exportToHtml,
    
    // Persistence
    saveDeck,
    loadDeck,
    setTitle,
    updateVisibility,
    initializeNewDeck,
    importFromPowerPoint,
    importFromHtml,
    markDirty,
    startAutosave,
    stopAutosave,
    
    // Utility
    reset,
    
    // Direct access to composables if needed
    editor,
    persistence,
    presenter
  };
});

export type SlidesStoreReturn = ReturnType<typeof useSlidesStore>;
