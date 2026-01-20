<template>
  <Teleport to="body">
    <div 
      v-if="isPresenting"
      class="fixed inset-0 z-50 bg-black flex"
      @keydown="handleKeydown"
      tabindex="0"
      ref="presenterRef"
    >
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

        <div 
          class="presenter-slide bg-white shadow-2xl relative"
          :style="{ 
            width: slideWidth + 'px', 
            height: slideHeight + 'px',
            background: slideBackground || '#ffffff'
          }"
          :class="layoutClass"
          @mousemove="updatePointer"
          @mouseleave="clearPointer"
        >
          <div 
            class="slide-content h-full p-16 overflow-hidden"
            v-html="renderedContent"
          />
        </div>

        <!-- Slide Progress Bar -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
          <div
            v-for="(_, index) in totalSlides"
            :key="index"
            class="w-2 h-2 rounded-full transition-colors cursor-pointer"
            :class="index === currentSlideIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'"
            @click="emit('go-to-slide', index)"
          />
        </div>

        <!-- Quick Actions Bar -->
        <div class="absolute bottom-4 right-4 flex gap-2">
          <button
            class="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            :class="{ 'bg-red-500/50': isDrawingMode }"
            title="Drawing Mode (D)"
            @click="emit('toggle-drawing')"
          >
            <Pencil class="h-5 w-5" />
          </button>
          <button
            class="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            :class="{ 'bg-red-500/50': isPointerMode }"
            title="Laser Pointer (P)"
            @click="emit('toggle-pointer')"
          >
            <MousePointer class="h-5 w-5" />
          </button>
          <button
            class="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Clear Drawings (C)"
            @click="emit('clear-drawings')"
          >
            <Eraser class="h-5 w-5" />
          </button>
          <button
            class="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Overview (O)"
            @click="emit('toggle-overview')"
          >
            <LayoutGrid class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Presenter Panel -->
      <div class="w-96 bg-gray-900 text-white flex flex-col">
        <!-- Timer & Controls -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <div 
              class="text-3xl font-mono cursor-pointer"
              :class="{ 'text-yellow-400': isPaused }"
              @click="emit('toggle-timer')"
              title="Click to pause/resume"
            >
              {{ formattedTime }}
            </div>
            <div class="flex gap-2">
              <button
                class="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                @click="emit('reset-timer')"
                title="Reset Timer"
              >
                <RotateCcw class="h-4 w-4" />
              </button>
              <button
                class="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                :class="{ 'bg-blue-600': isCameraEnabled }"
                @click="emit('toggle-camera')"
                title="Toggle Camera"
              >
                <Camera class="h-4 w-4" />
              </button>
              <button
                class="p-2 bg-red-600 hover:bg-red-700 rounded"
                @click="emit('exit')"
                title="Exit (Esc)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="text-sm text-gray-400">
            Slide {{ currentSlideIndex + 1 }} of {{ totalSlides }}
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
            Notes
          </h4>
          <div 
            class="text-sm text-gray-300 whitespace-pre-wrap"
            v-html="currentNotes || '<span class=\'text-gray-500 italic\'>No notes for this slide</span>'"
          />
        </div>

        <!-- Next Slide Preview -->
        <div class="p-4 border-t border-gray-700">
          <h4 class="text-sm font-semibold text-gray-400 mb-2">Next Slide</h4>
          <div 
            v-if="nextSlideContent"
            class="aspect-[4/3] bg-white rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
            @click="emit('next-slide')"
          >
            <div 
              class="h-full p-2 text-[8px] text-gray-900 overflow-hidden"
              v-html="nextSlideContent"
            />
          </div>
          <div v-else class="text-sm text-gray-500 italic">
            End of presentation
          </div>
        </div>

        <!-- Navigation -->
        <div class="p-4 border-t border-gray-700 flex justify-center gap-4">
          <button
            class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            :disabled="currentSlideIndex <= 0"
            @click="emit('previous-slide')"
          >
            <ChevronLeft class="h-5 w-5" />
            <span class="text-sm">Previous</span>
          </button>
          <button
            class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            :disabled="currentSlideIndex >= totalSlides - 1"
            @click="emit('next-slide')"
          >
            <span class="text-sm">Next</span>
            <ChevronRight class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Overview Modal -->
      <div
        v-if="showOverview"
        class="absolute inset-0 bg-black/90 z-30 flex items-center justify-center p-8"
        @click.self="emit('toggle-overview')"
      >
        <div class="max-w-6xl w-full max-h-full overflow-auto">
          <div class="grid grid-cols-4 gap-4">
            <div
              v-for="(slide, index) in slides"
              :key="slide.id"
              class="aspect-[4/3] bg-white rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
              :class="{ 'ring-4 ring-blue-500': index === currentSlideIndex }"
              @click="emit('go-to-slide', index); emit('toggle-overview')"
            >
              <div class="relative h-full">
                <div 
                  class="h-full p-2 text-[6px] text-gray-900 overflow-hidden"
                  v-html="getSlidePreview(slide)"
                />
                <div class="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {{ index + 1 }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { 
  ChevronLeft, ChevronRight, X, RotateCcw, Camera,
  Pencil, MousePointer, Eraser, LayoutGrid, StickyNote
} from 'lucide-vue-next';
import { parseMarkdownToHtml, type SlidevSlide } from '@/utils/slidevMarkdown';

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

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
}

function getSlidePreview(slide: SlidevSlide): string {
  return parseMarkdownToHtml(slide.content).substring(0, 500);
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
});
</script>

<style scoped>
.presenter-slide {
  aspect-ratio: 4/3;
}

.slide-content :deep(h1) {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.slide-content :deep(h2) {
  font-size: 2.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.slide-content :deep(p) {
  font-size: 1.5rem;
  line-height: 1.75;
}

.slide-content :deep(ul),
.slide-content :deep(ol) {
  font-size: 1.5rem;
  margin-left: 2rem;
}

.slide-content :deep(li) {
  margin-bottom: 0.5rem;
}
</style>
