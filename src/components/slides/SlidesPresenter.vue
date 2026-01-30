<template>
  <Teleport to="body">
    <div 
      v-if="isPresenting"
      class="fixed inset-0 z-50 bg-black flex"
      @keydown="handleKeydown"
      tabindex="0"
      ref="presenterRef"
    >
      <!-- Navigation Bar (Slidev style) -->
      <div 
        v-if="showNavigationBar"
        class="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm rounded-t-lg px-4 py-2 flex items-center gap-4 transition-all duration-300"
        @mouseenter="keepNavigationVisible"
        @mouseleave="hideNavigationDelayed"
      >
        <!-- Quick Actions -->
        <div class="flex items-center gap-2">
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Quick Overview (O)"
            @click="toggleOverview"
          >
            <LayoutGrid class="h-4 w-4" />
          </button>
          
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Drawing Mode (D)"
            @click="toggleDrawing"
            :class="{ 'text-white bg-white/20': isDrawingMode }"
          >
            <Pencil class="h-4 w-4" />
          </button>
          
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Laser Pointer (P)"
            @click="togglePointer"
            :class="{ 'text-white bg-white/20': isPointerMode }"
          >
            <MousePointer class="h-4 w-4" />
          </button>
          
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Camera"
            @click="toggleCamera"
            :class="{ 'text-white bg-white/20': isCameraEnabled }"
          >
            <Camera class="h-4 w-4" />
          </button>
          
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Recording"
            @click="toggleRecording"
            :class="{ 'text-red-400 bg-red-500/20': isRecording }"
          >
            <Circle class="h-4 w-4" />
          </button>
          
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Browser Exporter"
            @click="openBrowserExporter"
          >
            <Download class="h-4 w-4" />
          </button>
        </div>

        <!-- Slide Progress -->
        <div class="flex items-center gap-3">
          <div class="flex gap-1">
            <div
              v-for="(_, index) in totalSlides"
              :key="index"
              class="w-1.5 h-1.5 rounded-full transition-all cursor-pointer"
              :class="index === currentSlideIndex 
                ? 'bg-white w-4' 
                : 'bg-white/30 hover:bg-white/50'"
              @click="goToSlide(index)"
            />
          </div>
          <span class="text-white/70 text-xs">{{ currentSlideIndex + 1 }} / {{ totalSlides }}</span>
        </div>

        <!-- Navigation Controls -->
        <div class="flex items-center gap-1">
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
            :disabled="currentSlideIndex <= 0"
            @click="previousSlide"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
            :disabled="currentSlideIndex >= totalSlides - 1"
            @click="nextSlide"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <!-- Timer -->
        <div 
          class="text-white/70 text-sm font-mono cursor-pointer hover:text-white"
          @click="toggleTimer"
          :class="{ 'text-yellow-400': isPaused }"
        >
          {{ formattedTime }}
        </div>
      </div>

      <!-- Main Slide Display -->
      <div class="flex-1 flex items-center justify-center p-4 relative">
        <!-- Drawing Canvas Overlay -->
        <canvas
          v-if="isDrawingMode"
          ref="drawingCanvas"
          class="absolute inset-0 z-10 cursor-crosshair"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
        />
        
        <!-- Laser Pointer -->
        <div
          v-if="isPointerMode && pointerPosition"
          class="absolute z-20 w-4 h-4 rounded-full bg-red-500 pointer-events-none animate-pulse"
          :style="{ left: pointerPosition.x + 'px', top: pointerPosition.y + 'px', transform: 'translate(-50%, -50%)' }"
        />

        <!-- Slide Content -->
        <div 
          class="presenter-slide shadow-2xl relative"
          :style="{ 
            width: slideWidth + 'px', 
            height: slideHeight + 'px',
            background: slideBackground || themeBackground || '#ffffff',
            color: themeText || '#1e293b',
            ...themeStyle
          }"
          :class="layoutClass"
          @mousemove="updatePointer"
          @mouseleave="clearPointer"
        >
          <div 
            ref="slideContentRef"
            class="slide-content h-full overflow-hidden p-8"
            :style="{ color: 'inherit' }"
            v-html="renderedContent"
          />
        </div>

        <!-- Slide Transition Animation -->
        <Transition
          name="slide-transition"
          mode="out-in"
          @before-enter="beforeSlideEnter"
          @after-enter="afterSlideEnter"
        >
          <div
            v-if="isTransitioning"
            class="absolute inset-0 bg-black/50 z-30 flex items-center justify-center"
          >
            <div class="text-white text-2xl font-bold">{{ currentSlideIndex + 1 }}</div>
          </div>
        </Transition>
      </div>

      <!-- Presenter Panel (Enhanced) -->
      <div class="w-96 bg-gray-900 text-white flex flex-col">
        <!-- Timer & Controls -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <div 
              class="text-3xl font-mono cursor-pointer"
              :class="{ 'text-yellow-400': isPaused }"
              @click="toggleTimer"
              title="Click to pause/resume"
            >
              {{ formattedTime }}
            </div>
            <div class="flex gap-2">
              <button
                class="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                @click="resetTimer"
                title="Reset Timer"
              >
                <RotateCcw class="h-4 w-4" />
              </button>
              <button
                class="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                :class="{ 'bg-blue-600': isCameraEnabled }"
                @click="toggleCamera"
                title="Toggle Camera"
              >
                <Camera class="h-4 w-4" />
              </button>
              <button
                class="p-2 bg-red-600 hover:bg-red-700 rounded"
                @click="exitPresentation"
                title="Exit (Esc)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <!-- Presentation Stats -->
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-gray-400">{{$t('Commons.text.current')}}</div>
              <div class="font-semibold">{{ currentSlideIndex + 1 }}</div>
            </div>
            <div class="text-center">
              <div class="text-gray-400">{{$t('Commons.text.total')}}</div>
              <div class="font-semibold">{{ totalSlides }}</div>
            </div>
            <div class="text-center">
              <div class="text-gray-400">{{$t('Commons.text.progress')}}</div>
              <div class="font-semibold">{{ Math.round((currentSlideIndex + 1) / totalSlides * 100) }}%</div>
            </div>
          </div>
        </div>

        <!-- Camera Preview -->
        <div v-if="isCameraEnabled && cameraStream" class="p-4 border-b border-gray-700">
          <video
            ref="cameraVideo"
            autoplay
            muted
            playsinline
            class="w-full rounded-lg"
            :srcObject="cameraStream"
          />
        </div>

        <!-- Current Slide Notes -->
        <div class="flex-1 overflow-y-auto p-4">
          <h4 class="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <StickyNote class="h-4 w-4" />
            {{$t('Commons.heading.notes')}}
          </h4>
          <div 
            class="text-sm text-gray-300 whitespace-pre-wrap"
            v-html="currentNotes || '<span class=\'text-gray-500 italic\'>No notes for this slide</span>'"
          />
        </div>

        <!-- Next Slide Preview -->
        <div class="p-4 border-t border-gray-700">
          <h4 class="text-sm font-semibold text-gray-400 mb-2">{{$t('Commons.heading.next_slide')}}</h4>
          <div 
            v-if="nextSlideContent"
            class="aspect-[4/3] bg-white rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
            @click="nextSlide"
          >
            <div 
              class="h-full p-2 text-[8px] text-gray-900 overflow-hidden"
              v-html="nextSlideContent"
            />
          </div>
          <div v-else class="text-sm text-gray-500 italic">
            {{$t('Components.Slides.text.end_of_presentation')}}
          </div>
        </div>

        <!-- Navigation -->
        <div class="p-4 border-t border-gray-700 flex justify-center gap-4">
          <button
            class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            :disabled="currentSlideIndex <= 0"
            @click="previousSlide"
          >
            <ChevronLeft class="h-5 w-5" />
            <span class="text-sm">{{$t('Commons.button.previous')}}</span>
          </button>
          <button
            class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            :disabled="currentSlideIndex >= totalSlides - 1"
            @click="nextSlide"
          >
            <span class="text-sm">{{$t('Commons.button.next')}}</span>
            <ChevronRight class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Overview Modal (Enhanced) -->
      <div
        v-if="showOverview"
        class="absolute inset-0 bg-black/90 z-30 flex items-center justify-center p-8"
        @click.self="toggleOverview"
      >
        <div class="max-w-7xl w-full max-h-full overflow-auto">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white">{{$t('Commons.heading.slide_overview')}}</h2>
            <button
              @click="toggleOverview"
              class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            <div
              v-for="(slide, index) in slides"
              :key="slide.id"
              class="aspect-[4/3] bg-white rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 group"
              :class="{ 'ring-4 ring-blue-500': index === currentSlideIndex }"
              @click="goToSlide(index); toggleOverview()"
            >
              <div class="relative h-full">
                <div 
                  class="h-full p-2 text-[6px] text-gray-900 overflow-hidden"
                  v-html="getSlidePreview(slide)"
                />
                <div class="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {{ index + 1 }}
                </div>
                <!-- Slide title overlay -->
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="text-white text-xs truncate">
                    {{ getSlideTitle(slide) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recording Indicator -->
      <div
        v-if="isRecording"
        class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
      >
        <Circle class="h-2 w-2 animate-pulse" />
        Recording {{ recordingTime }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { 
  ChevronLeft, ChevronRight, X, RotateCcw, Camera,
  Pencil, MousePointer, LayoutGrid, StickyNote, Circle, Download
} from 'lucide-vue-next';
import { parseMarkdownToHtml, type SlidevSlide } from '@/utils/slidevMarkdown';
import { useSharedSlideRenderer } from '@/composables/useSharedSlideRenderer';

interface DrawingPoint {
  x: number;
  y: number;
}

interface Props {
  isPresenting: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  slides: SlidevSlide[];
  renderedContent: string;
  layoutClass: string;
  slideBackground?: string;
  themeBackground?: string;
  themeText?: string;
  themeStyle?: Record<string, string>;
  currentNotes?: string;
  nextSlideContent?: string;
  formattedTime: string;
  isPaused?: boolean;
  isDrawingMode?: boolean;
  isPointerMode?: boolean;
  isCameraEnabled?: boolean;
  cameraStream?: MediaStream | null;
  showOverview?: boolean;
  slideWidth?: number;
  slideHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  slideWidth: 1200,
  slideHeight: 900,
  themeBackground: '#ffffff',
  themeText: '#1e293b',
  themeStyle: () => ({}),
  isPaused: false,
  isDrawingMode: false,
  isPointerMode: false,
  isCameraEnabled: false,
  showOverview: false
});

const emit = defineEmits<{
  (e: 'exit'): void;
  (e: 'previous-slide'): void;
  (e: 'next-slide'): void;
  (e: 'go-to-slide', index: number): void;
  (e: 'reset-timer'): void;
  (e: 'toggle-timer'): void;
  (e: 'toggle-drawing'): void;
  (e: 'toggle-pointer'): void;
  (e: 'toggle-camera'): void;
  (e: 'toggle-overview'): void;
  (e: 'clear-drawings'): void;
  (e: 'add-stroke', stroke: { points: DrawingPoint[]; color: string; width: number }): void;
  (e: 'update-pointer', position: DrawingPoint | null): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

const presenterRef = ref<HTMLDivElement | null>(null);
const drawingCanvas = ref<HTMLCanvasElement | null>(null);
const cameraVideo = ref<HTMLVideoElement | null>(null);
const slideContentRef = ref<HTMLDivElement | null>(null);

// Use shared renderer for consistent positioning
const sharedRenderer = useSharedSlideRenderer();

// Enhanced state
const showNavigationBar = ref(true);
const isTransitioning = ref(false);
const isRecording = ref(false);
const recordingTime = ref('00:00');
const navigationTimeout = ref<NodeJS.Timeout | null>(null);

// Drawing state
const isDrawing = ref(false);
const currentPath = ref<DrawingPoint[]>([]);
const pointerPosition = ref<DrawingPoint | null>(null);

// Focus presenter on mount
watch(() => props.isPresenting, (presenting) => {
  if (presenting) {
    nextTick(() => {
      presenterRef.value?.focus();
    });
  }
});

// Setup camera video
watch(() => props.cameraStream, (stream) => {
  if (cameraVideo.value && stream) {
    cameraVideo.value.srcObject = stream;
  }
});

// Apply positioning when slide content changes
watch(() => props.renderedContent, async () => {
  await nextTick();
  if (slideContentRef.value) {
    // Apply position classes using shared renderer for consistency with preview
    sharedRenderer.applyPositionsWithZoom(slideContentRef.value, 100);
    
    // Apply theme colors to ensure text visibility
    sharedRenderer.renderSlideContent(slideContentRef.value, {
      background: props.slideBackground || props.themeBackground || '#ffffff',
      textColor: props.themeText || '#1e293b',
      padding: '48px', // Presenter mode uses fullscreen padding
      layoutClass: props.layoutClass
    });
  }
}, { immediate: true });

// Navigation bar auto-hide
function keepNavigationVisible() {
  if (navigationTimeout.value) {
    clearTimeout(navigationTimeout.value);
  }
  showNavigationBar.value = true;
}

function hideNavigationDelayed() {
  navigationTimeout.value = setTimeout(() => {
    showNavigationBar.value = false;
  }, 3000);
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
  
  // Enhanced keyboard shortcuts
  switch (event.key) {
    case 'o':
    case 'O':
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleOverview();
      }
      break;
    case 'd':
    case 'D':
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleDrawing();
      }
      break;
    case 'p':
    case 'P':
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        togglePointer();
      }
      break;
    case 'c':
    case 'C':
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        emit('clear-drawings');
      }
      break;
    case 'r':
    case 'R':
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleRecording();
      }
      break;
  }
}

