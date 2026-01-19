<template>
  <div class="slidev-container h-full w-full flex flex-col">
    <!-- Toolbar -->
    <div class="slidev-toolbar flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="addSlide">
          <Plus class="h-4 w-4 mr-1" /> Add Slide
        </Button>
        <Button variant="outline" size="sm" @click="previousSlide" :disabled="currentSlide <= 0">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-sm font-medium px-2">{{ currentSlide + 1 }} / {{ totalSlides }}</span>
        <Button variant="outline" size="sm" @click="nextSlide" :disabled="currentSlide >= totalSlides - 1">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="toggleEditMode">
          <Edit class="h-4 w-4 mr-1" /> {{ editMode ? 'Preview' : 'Edit' }}
        </Button>
        <Button variant="outline" size="sm" @click="exportPDF">
          <Download class="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button variant="outline" size="sm" @click="exportPPTX">
          <FileText class="h-4 w-4 mr-1" /> PPTX
        </Button>
        <Button variant="outline" size="sm" @click="togglePresenterMode">
          <Monitor class="h-4 w-4 mr-1" /> Present
        </Button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Slide Editor/Viewer -->
      <div class="flex-1 relative">
        <div 
          ref="slideContainer"
          class="slide-content w-full h-full overflow-auto bg-gray-50 dark:bg-gray-950"
          @click="handleSlideClick"
        >
          <div 
            v-for="(slide, index) in slides"
            :key="slide.id"
            v-show="index === currentSlide"
            class="slide-wrapper min-w-full min-h-full flex items-center justify-center p-8"
          >
            <div 
              class="slide-page bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden"
              :style="{ width: slideWidth + 'px', height: slideHeight + 'px' }"
            >
              <!-- Slide Content -->
              <div 
                v-if="editMode"
                class="slide-editor p-8 h-full"
                contenteditable
                @input="updateSlideContent(index, $event)"
                v-html="slide.content"
              />
              <div 
                v-else
                class="slide-viewer p-8 h-full"
                v-html="slide.content"
              />
            </div>
          </div>
        </div>

        <!-- Presenter Mode Overlay -->
        <div 
          v-if="presenterMode"
          class="presenter-overlay fixed inset-0 bg-black bg-opacity-90 z-50 flex"
        >
          <!-- Current Slide -->
          <div class="flex-1 flex items-center justify-center">
            <div 
              class="presenter-slide bg-white shadow-2xl"
              :style="{ width: presenterSlideWidth + 'px', height: presenterSlideHeight + 'px' }"
            >
              <div 
                class="p-8 h-full"
                v-html="slides[currentSlide]?.content || ''"
              />
            </div>
          </div>

          <!-- Presenter Notes -->
          <div class="w-80 bg-gray-900 text-white p-4 overflow-hidden">
            <div class="mb-4">
              <h3 class="text-lg font-semibold mb-2">Presenter Notes</h3>
              <textarea 
                v-model="slides[currentSlide].notes"
                class="w-full h-32 bg-gray-800 text-white p-2 rounded resize-none"
                placeholder="Add presenter notes..."
              />
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-semibold mb-2">Next Slide</h3>
              <div 
                class="next-slide-preview bg-white text-black p-4 rounded text-sm"
                :style="{ width: '200px', minHeight: '150px' }"
              >
                <div v-html="slides[currentSlide + 1]?.content || 'No more slides'" />
              </div>
            </div>

            <div class="text-sm text-gray-400">
              <p>Slide {{ currentSlide + 1 }} of {{ totalSlides }}</p>
              <p>{{ formatTime(elapsedTime) }}</p>
            </div>

            <Button 
              variant="destructive" 
              class="mt-4 w-full"
              @click="togglePresenterMode"
            >
              Exit Presenter Mode
            </Button>
          </div>
        </div>
      </div>

      <!-- Slide Thumbnails Sidebar -->
      <div class="w-48 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
        <div class="p-2">
          <h4 class="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Slides</h4>
          <div 
            v-for="(slide, index) in slides"
            :key="slide.id"
            class="slide-thumbnail mb-2 p-2 border rounded cursor-pointer transition-colors"
            :class="{
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20': index === currentSlide,
              'border-gray-200 dark:border-gray-700 hover:border-gray-300': index !== currentSlide
            }"
            @click="goToSlide(index)"
          >
            <div class="text-xs font-medium mb-1">Slide {{ index + 1 }}</div>
            <div 
              class="thumbnail-content text-xs text-gray-600 dark:text-gray-400 line-clamp-3"
              v-html="stripHtml(slide.content)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Edit, Download, FileText, Monitor } from 'lucide-vue-next';
