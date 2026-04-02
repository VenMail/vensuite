/**
 * useStoryPresenter — Presentation mode composable for the StoryTeller module.
 * Handles scene navigation, timer, drawing overlay, pointer/laser, fullscreen,
 * auto-advance, and presentation modes (slide, scroll, auto).
 *
 * Adapted from src/composables/usePresenter.ts (slides module).
 */
import { ref, computed, onUnmounted } from 'vue';
import type { StoryEditorReturn } from './useStoryEditor';
import type {
  StoryPresentationMode,
  StoryScene,
} from '@/types/story';

// ─── Drawing Types ──────────────────────────────────────────────────────

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  points: DrawingPoint[];
  color: string;
  width: number;
}

// ─── Options ────────────────────────────────────────────────────────────

export interface UseStoryPresenterOptions {
  editor: StoryEditorReturn;
}

// ─── Composable ─────────────────────────────────────────────────────────

export function useStoryPresenter(options: UseStoryPresenterOptions) {
  const { editor } = options;

  // ── Presentation state ──────────────────────────────────────────────
  const isPresenting = ref(false);
  const isPaused = ref(false);
  const presentationMode = ref<StoryPresentationMode>('slide');
  const presentationSceneIndex = ref(0);
  const transitionDirection = ref<'forward' | 'backward'>('forward');
  const isFullscreen = ref(false);

  // ── Timer state ─────────────────────────────────────────────────────
  const elapsedTime = ref(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── UI state ────────────────────────────────────────────────────────
  const showOverview = ref(false);
  const showControls = ref(true);

  // ── Drawing state ───────────────────────────────────────────────────
  const isDrawingMode = ref(false);
  const drawingColor = ref('#ff0000');
  const drawingWidth = ref(3);
  const sceneDrawings = ref<Map<string, DrawingStroke[]>>(new Map());

  // ── Pointer / laser state ───────────────────────────────────────────
  const isPointerMode = ref(false);
  const pointerPosition = ref<DrawingPoint | null>(null);

  // ── Auto-advance ────────────────────────────────────────────────────
  let autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Computed ────────────────────────────────────────────────────────

  const totalScenes = computed(() => editor.scenes.value.length);

  const currentPresentationScene = computed<StoryScene | null>(() =>
    editor.scenes.value[presentationSceneIndex.value] ?? null,
  );

  const progressPercent = computed(() => {
    if (totalScenes.value <= 1) return 100;
    return ((presentationSceneIndex.value + 1) / totalScenes.value) * 100;
  });

  const formattedTime = computed(() => formatTime(elapsedTime.value));

  const currentSceneDrawings = computed(() => {
    const sceneId = currentPresentationScene.value?.id;
    if (!sceneId) return [];
    return sceneDrawings.value.get(sceneId) || [];
  });

  // ── Helpers ─────────────────────────────────────────────────────────

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ── Timer ───────────────────────────────────────────────────────────

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      if (!isPaused.value) {
        elapsedTime.value++;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    elapsedTime.value = 0;
  }

  function toggleTimer() {
    isPaused.value = !isPaused.value;
  }

  // ── Auto-advance ────────────────────────────────────────────────────

  function scheduleAutoAdvance() {
    cancelAutoAdvance();
    if (presentationMode.value !== 'auto') return;

    const scene = currentPresentationScene.value;
    const settings = editor.document.value.settings;
    const interval = scene?.duration ?? settings.autoAdvanceInterval ?? 5000;

    autoAdvanceTimeout = setTimeout(() => {
      nextScene();
    }, interval);
  }

  function cancelAutoAdvance() {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
  }

  // ── Scene navigation ────────────────────────────────────────────────

  /** Called internally whenever the scene changes during presentation */
  function onSceneEnter() {
    cancelAutoAdvance();
    // Auto-advance scheduling is handled here; GSAP playback is handled
    // by the presenter component via @after-enter callback
    if (presentationMode.value === 'auto' && !isPaused.value) {
      scheduleAutoAdvance();
    }
  }

  function nextScene() {
    const maxIdx = totalScenes.value - 1;
    const settings = editor.document.value.settings;

    if (presentationSceneIndex.value >= maxIdx) {
      if (settings.loopPresentation) {
        transitionDirection.value = 'forward';
        presentationSceneIndex.value = 0;
        onSceneEnter();
      }
      return;
    }

    transitionDirection.value = 'forward';
    presentationSceneIndex.value++;
    onSceneEnter();
  }

  function previousScene() {
    if (presentationSceneIndex.value <= 0) return;
    transitionDirection.value = 'backward';
    presentationSceneIndex.value--;
    onSceneEnter();
  }

  function goToScene(index: number) {
    if (index < 0 || index >= totalScenes.value) return;
    transitionDirection.value = index > presentationSceneIndex.value ? 'forward' : 'backward';
    presentationSceneIndex.value = index;
    onSceneEnter();
  }

  // ── Fullscreen ──────────────────────────────────────────────────────

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      isFullscreen.value = true;
    } catch {
      // Fullscreen may not be available
    }
  }

  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      isFullscreen.value = false;
    } catch {
      // Ignore
    }
  }

  function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement;
  }

  // ── Presentation lifecycle ──────────────────────────────────────────

  function startPresentation(mode?: StoryPresentationMode) {
    presentationMode.value = mode ?? editor.document.value.settings.presentationMode;
    presentationSceneIndex.value = editor.currentSceneIndex.value;
    transitionDirection.value = 'forward';
    isPresenting.value = true;
    isPaused.value = false;
    elapsedTime.value = 0;
    showOverview.value = false;
    isDrawingMode.value = false;
    isPointerMode.value = false;
    sceneDrawings.value.clear();
    showControls.value = true;

    startTimer();
    enterFullscreen();
    document.addEventListener('fullscreenchange', onFullscreenChange);

    onSceneEnter();
  }

  function stopPresentation() {
    isPresenting.value = false;
    stopTimer();
    cancelAutoAdvance();
    exitFullscreen();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    sceneDrawings.value.clear();
    pointerPosition.value = null;
  }

  // ── Keyboard handler ────────────────────────────────────────────────

  function handleKeydown(event: KeyboardEvent) {
    if (!isPresenting.value) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
      case 'PageDown':
        event.preventDefault();
        nextScene();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        previousScene();
        break;
      case 'Escape':
        event.preventDefault();
        if (showOverview.value) {
          showOverview.value = false;
        } else {
          stopPresentation();
        }
        break;
      case 'Home':
        event.preventDefault();
        goToScene(0);
        break;
      case 'End':
        event.preventDefault();
        goToScene(totalScenes.value - 1);
        break;
      case 'o':
      case 'O':
        event.preventDefault();
        showOverview.value = !showOverview.value;
        break;
      case 'd':
      case 'D':
        event.preventDefault();
        toggleDrawing();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        togglePointer();
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        clearCurrentDrawings();
        break;
    }

    // Number keys 1-9 for quick scene navigation
    if (event.key >= '1' && event.key <= '9') {
      const sceneNum = parseInt(event.key) - 1;
      if (sceneNum < totalScenes.value) {
        event.preventDefault();
        goToScene(sceneNum);
      }
    }
  }

  // ── Drawing ─────────────────────────────────────────────────────────

  function toggleDrawing() {
    isDrawingMode.value = !isDrawingMode.value;
    if (isDrawingMode.value) {
      isPointerMode.value = false;
    }
  }

  function setDrawingColor(color: string) {
    drawingColor.value = color;
  }

  function setDrawingWidth(width: number) {
    drawingWidth.value = width;
  }

  function addStroke(stroke: DrawingStroke) {
    const sceneId = currentPresentationScene.value?.id;
    if (!sceneId) return;
    const existing = sceneDrawings.value.get(sceneId) || [];
    sceneDrawings.value.set(sceneId, [...existing, stroke]);
  }

  function undoLastStroke() {
    const sceneId = currentPresentationScene.value?.id;
    if (!sceneId) return;
    const existing = sceneDrawings.value.get(sceneId) || [];
    if (existing.length > 0) {
      sceneDrawings.value.set(sceneId, existing.slice(0, -1));
    }
  }

  function clearCurrentDrawings() {
    const sceneId = currentPresentationScene.value?.id;
    if (!sceneId) return;
    sceneDrawings.value.set(sceneId, []);
  }

  function clearAllDrawings() {
    sceneDrawings.value.clear();
  }

  // ── Pointer / Laser ─────────────────────────────────────────────────

  function togglePointer() {
    isPointerMode.value = !isPointerMode.value;
    if (isPointerMode.value) {
      isDrawingMode.value = false;
    }
  }

  function updatePointerPosition(position: DrawingPoint | null) {
    pointerPosition.value = position;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  onUnmounted(() => {
    stopTimer();
    cancelAutoAdvance();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  });

  // ── Return ──────────────────────────────────────────────────────────

  return {
    // Presentation state
    isPresenting,
    isPaused,
    presentationMode,
    presentationSceneIndex,
    transitionDirection,
    isFullscreen,

    // Timer
    elapsedTime,
    formattedTime,

    // UI
    showOverview,
    showControls,

    // Drawing
    isDrawingMode,
    drawingColor,
    drawingWidth,
    sceneDrawings,
    currentSceneDrawings,

    // Pointer
    isPointerMode,
    pointerPosition,

    // Computed
    totalScenes,
    currentPresentationScene,
    progressPercent,

    // Timer functions
    startTimer,
    stopTimer,
    resetTimer,
    toggleTimer,

    // Auto-advance
    scheduleAutoAdvance,
    cancelAutoAdvance,

    // Scene navigation
    nextScene,
    previousScene,
    goToScene,

    // Fullscreen
    enterFullscreen,
    exitFullscreen,

    // Lifecycle
    startPresentation,
    stopPresentation,

    // Keyboard
    handleKeydown,

    // Drawing functions
    toggleDrawing,
    setDrawingColor,
    setDrawingWidth,
    addStroke,
    undoLastStroke,
    clearCurrentDrawings,
    clearAllDrawings,

    // Pointer functions
    togglePointer,
    updatePointerPosition,
  };
}

export type StoryPresenterReturn = ReturnType<typeof useStoryPresenter>;