function getSlidePreview(slide: SlidevSlide): string {
  return parseMarkdownToHtml(slide.content).substring(0, 500);
}

function getSlideTitle(slide: SlidevSlide): string {
  const lines = slide.content.split('\n');
  const firstLine = lines[0];
  if (firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '');
  }
  return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}

// Navigation functions
function previousSlide() {
  if (props.currentSlideIndex > 0) {
    startSlideTransition();
    emit('previous-slide');
  }
}

function nextSlide() {
  if (props.currentSlideIndex < props.totalSlides - 1) {
    startSlideTransition();
    emit('next-slide');
  }
}

function goToSlide(index: number) {
  if (index !== props.currentSlideIndex) {
    startSlideTransition();
    emit('go-to-slide', index);
  }
}

function startSlideTransition() {
  isTransitioning.value = true;
  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
}

function beforeSlideEnter() {
  // Animation setup
}

function afterSlideEnter() {
  // Animation cleanup
}

// Toggle functions
function toggleOverview() {
  emit('toggle-overview');
}

function toggleDrawing() {
  emit('toggle-drawing');
}

function togglePointer() {
  emit('toggle-pointer');
}

function toggleCamera() {
  emit('toggle-camera');
}

function toggleTimer() {
  emit('toggle-timer');
}