import { toast } from '@/composables/useToast';
import { slidevService, type SlidevSlide } from '@/services/slidevService';

interface Slide {
  id: string;
  content: string;
  notes: string;
}

const props = defineProps<{
  initialSlides?: Slide[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:slides', slides: Slide[]): void;
  (e: 'thumbnail', data: string | null): void;
}>();

// State
const slides = ref<Slide[]>(props.initialSlides || [
  {
    id: '1',
    content: '<h1>Welcome to Slidev</h1><p>Your presentation starts here</p>',
    notes: 'Welcome the audience and introduce the topic'
  }
]);

const currentSlide = ref(0);
const editMode = ref(true);
const presenterMode = ref(false);
const elapsedTime = ref(0);
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Constants
const slideWidth = 1024;
const slideHeight = 768;
const presenterSlideWidth = 1200;
const presenterSlideHeight = 900;

// Computed
const totalSlides = computed(() => slides.value.length);

// Methods
const addSlide = () => {
  const newSlide: Slide = {
    id: Date.now().toString(),
    content: '<h1>New Slide</h1><p>Add your content here</p>',
    notes: ''
  };
  slides.value.splice(currentSlide.value + 1, 0, newSlide);
  currentSlide.value++;
  emit('update:slides', slides.value);
  toast.success('New slide added');
};

const previousSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--;
  }
};

const nextSlide = () => {
  if (currentSlide.value < slides.value.length - 1) {
    currentSlide.value++;
  }
};

const goToSlide = (index: number) => {
  currentSlide.value = index;
};

const toggleEditMode = () => {
  editMode.value = !editMode.value;
};

const togglePresenterMode = () => {
  presenterMode.value = !presenterMode.value;
  if (presenterMode.value) {
    startTimer();
  } else {
    stopTimer();
  }
};

const updateSlideContent = (index: number, event: Event) => {
  const target = event.target as HTMLElement;
  if (target) {
    slides.value[index].content = target.innerHTML;
    emit('update:slides', slides.value);
    generateThumbnail();
  }
};

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, '');
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const startTimer = () => {
  elapsedTime.value = 0;
  timerInterval.value = setInterval(() => {
    elapsedTime.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const generateThumbnail = async () => {
  // Generate thumbnail for current slide
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = '#000000';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Slide ${currentSlide.value + 1}`, 10, 20);
      emit('thumbnail', canvas.toDataURL());
    }
  } catch (error) {
    console.warn('Failed to generate thumbnail:', error);
    emit('thumbnail', null);
  }
};

const exportPDF = async () => {
  await slidevService.exportSlides(slides.value as SlidevSlide[], { format: 'pdf' });
};

const exportPPTX = async () => {
  await slidevService.exportSlides(slides.value as SlidevSlide[], { format: 'pptx' });
};

const handleSlideClick = (event: MouseEvent) => {
  if (editMode.value && event.target === event.currentTarget) {
    // Add a new text block at click position
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const currentSlideData = slides.value[currentSlide.value];
    const newText = `<p style="position: absolute; left: ${x}px; top: ${y}px;">New text</p>`;
    currentSlideData.content += newText;
    
    emit('update:slides', slides.value);
  }
};

// Lifecycle
onMounted(() => {
  generateThumbnail();
});

onBeforeUnmount(() => {
  stopTimer();
});
</script>

<style scoped>
.slidev-container {
  font-family: 'Inter', sans-serif;
}

.slide-content {
  scroll-behavior: smooth;
}

.slide-page {
  aspect-ratio: 4/3;
}

.slide-editor {
  outline: none;
}

.slide-editor:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.slide-thumbnail {
  transition: all 0.2s ease;
}

.slide-thumbnail:hover {
  transform: translateY(-1px);
}

.thumbnail-content {
  max-height: 60px;
  overflow: hidden;
}

.presenter-overlay {
  backdrop-filter: blur(4px);
}

.presenter-slide {
  aspect-ratio: 4/3;
}

.next-slide-preview {
  aspect-ratio: 4/3;
  overflow: hidden;
}

/* Dark mode styles */
.dark .slide-page {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.dark .presenter-slide {
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
</style>
