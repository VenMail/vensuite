/**
 * Presenter mode composable
 * Handles presentation mode, timer, keyboard navigation, and drawing
 */
import { ref, computed, onUnmounted } from 'vue';
import type { SlidesEditorReturn } from './useSlidesEditor';

export interface UsePresenterOptions {
  editor: SlidesEditorReturn;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  points: DrawingPoint[];
  color: string;
  width: number;
}

export function usePresenter(options: UsePresenterOptions) {
  const { editor } = options;

  // Presentation state
  const isPresenting = ref(false);
  const isPaused = ref(false);
  const elapsedTime = ref(0);
  const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const showOverview = ref(false);
  const showNotes = ref(true);
  const showTimer = ref(true);
  const showNextSlide = ref(true);
  const isFullscreen = ref(false);

  // Drawing state
  const isDrawingMode = ref(false);
  const drawingColor = ref('#ff0000');
  const drawingWidth = ref(3);
  const currentStrokes = ref<DrawingStroke[]>([]);
  const slideDrawings = ref<Map<string, DrawingStroke[]>>(new Map());

  // Pointer/laser state
  const isPointerMode = ref(false);
  const pointerPosition = ref<DrawingPoint | null>(null);

  // Camera state (for picture-in-picture)
  const isCameraEnabled = ref(false);
  const cameraStream = ref<MediaStream | null>(null);

  // Computed
  const formattedTime = computed(() => formatTime(elapsedTime.value));
  
  const currentSlideDrawings = computed(() => {
    const slideId = editor.currentSlide.value?.id;
    if (!slideId) return [];
    return slideDrawings.value.get(slideId) || [];
  });

  // Timer functions
  function startTimer() {
    if (timerInterval.value) return;
    timerInterval.value = setInterval(() => {
      if (!isPaused.value) {
        elapsedTime.value++;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  }

  function resetTimer() {
    elapsedTime.value = 0;
  }

  function pauseTimer() {
    isPaused.value = true;
  }

  function resumeTimer() {
    isPaused.value = false;
  }

  function toggleTimer() {
    isPaused.value = !isPaused.value;
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Presentation control
  function startPresentation() {
    isPresenting.value = true;
    startTimer();
    enterFullscreen();
  }

  function exitPresentation() {
    isPresenting.value = false;
    stopTimer();
    exitFullscreen();
    disableCamera();
  }

  function togglePresentation() {
    if (isPresenting.value) {
      exitPresentation();
    } else {
      startPresentation();
    }
  }

  // Fullscreen
  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      isFullscreen.value = true;
    } catch (e) {
      console.warn('Fullscreen not available:', e);
    }
  }

  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      isFullscreen.value = false;
    } catch (e) {
      console.warn('Exit fullscreen failed:', e);
    }
  }

  function toggleFullscreen() {
    if (isFullscreen.value) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  // Keyboard handling
  function handleKeydown(event: KeyboardEvent) {
    if (!isPresenting.value) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
      case 'PageDown':
        event.preventDefault();
        editor.nextSlide();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        editor.previousSlide();
        break;
      case 'Escape':
        event.preventDefault();
        if (showOverview.value) {
          showOverview.value = false;
        } else {
          exitPresentation();
        }
        break;
      case 'Home':
        event.preventDefault();
        editor.goToFirst();
        break;
      case 'End':
        event.preventDefault();
        editor.goToLast();
        break;
      case 'o':
      case 'O':
        event.preventDefault();
        toggleOverview();
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
      case 'b':
      case 'B':
      case '.':
        event.preventDefault();
        // Black screen toggle could be added here
        break;
      case 'g':
      case 'G':
        event.preventDefault();
        // Go to slide dialog could be added here
        break;
    }

    // Number keys for quick navigation (1-9)
    if (event.key >= '1' && event.key <= '9') {
      const slideNum = parseInt(event.key) - 1;
      if (slideNum < editor.slides.value.length) {
        event.preventDefault();
        editor.goToSlide(slideNum);
      }
    }
  }

  // Overview
  function toggleOverview() {
    showOverview.value = !showOverview.value;
  }

  function selectFromOverview(index: number) {
    editor.goToSlide(index);
    showOverview.value = false;
  }

  // Drawing functions
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
    const slideId = editor.currentSlide.value?.id;
    if (!slideId) return;

    const existing = slideDrawings.value.get(slideId) || [];
    slideDrawings.value.set(slideId, [...existing, stroke]);
  }

  function clearCurrentDrawings() {
    const slideId = editor.currentSlide.value?.id;
    if (!slideId) return;
    slideDrawings.value.set(slideId, []);
  }

  function clearAllDrawings() {
    slideDrawings.value.clear();
  }

  function undoLastStroke() {
    const slideId = editor.currentSlide.value?.id;
    if (!slideId) return;

    const existing = slideDrawings.value.get(slideId) || [];
    if (existing.length > 0) {
      slideDrawings.value.set(slideId, existing.slice(0, -1));
    }
  }

  // Pointer/laser functions
  function togglePointer() {
    isPointerMode.value = !isPointerMode.value;
    if (isPointerMode.value) {
      isDrawingMode.value = false;
    }
  }

  function updatePointerPosition(position: DrawingPoint | null) {
    pointerPosition.value = position;
  }

  // Camera functions
  async function enableCamera() {
    try {
      cameraStream.value = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 } 
      });
      isCameraEnabled.value = true;
    } catch (e) {
      console.warn('Camera not available:', e);
    }
  }

  function disableCamera() {
    if (cameraStream.value) {
      cameraStream.value.getTracks().forEach(track => track.stop());
      cameraStream.value = null;
    }
    isCameraEnabled.value = false;
  }

  function toggleCamera() {
    if (isCameraEnabled.value) {
      disableCamera();
    } else {
      enableCamera();
    }
  }

  // UI toggles
  function toggleNotes() {
    showNotes.value = !showNotes.value;
  }

  function toggleTimerVisibility() {
    showTimer.value = !showTimer.value;
  }

  function toggleNextSlide() {
    showNextSlide.value = !showNextSlide.value;
  }

  // Cleanup
  onUnmounted(() => {
    stopTimer();
    disableCamera();
  });

  return {
    // Presentation state
    isPresenting,
    isPaused,
    elapsedTime,
    formattedTime,

    // UI state
    showOverview,
    showNotes,
    showTimer,
    showNextSlide,
    isFullscreen,

    // Drawing state
    isDrawingMode,
    drawingColor,
    drawingWidth,
    currentStrokes,
    currentSlideDrawings,

    // Pointer state
    isPointerMode,
    pointerPosition,

    // Camera state
    isCameraEnabled,
    cameraStream,

    // Timer functions
    startTimer,
    stopTimer,
    resetTimer,
    pauseTimer,
    resumeTimer,
    toggleTimer,
    formatTime,

    // Presentation control
    startPresentation,
    exitPresentation,
    togglePresentation,

    // Fullscreen
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,

    // Keyboard
    handleKeydown,

    // Overview
    toggleOverview,
    selectFromOverview,

    // Drawing
    toggleDrawing,
    setDrawingColor,
    setDrawingWidth,
    addStroke,
    clearCurrentDrawings,
    clearAllDrawings,
    undoLastStroke,

    // Pointer
    togglePointer,
    updatePointerPosition,

    // Camera
    enableCamera,
    disableCamera,
    toggleCamera,

    // UI toggles
    toggleNotes,
    toggleTimerVisibility,
    toggleNextSlide
  };
}

export type PresenterReturn = ReturnType<typeof usePresenter>;