function toggleRecording() {
  isRecording.value = !isRecording.value;
  if (isRecording.value) {
    startRecordingTimer();
  } else {
    stopRecordingTimer();
  }
}

function resetTimer() {
  emit('reset-timer');
}

function exitPresentation() {
  emit('exit');
}

function openBrowserExporter() {
  // Open browser exporter in new window
  const url = window.location.href.replace('/edit', '/export');
  window.open(url, '_blank');
}

// Recording timer
let recordingInterval: NodeJS.Timeout | null = null;

function startRecordingTimer() {
  let seconds = 0;
  recordingInterval = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    recordingTime.value = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

// Drawing functions
function startDrawing(event: MouseEvent) {
  if (!props.isDrawingMode) return;
  isDrawing.value = true;
  currentPath.value = [{ x: event.offsetX, y: event.offsetY }];
}

function draw(event: MouseEvent) {
  if (!isDrawing.value || !props.isDrawingMode) return;
  
  const canvas = drawingCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const point = { x: event.offsetX, y: event.offsetY };
  currentPath.value.push(point);
  
  // Draw the line
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (currentPath.value.length >= 2) {
    const prev = currentPath.value[currentPath.value.length - 2];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}

function stopDrawing() {
  if (isDrawing.value && currentPath.value.length > 0) {
    emit('add-stroke', {
      points: [...currentPath.value],
      color: '#ff0000',
      width: 3
    });
  }
  isDrawing.value = false;
  currentPath.value = [];
}

function updatePointer(event: MouseEvent) {
  if (props.isPointerMode) {
    pointerPosition.value = { x: event.clientX, y: event.clientY };
    emit('update-pointer', pointerPosition.value);
  }
}

function clearPointer() {
  pointerPosition.value = null;
  emit('update-pointer', null);
}

// Setup canvas size
onMounted(() => {
  if (drawingCanvas.value) {
    const rect = drawingCanvas.value.parentElement?.getBoundingClientRect();
    if (rect) {
      drawingCanvas.value.width = rect.width;
      drawingCanvas.value.height = rect.height;
    }
  }
  
  // Start navigation auto-hide timer
  hideNavigationDelayed();
});

onUnmounted(() => {
  if (navigationTimeout.value) {
    clearTimeout(navigationTimeout.value);
  }
  if (recordingInterval) {
    clearInterval(recordingInterval);
  }
});
</script>

<style scoped>
.slide-transition-enter-active,
.slide-transition-leave-active {
  transition: all 0.3s ease;
}

.slide-transition-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-transition-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.presenter-slide {
  aspect-ratio: 4/3;
}

.slide-content :deep(h1) {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: inherit;
}

.slide-content :deep(h2) {
  font-size: 2.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: inherit;
}

.slide-content :deep(p) {
  font-size: 1.5rem;
  line-height: 1.75;
  color: inherit;
}

.slide-content :deep(ul),
.slide-content :deep(ol) {
  font-size: 1.5rem;
  margin-left: 2rem;
  color: inherit;
}

.slide-content :deep(li) {
  margin-bottom: 0.5rem;
  color: inherit;
}
</style>
